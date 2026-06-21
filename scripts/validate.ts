#!/usr/bin/env tsx
/**
 * Validate Lottie JSON files in a directory.
 * Usage: pnpm validate [directory]
 */

import fs from 'fs';
import path from 'path';
import { isLottieJson, autoFixLottie } from '../src/generator/index.ts';

const dir: string = process.argv[2] || './public/animations';

try {
  const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No .json files found in', dir);
    process.exit(0);
  }

  let valid = 0;
  let invalid = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (isLottieJson(raw)) {
        console.log(`✅ ${file} — valid Lottie JSON`);
        valid++;
      } else {
        // Try auto-fix
        const fixed = autoFixLottie(raw as Record<string, unknown>);
        if (isLottieJson(fixed)) {
          console.log(`⚠️  ${file} — needed auto-fix, now valid`);
          valid++;
        } else {
          console.log(`❌ ${file} — invalid Lottie JSON`);
          invalid++;
        }
      }
    } catch (e) {
      console.log(`❌ ${file} — parse error: ${(e as Error).message}`);
      invalid++;
    }
  }

  console.log(`\n${valid} valid, ${invalid} invalid out of ${files.length} files`);
} catch (e) {
  console.error('Error:', (e as Error).message);
  process.exit(1);
}
