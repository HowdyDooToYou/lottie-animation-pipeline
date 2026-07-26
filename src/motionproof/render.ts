import { createRequire } from 'node:module';

import puppeteer from 'puppeteer-core';

import {
  findChromium,
  probeAnimationRender,
  type RenderProbeResult,
} from '../generator/render-validation.ts';

export interface MotionProofRenderResult {
  probe: RenderProbeResult;
  poster: Buffer;
  playerSource: string;
}

export interface MotionProofRenderOptions {
  chromiumPath?: string;
  posterFrame: number;
}

const require = createRequire(import.meta.url);

export async function renderMotionProofCandidate(
  animation: Record<string, unknown>,
  options: MotionProofRenderOptions,
): Promise<MotionProofRenderResult> {
  const width = finiteDimension(animation.w, 400);
  const height = finiteDimension(animation.h, 400);
  const executablePath = options.chromiumPath ?? findChromium();
  const playerPath = require.resolve('lottie-web/build/player/lottie_light.min.js');

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: chromiumLaunchArguments(),
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (/^https?:/i.test(request.url())) {
        void request.abort('blockedbyclient');
      } else {
        void request.continue();
      }
    });
    await page.setViewport({
      width: Math.min(width, 2_000),
      height: Math.min(height, 2_000),
      deviceScaleFactor: 1,
    });
    await page.setContent(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
            #anim { width: ${width}px; height: ${height}px; }
            #anim svg { display: block; width: 100%; height: 100%; }
          </style>
        </head>
        <body><div id="anim"></div></body>
      </html>
    `);
    await page.addScriptTag({ path: playerPath });

    const probe = await probeAnimationRender(page, animation);
    const targetFrame = Math.max(
      0,
      Math.min(probe.totalFrames - 1, Math.round((probe.totalFrames - 1) * options.posterFrame)),
    );

    await page.evaluate(async (frame) => {
      const lottie = (window as unknown as { lottie: any }).lottie;
      const animation = lottie.getRegisteredAnimations()[0];
      if (!animation) throw new Error('Certified animation instance disappeared before poster capture');
      animation.goToAndStop(frame, true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }, targetFrame);

    const element = await page.$('#anim');
    if (!element) throw new Error('Poster capture container is missing');
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: true,
    });
    const playerSource = await import('node:fs/promises')
      .then((fs) => fs.readFile(playerPath, 'utf8'));

    return {
      probe,
      poster: Buffer.from(screenshot),
      playerSource,
    };
  } finally {
    await browser.close();
  }
}

function finiteDimension(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : fallback;
}

function chromiumLaunchArguments(): string[] {
  const args = ['--disable-background-networking', '--disable-dev-shm-usage'];
  const runningAsRoot = process.platform !== 'win32'
    && typeof process.getuid === 'function'
    && process.getuid() === 0;

  if (runningAsRoot || process.env.MOTIONPROOF_CHROMIUM_NO_SANDBOX === '1') {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }
  return args;
}
