import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

import { findChromium, probeAnimationRender } from './render-validation.ts';

const visibleAnimation = {
  v: '5.7.4', fr: 60, ip: 0, op: 60, w: 200, h: 200,
  layers: [{
    ty: 4, nm: 'Visible circle', st: 0, sr: 1, ip: 0, op: 60,
    ks: {
      a: { a: 0, k: [0, 0] }, p: { a: 0, k: [100, 100] },
      s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 },
    },
    shapes: [{
      ty: 'gr',
      it: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
        { ty: 'fl', c: { a: 0, k: [0.25, 0.84, 0.67, 1] }, o: { a: 0, k: 100 } },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    }],
  }],
};

test('render probe rejects node-filled SVGs that paint no visible pixels', async () => {
  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const lottieLib = fs.readFileSync(
      path.resolve(process.cwd(), 'node_modules/lottie-web/build/player/lottie_svg.min.js'),
      'utf-8',
    );
    const page = await browser.newPage();
    await page.setContent('<div id="anim" style="width:200px;height:200px"></div>');
    await page.addScriptTag({ content: lottieLib });

    const visible = await probeAnimationRender(page, visibleAnimation);
    assert.ok(visible.svgChildCount > 0);
    assert.ok(visible.maxPaintedPixels > 0);
    assert.equal(visible.paintedSampleCount, visible.sampledFrames.length);

    const missingStartTime = structuredClone(visibleAnimation);
    delete (missingStartTime.layers[0] as { st?: number }).st;
    const blank = await probeAnimationRender(page, missingStartTime);
    assert.ok(blank.svgChildCount > 0, 'regression fixture should still create misleading SVG nodes');
    assert.equal(blank.paintedSampleCount, 0);
    assert.equal(blank.maxPaintedPixels, 0, 'visually blank output must paint no pixels');

    await page.close();
  } finally {
    await browser.close();
  }
});
