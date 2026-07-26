#!/usr/bin/env tsx

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { findChromium } from '../src/generator/render-validation.ts';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs/assets');
const GIF_PATH = path.join(OUTPUT_DIR, 'production-motion-showcase.gif');
const POSTER_PATH = path.join(OUTPUT_DIR, 'production-motion-showcase.png');
const WIDTH = 960;
const HEIGHT = 540;
const FPS = 12;
const DURATION_SECONDS = 3;
const FRAME_COUNT = FPS * DURATION_SECONDS;

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function runFfmpeg(args: string[]): void {
  const result = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (result.error?.message.includes('ENOENT')) {
    throw new Error('ffmpeg is required to render the README showcase');
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'ffmpeg failed');
  }
}

async function main(): Promise<void> {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lottie-readme-'));
  const palettePath = path.join(framesDir, 'palette.png');
  const desktop = readJson('public/animations/final/attribution-flow-01.json');
  const mobile = readJson('public/animations/final/attribution-flow-mobile-01.json');
  const lottieLibrary = fs.readFileSync(
    path.join(ROOT, 'node_modules/lottie-web/build/player/lottie_svg.min.js'),
    'utf8',
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.setContent(`
      <style>
        * { box-sizing: border-box; }
        html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
        body {
          background: #091226;
          color: #eef4ff;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        main {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: 16px;
          width: 100%;
          height: 100%;
          padding: 24px 28px 20px;
        }
        header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 32px;
        }
        .eyebrow {
          margin: 0 0 5px;
          color: #79aef8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          max-width: 660px;
          font-size: 26px;
          font-weight: 650;
          letter-spacing: -.025em;
          line-height: 1.08;
        }
        .proof {
          margin: 0 0 2px;
          color: #aab9d2;
          font-size: 12px;
          white-space: nowrap;
        }
        section {
          display: grid;
          grid-template-columns: minmax(0, 3fr) minmax(190px, 1fr);
          gap: 16px;
          min-height: 0;
        }
        figure {
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          min-width: 0;
          min-height: 0;
          margin: 0;
          overflow: hidden;
          background: #0d1933;
          border: 1px solid #24385d;
          border-radius: 16px;
        }
        .stage {
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        .stage svg { display: block; width: 100% !important; height: 100% !important; }
        figcaption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 34px;
          padding: 8px 12px;
          color: #c3cee0;
          border-top: 1px solid #24385d;
          font-size: 11px;
          letter-spacing: .02em;
        }
        figcaption span { color: #6fdcb5; font-weight: 700; }
        footer {
          display: flex;
          gap: 20px;
          color: #8495b2;
          font-size: 10px;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
      </style>
      <main>
        <header>
          <div>
            <p class="eyebrow">Production motion system</p>
            <h1>Evidence becomes an attributable outcome.</h1>
          </div>
          <p class="proof">Real assets · deterministic render</p>
        </header>
        <section>
          <figure>
            <div class="stage" id="desktop"></div>
            <figcaption>Desktop · horizontal topology <span>100 / 100</span></figcaption>
          </figure>
          <figure>
            <div class="stage" id="mobile"></div>
            <figcaption>Mobile · recomposed <span>100 / 100</span></figcaption>
          </figure>
        </section>
        <footer>
          <span>Responsive by composition</span>
          <span>Reduced-motion contract</span>
          <span>Chromium validated</span>
        </footer>
      </main>
    `);
    await page.addScriptTag({ content: lottieLibrary });

    await page.evaluate(
      async ({ desktopData, mobileData }) => {
        const lottie = (window as unknown as { lottie: any }).lottie;
        const animations = [
          lottie.loadAnimation({
            container: document.querySelector('#desktop'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: desktopData,
          }),
          lottie.loadAnimation({
            container: document.querySelector('#mobile'),
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: mobileData,
          }),
        ];

        await Promise.all(animations.map((animation) => new Promise<void>((resolve) => {
          animation.addEventListener('DOMLoaded', resolve);
        })));
        (window as unknown as { showcaseAnimations: any[] }).showcaseAnimations = animations;
      },
      { desktopData: desktop, mobileData: mobile },
    );

    for (let index = 0; index < FRAME_COUNT; index++) {
      await page.evaluate(
        ({ frameIndex, frameCount }) => {
          const animations = (window as unknown as { showcaseAnimations: any[] }).showcaseAnimations;
          for (const animation of animations) {
            animation.goToAndStop((frameIndex / frameCount) * animation.totalFrames, true);
          }
          return new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        },
        { frameIndex: index, frameCount: FRAME_COUNT },
      );

      const framePath = path.join(framesDir, `frame-${String(index).padStart(3, '0')}.png`);
      await page.screenshot({ path: framePath as `${string}.png` });
    }

    fs.copyFileSync(
      path.join(framesDir, `frame-${String(Math.floor(FRAME_COUNT * 0.52)).padStart(3, '0')}.png`),
      POSTER_PATH,
    );

    runFfmpeg([
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(framesDir, 'frame-%03d.png'),
      '-vf', 'palettegen=max_colors=96:stats_mode=diff',
      palettePath,
    ]);
    runFfmpeg([
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(framesDir, 'frame-%03d.png'),
      '-i', palettePath,
      '-lavfi', '[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      '-loop', '0',
      GIF_PATH,
    ]);

    const megabytes = fs.statSync(GIF_PATH).size / 1024 / 1024;
    console.log(`✅ README showcase: ${path.relative(ROOT, GIF_PATH)} (${megabytes.toFixed(2)} MB)`);
    console.log(`✅ README poster: ${path.relative(ROOT, POSTER_PATH)}`);
  } finally {
    await browser.close();
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error('❌', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
