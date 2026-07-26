import successSeal from './recipe-assets/check-mark-01.json';
import executiveOrbit from './recipe-assets/sample-executive-orbit-01.json';
import milestoneBloom from './recipe-assets/sample-milestone-bloom-01.json';
import signalFlow from './recipe-assets/sample-signal-convergence-01.json';

import type {
  MotionCandidate,
  MotionProvider,
  MotionProofRequest,
  MotionProofTheme,
} from './contracts.ts';

export type BuiltInRecipeId =
  | 'signal-flow'
  | 'success-seal'
  | 'milestone-bloom'
  | 'executive-orbit';

export interface BuiltInRecipe {
  id: BuiltInRecipeId;
  name: string;
  description: string;
  bestFor: string[];
  promptExample: string;
  posterFrame: number;
  animation: Record<string, unknown>;
}

const RECIPES: BuiltInRecipe[] = [
  {
    id: 'signal-flow',
    name: 'Signal Flow',
    description: 'Persistent rails route staggered signals into a credible processing outcome.',
    bestFor: ['agents', 'pipelines', 'data routing', 'integrations', 'systems'],
    promptExample: 'Show three AI agents routing evidence into one verified decision.',
    posterFrame: 0.58,
    animation: signalFlow as Record<string, unknown>,
  },
  {
    id: 'success-seal',
    name: 'Success Seal',
    description: 'A compact, restrained completion mark for product feedback and confirmations.',
    bestFor: ['success', 'checkout', 'completion', 'confirmation', 'done'],
    promptExample: 'Confirm that a checkout completed successfully.',
    posterFrame: 0.72,
    animation: successSeal as Record<string, unknown>,
  },
  {
    id: 'milestone-bloom',
    name: 'Milestone Bloom',
    description: 'A composed progress seal that lands with confidence rather than confetti.',
    bestFor: ['milestones', 'launches', 'progress', 'achievement', 'release'],
    promptExample: 'Celebrate a product launch milestone without using confetti.',
    posterFrame: 0.84,
    animation: milestoneBloom as Record<string, unknown>,
  },
  {
    id: 'executive-orbit',
    name: 'Executive Orbit',
    description: 'Calm ambient intelligence orbiting a stable platform core.',
    bestFor: ['hero', 'platform', 'ecosystem', 'intelligence', 'ambient'],
    promptExample: 'Create a calm hero animation for an AI intelligence platform.',
    posterFrame: 0.42,
    animation: executiveOrbit as Record<string, unknown>,
  },
];

const KEYWORDS: Record<BuiltInRecipeId, string[]> = {
  'signal-flow': [
    'agent', 'agents', 'ai', 'data', 'flow', 'route', 'routing', 'pipeline',
    'system', 'integration', 'network', 'decision', 'evidence', 'process',
  ],
  'success-seal': [
    'success', 'successful', 'complete', 'completed', 'check', 'checkout',
    'confirm', 'confirmation', 'done', 'saved', 'approved',
  ],
  'milestone-bloom': [
    'milestone', 'achievement', 'launch', 'release', 'progress', 'celebrate',
    'goal', 'award', 'bloom', 'growth',
  ],
  'executive-orbit': [
    'hero', 'orbit', 'ecosystem', 'platform', 'ambient', 'intelligence',
    'premium', 'executive', 'calm', 'background',
  ],
};

const SOURCE_COLORS = {
  primary: [[0.25, 0.56, 0.96], [0.25098, 0.56078, 0.96078]],
  accent: [[1, 0.76, 0.25], [1, 0.76078, 0.25098]],
  success: [[0.25, 0.84, 0.67], [0.25098, 0.83922, 0.67059], [0.2902, 0.87059, 0.50196]],
  background: [[0.035, 0.055, 0.095], [0.07, 0.11, 0.18], [0.08, 0.12, 0.2]],
  foreground: [[0.92, 0.95, 1], [1, 1, 1]],
} satisfies Record<keyof MotionProofTheme, number[][]>;

export function listBuiltInRecipes(): Omit<BuiltInRecipe, 'animation'>[] {
  return RECIPES.map(({ animation: _animation, ...recipe }) => ({
    ...recipe,
    bestFor: [...recipe.bestFor],
  }));
}

