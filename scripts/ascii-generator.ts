#!/usr/bin/env tsx
import fs from 'node:fs';

import { renderAsciiAnimation, clearFrame, setPixel, type AsciiAnimation } from '../src/generator/ascii-renderer.ts';

interface AsciiGeneratorOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  animationType: 'bounce' | 'pulse' | 'wave' | 'fade';
}

function generateBounceAnimation(opts: AsciiGeneratorOptions): AsciiAnimation {
  const frames: { width: number; height: number; content: string }[] = [];
  const frameCount = opts.fps * opts.duration;

  for (let i = 0; i < frameCount; i++) {
    const frame = clearFrame(opts.width, opts.height);
    const cosVal = Math.cos((i / frameCount) * Math.PI);
    const y = Math.floor((opts.height - 1) * (1 - cosVal / 2));
    const modified = setPixel(frame, Math.floor(opts.width / 2), y, '●');
    frames.push(modified);
  }

  return { frames, fps: opts.fps, loop: true, name: 'bounce' };
}

function generatePulseAnimation(opts: AsciiGeneratorOptions): AsciiAnimation {
  const frames: { width: number; height: number; content: string }[] = [];
  const frameCount = opts.fps * opts.duration;

  for (let i = 0; i < frameCount; i++) {
    const frame = clearFrame(opts.width, opts.height);
    const scale = 0.5 + 0.5 * Math.sin((i / frameCount) * Math.PI * 2);
    const size = Math.floor(Math.min(opts.width, opts.height) * scale);
    const offset = Math.floor((opts.width - size) / 2);

    for (let y = offset; y < offset + size; y++) {
      for (let x = offset; x < offset + size; x++) {
        setPixel(frame, x, y, '◆');
      }
    }

    frames.push(frame);
  }

  return { frames, fps: opts.fps, loop: true, name: 'pulse' };
}

function generateWaveAnimation(opts: AsciiGeneratorOptions): AsciiAnimation {
  const frames: { width: number; height: number; content: string }[] = [];
  const frameCount = opts.fps * opts.duration;

  for (let i = 0; i < frameCount; i++) {
    const frame = clearFrame(opts.width, opts.height);

    for (let x = 0; x < opts.width; x++) {
      const waveVal = (x / opts.width + i / frameCount) * Math.PI * 2;
      const y = Math.floor((opts.height / 2) * (1 + Math.sin(waveVal)));
      setPixel(frame, x, y, '~');
    }

    frames.push(frame);
  }

  return { frames, fps: opts.fps, loop: true, name: 'wave' };
}

function generateFadeAnimation(opts: AsciiGeneratorOptions): AsciiAnimation {
  const frames: { width: number; height: number; content: string }[] = [];
  const frameCount = opts.fps * opts.duration;

  for (let i = 0; i < frameCount; i++) {
    const frame = clearFrame(opts.width, opts.height);
    const opacity = i / frameCount;

    for (let y = 0; y < opts.height; y++) {
      for (let x = 0; x < opts.width; x++) {
        if (Math.random() < opacity) {
          setPixel(frame, x, y, '·');
        }
      }
    }

    frames.push(frame);
  }

  return { frames, fps: opts.fps, loop: true, name: 'fade' };
}

function main() {
  const args = process.argv.slice(2);
  const outputPath = args[0] || 'ascii-animation.txt';

  const opts: AsciiGeneratorOptions = {
    width: 40,
    height: 15,
    fps: 10,
    duration: 3,
    animationType: 'bounce',
  };

  let anim: AsciiAnimation;

  switch (opts.animationType) {
    case 'bounce':
      anim = generateBounceAnimation(opts);
      break;
    case 'pulse':
      anim = generatePulseAnimation(opts);
      break;
    case 'wave':
      anim = generateWaveAnimation(opts);
      break;
    case 'fade':
      anim = generateFadeAnimation(opts);
      break;
    default:
      anim = generateBounceAnimation(opts);
  }

  const output = renderAsciiAnimation(anim);
  fs.writeFileSync(outputPath, output);
  console.log(`Generated ASCII animation: ${outputPath}`);
}

main();