#!/usr/bin/env tsx
/**
 * CLI entry point for quality-gated Lottie generation.
 * Thin wrapper: parse args → call generateWithQualityGate → report.
 */

import { generateWithQualityGate } from '../src/generator/index.ts';

const name = process.argv[2];
const prompt = process.argv[3];
const preset = process.argv[4] as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined;

if (!name || !prompt) {
  console.log(`
Usage: tsx scripts/generate.ts <name> "<prompt>" [preset]

Quality-gated generation:
  - Generates from prompt (local Ollama → OpenRouter fallback)
  - Runs quality gate each iteration (valid JSON + brand + motion + animation)
  - Auto-promotes to final/<name>.json when score >= 60
  - Up to 3 iterations with refined prompts
  - Saves best result even if never reaches threshold

Presets: premium | energetic | subtle | technical

Examples:
  tsx scripts/generate.ts hero "sliding indicator bars" premium
  tsx scripts/generate.ts pulse "pulsing circle in blue"
  tsx scripts/generate.ts transition "smooth page slide" technical
`);
  process.exit(1);
}

(async () => {
  const result = await generateWithQualityGate({
    name,
    prompt,
    preset,
  });

  console.log('\n' + '─'.repeat(50));
  console.log(`Result: ${result.passed ? '✅ PASSED' : '⚠️ SAVED (best effort)'}`);
  console.log(`Score: ${result.score}/100`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Output: ${result.path}`);
  console.log(`Provider: ${result.provider} (${result.model})`);
  if (result.strengths.length) {
    console.log(`Strengths: ${result.strengths.join(', ')}`);
  }
  if (result.issues.length) {
    console.log(`Issues: ${result.issues.join(', ')}`);
  }
})().catch((err) => {
  console.error('❌', (err as Error).message);
  process.exit(1);
});
