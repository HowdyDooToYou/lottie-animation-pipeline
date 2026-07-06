import test from 'node:test';
import assert from 'node:assert/strict';

import { renderShowcaseHtml } from './showcase.ts';

const variants = [
  {
    slug: 'indicator-bars',
    label: 'Indicator Bars',
    preset: 'technical',
    prompt: 'stacked indicator bars for revenue dashboard health',
    outputPath: '/tmp/indicator-bars.json',
    score: 94,
    passed: true,
    provider: 'ollama-fast(qwen2.5:7b)',
    model: 'qwen2.5:7b',
    metrics: { durationSeconds: 1.5, frameCount: 90, layerCount: 3, animatedPropertyCount: 4, brandColors: ['electricBlue', 'gold'] },
  },
  {
    slug: 'pulse-ring',
    label: 'Pulse Ring',
    preset: 'premium',
    prompt: 'pulse ring for revenue dashboard health',
    outputPath: '/tmp/pulse-ring.json',
    score: 88,
    passed: true,
    provider: 'ollama-fast(qwen2.5:7b)',
    model: 'qwen2.5:7b',
    metrics: { durationSeconds: 1.2, frameCount: 72, layerCount: 2, animatedPropertyCount: 3, brandColors: ['gold'] },
  },
];

test('renderShowcaseHtml includes variant cards and summary stats', () => {
  const html = renderShowcaseHtml('Revenue Dashboard Motion', variants);

  assert.match(html, /Revenue Dashboard Motion/);
  assert.match(html, /Indicator Bars/);
  assert.match(html, /Pulse Ring/);
  assert.match(html, /ollama-fast/);
  assert.match(html, /2 variants/);
  assert.match(html, /indicator-bars/);
});
