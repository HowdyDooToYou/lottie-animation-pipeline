#!/usr/bin/env tsx
import fs from 'node:fs';

import {
  FEW_SHOT_EXAMPLES,
  buildVariantPlan,
  generateWithQualityGate,
  renderShowcaseHtml,
  summarizeAnimationPreview,
  type ShowcaseVariant,
} from '../src/generator/index.ts';

const theme = process.argv[2] || 'Revenue dashboard motion system';
const limitArg = Number(process.argv[3] || 4);
const outputPath = process.argv[4] || `${process.cwd()}/lottie-variant-showcase.html`;
const limit = Number.isFinite(limitArg) && limitArg > 0 ? Math.min(limitArg, 4) : 4;

function fallbackAnimationFor(slug: string): { path: string; provider: string; model: string } | null {
  const finalDir = `${process.cwd()}/public/animations/final`;
  fs.mkdirSync(finalDir, { recursive: true });

  if (slug === 'indicator-bars') {
    const orbitBarsPath = `${finalDir}/orbit-bars.json`;
    if (fs.existsSync(orbitBarsPath)) {
      return { path: orbitBarsPath, provider: 'fallback-existing-asset', model: 'orbit-bars' };
    }
  }

  if (slug === 'pulse-ring') {
    const pulsePath = `${finalDir}/pulse-ring-fallback.json`;
    fs.writeFileSync(pulsePath, JSON.stringify(FEW_SHOT_EXAMPLES.pulsingCircle.animation, null, 2));
    return { path: pulsePath, provider: 'fallback-built-in-example', model: 'pulsingCircle' };
  }

  if (slug === 'loading-dots' || slug === 'metric-rise') {
    const barsPath = `${finalDir}/${slug}-fallback.json`;
    fs.writeFileSync(barsPath, JSON.stringify(FEW_SHOT_EXAMPLES.waveformBars.animation, null, 2));
    return { path: barsPath, provider: 'fallback-built-in-example', model: 'waveformBars' };
  }

  return null;
}

(async () => {
  const plan = buildVariantPlan(theme).slice(0, limit);
  const variants: ShowcaseVariant[] = [];

  console.log(`\n🎬 Generating Lottie showcase for theme: ${theme}`);
  console.log(`Variants: ${plan.map((item) => item.slug).join(', ')}`);

  for (const item of plan) {
    let finalPath = '';
    let provider = 'unknown';
    let model = 'unknown';
    let score = 0;
    let passed = false;

    try {
      const result = await generateWithQualityGate({
        name: item.slug,
        prompt: item.prompt,
        preset: item.preset,
      });
      finalPath = result.path;
      provider = result.provider;
      model = result.model;
      score = result.score;
      passed = result.passed;
    } catch (err) {
      console.warn(`⚠️ ${item.slug} generation failed: ${(err as Error).message}`);
      const fallback = fallbackAnimationFor(item.slug);
      if (!fallback) throw err;
      finalPath = fallback.path;
      provider = fallback.provider;
      model = fallback.model;
      score = 70;
      passed = false;
      console.warn(`↳ using fallback asset for ${item.slug}: ${finalPath}`);
    }

    const raw = fs.readFileSync(finalPath, 'utf8');
    const animation = JSON.parse(raw) as Record<string, unknown>;
    const preview = summarizeAnimationPreview(animation);

    variants.push({
      slug: item.slug,
      label: item.label,
      preset: item.preset,
      prompt: item.prompt,
      outputPath: finalPath,
      score,
      passed,
      provider,
      model,
      metrics: {
        durationSeconds: preview.durationSeconds,
        frameCount: preview.frameCount,
        layerCount: preview.layerCount,
        animatedPropertyCount: preview.animatedPropertyCount,
        brandColors: preview.brandColors,
      },
    });
  }

  const html = renderShowcaseHtml(`${theme} — Lottie Variant Showcase`, variants);
  fs.writeFileSync(outputPath, html);

  console.log(`\n✅ Showcase written to ${outputPath}`);
  for (const variant of variants) {
    console.log(`- ${variant.slug}: ${variant.score}/100 via ${variant.provider}`);
  }
})().catch((err) => {
  console.error('❌ Showcase generation failed:', err);
  process.exit(1);
});
