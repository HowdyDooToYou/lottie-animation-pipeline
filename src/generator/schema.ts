/**
 * Zod schema for Lottie/Bodymovin JSON validation.
 * Covers the most common Lottie v5.7+ structures.
 */
import { z } from 'zod';

// Animated value: static or keyframed
const AnimatedValue = z.object({
  a: z.number(),           // 0 = static, 1 = animated
  k: z.union([
    z.any(),               // static: any value (number, array, object)
    z.array(z.object({     // keyframed: array of keyframes
      t: z.number(),       // time (frame)
      s: z.array(z.any()).optional(), // start value
      e: z.array(z.any()).optional(), // end value
      i: z.object({        // in tangent
        x: z.any(),
        y: z.any(),
      }).optional(),
      o: z.object({        // out tangent
        x: z.any(),
        y: z.any(),
      }).optional(),
    })),
  ]),
});

// Transform (ks)
const TransformSchema = z.object({
  a: AnimatedValue.optional(),  // anchor point
  p: AnimatedValue.optional(),  // position
  s: AnimatedValue.optional(),  // scale
  r: AnimatedValue.optional(),  // rotation
  o: AnimatedValue.optional(),  // opacity
  sk: AnimatedValue.optional(), // skew
  sa: AnimatedValue.optional(), // skew axis
});

// Bezier path
const BezierPath = z.object({
  i: z.array(z.array(z.number())), // in tangents
  o: z.array(z.array(z.number())), // out tangents
  v: z.array(z.array(z.number())), // vertices
  c: z.boolean().optional(),       // closed
});

// Fill
const FillSchema = z.object({
  ty: z.literal('fl'),
  c: AnimatedValue,
  o: AnimatedValue.optional(),
  r: z.number().optional(),       // fill rule: 1=nonzero, 2=evenodd
});

// Stroke
const StrokeSchema = z.object({
  ty: z.literal('st'),
  c: AnimatedValue,
  o: AnimatedValue.optional(),
  w: AnimatedValue.optional(),    // width
  lc: z.number().optional(),      // line cap
  lj: z.number().optional(),      // line join
});

// Shape types — passthrough allows extra fields per shape type without crashing strict validation
const ShapeItem = z.discriminatedUnion('ty', [
  FillSchema,
  StrokeSchema,
  z.object({
    ty: z.literal('sh'),          // shape path
    ks: z.object({
      a: z.number(),
      k: z.union([BezierPath, z.array(z.any())]),
    }),
  }),
  z.object({
    ty: z.literal('rc'),          // rectangle
    p: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
    r: AnimatedValue.optional(),
  }),
  z.object({
    ty: z.literal('el'),          // ellipse
    p: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
  }),
  z.object({
    ty: z.literal('tr'),          // transform (in shape group)
    p: AnimatedValue.optional(),
    a: AnimatedValue.optional(),
    s: AnimatedValue.optional(),
    r: AnimatedValue.optional(),
    o: AnimatedValue.optional(),
  }),
  z.object({
    ty: z.literal('gr'),          // group
    it: z.array(z.any()),         // items
  }),
]) as z.ZodTypeAny;

// Layer
const LayerSchema = z.object({
  ty: z.number(),                  // 0=precomp, 1=solid, 2=image, 3=null, 4=shape, 5=text
  nm: z.string().optional(),       // name
  sr: z.number().optional(),       // stretch
  ks: TransformSchema,             // transform
  ao: z.number().optional(),       // auto-orient
  ip: z.number(),                  // in point (frame)
  op: z.number(),                  // out point (frame)
  st: z.number().optional(),       // start time
  shapes: z.array(ShapeItem).optional(),
}).passthrough();

// Asset
const AssetSchema = z.object({
  id: z.string().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  u: z.string().optional(),        // path
  p: z.string().optional(),        // filename
}).passthrough();

// Full Lottie JSON (top-level)
export const LottieSchema = z.object({
  v: z.string().optional(),        // version
  fr: z.number(),                  // framerate
  ip: z.number(),                  // in point
  op: z.number(),                  // out point
  w: z.number(),                   // width
  h: z.number(),                   // height
  nm: z.string().optional(),       // name
  ddd: z.number().optional(),      // 3d
  assets: z.array(AssetSchema).optional(),
  layers: z.array(LayerSchema),
}).passthrough();

export type LottieAnimation = z.infer<typeof LottieSchema>;
export type LottieLayer = z.infer<typeof LayerSchema>;

/**
 * Validate a Lottie JSON object. Returns the parsed result or throws.
 */
export function validateLottie(json: unknown): LottieAnimation {
  return LottieSchema.parse(json);
}

/**
 * Quick check if an object looks like Lottie JSON without full validation.
 */
export function isLottieJson(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.fr === 'number'
    && typeof o.ip === 'number'
    && typeof o.op === 'number'
    && typeof o.w === 'number'
    && typeof o.h === 'number'
    && Array.isArray(o.layers);
}

/**
 * Auto-fix common issues in generated Lottie JSON.
 */
export function autoFixLottie(json: Record<string, unknown>): Record<string, unknown> {
  const fixed = { ...json };

  // Ensure version
  if (!fixed.v) fixed.v = '5.7.4';

  // Ensure integer frame values
  if (typeof fixed.fr === 'number' && fixed.fr <= 0) fixed.fr = 60;
  if (typeof fixed.ip === 'number' && fixed.ip < 0) fixed.ip = 0;
  if (typeof fixed.op === 'number' && fixed.op <= (fixed.ip as number)) {
    fixed.op = ((fixed.ip as number) || 0) + ((fixed.fr as number) || 60) * 2;
  }

  // Validate layers exist
  if (!Array.isArray(fixed.layers)) fixed.layers = [];

  return fixed;
}
