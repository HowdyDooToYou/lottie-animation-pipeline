import { CHOREOGRAPHY_GUIDANCE } from './choreography.ts';
import { PROPERTY_SELECTION_GUIDANCE, type MotionProperty } from './property-selection.ts';
import {
  MOTION_QUALITY_THRESHOLDS,
  MOTION_QUALITY_WEIGHTS,
} from './quality-heuristics.ts';
import { TIMING_EASING_GUIDANCE } from './timing-easing.ts';

export { CHOREOGRAPHY_GUIDANCE } from './choreography.ts';
export { EMOTION_MOTION_REFERENCE } from './emotion-mapping.ts';
export { MOTION_PATTERNS } from './patterns.ts';
export { MOTION_PHILOSOPHY } from './philosophy.ts';
export { PROPERTY_SELECTION_GUIDANCE, type MotionProperty } from './property-selection.ts';
export { MOTION_QUALITY_THRESHOLDS, MOTION_QUALITY_WEIGHTS } from './quality-heuristics.ts';
export { TIMING_EASING_GUIDANCE } from './timing-easing.ts';

/**
 * Motion-quality heuristics adapted from LottieFiles' Motion Design Skill
 * (MIT, Copyright LottieFiles). Local source attribution and license live in
 * this directory; these checks evaluate evidence rather than instruct providers.
 */

export const MOTION_QUALITY_POLICY = 'soft-report-v1' as const;

export interface MotionQualityBreakdown {
  easing: number;
  timing: number;
  choreography: number;
  propertyCommunication: number;
}

export interface MotionQualityReport {
  policy: typeof MOTION_QUALITY_POLICY;
  score: number;
  /** Motion quality is advisory in v1; the structural 85-point gate remains mandatory. */
  passed: boolean;
  breakdown: MotionQualityBreakdown;
  warnings: string[];
  strengths: string[];
}

/**
 * Evaluate evidence available in portable Lottie JSON against local motion
 * principles: non-linear easing, intentional timing, bounded choreography,
 * and meaningful transform-plus-opacity state communication.
 */
export function evaluateMotionQuality(animation: Record<string, unknown>): MotionQualityReport {
  const warnings: string[] = [];
  const strengths: string[] = [];
  const frameRate = numberValue(animation.fr, 60);
  const durationSeconds = (numberValue(animation.op) - numberValue(animation.ip)) / frameRate;
  const layers = Array.isArray(animation.layers) ? animation.layers.filter(isRecord) : [];
  const animated = layers.flatMap(collectAnimatedProperties);

  const timing = evaluateTiming(durationSeconds, warnings, strengths);
  const easing = evaluateEasing(animated, warnings, strengths);
  const propertyCommunication = evaluatePropertyCommunication(animated, warnings, strengths);
  const choreography = evaluateChoreography(layers, frameRate, warnings, strengths);
  const score = Math.round((
    easing * MOTION_QUALITY_WEIGHTS.easing
    + timing * MOTION_QUALITY_WEIGHTS.timing
    + choreography * MOTION_QUALITY_WEIGHTS.choreography
    + propertyCommunication * MOTION_QUALITY_WEIGHTS.propertyCommunication
  ));

  return {
    policy: MOTION_QUALITY_POLICY,
    score,
    passed: score >= MOTION_QUALITY_THRESHOLDS.advisoryPass,
    breakdown: { easing, timing, choreography, propertyCommunication },
    warnings,
    strengths,
  };
}

const LOTTIE_TRANSFORM_PROPERTIES: MotionProperty[] = ['p', 's', 'r', 'o'];

interface AnimatedProperty {
  name: MotionProperty;
  keyframes: Record<string, unknown>[];
  layerName: string;
  startFrame: number;
}

function collectAnimatedProperties(layer: Record<string, unknown>): AnimatedProperty[] {
  const transform = isRecord(layer.ks) ? layer.ks : {};
  const layerName = typeof layer.nm === 'string' ? layer.nm : 'unnamed layer';
  const result: AnimatedProperty[] = [];

  for (const name of LOTTIE_TRANSFORM_PROPERTIES) {
    const property = transform[name];
    if (!isRecord(property) || property.a !== 1 || !Array.isArray(property.k)) continue;
    const keyframes = property.k.filter(isRecord);
    if (keyframes.length === 0) continue;
    result.push({
      name,
      keyframes,
      layerName,
      startFrame: numberValue(keyframes[0]?.t),
    });
  }

  return result;
}

