/**
 * Quality gate for generated Lottie animations.
 * Checks structural validity + brand compliance + motion design principles.
 * Follows the proposal-operator pattern: run gate, iterate if fails, promote when passing.
 */

import { BRAND_COLORS } from '../brand/design-tokens.ts';
import {
  evaluateMotionQuality,
  type MotionQualityReport,
} from '../motionproof/motion-knowledge/index.ts';
import { isLottieJson, validateLottie, validateOrFix } from './schema.ts';

export interface QualityReport {
  /** Combined structural (70%) and advisory motion (30%) score. */
  score: number;
  /** The established structural promotion floor remains mandatory in v1. */
  structuralScore: number;
  motion: MotionQualityReport;
  passed: boolean;
  validLottie: boolean;
  issues: string[];
  warns: string[];
  strengths: string[];
}

export interface AnimationPreviewSummary {
  validLottie: boolean;
  durationSeconds: number;
  frameCount: number;
  layerCount: number;
  hasShapeLayers: boolean;
  animatedPropertyCount: number;
  brandColors: string[];
}

// Impeccable motion design thresholds
const MIN_FRAMES = 15;                     // Too short = broken feeling
const MAX_FRAMES = 600;                    // Too long = bloated
export const QUALITY_THRESHOLD = 85;       // Production promotion floor
export const MAX_ITERATIONS = 3;

/**
 * Run quality gate on a Lottie JSON.
 */
export function qualityGate(animation: Record<string, unknown>): QualityReport {
  const motion = evaluateMotionQuality(animation);
  const issues: string[] = [];
  const warns: string[] = [];
  const strengths: string[] = [];
  let score = 50; // structural baseline

  // ── 1. Structural validity ─────────────────────────────────────────────
  // Try strict first, then auto-fix if it fails. validateOrFix returns a
  // non-null result even when only the auto-fixed copy parsed — strict
  // failure is signaled by fixed !== null.
  const { result: parsedResult, fixed, issues: fixIssues } = validateOrFix(animation);
  const strictParsed = fixed === null ? parsedResult : null;

  if (fixIssues.length > 0) {
    issues.push(...fixIssues.slice(0, 5)); // Top 5 issues
  }

  if (!strictParsed) {
    // Strict validation is the promotion bar. Auto-fix may rescue a renderable
    // repair (callers can still save it as best-effort), but a structure that
    // needed repair never passes the gate.
    return {
      score: fixed ? 10 : 0,
      structuralScore: fixed ? 10 : 0,
      motion,
      passed: false,
      validLottie: false,
      issues: [
        `Schema validation failed: ${issues[0] ?? 'unknown structural error'}`,
        ...issues.slice(1),
        ...(fixed ? [] : ['Could not produce renderable Lottie JSON']),
      ],
      warns: fixed
        ? [...warns, 'Auto-fix produced a renderable repair, but strict validity is required to promote']
        : warns,
      strengths: [],
    };
  }

  const parsed = strictParsed;
  score += 15;

  const layers = parsed.layers as Record<string, unknown>[];
  const fr = parsed.fr || 60;
  const op = parsed.op || 0;
  const ip = parsed.ip || 0;
  const preview = summarizeAnimationPreview(parsed as unknown as Record<string, unknown>);

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
  const layerCount = layers.length;
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
  const brandColorUsage = preview.brandColors.length;
  if (brandColorUsage > 0) {
    strengths.push(`Uses ${brandColorUsage} brand color reference(s)`);
    score += 15;
  } else {
    warns.push('No recognized brand colors found');
  }

  // ── 5. Has animation (not static) ──────────────────────────────────────
  const animatedProperties = preview.animatedPropertyCount;
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
  if (preview.hasShapeLayers) {
    strengths.push('Uses shape layers (transform-based)');
    score += 5;
  } else {
    warns.push('No shape layers found');
    score -= 10;
  }

  // ── 7. Reasonable canvas ────────────────────────────────────────────────
  const w = parsed.w || 0;
  const h = parsed.h || 0;
  if (w > 0 && h > 0 && w <= 2000 && h <= 2000) {
    score += 5;
    if (w === h) strengths.push('Square canvas (versatile)');
  }

  // Motion quality is reported and contributes to the displayed score. The
  // long-standing structural threshold is still the promotion boundary while
  // we tune motion heuristics against real production candidates.
  const structuralScore = Math.max(0, Math.min(100, score));
  const combinedScore = Math.round(structuralScore * 0.7 + motion.score * 0.3);

  return {
    score: combinedScore,
    structuralScore,
    motion,
    passed: structuralScore >= QUALITY_THRESHOLD,
    validLottie: true,
    issues,
    warns,
    strengths,
  };
}