export function selectBuiltInRecipe(prompt: string, requested?: string): BuiltInRecipe {
  if (requested) {
    const exact = RECIPES.find((recipe) => recipe.id === requested);
    if (!exact) {
      throw new Error(
        `Unknown recipe "${requested}". Available recipes: ${RECIPES.map((recipe) => recipe.id).join(', ')}`,
      );
    }
    return exact;
  }

  const words = new Set(prompt.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  let selected = RECIPES[0];
  let bestScore = -1;

  for (const recipe of RECIPES) {
    const score = KEYWORDS[recipe.id].reduce(
      (total, keyword) => total + (words.has(keyword) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      selected = recipe;
    }
  }

  return selected;
}

export function buildRecipeCandidate(request: MotionProofRequest): MotionCandidate {
  const recipe = selectBuiltInRecipe(request.prompt, request.recipe);
  const animation = cloneAnimation(recipe.animation);

  if (recipe.id === 'success-seal') ensureSuccessBaseline(animation);
  if (request.theme) applyTheme(animation, request.theme);

  const existingMeta = isRecord(animation.meta) ? animation.meta : {};
  animation.meta = {
    ...existingMeta,
    motionproof: {
      schemaVersion: '1.0',
      source: 'built-in-recipe',
      recipe: recipe.id,
      preset: request.preset,
      posterFrame: request.posterFrame ?? recipe.posterFrame,
    },
    accessibility: {
      description: request.description ?? request.prompt,
      reducedMotion: `Use the certified poster at ${Math.round((request.posterFrame ?? recipe.posterFrame) * 100)} percent.`,
    },
  };

  animation.nm = request.id ?? animation.nm ?? recipe.name;

  return {
    animation,
    recipe: recipe.id,
    model: 'motionproof-recipes-v1',
    notes: [
      `Matched the "${recipe.name}" deterministic recipe.`,
      'No model call or API key was required.',
    ],
  };
}

export function createRecipeProvider(): MotionProvider {
  return {
    id: 'motionproof/recipes',
    async generate({ request }) {
      return buildRecipeCandidate(request);
    },
  };
}

function cloneAnimation(animation: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(animation)) as Record<string, unknown>;
}

function ensureSuccessBaseline(animation: Record<string, unknown>): void {
  if (!Array.isArray(animation.layers)) return;
  const totalFrames = typeof animation.op === 'number' ? animation.op : 72;
  animation.layers.push({
    ty: 4,
    nm: 'Persistent success baseline',
    sr: 1,
    ip: 0,
    op: totalFrames,
    st: 0,
    ao: 0,
    bm: 0,
    ks: {
      a: { a: 0, k: [0, 0] },
      p: { a: 0, k: [80, 80] },
      s: { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: { a: 0, k: 100 },
    },
    shapes: [{
      ty: 'gr',
      nm: 'Baseline ring',
      it: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [120, 120] } },
        {
          ty: 'st',
          c: { a: 0, k: [0.29, 0.87, 0.5, 1] },
          o: { a: 0, k: 24 },
          w: { a: 0, k: 2 },
          lc: 2,
          lj: 2,
        },
        {
          ty: 'tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
        },
      ],
    }],
  });
}

function applyTheme(animation: Record<string, unknown>, theme: MotionProofTheme): void {
  visit(animation, (value) => {
    if (!Array.isArray(value) || value.length < 3) return;
    if (!value.slice(0, 3).every((channel) => typeof channel === 'number')) return;

    for (const role of Object.keys(theme) as Array<keyof MotionProofTheme>) {
      const hex = theme[role];
      if (!hex) continue;
      if (!SOURCE_COLORS[role].some((source) => closeColor(value, source))) continue;
      const [red, green, blue] = hexToRgb(hex);
      value[0] = red;
      value[1] = green;
      value[2] = blue;
      return;
    }
  });
}

function closeColor(value: unknown[], expected: number[]): boolean {
  return expected.every((channel, index) => (
    typeof value[index] === 'number'
    && Math.abs((value[index] as number) - channel) <= 0.025
  ));
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ];
}

function visit(value: unknown, visitor: (value: unknown) => void): void {
  visitor(value);
  if (Array.isArray(value)) {
    for (const child of value) visit(child, visitor);
  } else if (isRecord(value)) {
    for (const child of Object.values(value)) visit(child, visitor);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
