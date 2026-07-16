#!/usr/bin/env tsx
/**
 * Export validated animations to a target project.
 * Only strictly-valid Lottie JSON is copied — the quality gate for consumers.
 *
 * Usage:
 *   npm run export -- --to /path/to/project/public/animations
 *   npm run export -- --to <dir> --only hero-orbit-01,pulse-ring-01
 */

import fs from 'fs';
import path from 'path';
import { validateOrFix } from '../src/generator/schema.ts';
import { selectExportFiles } from '../src/generator/export-plan.ts';

const args = process.argv.slice(2);
const toIndex = args.indexOf('--to');
const target = toIndex >= 0 ? args[toIndex + 1] : null;
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 && args[onlyIndex + 1]
  ? new Set(args[onlyIndex + 1].split(','))
  : null;
const all = args.includes('--all');

if (!target) {
  console.error('Usage: npm run export -- --to <target-dir> [--only id1,id2] [--all]');
  process.exit(1);
}

const SOURCE_DIR = path.join(process.cwd(), 'public/animations/final');
const MANIFEST_PATH = path.join(process.cwd(), 'animations/manifest.json');
const availableFiles = fs.readdirSync(SOURCE_DIR).filter((file) => file.endsWith('.json'));
const releaseManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as {
  animations: Array<{ id: string }>;
};
const files = selectExportFiles(
  availableFiles,
  releaseManifest.animations.map((animation) => animation.id),
  { all, only },
);

if (files.length === 0) {
  console.log('Nothing to export from', SOURCE_DIR);
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });

let exported = 0;
let rejected = 0;
// Normalized width/height/fps match the ascii pipeline's manifest shape so a
// consumer can treat both uniformly; legacy w/h/fr keys are kept for existing
// consumers.
const exportManifest: Array<{
  id: string; file: string;
  width: number; height: number; fps: number; frames: number;
  w: number; h: number; fr: number;
}> = [];

for (const file of files) {
  const src = path.join(SOURCE_DIR, file);
  const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));
  const { result, fixed } = validateOrFix(raw);

  if (!result || fixed) {
    console.log(`⛔ ${file} — not strictly valid, NOT exported`);
    rejected++;
    continue;
  }

  fs.copyFileSync(src, path.join(target, file));
  exportManifest.push({
    id: file.replace(/\.json$/, ''),
    file,
    width: result.w,
    height: result.h,
    fps: result.fr,
    frames: result.op - result.ip,
    w: result.w,
    h: result.h,
    fr: result.fr,
  });
  console.log(`📦 ${file} → ${target}`);
  exported++;
}

fs.writeFileSync(
  path.join(target, 'animations-manifest.json'),
  JSON.stringify({ type: 'lottie', version: 1, exported: new Date().toISOString(), animations: exportManifest }, null, 2),
);

console.log(`\n${exported} exported, ${rejected} rejected (invalid). Manifest: ${path.join(target, 'animations-manifest.json')}`);
process.exit(rejected > 0 ? 1 : 0);
