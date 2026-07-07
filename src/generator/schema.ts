/**
 * Zod schema for Lottie/Bodymovin JSON validation.
 *
 * This schema enforces the subset of the Lottie spec that lottie-web
 * requires to render. It's intentionally stricter than a "has the right
 * shape" check — it validates renderability:
 *
 *   - Top-level: v, fr, ip, op, w, h, layers all required and well-typed
 *   - Layers: ty, ks (transform), ip, op required; shape layers must
 *     contain at least one visible shape (fill/stroke) or be nested groups
 *     that do
 *   - Shapes: typed discriminated union with required color/width
 *   - Animated values: a=0 → k is static; a=1 → k is keyframe array
 *
 * The autoFix function patches common structural errors so that a
 * "sort of right" output from a small model becomes renderable.
 */
import { z } from 'zod';

// ── Animated value ────────────────────────────────────────────────────────
// Lottie uses { a, k } for every animated property:
//   a=0 → k is the static value (number, [x,y], [r,g,b,a])
//   a=1 → k is a keyframe array (each entry has t, s, i, o)
export const AnimatedValue = z.object({
  a: z.union([z.number(), z.array(z.number())]).transform(v => Array.isArray(v) ? v[0] ?? 0 : v),
  k: z.union([
    z.number(),
    z.array(z.number()),
    z.object({}).passthrough(),
    z.array(z.object({
      t: z.number(),
      s: z.array(z.any()).optional(),
      e: z.array(z.any()).optional(),
      i: z.object({ x: z.any(), y: z.any() }).optional(),
      o: z.object({ x: z.any(), y: z.any() }).optional(),
    })),
  ]),
}).superRefine((val, ctx) => {
  const isKeyframeArray = Array.isArray(val.k)
    && val.k.length > 0
    && val.k.every(item => typeof item === 'object' && item !== null);

  if (val.a === 1) {
    // Animated: k must be non-empty keyframes with numeric times
    if (!isKeyframeArray || !(val.k as Record<string, unknown>[]).every(kf => typeof kf.t === 'number')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a=1 requires k to be a non-empty keyframe array with numeric t values',
        path: ['k'],
      });
    }
  } else if (val.a === 0 && isKeyframeArray) {
    // Static: k must not be a keyframe array
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'a=0 requires k to be a static value, not a keyframe array',
      path: ['k'],
    });
  }
});

// ── Transform (ks) ────────────────────────────────────────────────────────
export const TransformSchema = z.object({
  a: AnimatedValue.optional(),
  p: AnimatedValue.optional(),
  s: AnimatedValue.optional(),
  r: AnimatedValue.optional(),
  o: AnimatedValue.optional(),
  sk: AnimatedValue.optional(),
  sa: AnimatedValue.optional(),
}).passthrough();

// ── Bezier path ───────────────────────────────────────────────────────────
export const BezierPath = z.object({
  i: z.array(z.array(z.number())),
  o: z.array(z.array(z.number())),
  v: z.array(z.array(z.number())),
  c: z.boolean().optional(),
});

// ── Color shorthand (arrays are accepted as AnimatedValue.k shorthand) ────
// Lottie allows c: [r,g,b] or c: [r,g,b,a] directly on shapes in some
// encoders. The AnimatedValue transform handles this.
const ColorLike = z.union([
  AnimatedValue,
  z.array(z.number()).min(3).max(4),
]);

