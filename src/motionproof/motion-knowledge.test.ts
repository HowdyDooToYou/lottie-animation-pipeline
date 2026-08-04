import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateMotionQuality,
  MOTION_QUALITY_POLICY,
} from './motion-knowledge/index.ts';

interface TestAnimation extends Record<string, unknown> {
  layers: Array<Record<string, unknown>>;
}

function animationWithKeyframes(keyframes: Array<Record<string, unknown>>): TestAnimation {
  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 30,
    w: 160,
    h: 160,
    layers: [{
      ty: 4,
      nm: 'status marker',
      sr: 1,
      ip: 0,
      op: 30,
      st: 0,
      ks: {
        o: { a: 1, k: keyframes },
        p: { a: 0, k: [80, 80, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
        r: { a: 0, k: 0 },
      },
      shapes: [],
    }],
  };
}

test('motion knowledge warns when a state change is opacity-only and linear', () => {
  const report = evaluateMotionQuality(animationWithKeyframes([
    { t: 0, s: [0] },
    { t: 30, s: [100] },
  ]) as Record<string, unknown>);

  assert.equal(report.policy, MOTION_QUALITY_POLICY);
  assert.ok(report.warnings.some((warning) => warning.includes('opacity-only')));
  assert.ok(report.warnings.some((warning) => warning.includes('linear')));
  assert.ok(report.score < 70);
});

test('motion knowledge rewards transform-plus-opacity motion with Lottie easing', () => {
  const animation = animationWithKeyframes([
    { t: 0, s: [0], o: { x: [0.2], y: [0] } },
    { t: 18, s: [100], i: { x: [0], y: [1] } },
  ]);
  const layer = animation.layers[0] as Record<string, unknown>;
  const transforms = layer.ks as Record<string, unknown>;
  transforms.s = {
    a: 1,
    k: [
      { t: 0, s: [92, 92, 100], o: { x: [0.2], y: [0] } },
      { t: 18, s: [100, 100, 100], i: { x: [0], y: [1] } },
    ],
  };

  const report = evaluateMotionQuality(animation as Record<string, unknown>);

  assert.equal(report.passed, true);
  assert.ok(report.score >= 70);
  assert.equal(report.breakdown.easing, 100);
  assert.equal(report.breakdown.propertyCommunication, 100);
});

test('motion knowledge recognizes a bounded stagger for multi-layer choreography', () => {
  const animation = animationWithKeyframes([
    { t: 0, s: [0], o: { x: [0.2], y: [0] } },
    { t: 18, s: [100], i: { x: [0], y: [1] } },
  ]);
  animation.layers = [0, 3, 6].map((start, index) => ({
    ...animation.layers[0],
    nm: `signal ${index + 1}`,
    ks: {
      ...(animation.layers[0].ks as Record<string, unknown>),
      o: {
        a: 1,
        k: [
          { t: start, s: [0], o: { x: [0.2], y: [0] } },
          { t: start + 18, s: [100], i: { x: [0], y: [1] } },
        ],
      },
    },
  }));

  const report = evaluateMotionQuality(animation as Record<string, unknown>);

  assert.equal(report.breakdown.choreography, 100);
  assert.ok(report.strengths.some((strength) => strength.includes('stagger')));
});
