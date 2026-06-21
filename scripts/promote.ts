#!/usr/bin/env tsx
/**
 * Promote a staged animation to final/ production.
 *
 * Usage:
 *   tsx scripts/promote.ts <name>
 *   npm run promote slide
 *
 * Moves public/animations/staging/<name>-current.json → public/animations/final/<name>.json
 */

import fs from 'fs';
import path from 'path';

const name = process.argv[2]?.replace(/\.json$/, '');

if (!name) {
  console.log('Usage: tsx scripts/promote.ts <name>');
  console.log('Example: npm run promote slide');
  process.exit(1);
}

const stagingFile = path.join(process.cwd(), 'public/animations/staging', `${name}-current.json`);
const finalDir = path.join(process.cwd(), 'public/animations/final');
const finalFile = path.join(finalDir, `${name}.json`);

if (!fs.existsSync(stagingFile)) {
  console.error(`❌ Staging file not found: ${stagingFile}`);
  console.log('Generate it first: npm run gen --', name, '"<prompt>"');
  process.exit(1);
}

if (!fs.existsSync(finalDir)) {
  fs.mkdirSync(finalDir, { recursive: true });
}

fs.copyFileSync(stagingFile, finalFile);
console.log(`✅ Promoted: staging/${name}-current.json → final/${name}.json`);