// ── Shape items ───────────────────────────────────────────────────────────
// Each shape needs a `ty`. The discriminator catches missing types early.
export const ShapeItem = z.discriminatedUnion('ty', [
  z.object({
    ty: z.literal('fl'),      // fill
    c: ColorLike,
    o: AnimatedValue.optional(),
    r: z.number().optional(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('st'),      // stroke
    c: ColorLike,
    o: AnimatedValue.optional(),
    w: AnimatedValue.optional(),
    lc: z.number().optional(),
    lj: z.number().optional(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('sh'),      // path
    ks: z.object({ a: z.number(), k: z.union([BezierPath, z.array(z.any())]) }).passthrough(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('rc'),      // rectangle
    p: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
    r: AnimatedValue.optional(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('el'),      // ellipse
    p: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('tr'),      // group transform
    p: AnimatedValue.optional(),
    a: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
    r: AnimatedValue.optional(),
    o: AnimatedValue.optional(),
    nm: z.string().optional(),
  }),
  z.object({
    ty: z.literal('gr'),      // group
    it: z.array(z.any()),
    nm: z.string().optional(),
  }).passthrough(),
  z.object({
    ty: z.literal('tm'),      // trim path
    s: AnimatedValue.optional(),
    e: AnimatedValue.optional(),
    o: AnimatedValue.optional(),
    nm: z.string().optional(),
  }).passthrough(),
  z.object({
    ty: z.literal('mm'),      // merge
    mm: z.number().optional(),
    nm: z.string().optional(),
  }).passthrough(),
  z.object({
    ty: z.literal('rd'),      // repeater
    c: AnimatedValue.optional(),
    o: AnimatedValue.optional(),
    nm: z.string().optional(),
  }).passthrough(),
]) as z.ZodTypeAny;

// ── Layer ─────────────────────────────────────────────────────────────────
// Lottie layer types:
//   0 = precomp, 1 = solid, 2 = image, 3 = null, 4 = shape, 5 = text, 6 = audio
//
// ty must be a number (lottie-web crashes if it receives an array/object).
// ip/op must be numbers.
export const LayerSchema = z.object({
  ty: z.number().refine(n => [0, 1, 2, 3, 4, 5, 6].includes(n), {
    message: 'Layer ty must be a valid Lottie layer type (0-6)',
  }),
  nm: z.string().optional(),
  sr: z.number().optional().refine(
    v => v === undefined || typeof v === 'number',
    { message: 'Layer sr must be a number, not array/object' },
  ),
  ks: TransformSchema,
  ao: z.number().optional(),
  ip: z.number(),
  op: z.number(),
  st: z.number().optional(),
  bm: z.number().optional(),
  shapes: z.array(ShapeItem).optional(),
  tt: z.number().optional(),      // track matte type
  td: z.number().optional(),      // track matte target
  ind: z.number().optional(),     // index
  parent: z.number().optional(),
  refId: z.string().optional(),   // for asset references (image, precomp)
  w: z.number().optional(),       // solid width
  h: z.number().optional(),       // solid height
  sc: z.string().optional(),      // solid color
}).passthrough();

// ── Asset ─────────────────────────────────────────────────────────────────
export const AssetSchema = z.object({
  id: z.string(),
  w: z.number().optional(),
  h: z.number().optional(),
  u: z.string().optional(),
  p: z.string().optional(),
}).passthrough();

// ── Top-level Lottie JSON ────────────────────────────────────────────────
// These are the fields lottie-web reads on every load. All required.
export const LottieSchema = z.object({
  v: z.string().default('5.7.4'),
  fr: z.number().refine(n => n > 0, { message: 'fr must be > 0' }),
  ip: z.number(),
  op: z.number().refine((n) => n > 0, { message: 'op must be > 0' }),
  w: z.number().refine(n => n > 0, { message: 'w must be > 0' }),
  h: z.number().refine(n => n > 0, { message: 'h must be > 0' }),
  nm: z.string().optional(),
  ddd: z.number().optional(),
  assets: z.array(AssetSchema).optional(),
  layers: z.array(LayerSchema),
}).passthrough().superRefine((data, ctx) => {
  if (data.op <= data.ip) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `op (${data.op}) must be > ip (${data.ip})`,
      path: ['op'],
    });
  }
  if (data.layers.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one layer is required',
      path: ['layers'],
    });
  }
  // Verify every shape layer has at least one renderable shape
  for (const [i, layer] of data.layers.entries()) {
    if (layer.ty === 4 && layer.shapes) {
      const hasVisual = layer.shapes.some(s =>
        s.ty === 'fl' || s.ty === 'st' || s.ty === 'sh' || s.ty === 'rc' || s.ty === 'el' || s.ty === 'gr'
      );
      if (!hasVisual) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Layer ${i} (${layer.nm || 'unnamed'}) is a shape layer with no visible shapes`,
          path: ['layers', i, 'shapes'],
        });
      }

      // Every group must contain a tr (group transform) item — lottie-web
      // silently fails to build layers whose groups lack one (empty render,
      // DOMLoaded never fires).
      const checkGroups = (items: unknown[], where: string): void => {
        for (const item of items) {
          const s = item as Record<string, unknown>;
          if (s && s.ty === 'gr' && Array.isArray(s.it)) {
            if (!s.it.some((it: unknown) => (it as Record<string, unknown>)?.ty === 'tr')) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Group "${s.nm || 'unnamed'}" in ${where} is missing its tr (transform) item`,
                path: ['layers', i, 'shapes'],
              });
            }
            checkGroups(s.it, `${where} > ${s.nm || 'group'}`);
          }
        }
      };
      checkGroups(layer.shapes, `layer ${i} (${layer.nm || 'unnamed'})`);
    }
  }
});

