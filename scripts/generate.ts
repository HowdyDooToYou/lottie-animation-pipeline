#!/usr/bin/env tsx
/**
 * Generate a Lottie animation via the AI pipeline.
 * Usage:
 *   tsx scripts/generate.ts "pulsing circle in brand blue" [output.json] [preset]
 *   npm run generate -- "slide transition" my-slide.json premium
 */

import { generateToFile } from '../src/generator/client.ts';

const prompt = process.argv[2];
const filename = process.argv[3] || 'generated.json';
const preset = process.argv[4] as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined;

if (!prompt) {
  console.log('Usage: tsx scripts/generate.ts "<description>" [output.json] [preset]');
  console.log('');
  console.log('Presets: premium | energetic | subtle | technical');
  console.log('');
  console.log('Examples:');
  console.log('  tsx scripts/generate.ts "pulsing circle in brand blue"');
  console.log('  tsx scripts/generate.ts "slide transition" slide.json premium');
  console.log('  tsx scripts/generate.ts "checkmark success animation" success.json energetic');
  process.exit(1);
}

// Ensure output dir exists
import fs from 'fs';
import path from 'path';
const animDir = path.join(process.cwd(), 'public/animations');
if (!fs.existsSync(animDir)) fs.mkdirSync(animDir, { recursive: true });

console.log('🎬 MoreProof Lottie Generator');
console.log('═'.repeat(40));
console.log(`Prompt: ${prompt}`);
console.log(`Preset: ${preset || 'premium'}`);
console.log(`Output: public/animations/${filename}`);
console.log('');

generateToFile(prompt, filename, preset).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
