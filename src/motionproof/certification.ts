import { qualityGate, type QualityReport } from '../generator/quality-gate.ts';
import { validateLottie } from '../generator/schema.ts';
import type { RenderProbeResult } from '../generator/render-validation.ts';

import {
  MOTIONPROOF_CERTIFICATION,
  MOTIONPROOF_SCHEMA_VERSION,
  type MotionProofCertification,
  type MotionProofCheck,
  type MotionProofIssue,
} from './contracts.ts';

const MAX_JSON_BYTES = 500_000;
const MIN_MEANINGFUL_MOTION_SAMPLES = 3;

export interface CandidateInspection {
  quality: QualityReport;
  jsonBytes: number;
}

export function inspectCandidate(animation: Record<string, unknown>): CandidateInspection {
  assertPortableCandidate(animation);
  validateLottie(animation);
  return {
    quality: qualityGate(animation),
    jsonBytes: Buffer.byteLength(JSON.stringify(animation)),
  };
}

function assertPortableCandidate(animation: Record<string, unknown>): void {
  const violations: string[] = [];
  visit(animation, [], (value, path) => {
    if (typeof value.x === 'string' && value.x.trim()) {
      violations.push(`${formatPath(path)}.x (executable expression)`);
    }
    if (value.xt === true || value.xt === 1) {
      violations.push(`${formatPath(path)}.xt (expression composition)`);
    }
    if (typeof value.fPath === 'string' && value.fPath.trim()) {
      violations.push(`${formatPath(path)}.fPath (external font path)`);
    }
    if (
      typeof value.ty === 'number'
      && isRecord(value.ks)
      && typeof value.ip === 'number'
      && typeof value.op === 'number'
      && (value.ty === 2 || value.ty === 6)
    ) {
      violations.push(
        `${formatPath(path)} (unsupported ${value.ty === 2 ? 'image' : 'audio'} layer)`,
      );
    }
  });

  if (Array.isArray(animation.assets)) {
    animation.assets.forEach((asset, index) => {
      if (!isRecord(asset)) return;
      if (
        (typeof asset.p === 'string' && asset.p.trim())
        || (typeof asset.u === 'string' && asset.u.trim())
      ) {
        violations.push(`assets[${index}] (external or embedded media asset)`);
      }
    });
  }

  if (violations.length > 0) {
    throw new Error(
      'MotionProof accepts portable, expression-free vector Lottie only. '
      + `Rejected: ${violations.slice(0, 6).join(', ')}`,
    );
  }
}

export function certifyCandidate(
  inspection: CandidateInspection,
  probe: RenderProbeResult,
  posterBytes: number,
): { certification?: MotionProofCertification; issues: MotionProofIssue[] } {
  const checks: MotionProofCheck[] = [
    {
      id: 'schema',
      label: 'Strict structure',
      passed: inspection.quality.validLottie,
      detail: inspection.quality.validLottie
        ? 'Strict Lottie schema passed without repair.'
        : 'The candidate is not strict Lottie JSON.',
    },
    {
      id: 'quality',
      label: 'Structural quality',
      passed: inspection.quality.passed,
      detail: `${inspection.quality.structuralScore}/100 structural quality score; ${inspection.quality.score}/100 displayed score includes advisory motion evidence.`,
    },
    {
      id: 'visibility',
      label: 'Visible rendering',
      passed: probe.svgPresent
        && probe.svgChildCount > 0
        && probe.paintedSampleCount === probe.sampledFrames.length,
      detail: `${probe.paintedSampleCount}/${probe.sampledFrames.length} representative frames paint visible pixels.`,
    },
    {
      id: 'motion',
      label: 'Meaningful motion',
      passed: probe.meaningfulMotionSampleCount >= MIN_MEANINGFUL_MOTION_SAMPLES,
      detail: `${probe.meaningfulMotionSampleCount} sampled transitions contain meaningful pixel change.`,
    },
    {
      id: 'complexity',
      label: 'Delivery budget',
      passed: inspection.jsonBytes <= MAX_JSON_BYTES,
      detail: `${formatBytes(inspection.jsonBytes)} animation payload; ${formatBytes(MAX_JSON_BYTES)} maximum.`,
    },
    {
      id: 'poster',
      label: 'Reduced-motion poster',
      passed: posterBytes > 0,
      detail: posterBytes > 0
        ? `${formatBytes(posterBytes)} PNG poster captured from the certified render.`
        : 'No poster was captured.',
    },
  ];

  const issues: MotionProofIssue[] = checks
    .filter((check) => !check.passed)
    .map((check) => ({
      code: `certification.${check.id}`,
      message: check.detail,
      stage: check.id === 'schema'
        ? 'schema'
        : check.id === 'quality' || check.id === 'complexity'
          ? 'quality'
          : 'render',
      retryable: check.id !== 'poster',
    }));

  if (issues.length > 0) return { issues };

  return {
    issues: [],
    certification: {
      name: MOTIONPROOF_CERTIFICATION,
      certified: true,
      schemaVersion: MOTIONPROOF_SCHEMA_VERSION,
      score: Math.min(100, Math.round((
        inspection.quality.score
        + renderScore(probe)
        + 100
      ) / 3)),
      checks,
      quality: {
        structuralScore: inspection.quality.structuralScore,
        score: inspection.quality.score,
        strengths: inspection.quality.strengths,
        warnings: [...inspection.quality.warns, ...inspection.quality.motion.warnings],
        motion: inspection.quality.motion,
      },
      render: {
        sampledFrames: probe.sampledFrames,
        paintedPixels: probe.paintedPixels,
        changedPixelsFromPrevious: probe.changedPixelsFromPrevious,
        meaningfulMotionSampleCount: probe.meaningfulMotionSampleCount,
      },
    },
  };
}

export function qualityIssues(report: QualityReport): MotionProofIssue[] {
  return [
    ...report.issues.map((message, index) => ({
      code: `quality.issue.${index + 1}`,
      message,
      stage: 'quality' as const,
      retryable: true,
    })),
    ...report.warns.map((message, index) => ({
      code: `quality.warning.${index + 1}`,
      message,
      stage: 'quality' as const,
      retryable: true,
    })),
  ];
}

function renderScore(probe: RenderProbeResult): number {
  const visibleRatio = probe.sampledFrames.length
    ? probe.paintedSampleCount / probe.sampledFrames.length
    : 0;
  const motionRatio = Math.min(1, probe.meaningfulMotionSampleCount / 5);
  return Math.round((visibleRatio * 0.6 + motionRatio * 0.4) * 100);
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  return `${(bytes / 1_000).toFixed(bytes < 10_000 ? 1 : 0)} kB`;
}

function visit(
  value: unknown,
  path: Array<string | number>,
  visitor: (value: Record<string, unknown>, path: Array<string | number>) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => visit(child, [...path, index], visitor));
    return;
  }
  if (!isRecord(value)) return;
  visitor(value, path);
  for (const [key, child] of Object.entries(value)) {
    visit(child, [...path, key], visitor);
  }
}

function formatPath(path: Array<string | number>): string {
  if (path.length === 0) return 'animation';
  return path.reduce<string>((result, part) => (
    typeof part === 'number'
      ? `${result}[${part}]`
      : result ? `${result}.${part}` : part
  ), '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
