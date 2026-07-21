import fs from 'node:fs';
import type { Page } from 'puppeteer-core';

const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_BIN,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/usr/bin/google-chrome',
].filter(Boolean) as string[];

export interface RenderProbeResult {
  svgPresent: boolean;
  svgChildCount: number;
  totalFrames: number;
  sampledFrames: number[];
  paintedPixels: number[];
  paintedSampleCount: number;
  maxPaintedPixels: number;
}

export function findChromium(): string {
  for (const candidate of CHROMIUM_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No Chromium found. Tried: ${CHROMIUM_CANDIDATES.join(', ')} — set CHROMIUM_BIN`);
}

/**
 * Render representative frames and rasterize the resulting SVG into a canvas.
 * Counting SVG nodes is insufficient: lottie-web still creates nodes for
 * malformed layers that remain `display:none` and paint no pixels.
 */
export async function probeAnimationRender(
  page: Page,
  animationData: unknown,
): Promise<RenderProbeResult> {
  return page.evaluate(async (data) => {
    const lottie = (window as unknown as { lottie: any }).lottie;
    // Keep one registered animation per page. The caller may use that same
    // instance for a post-probe screenshot before closing the page.
    lottie.destroy();
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

    const svg = document.querySelector<SVGSVGElement>('#anim svg');
    const totalFrames = anim.totalFrames as number;
    const sampledFrames = [0, 0.25, 0.5, 0.75, 0.99]
      .map((fraction) => Math.floor(fraction * (totalFrames - 1)));
    const paintedPixels: number[] = [];

    if (svg) {
      for (const frame of sampledFrames) {
        anim.goToAndStop(frame, true);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

          const clone = svg.cloneNode(true) as SVGSVGElement;
          const width = Math.max(1, Math.round(svg.viewBox.baseVal.width || svg.clientWidth || 400));
          const height = Math.max(1, Math.round(svg.viewBox.baseVal.height || svg.clientHeight || 400));
          clone.setAttribute('width', String(width));
          clone.setAttribute('height', String(height));
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

          const markup = new XMLSerializer().serializeToString(clone);
          const image = new Image();
          image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
          await image.decode();

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('2D canvas unavailable for visibility probe');
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

          const pixels = context.getImageData(0, 0, width, height).data;
          let painted = 0;
          for (let offset = 3; offset < pixels.length; offset += 4) {
            if (pixels[offset] > 8) painted++;
          }
        paintedPixels.push(painted);
      }
    }

    return {
      svgPresent: Boolean(svg),
      svgChildCount: svg ? svg.querySelectorAll('path, rect, ellipse, circle, g').length : 0,
      totalFrames,
      sampledFrames,
      paintedPixels,
      paintedSampleCount: paintedPixels.filter((count) => count > 0).length,
      maxPaintedPixels: paintedPixels.length > 0 ? Math.max(...paintedPixels) : 0,
    };
  }, animationData);
}