/**
 * Check if the animation references brand colors in RGBA arrays.
 */
function checkBrandColors(animation: Record<string, unknown>): string[] {
  const discovered = new Set<string>();

  visit(animation, (value) => {
    if (!Array.isArray(value) || value.length < 3) return;
    const [r, g, b] = value;
    if (![r, g, b].every((n) => typeof n === 'number')) return;

    for (const name of Object.keys(BRAND_COLORS) as Array<keyof typeof BRAND_COLORS>) {
      const color = BRAND_COLORS[name];
      if (name === 'transparent') continue;
      if (Math.abs(r - color.r) <= 0.02 && Math.abs(g - color.g) <= 0.02 && Math.abs(b - color.b) <= 0.02) {
        discovered.add(name);
      }
    }
  });

  return [...discovered];
}

/**
 * Count properties with a:1 (animated keyframes).
 */
function countAnimatedProperties(animation: Record<string, unknown>): number {
  let count = 0;

  visit(animation, (value) => {
    if (value && typeof value === 'object' && 'a' in value && (value as { a?: unknown }).a === 1) {
      count += 1;
    }
  });

  return count;
}

function visit(value: unknown, fn: (value: unknown) => void): void {
  fn(value);

  if (Array.isArray(value)) {
    for (const item of value) visit(item, fn);
    return;
  }

  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      visit(child, fn);
    }
  }
}

export function summarizeAnimationPreview(animation: Record<string, unknown>): AnimationPreviewSummary {
  if (!isLottieJson(animation)) {
    return {
      validLottie: false,
      durationSeconds: 0,
      frameCount: 0,
      layerCount: 0,
      hasShapeLayers: false,
      animatedPropertyCount: 0,
      brandColors: [],
    };
  }

  try {
    const parsed = validateLottie(animation);
    const frameCount = parsed.op - parsed.ip;

    return {
      validLottie: true,
      durationSeconds: Number((frameCount / parsed.fr).toFixed(2)),
      frameCount,
      layerCount: parsed.layers.length,
      hasShapeLayers: parsed.layers.some((layer) => layer.ty === 4),
      animatedPropertyCount: countAnimatedProperties(parsed as unknown as Record<string, unknown>),
      brandColors: checkBrandColors(parsed as unknown as Record<string, unknown>),
    };
  } catch {
    return {
      validLottie: false,
      durationSeconds: 0,
      frameCount: 0,
      layerCount: 0,
      hasShapeLayers: false,
      animatedPropertyCount: 0,
      brandColors: [],
    };
  }
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
    if (issue.includes('Schema validation failed')) {
      refinements.push('Return strict Bodymovin/Lottie JSON only with numeric layer ty values, st: 0, sr: 1, and valid ks transform objects on every layer.');
    }
    if (issue.includes('missing its tr')) {
      refinements.push("Every shape group (ty: 'gr') must include a transform item (ty: 'tr' with p, a, s, r, o) as the last element of its it array.");
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
    if (warn.includes('No shape layers')) {
      refinements.push('Use proper shape layers (ty: 4) with shapes[] content, not pseudo-layer groups.');
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
