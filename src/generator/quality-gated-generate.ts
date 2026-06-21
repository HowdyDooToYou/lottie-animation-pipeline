/**
 * Quality-gated generation orchestration.
 * Follows the proposal-operator pattern: generate → gate → refine → retry → promote.
 *
 * Auto-promotes to final/ when quality gate passes.
 * Keeps best result even if never reaches threshold.
 */

import fs from 'fs';
import path from 'path';
import { generateLottie } from './client.ts';
import { qualityGate, refinePrompt, QUALITY_THRESHOLD, MAX_ITERATIONS } from './quality-gate.ts';
import type { QualityReport } from './quality-gate.ts';

export interface QualityGatedResult {
  name: string;
  path: string;
  score: number;
  passed: boolean;
  iterations: number;
  strengths: string[];
  warns: string[];
  issues: string[];
  provider: string;
  model: string;
}

export interface GenerateOptions {
  name: string;
  prompt: string;
  preset?: 'premium' | 'energetic' | 'subtle' | 'technical';
  outputDir?: string;
  maxIterations?: number;
  qualityThreshold?: number;
  onIteration?: (iteration: number, score: number, passed: boolean, report: QualityReport) => void;
}

/**
 * Run quality-gated generation loop.
 */
export async function generateWithQualityGate(opts: GenerateOptions): Promise<QualityGatedResult> {
  const {
    name,
    prompt,
    preset,
    outputDir = path.join(process.cwd(), 'public/animations/final'),
    maxIterations = MAX_ITERATIONS,
    qualityThreshold = QUALITY_THRESHOLD,
    onIteration,
  } = opts;

  // Ensure output dir exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let bestResult: Awaited<ReturnType<typeof generateLottie>> | null = null;
  let bestScore = 0;
  let bestReport: QualityReport | null = null;
  let currentPrompt = prompt;

  console.log(`\n🎬 Quality-gated generation: "${name}"`);
  console.log(`   Threshold: ${qualityThreshold}/100 | Max iterations: ${maxIterations}`);
  console.log(`   Prompt: "${prompt}"`);
  console.log(`   Preset: ${preset || 'premium'}`);

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(`\n── Iteration ${iteration}/${maxIterations} ──`);

    // Generate
    const result = await generateLottie(
      currentPrompt,
      preset,
    );

    if (!result.success || !result.animation) {
      console.log(`⚠️  Generation failed (${result.error}), skipping...`);
      continue;
    }

    // Quality gate
    const report = qualityGate(result.animation);
    console.log(`   Score: ${report.score}/100 | ${report.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (report.strengths.length) console.log(`   + ${report.strengths.join(', ')}`);
    if (report.warns.length) console.log(`   ~ ${report.warns.join(', ')}`);
    if (report.issues.length) console.log(`   ✗ ${report.issues.join(', ')}`);

    // Notify caller
    onIteration?.(iteration, report.score, report.passed, report);

    // Track best
    if (report.score > bestScore) {
      bestScore = report.score;
      bestResult = result;
      bestReport = report;
    }

    // Auto-promote if passed
    if (report.passed) {
      const finalPath = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(finalPath, JSON.stringify(result.animation, null, 2));
      console.log(`\n✅ Auto-promoted → ${finalPath} (score: ${report.score}/100)`);

      return {
        name,
        path: finalPath,
        score: report.score,
        passed: true,
        iterations: iteration,
        strengths: report.strengths,
        warns: report.warns,
        issues: [],
        provider: result.provider || 'unknown',
        model: result.model || 'unknown',
      };
    }

    // Refine prompt for next iteration
    if (iteration < maxIterations) {
      currentPrompt = refinePrompt(currentPrompt, report, iteration);
      console.log(`   Refined prompt for next iteration`);
    }
  }

  // Max iterations hit — save best result
  console.log(`\n⚠️  Reached max iterations (${maxIterations}), saving best result (score: ${bestScore}/100)`);

  if (bestResult?.animation && bestReport) {
    const finalPath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(finalPath, JSON.stringify(bestResult.animation, null, 2));
    console.log(`📦 Saved best result → ${finalPath}`);

    return {
      name,
      path: finalPath,
      score: bestReport.score,
      passed: false,
      iterations: maxIterations,
      strengths: bestReport.strengths,
      warns: bestReport.warns,
      issues: bestReport.issues,
      provider: bestResult.provider || 'unknown',
      model: bestResult.model || 'unknown',
    };
  }

  throw new Error('No valid animation produced across all iterations');
}
