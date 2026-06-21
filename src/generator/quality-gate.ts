/**
 * Quality gate for generated Lottie animations.
 * Checks structural validity + brand compliance + motion design principles.
 * Follows the proposal-operator pattern: run gate, iterate if fails, promote when passing.
 */

import { BRAND_COLORS } from '../brand/design-tokens.ts';
import { isLottieJson } from './schema.ts';

export interface QualityReport {
  score: number;           // 0-100
  passed: boolean;
  validLottie: boolean;
  issues: string[];
  warns: string[];
  strengths: string[];
}

// Impeccable motion design thresholds
const MIN_FRAMES = 15;                     // Too short = broken feeling
const MAX_FRAMES = 600;                    // Too long = bloated
export const QUALITY_THRESHOLD = 60;       // Minimum score to auto-promote
export const MAX_ITERATIONS = 3;

/**
 * Run quality gate on a Lottie JSON.
 */
export function qualityGate(animation: Record<string, unknown>): QualityReport {
  const issues: string[] = [];
  const warns: string[] = [];
  const strengths: string[] = [];
  let score = 50; // baseline

  // ── 1. Structural validity ─────────────────────────────────────────────
  if (!isLottieJson(animation)) {
    return { score: 0, passed: false, validLottie: false, issues: ['Not valid Lottie JSON'], warns: [], strengths: [] };
  }
  score += 15;

  const layers = animation.layers as Record<string, unknown>[] | undefined;
  const fr = (animation.fr as number) || 60;
  const op = (animation.op as number) || 0;
  const ip = (animation.ip as number) || 0;

  // ── 2. Duration sanity ─────────────────────────────────────────────────
  const totalFrames = op - ip;
  if (totalFrames < MIN_FRAMES) {
    warns.push(`Animation too short (${totalFrames} frames, min ${MIN_FRAMES})`);
    score -= 15;
  } else if (totalFrames > MAX_FRAMES) {
    warns.push(`Animation too long (${totalFrames} frames, max ${MAX_FRAMES})`);
    score -= 10;
  } else {
    strengths.push(`Good duration (${(totalFrames / fr).toFixed(1)}s)`);
    score += 10;
  }

  // ── 3. Layer count ─────────────────────────────────────────────────────
  const layerCount = layers?.length || 0;
  if (layerCount === 0) {
    issues.push('No layers found');
    score -= 30;
  } else if (layerCount > 20) {
    warns.push(`Many layers (${layerCount}) — may be bloated`);
    score -= 5;
  } else if (layerCount >= 2 && layerCount <= 10) {
    strengths.push(`Clean layer count (${layerCount})`);
    score += 10;
  }

  // ── 4. Brand color compliance ──────────────────────────────────────────
  const brandColorUsage = checkBrandColors(animation);
  if (brandColorUsage > 0) {
    strengths.push(`Uses ${brandColorUsage} brand color reference(s)`);
    score += 15;
  }

  // ── 5. Has animation (not static) ──────────────────────────────────────
  const animatedProperties = countAnimatedProperties(animation);
  if (animatedProperties === 0 && layerCount > 0) {
    warns.push('No animated properties — animation is static');
    score -= 20;
  } else if (animatedProperties >= 2) {
    strengths.push(`${animatedProperties} animated properties`);
    score += 15;
  } else if (animatedProperties === 1) {
    strengths.push('Has animated property');
    score += 5;
  }

  // ── 6. Shape layer usage (Impeccable: animate transforms only) ─────────
  const usesShapeLayers = layers?.some(l => l.ty === 4);
  if (usesShapeLayers) {
    strengths.push('Uses shape layers (transform-based)');
    score += 5;
  }

  // ── 7. Reasonable canvas ────────────────────────────────────────────────
  const w = (animation.w as number) || 0;
  const h = (animation.h as number) || 0;
  if (w > 0 && h > 0 && w <= 2000 && h <= 2000) {
    score += 5;
    if (w === h) strengths.push('Square canvas (versatile)');
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= QUALITY_THRESHOLD,
    validLottie: true,
    issues,
    warns,
    strengths,
  };
}

/**
 * Check if the animation references brand colors in RGBA arrays.
 */
function checkBrandColors(animation: Record<string, unknown>): number {
  const jsonStr = JSON.stringify(animation);
  let matchCount = 0;
  for (const name of Object.keys(BRAND_COLORS) as Array<keyof typeof BRAND_COLORS>) {
    const { r, g, b } = BRAND_COLORS[name];
    if (r === 0 && g === 0 && b === 0) continue; // skip transparent/navy edge
    if (jsonStr.includes(String(r))) matchCount++;
  }
  return matchCount;
}

/**
 * Count properties with a:1 (animated keyframes).
 */
function countAnimatedProperties(animation: Record<string, unknown>): number {
  const jsonStr = JSON.stringify(animation);
  const matches = jsonStr.match(/"a"\s*:\s*1/g);
  return matches?.length || 0;
}

/**
 * Generate a refined prompt incorporating quality gate feedback.
 * Follows proposal-operator iterative refinement pattern.
 */
export function refinePrompt(
  originalPrompt: string,
  report: QualityReport,
  iteration: number,
): string {
  const refinements: string[] = [];

  for (const issue of report.issues) {
    if (issue.includes('No layers')) {
      refinements.push('Include at least 2 visible shape layers.');
    }
  }

  for (const warn of report.warns) {
    if (warn.includes('too short')) {
      refinements.push('Extend the animation to at least 1 second with smooth keyframes.');
    }
    if (warn.includes('static') || warn.includes('No animated')) {
      refinements.push('Add animated keyframes for opacity, position, or scale — make it dynamic, not static.');
    }
    if (warn.includes('too long')) {
      refinements.push('Trim to under 5 seconds, keep it purposeful.');
    }
  }

  // Impeccable motion principles for retries
  if (iteration >= 2) {
    refinements.push(
      'Use only transform-based animation (position, rotation, scale, opacity). ' +
      'Apply easings, not linear timing. Keep shapes minimal and intentional.',
    );
  }

  if (refinements.length === 0) {
    return originalPrompt;
  }

  return [originalPrompt, '', 'Quality feedback — fix these:', ...refinements.map((r, i) => `${i + 1}. ${r}`)].join('\n');
}