export type LottieAnimation = z.infer<typeof LottieSchema>;
export type LottieLayer = z.infer<typeof LayerSchema>;

/**
 * Validate Lottie JSON strictly. Throws on schema violation.
 */
export function validateLottie(json: unknown): LottieAnimation {
  return LottieSchema.parse(json);
}

/**
 * Quick structural check (used by quality gate without throwing).
 * Stricter than before: checks types, not just presence.
 */
export function isLottieJson(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.fr === 'number' && o.fr > 0
    && typeof o.ip === 'number'
    && typeof o.op === 'number' && o.op > (o.ip as number)
    && typeof o.w === 'number' && o.w > 0
    && typeof o.h === 'number' && o.h > 0
    && Array.isArray(o.layers)
    && o.layers.length > 0
    && o.layers.every((layer: unknown) =>
        typeof layer === 'object' && layer !== null
        && typeof (layer as Record<string, unknown>).ty === 'number'
        && typeof (layer as Record<string, unknown>).ip === 'number'
        && typeof (layer as Record<string, unknown>).op === 'number'
        && typeof (layer as Record<string, unknown>).ks === 'object'
    )
  );
}

/**
 * Auto-fix common structural errors in generated Lottie JSON.
 * Patches things small models get wrong so output becomes renderable.
 */
