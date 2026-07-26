import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Page } from 'puppeteer-core';

export interface RenderProbeResult {
  svgPresent: boolean;
  svgChildCount: number;
  totalFrames: number;
  sampledFrames: number[];
  paintedPixels: number[];
  changedPixelsFromPrevious: number[];
  paintedSampleCount: number;
  meaningfulMotionSampleCount: number;
  maxPaintedPixels: number;
  loopSeamChangedPixels: number;
}

const RENDER_READY_TIMEOUT_MS = 10_000;

export function findChromium(): string {
  const candidates = chromiumCandidates();
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  for (const binary of ['chromium', 'chromium-browser', 'google-chrome', 'chrome', 'msedge']) {
    try {
      const resolver = process.platform === 'win32' ? 'where.exe' : 'which';
      const resolved = execFileSync(resolver, [binary], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).split(/\r?\n/).find(Boolean);
      if (resolved && fs.existsSync(resolved)) return resolved;
    } catch {
      // Continue through the small, explicit browser list.
    }
  }

  throw new Error(`No Chrome or Chromium found. Tried: ${candidates.join(', ')} — set CHROMIUM_BIN`);
}

function chromiumCandidates(): string[] {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];

  return [
    process.env.CHROMIUM_BIN,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    localAppData ? path.join(localAppData, 'Google/Chrome/Application/chrome.exe') : undefined,
    localAppData ? path.join(localAppData, 'Chromium/Application/chrome.exe') : undefined,
    programFiles ? path.join(programFiles, 'Google/Chrome/Application/chrome.exe') : undefined,
    programFiles ? path.join(programFiles, 'Microsoft/Edge/Application/msedge.exe') : undefined,
    programFilesX86 ? path.join(programFilesX86, 'Google/Chrome/Application/chrome.exe') : undefined,
    programFilesX86 ? path.join(programFilesX86, 'Microsoft/Edge/Application/msedge.exe') : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
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
  return page.evaluate(async ({ data, renderReadyTimeoutMs }) => {
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
      const timeout = setTimeout(
        () => reject(new Error(`DOMLoaded timeout (${renderReadyTimeoutMs / 1000}s)`)),
        renderReadyTimeoutMs,
      );
      anim.addEventListener('DOMLoaded', () => {
        clearTimeout(timeout);
        resolve();
      });
      anim.addEventListener('data_failed', () => {
        clearTimeout(timeout);
        reject(new Error('lottie data_failed'));
      });
    });

    const svg = document.querySelector<SVGSVGElement>('#anim svg');
    const totalFrames = anim.totalFrames as number;
    const sampledFrames = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.99]
      .map((fraction) => Math.floor(fraction * (totalFrames - 1)));
    const paintedPixels: number[] = [];
    const changedPixelsFromPrevious: number[] = [];
    let firstPixels: Uint8ClampedArray | null = null;
    let previousPixels: Uint8ClampedArray | null = null;
    let loopSeamChangedPixels = 0;

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
        let changed = 0;
        if (previousPixels) {
          for (let offset = 0; offset < pixels.length; offset += 4) {
            const difference = Math.max(
              Math.abs(pixels[offset] - previousPixels[offset]),
              Math.abs(pixels[offset + 1] - previousPixels[offset + 1]),
              Math.abs(pixels[offset + 2] - previousPixels[offset + 2]),
              Math.abs(pixels[offset + 3] - previousPixels[offset + 3]),
            );
            if (difference > 12) changed++;
          }
        }
        if (!firstPixels) firstPixels = new Uint8ClampedArray(pixels);
        previousPixels = new Uint8ClampedArray(pixels);
        changedPixelsFromPrevious.push(changed);
        paintedPixels.push(painted);
      }

      if (firstPixels && previousPixels) {
        for (let offset = 0; offset < firstPixels.length; offset += 4) {
          const difference = Math.max(
            Math.abs(firstPixels[offset] - previousPixels[offset]),
            Math.abs(firstPixels[offset + 1] - previousPixels[offset + 1]),
            Math.abs(firstPixels[offset + 2] - previousPixels[offset + 2]),
            Math.abs(firstPixels[offset + 3] - previousPixels[offset + 3]),
          );
          if (difference > 12) loopSeamChangedPixels++;
        }
      }
    }

    return {
      svgPresent: Boolean(svg),
      svgChildCount: svg ? svg.querySelectorAll('path, rect, ellipse, circle, g').length : 0,
      totalFrames,
      sampledFrames,
      paintedPixels,
      changedPixelsFromPrevious,
      paintedSampleCount: paintedPixels.filter((count) => count > 0).length,
      meaningfulMotionSampleCount: changedPixelsFromPrevious.filter((count) => count > 8).length,
      maxPaintedPixels: paintedPixels.length > 0 ? Math.max(...paintedPixels) : 0,
      loopSeamChangedPixels,
    };
  }, {
    data: animationData,
    renderReadyTimeoutMs: RENDER_READY_TIMEOUT_MS,
  });
}