function evaluateTiming(
  durationSeconds: number,
  warnings: string[],
  strengths: string[],
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    warnings.push('Motion timing could not be evaluated from frame bounds.');
    return 0;
  }
  if (durationSeconds < TIMING_EASING_GUIDANCE.minimumFeedbackMs / 1000) {
    warnings.push(`Motion resolves in ${formatSeconds(durationSeconds)}; UI feedback normally needs at least ${TIMING_EASING_GUIDANCE.minimumFeedbackMs}ms.`);
    return 45;
  }
  if (durationSeconds > TIMING_EASING_GUIDANCE.maximumAmbientMs / 1000) {
    warnings.push(`Motion runs for ${formatSeconds(durationSeconds)}; long motion should be ambient and pausable.`);
    return 55;
  }
  strengths.push(`Motion duration is intentional (${formatSeconds(durationSeconds)}).`);
  return 100;
}

function evaluateEasing(
  animated: AnimatedProperty[],
  warnings: string[],
  strengths: string[],
): number {
  if (animated.length === 0) return 0;
  const eased = animated.filter((property) => property.keyframes.some(hasBezierHandle));
  if (eased.length === 0) {
    warnings.push('Animated properties use linear timing; use Lottie Bezier easing except for intentional progress or continuous rotation.');
    return 35;
  }
  if (eased.length < animated.length) {
    warnings.push(`${animated.length - eased.length} animated propert${animated.length - eased.length === 1 ? 'y is' : 'ies are'} linear; document intentional progress or rotation when applicable.`);
    return 75;
  }
  strengths.push('Animated properties include Lottie Bezier easing.');
  return 100;
}

function evaluatePropertyCommunication(
  animated: AnimatedProperty[],
  warnings: string[],
  strengths: string[],
): number {
  const properties = new Set(animated.map((property) => property.name));
  if (properties.size === 0) {
    warnings.push('No animated transform properties were found.');
    return 0;
  }
  if (properties.size === 1 && properties.has('o')) {
    warnings.push(`Important state motion is opacity-only; ${PROPERTY_SELECTION_GUIDANCE.rule}`);
    return 25;
  }
  if (properties.has('o') && (properties.has('p') || properties.has('s'))) {
    strengths.push('Motion pairs opacity with transform for clear state communication.');
    return 100;
  }
  if (properties.has('p') || properties.has('s') || properties.has('r')) {
    strengths.push(`Motion uses purposeful transform properties (${[...properties].join(', ')}).`);
    return 85;
  }
  return 65;
}

function evaluateChoreography(
  layers: Record<string, unknown>[],
  frameRate: number,
  warnings: string[],
  strengths: string[],
): number {
  const starts = layers
    .flatMap(collectAnimatedProperties)
    .map((property) => property.startFrame);
  const uniqueStarts = [...new Set(starts)];
  if (uniqueStarts.length < 3) {
    strengths.push('Choreography is appropriately compact for the number of animated starts.');
    return 100;
  }
  const staggerMs = ((Math.max(...uniqueStarts) - Math.min(...uniqueStarts)) / frameRate) * 1000;
  if (staggerMs <= CHOREOGRAPHY_GUIDANCE.maxUiStaggerMs) {
    strengths.push(`Multi-layer choreography uses a bounded ${Math.round(staggerMs)}ms stagger.`);
    return 100;
  }
  warnings.push(`Multi-layer choreography spans ${Math.round(staggerMs)}ms; keep staggered UI motion within ${CHOREOGRAPHY_GUIDANCE.maxUiStaggerMs}ms.`);
  return 50;
}

function hasBezierHandle(keyframe: Record<string, unknown>): boolean {
  return isRecord(keyframe.i) || isRecord(keyframe.o);
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatSeconds(seconds: number): string {
  return `${Number(seconds.toFixed(2))}s`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
