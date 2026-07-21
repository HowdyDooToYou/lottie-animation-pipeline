import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectExportFiles } from './export-plan.ts';

const finalDir = path.resolve(import.meta.dirname, '../../public/animations/final');
const manifestPath = path.resolve(import.meta.dirname, '../../animations/manifest.json');

const available = fs.readdirSync(finalDir).filter((file) => file.endsWith('.json'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
  animations: Array<{ id: string }>;
};

test('default export releases only manifest-backed assets', () => {
  const files = selectExportFiles(available, manifest.animations.map((animation) => animation.id));

  assert.deepEqual(
    files,
    [
      'hero-orbit-01.json',
      'hero-orbit-card.json',
      'pulse-ring-01.json',
      'indicator-bars-01.json',
      'metric-rise-01.json',
      'spinning-dots-01.json',
      'check-mark-01.json',
      'progress-ring-01.json',
      'waveform-bars-01.json',
      'gradient-flow-01.json',
      'sample-executive-orbit-01.json',
      'sample-signal-convergence-01.json',
      'sample-milestone-bloom-01.json',
    ],
  );
});

test('explicit all export can include every strict-valid library asset', () => {
  assert.deepEqual(selectExportFiles(available, [], { all: true }), available);
});
