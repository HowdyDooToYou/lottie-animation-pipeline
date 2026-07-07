import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReviewCardData } from './review-card.ts';

const animation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 90,
  w: 512,
  h: 512,
  layers: [
    {
      ty: 4,
      nm: 'pulse ring',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 1, k: [{ t: 0, s: [256, 256, 0] }, { t: 90, s: [256, 256, 0] }] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [80, 80, 100] }, { t: 90, s: [120, 120, 100] }] },
      },
      ip: 0,
      op: 90,
      st: 0,
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [160, 160] } },
        { ty: 'fl', c: { a: 0, k: [1, 0.76, 0.25, 1] }, o: { a: 0, k: 100 } },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    },
  ],
};

test('buildReviewCardData returns readable labels for generated animations', () => {
  const card = buildReviewCardData({
    name: 'pulse-ring',
    path: 'generated',
    data: animation,
    generation: {
      provider: 'ollama-fast(qwen2.5:7b)',
      model: 'qwen2.5:7b',
      score: 92,
      passed: true,
      iterations: 1,
    },
  });

  assert.equal(card.title, 'pulse-ring');
  assert.equal(card.sourceLabel, 'Generated in app');
  assert.equal(card.metrics.duration, '1.50s');
  assert.equal(card.metrics.frames, '90');
  assert.equal(card.metrics.canvas, '512×512');
  assert.equal(card.metrics.motion, '2 animated props');
  assert.deepEqual(card.badges, ['passed', 'shape-layers', 'gold']);
  if (!card.generation) throw new Error('expected generation metadata');
  assert.equal(card.generation.provider, 'ollama-fast(qwen2.5:7b)');
});

test('buildReviewCardData handles imported files without generation metadata', () => {
  const card = buildReviewCardData({
    name: 'imported-asset',
    path: 'file:orbit-bars.json',
    data: animation,
  });

  assert.equal(card.sourceLabel, 'Imported file');
  assert.equal(card.generation, null);
});
