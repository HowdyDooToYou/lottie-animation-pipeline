import { summarizeAnimationPreview } from './quality-gate.ts';

export interface AnimationGenerationMeta {
  provider?: string;
  model?: string;
  score?: number;
  passed?: boolean;
  iterations?: number;
}

export interface ReviewCardInput {
  name: string;
  path: string;
  data: Record<string, unknown>;
  generation?: AnimationGenerationMeta;
}

export interface ReviewCardData {
  title: string;
  sourceLabel: string;
  metrics: {
    duration: string;
    frames: string;
    canvas: string;
    motion: string;
  };
  badges: string[];
  generation: AnimationGenerationMeta | null;
}

export function buildReviewCardData(input: ReviewCardInput): ReviewCardData {
  const preview = summarizeAnimationPreview(input.data);
  const sourceLabel = input.path === 'generated'
    ? 'Generated in app'
    : input.path.startsWith('file:')
      ? 'Imported file'
      : input.path.startsWith('builtin:')
        ? 'Built-in example'
        : 'Animation asset';

  const badges: string[] = [];
  if (input.generation?.passed) badges.push('passed');
  if (preview.hasShapeLayers) badges.push('shape-layers');
  if (preview.brandColors.includes('gold')) badges.push('gold');
  else if (preview.brandColors.length > 0) badges.push(preview.brandColors[0]);

  return {
    title: input.name,
    sourceLabel,
    metrics: {
      duration: preview.validLottie ? `${preview.durationSeconds.toFixed(2)}s` : 'n/a',
      frames: preview.validLottie ? String(preview.frameCount) : 'n/a',
      canvas: preview.validLottie
        ? `${(input.data.w as number) || 0}×${(input.data.h as number) || 0}`
        : 'n/a',
      motion: preview.animatedPropertyCount === 1
        ? '1 animated prop'
        : `${preview.animatedPropertyCount} animated props`,
    },
    badges,
    generation: input.generation ?? null,
  };
}
