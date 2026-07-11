#!/usr/bin/env tsx
/**
 * Validate Lottie JSON files in a directory (recursive).
 * Strict zod validation is the bar; auto-fixable files are flagged so they
 * can be regenerated or repaired deliberately.
 *
 * Usage: npm run validate [-- directory]
 * Exits 1 if any file fails validation (agent/CI friendly).
 */

import fs from 'fs';
import path from 'path';
import { validateOrFix } from '../src/generator/schema.ts';

// Production validation intentionally targets only the supported export set.
// Rejected legacy JSON remains under public/animations/rejected for provenance.
const dir: string = process.argv[2] || './public/animations/final';

function walk(d: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}

try {
  const files = walk(dir);
  if (files.length === 0) {
    console.log('No .json files found in', dir);
    process.exit(0);
  }

  let strict = 0;
  let fixable = 0;
  let invalid = 0;

  for (const filePath of files) {
    const rel = path.relative(dir, filePath);
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const { result, fixed, issues } = validateOrFix(raw);

      if (result && !fixed) {
        console.log(`✅ ${rel} — strictly valid`);
        strict++;
      } else if (result && fixed) {
        console.log(`⚠️  ${rel} — auto-fixable, but not strictly valid:`);
        for (const issue of issues.slice(0, 3)) console.log(`     · ${issue}`);
        fixable++;
      } else {
        console.log(`❌ ${rel} — invalid:`);
        for (const issue of issues.slice(0, 3)) console.log(`     · ${issue}`);
        invalid++;
      }
    } catch (e) {
      console.log(`❌ ${rel} — parse error: ${(e as Error).message}`);
      invalid++;
    }
  }

  console.log(`\n${strict} strict, ${fixable} auto-fixable, ${invalid} invalid out of ${files.length} files`);
  process.exit(invalid > 0 ? 1 : 0);
} catch (e) {
  console.error('Error:', (e as Error).message);
  process.exit(1);
}
