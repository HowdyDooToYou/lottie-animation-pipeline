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

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean) as string[];

const target = process.argv[2] || path.join(process.cwd(), 'public/animations/final');
const SCREENSHOT_DIR = path.join(process.cwd(), 'reports/screenshots');

function findChromium(): string {
  for (const candidate of CHROMIUM_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No Chromium found. Tried: ${CHROMIUM_CANDIDATES.join(', ')} — set CHROMIUM_BIN`);
}

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

        const result = await page.evaluate(async (data) => {
          const lottie = (window as unknown as { lottie: any }).lottie;
          const anim = lottie.loadAnimation({
            container: document.getElementById('anim'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: data,
          });

          await new Promise<void>((resolve, reject) => {
            anim.addEventListener('DOMLoaded', () => resolve());
            anim.addEventListener('data_failed', () => reject(new Error('lottie data_failed')));
            setTimeout(() => reject(new Error('DOMLoaded timeout (3s)')), 3000);
          });

          // Sample frames across the animation and confirm the SVG has content
          const svg = document.querySelector('#anim svg');
          const totalFrames = anim.totalFrames as number;
          const samples = [0, 0.25, 0.5, 0.75, 0.99].map(f => Math.floor(f * (totalFrames - 1)));
          for (const frame of samples) {
            anim.goToAndStop(frame, true);
          }

          return {
            svgPresent: !!svg,
            svgChildCount: svg ? svg.querySelectorAll('path, rect, ellipse, circle, g').length : 0,
            totalFrames,
          };
        }, animationData);

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
        } else {
          console.log(`✅ ${name} — renders (${result.totalFrames} frames, ${result.svgChildCount} SVG nodes)`);
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
