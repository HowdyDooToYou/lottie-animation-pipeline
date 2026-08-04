import test from 'node:test';
import assert from 'node:assert/strict';

import { qualityGate, summarizeAnimationPreview } from './quality-gate.ts';

const validAnimation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 60,
  w: 512,
  h: 512,
  layers: [
    {
      ty: 4,
      nm: 'blue dot',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [120, 256, 0] }, { t: 60, s: [392, 256, 0] }] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ip: 0,
      op: 60,
      st: 0,
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [80, 80] },
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.25, 0.56, 0.96, 1] },
          o: { a: 0, k: 100 },
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
    },
  ],
};

const malformedAnimation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 26,
  w: 100,
  h: 30,
  layers: [
    {
      ty: 'gr',
      ks: {
        a: 1,
        k: [{ t: 0, s: [0.5] }, { t: 8, s: [1] }],
      },
      ip: 0,
      op: 26,
      sr: 1,
      layers: [
        {
          ty: 'sh',
          ks: {
            a: 1,
            k: [{ t: 0, s: [0] }, { t: 8, e: [100] }],
          },
          ip: 0,
          op: 26,
          shapes: [{ ty: 'fl', c: [0.25, 0.56, 0.96, 1], o: 100 }],
          p: [47, 13],
          s: [12, 1],
        },
      ],
    },
  ],
};

test('quality gate rejects malformed lottie structures that only look lottie-like', () => {
  const report = qualityGate(malformedAnimation as Record<string, unknown>);

  assert.equal(report.passed, false);
  assert.equal(report.validLottie, false);
  assert.ok(report.issues.some((issue) => issue.includes('Schema validation failed')));
});

test('quality gate records advisory motion-quality evidence without lowering the structural promotion floor', () => {
  const report = qualityGate(validAnimation as Record<string, unknown>);

  assert.equal(report.passed, true);
  assert.equal(report.motion.policy, 'soft-report-v1');
  assert.ok(report.motion.score < 100);
  assert.ok(report.motion.warnings.some((warning) => warning.includes('linear')));
  assert.ok(report.structuralScore >= 85);
  assert.equal(report.score, Math.round(report.structuralScore * 0.7 + report.motion.score * 0.3));
});

test('summarizeAnimationPreview returns useful review metadata for valid lottie', () => {
  const summary = summarizeAnimationPreview(validAnimation as Record<string, unknown>);

  assert.equal(summary.validLottie, true);
  assert.equal(summary.durationSeconds, 1);
  assert.equal(summary.frameCount, 60);
  assert.equal(summary.layerCount, 1);
  assert.equal(summary.hasShapeLayers, true);
  assert.equal(summary.animatedPropertyCount, 1);
  assert.deepEqual(summary.brandColors, ['electricBlue']);
});
