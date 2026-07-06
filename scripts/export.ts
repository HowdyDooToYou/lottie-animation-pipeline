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

const args = process.argv.slice(2);
const toIndex = args.indexOf('--to');
const target = toIndex >= 0 ? args[toIndex + 1] : null;
const onlyIndex = args.indexOf('--only');
const only = onlyIndex >= 0 ? new Set(args[onlyIndex + 1].split(',')) : null;

if (!target) {
  console.error('Usage: npm run export -- --to <target-dir> [--only id1,id2]');
  process.exit(1);
}

const SOURCE_DIR = path.join(process.cwd(), 'public/animations/final');

const files = fs.readdirSync(SOURCE_DIR)
  .filter(f => f.endsWith('.json'))
  .filter(f => !only || only.has(f.replace(/\.json$/, '')));

if (files.length === 0) {
  console.log('Nothing to export from', SOURCE_DIR);
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });

let exported = 0;
let rejected = 0;
const manifest: Array<{ id: string; file: string; w: number; h: number; frames: number; fr: number }> = [];

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
  manifest.push({
    id: file.replace(/\.json$/, ''),
    file,
    w: result.w,
    h: result.h,
    frames: result.op - result.ip,
    fr: result.fr,
  });
  console.log(`📦 ${file} → ${target}`);
  exported++;
}

fs.writeFileSync(
  path.join(target, 'animations-manifest.json'),
  JSON.stringify({ exported: new Date().toISOString(), animations: manifest }, null, 2),
);

console.log(`\n${exported} exported, ${rejected} rejected (invalid). Manifest: ${path.join(target, 'animations-manifest.json')}`);
process.exit(rejected > 0 ? 1 : 0);
