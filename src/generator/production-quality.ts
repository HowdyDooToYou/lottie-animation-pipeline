import { qualityGate, summarizeAnimationPreview, type QualityReport } from './quality-gate.ts';
import { validateMotionSpec, type MotionSpec } from './motion-spec.ts';
import type { RenderProbeResult } from './render-validation.ts';

export const PRODUCTION_QUALITY_THRESHOLD = 90;

export interface ProductionAnimationMetadata {
  motionSpecVersion: string;
  variant: string;
  semanticLayerMap: Record<string, string[]>;
  posterFrame: number;
  companionVariants: string[];
}

export interface ProductionQualityReport {
  score: number;
  passed: boolean;
  base: QualityReport;
  issues: string[];
  warns: string[];
  strengths: string[];
  animatedChannels: number;
  linearAnimatedChannels: number;
}

export interface ProductionRenderReport {
  passed: boolean;
  issues: string[];
  strengths: string[];
}

export function evaluateProductionRenderProbe(
  probe: RenderProbeResult,
  spec: MotionSpec,
): ProductionRenderReport {
  const issues: string[] = [];
  const strengths: string[] = [];
  if (!probe.svgPresent || probe.svgChildCount === 0) issues.push('Animation did not create a visible SVG scene');
  if (probe.paintedSampleCount !== probe.sampledFrames.length) {
    issues.push(`Only ${probe.paintedSampleCount}/${probe.sampledFrames.length} sampled frames paint visible pixels`);
  } else {
    strengths.push(`All ${probe.sampledFrames.length} sampled frames paint visible pixels`);
  }
  if (probe.meaningfulMotionSampleCount < 3) {
    issues.push(`Only ${probe.meaningfulMotionSampleCount} sampled transitions contain meaningful pixel change`);
  } else {
    strengths.push(`${probe.meaningfulMotionSampleCount} sampled transitions contain meaningful motion`);
  }
  if (['seamless', 'continuous'].includes(spec.loopStrategy)) {
    const seamRatio = probe.loopSeamChangedPixels / Math.max(1, probe.maxPaintedPixels);
    if (seamRatio > 0.08) issues.push(`Loop seam changes ${(seamRatio * 100).toFixed(1)}% of the painted scene (maximum 8%)`);
    else strengths.push(`Loop seam change is bounded to ${(seamRatio * 100).toFixed(1)}% of the painted scene`);
  }
  return { passed: issues.length === 0, issues, strengths };
}

export function productionQualityGate(
  animation: Record<string, unknown>,
  motionSpec: MotionSpec,
  variantId: string,
): ProductionQualityReport {
  const base = qualityGate(animation);
  const issues: string[] = [];
  const warns: string[] = [];
  const strengths: string[] = [];
  let spec: MotionSpec;

  try {
    spec = validateMotionSpec(motionSpec);
    strengths.push(`Valid motion specification v${spec.version}`);
  } catch (error) {
    issues.push(`Invalid motion specification: ${error instanceof Error ? error.message : String(error)}`);
    return finish();
  }

  if (!base.passed) issues.push(`Base Lottie quality gate failed at ${base.score}/100`);
  else strengths.push(`Base Lottie quality gate passed at ${base.score}/100`);

  const preview = summarizeAnimationPreview(animation);
  const variant = spec.responsiveVariants.find((item) => item.id === variantId);
  if (!variant) {
    issues.push(`Variant "${variantId}" is not declared by the motion specification`);
  } else if (animation.w !== variant.width || animation.h !== variant.height) {
    issues.push(`Canvas ${String(animation.w)}x${String(animation.h)} does not match ${variantId} contract ${variant.width}x${variant.height}`);
  } else {
    strengths.push(`Canvas matches ${variantId} ${variant.aspectRatio} ${variant.topology} contract`);
  }

  const requiredVariants = spec.responsiveVariants.filter((item) => item.required);
  if (requiredVariants.length < 2 && ['transport', 'narrative'].includes(spec.role)) {
    issues.push('Production transport and narrative motion requires at least two responsive topologies');
  } else if (requiredVariants.length >= 2) {
    strengths.push(`${requiredVariants.length} required responsive topologies declared`);
  }

  const metadata = readProductionMetadata(animation.meta);
  if (!metadata) {
    issues.push('Missing meta.production delivery metadata');
  } else {
    if (metadata.motionSpecVersion !== spec.version) issues.push('Production metadata motionSpecVersion does not match the motion specification');
    if (metadata.variant !== variantId) issues.push('Production metadata variant does not match the selected variant');
    if (Math.abs(metadata.posterFrame - spec.reducedMotion.posterFrame) > 0.001) issues.push('Production metadata posterFrame does not match the reduced-motion contract');

    const requiredCompanions = requiredVariants.filter((item) => item.id !== variantId).map((item) => item.id);
    for (const companion of requiredCompanions) {
      if (!metadata.companionVariants.includes(companion)) issues.push(`Missing required companion variant "${companion}"`);
    }

    for (const role of spec.semanticRoles) {
      const layers = metadata.semanticLayerMap[role.id];
      if (!layers?.length) issues.push(`Semantic role "${role.id}" has no mapped layers`);
    }
    if (!issues.some((issue) => issue.includes('Semantic role'))) {
      strengths.push(`All ${spec.semanticRoles.length} semantic roles map to concrete layers`);
    }
  }

  if (!spec.semanticRoles.some((role) => role.persistent && role.kind === 'connector') && spec.role === 'transport') {
    issues.push('Transport motion requires a persistent connector scaffold');
  }
  if (!spec.semanticRoles.some((role) => role.kind === 'outcome')) {
    issues.push('Production motion must declare an outcome role');
  }

  if (preview.animatedPropertyCount > spec.maxAnimatedChannels) {
    issues.push(`Animated channel budget exceeded (${preview.animatedPropertyCount}/${spec.maxAnimatedChannels})`);
  } else {
    strengths.push(`Animated channel budget respected (${preview.animatedPropertyCount}/${spec.maxAnimatedChannels})`);
  }

  const linearAnimatedChannels = countLinearAnimatedChannels(animation);
  if (linearAnimatedChannels > 0 && !spec.allowLinearContinuousMotion) {
    issues.push(`${linearAnimatedChannels} linear animated channel(s) found without a continuous-motion exception`);
  } else if (linearAnimatedChannels > 0) {
    strengths.push(`${linearAnimatedChannels} constant-velocity channel(s) are explicitly allowed for ${spec.role}`);
  }

  if (!spec.reducedMotion.preserveRoles.length) issues.push('Reduced-motion plan must preserve semantic roles');
  else strengths.push(`Reduced-motion ${spec.reducedMotion.strategy} preserves ${spec.reducedMotion.preserveRoles.length} semantic roles`);

  return finish(linearAnimatedChannels);

  function finish(linearAnimatedChannels = 0): ProductionQualityReport {
    const score = Math.max(0, Math.min(100, 100 - issues.length * 15 - warns.length * 4 - (base.passed ? 0 : 15)));
    return {
      score,
      passed: base.passed && issues.length === 0 && score >= PRODUCTION_QUALITY_THRESHOLD,
      base,
      issues,
      warns,
      strengths,
      animatedChannels: summarizeAnimationPreview(animation).animatedPropertyCount,
      linearAnimatedChannels,
    };
  }
}

