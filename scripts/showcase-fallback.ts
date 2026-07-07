#!/usr/bin/env tsx
import fs from 'node:fs';

import { FEW_SHOT_EXAMPLES, renderShowcaseHtml, summarizeAnimationPreview, type ShowcaseVariant } from '../src/generator/index.ts';

const outputPath = process.argv[2] || '/home/tempest/lottie-variant-showcase.html';
const orbitBarsPath = `${process.cwd()}/public/animations/final/orbit-bars.json`;
const finalDir = `${process.cwd()}/public/animations/final`;
fs.mkdirSync(finalDir, { recursive: true });

const pulsePath = `${finalDir}/pulse-ring-fallback.json`;
const metricPath = `${finalDir}/metric-rise-fallback.json`;
fs.writeFileSync(pulsePath, JSON.stringify(FEW_SHOT_EXAMPLES.pulsingCircle.animation, null, 2));
fs.writeFileSync(metricPath, JSON.stringify(FEW_SHOT_EXAMPLES.waveformBars.animation, null, 2));

const assets = [
  {
    slug: 'indicator-bars',
    label: 'Indicator Bars',
    preset: 'technical',
    prompt: 'Revenue dashboard motion system. Stacked indicator bars with staggered slide timing and a dashboard feel.',
    path: orbitBarsPath,
    provider: 'actual-local-run',
    model: 'qwen2.5:7b',
    score: 100,
    passed: true,
  },
  {
    slug: 'pulse-ring',
    label: 'Pulse Ring',
    preset: 'premium',
    prompt: 'Revenue dashboard motion system. Centered pulse ring with smooth breathing scale changes.',
    path: pulsePath,
    provider: 'built-in-fallback',
    model: 'pulsingCircle example',
    score: 74,
    passed: false,
  },
  {
    slug: 'metric-rise',
    label: 'Metric Rise',
    preset: 'technical',
    prompt: 'Revenue dashboard motion system. Compact chart-like rise with segments climbing upward.',
    path: metricPath,
    provider: 'built-in-fallback',
    model: 'waveformBars example',
    score: 78,
    passed: false,
  },
];

const variants: ShowcaseVariant[] = assets.map((asset) => {
  const animation = JSON.parse(fs.readFileSync(asset.path, 'utf8')) as Record<string, unknown>;
  const preview = summarizeAnimationPreview(animation);
  return {
    slug: asset.slug,
    label: asset.label,
    preset: asset.preset,
    prompt: asset.prompt,
    outputPath: asset.path,
    score: asset.score,
    passed: asset.passed,
    provider: asset.provider,
    model: asset.model,
    metrics: {
      durationSeconds: preview.durationSeconds,
      frameCount: preview.frameCount,
      layerCount: preview.layerCount,
      animatedPropertyCount: preview.animatedPropertyCount,
      brandColors: preview.brandColors,
    },
  };
});

const html = renderShowcaseHtml('Revenue dashboard motion system — Lottie Variant Showcase', variants);
fs.writeFileSync(outputPath, html);
console.log(`Wrote ${outputPath}`);
