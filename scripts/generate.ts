#!/usr/bin/env tsx
/**
 * Generate a staged Lottie animation via the AI pipeline.
 *
 * Usage:
 *   tsx scripts/generate.ts <name> "<prompt>" [preset]
 *   npm run gen -- slide "slide transition" premium
 *
 * Output goes to public/animations/staging/<name>-current.json
 * Previous iterations are archived with timestamps in the same folder.
 * Use `npm run promote <name>` to move to final/
 */

import fs from 'fs';
import path from 'path';
import { generateToFile } from '../src/generator/client.ts';

const name = process.argv[2];
const prompt = process.argv[3];
const preset = process.argv[4] as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined;

if (!name || !prompt) {
  console.log('Usage: tsx scripts/generate.ts <name> "<prompt>" [preset]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run gen -- pulse "pulsing circle in brand blue"');
  console.log('  npm run gen -- slide "slide transition" premium');
  console.log('  npm run gen -- success "checkmark animation" energetic');
  console.log('');
  console.log('Presets: premium | energetic | subtle | technical');
  console.log('');
  console.log('After confirming the animation, promote it:');
  console.log('  npm run promote <name>');
  process.exit(1);
}

const stagingDir = path.join(process.cwd(), 'public/animations/staging');
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

const currentFile = path.join(stagingDir, `${name}-current.json`);

// Archive previous current version if it exists
if (fs.existsSync(currentFile)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archiveFile = path.join(stagingDir, `${name}-${timestamp}.json`);
  fs.renameSync(currentFile, archiveFile);
  console.log(`📦 Archived previous version: ${name}-${timestamp}.json`);
}

// Generate new version to staging
await generateToFile(prompt, `staging/${name}-current.json`, preset);

console.log(`\n🔄 Iterate: npm run gen -- ${name} "new prompt" [preset]`);
console.log(`📤 When ready: npm run promote ${name}`);