function readProductionMetadata(value: unknown): ProductionAnimationMetadata | null {
  if (!value || typeof value !== 'object') return null;
  const production = (value as Record<string, unknown>).production;
  if (!production || typeof production !== 'object') return null;
  const item = production as Record<string, unknown>;
  if (
    typeof item.motionSpecVersion !== 'string'
    || typeof item.variant !== 'string'
    || typeof item.posterFrame !== 'number'
    || !Array.isArray(item.companionVariants)
    || !item.semanticLayerMap
    || typeof item.semanticLayerMap !== 'object'
  ) return null;

  const semanticLayerMap: Record<string, string[]> = {};
  for (const [role, layers] of Object.entries(item.semanticLayerMap as Record<string, unknown>)) {
    if (!Array.isArray(layers) || !layers.every((layer) => typeof layer === 'string')) return null;
    semanticLayerMap[role] = layers as string[];
  }

  if (!item.companionVariants.every((variant) => typeof variant === 'string')) return null;
  return {
    motionSpecVersion: item.motionSpecVersion,
    variant: item.variant,
    semanticLayerMap,
    posterFrame: item.posterFrame,
    companionVariants: item.companionVariants as string[],
  };
}

function countLinearAnimatedChannels(value: unknown): number {
  let count = 0;
  visit(value, (item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const property = item as { a?: unknown; k?: unknown };
    if (property.a !== 1 || !Array.isArray(property.k)) return;
    const keyframes = property.k.filter((keyframe): keyframe is Record<string, unknown> => Boolean(keyframe) && typeof keyframe === 'object');
    if (keyframes.length > 1 && keyframes.slice(0, -1).every((keyframe) => {
      if (keyframe.i === undefined && keyframe.o === undefined) return true;
      return isLinearHandle(keyframe.i, 0.667) && isLinearHandle(keyframe.o, 0.333);
    })) count += 1;
  });
  return count;
}

function isLinearHandle(value: unknown, expected: number): boolean {
  if (!value || typeof value !== 'object') return false;
  const handle = value as { x?: unknown; y?: unknown };
  const x = Array.isArray(handle.x) ? handle.x[0] : handle.x;
  const y = Array.isArray(handle.y) ? handle.y[0] : handle.y;
  return typeof x === 'number' && typeof y === 'number' && Math.abs(x - expected) < 0.01 && Math.abs(y - expected) < 0.01;
}

function visit(value: unknown, fn: (value: unknown) => void): void {
  fn(value);
  if (Array.isArray(value)) {
    for (const item of value) visit(item, fn);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) visit(item, fn);
  }
}
