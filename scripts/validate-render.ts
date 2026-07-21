#!/usr/bin/env tsx
/**
 * Headless render validation: loads each animation with lottie-web in
 * Chromium and verifies it actually renders — no runtime errors, non-empty
 * SVG DOM, and frame advancement. Screenshots land in reports/screenshots/.
 *
 * Usage:
 *   npm run validate:render                 # all of public/animations/final
 *   npm run validate:render -- <dir-or-file.json>
 *
 * Chromium path autodetected; override with CHROMIUM_BIN.
 */

import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { findChromium, probeAnimationRender } from '../src/generator/render-validation.ts';

const target = process.argv[2] || path.join(process.cwd(), 'public/animations/final');
const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/screenshots');

function collectFiles(p: string): string[] {
  if (p.endsWith('.json')) return [p];
  return fs.readdirSync(p)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(p, f));
}

(async () => {
  const files = collectFiles(target);
  if (files.length === 0) {
    console.log('No .json files found at', target);
    process.exit(0);
  }

  const lottieLib = fs.readFileSync(
    path.join(process.cwd(), 'node_modules/lottie-web/build/player/lottie_svg.min.js'),
    'utf-8',
  );

  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const executablePath = findChromium();
  console.log(`🖥️  Chromium: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  let passed = 0;
  let failed = 0;

  try {
    for (const file of files) {
      const name = path.basename(file, '.json');
      const animationData = JSON.parse(fs.readFileSync(file, 'utf-8'));

      const page = await browser.newPage();
      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push((err as Error).message));

      try {
        await page.setContent(
          '<div id="anim" style="width:400px;height:400px;background:#0d1117"></div>',
        );
        await page.addScriptTag({ content: lottieLib });

        const result = await probeAnimationRender(page, animationData);

        // Screenshot at mid-animation for manual review
        await page.evaluate(() => {
          const lottie = (window as unknown as { lottie: any }).lottie;
          const anim = lottie.getRegisteredAnimations()[0];
          anim.goToAndStop(Math.floor(anim.totalFrames / 2), true);
        });
        const el = await page.$('#anim');
        await el?.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`) as `${string}.png` });

        if (pageErrors.length > 0) {
          console.log(`❌ ${name} — runtime errors: ${pageErrors.slice(0, 2).join(' | ')}`);
          failed++;
        } else if (!result.svgPresent || result.svgChildCount === 0) {
          console.log(`❌ ${name} — rendered empty SVG`);
          failed++;
        } else if (result.maxPaintedPixels === 0) {
          console.log(
            `❌ ${name} — SVG nodes exist but sampled frames paint zero visible pixels ` +
            `(frames: ${result.sampledFrames.join(', ')})`,
          );
          failed++;
        } else if (result.paintedSampleCount < 2) {
          console.log(
            `❌ ${name} — visible content appears in only ${result.paintedSampleCount}/` +
            `${result.sampledFrames.length} sampled frames (painted px: ${result.paintedPixels.join(', ')})`,
          );
          failed++;
        } else {
          console.log(
            `✅ ${name} — renders (${result.totalFrames} frames, ${result.svgChildCount} SVG nodes, ` +
            `${result.maxPaintedPixels} max painted px)`,
          );
          passed++;
        }
      } catch (err) {
        console.log(`❌ ${name} — ${(err as Error).message}`);
        failed++;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${passed} render, ${failed} fail out of ${files.length}. Screenshots: ${path.relative(process.cwd(), SCREENSHOT_DIR)}/`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('❌', (err as Error).message);
  process.exit(1);
});