export function autoFixLottie(input: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.parse(JSON.stringify(input)); // deep clone

  // Top-level defaults
  if (!json.v || typeof json.v !== 'string') json.v = '5.7.4';
  if (typeof json.fr !== 'number' || json.fr <= 0) json.fr = 60;
  if (typeof json.ip !== 'number') json.ip = 0;
  if (typeof json.op !== 'number' || json.op <= (json.ip || 0)) {
    json.op = Math.max((json.ip || 0) + (json.fr as number), 60);
  }
  if (typeof json.w !== 'number' || json.w <= 0) json.w = 400;
  if (typeof json.h !== 'number' || json.h <= 0) json.h = 400;
  if (!Array.isArray(json.layers)) json.layers = [];

  // Fix each layer
  for (const layer of json.layers as Record<string, unknown>[]) {
    // ty must be number — fix common model errors (string, array, missing)
    if (typeof layer.ty !== 'number') {
      layer.ty = 4; // default to shape layer
    }
    // sr must be number if present
    if (layer.sr !== undefined && typeof layer.sr !== 'number') {
      if (Array.isArray(layer.sr)) layer.sr = layer.sr[0] ?? 1;
      else delete layer.sr;
    }
    // Ensure ip/op exist and make sense
    if (typeof layer.ip !== 'number') layer.ip = json.ip;
    if (typeof layer.op !== 'number') layer.op = json.op;
    if ((layer.op as number) <= (layer.ip as number)) {
      layer.op = (layer.ip as number) + (json.fr as number);
    }
    // Ensure ks transform exists
    if (!layer.ks || typeof layer.ks !== 'object') {
      layer.ks = {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [Math.floor((json.w as number) / 2), Math.floor((json.h as number) / 2)] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] },
      };
    }
    // Fix ks.a — often emitted as number instead of AnimatedValue
    const ks = layer.ks as Record<string, unknown>;
    for (const prop of ['a', 'p', 's', 'r', 'o'] as const) {
      if (ks[prop] !== undefined) {
        const val = ks[prop] as Record<string, unknown>;
        if (typeof val !== 'object' || val === null) {
          // Wrap bare value in AnimatedValue format
          ks[prop] = { a: 0, k: val };
        } else {
          const k = val.k;
          const isKeyframes = Array.isArray(k) && k.length > 0
            && k.every(item => typeof item === 'object' && item !== null
              && typeof (item as Record<string, unknown>).t === 'number');
          if (val.a === 1 && !isKeyframes) {
            // claims animated but k isn't valid keyframes — treat as static
            val.a = 0;
          } else if (val.a === 0 && isKeyframes) {
            // claims static but k is a keyframe array — treat as animated
            val.a = 1;
          }
        }
      }
    }
    // Shape layer: ensure at least one visible shape
    if (layer.ty === 4) {
      if (!Array.isArray(layer.shapes) || layer.shapes.length === 0) {
        // Add a default rectangle + fill so it renders
        layer.shapes = [
          { ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 20] }, r: { a: 0, k: 4 } },
          { ty: 'fl', c: { a: 0, k: [0.25, 0.56, 0.96, 1] } },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ];
      }
      // Ensure every shape has a `ty`
      for (const shape of layer.shapes as Record<string, unknown>[]) {
        if (!shape.ty) continue;
        // Fix fill/stroke color: model sometimes emits c: [r,g,b] (flat array)
        if ((shape.ty === 'fl' || shape.ty === 'st') && shape.c) {
          if (Array.isArray(shape.c) && !('a' in (shape.c as object))) {
            // flat color array — wrap in AnimatedValue
            const arr = shape.c as number[];
            if (arr.length === 3) arr.push(1);
            shape.c = { a: 0, k: arr };
          }
        }
      }
      // Groups without a tr item silently break lottie-web — append identity
      const fixGroups = (items: Record<string, unknown>[]): void => {
        for (const s of items) {
          if (s && s.ty === 'gr' && Array.isArray(s.it)) {
            const it = s.it as Record<string, unknown>[];
            if (!it.some(x => x?.ty === 'tr')) {
              it.push({
                ty: 'tr',
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 },
              });
            }
            fixGroups(it);
          }
        }
      };
      fixGroups(layer.shapes as Record<string, unknown>[]);
    }
    // Image layer: ensure refId
    if (layer.ty === 2 && !layer.refId) {
      layer.refId = 'image_0';
    }
  }

  return json;
}

/**
 * Validate with auto-fix fallback: try strict parse first; on failure,
 * auto-fix and try again. Returns { result, fixed, issues }.
 */
export function validateOrFix(json: unknown): {
  result: LottieAnimation | null;
  fixed: Record<string, unknown> | null;
  issues: string[];
} {
  const issues: string[] = [];

  // Try strict first
  try {
    const result = LottieSchema.parse(json);
    return { result, fixed: null, issues: [] };
  } catch (e) {
    if (e instanceof z.ZodError) {
      for (const issue of e.issues) {
        issues.push(`${issue.path.join('.')}: ${issue.message}`);
      }
    }
  }

  // Auto-fix and retry
  if (json && typeof json === 'object') {
    const fixed = autoFixLottie(json as Record<string, unknown>);
    try {
      const result = LottieSchema.parse(fixed);
      return { result, fixed, issues };
    } catch (e) {
      if (e instanceof z.ZodError) {
        for (const issue of e.issues) {
          issues.push(`[after fix] ${issue.path.join('.')}: ${issue.message}`);
        }
      }
      return { result: null, fixed, issues };
    }
  }

  return { result: null, fixed: null, issues };
}
