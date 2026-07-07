/**
 * Quality-gated generation orchestration with bounded retry/backoff.
 * Follows the proposal-operator pattern: generate → gate → refine → retry → promote.
 *
 * Auto-promotes to final/ when quality gate passes.
 * Keeps best result even if never reaches threshold.
 * Uses RetryOrchestrator for bounded autonomous progression.
 */

import fs from 'fs';
import path from 'path';
import { generateLottie } from './client.ts';
import { qualityGate, refinePrompt, QUALITY_THRESHOLD, MAX_ITERATIONS, type QualityReport } from './quality-gate.ts';
import { RetryOrchestrator, type RetryPolicy, type GenerationResult } from './retry-orchestrator.ts';

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
  retryPolicy?: { totalAttempts: number; bestScore: number; currentProvider: string; transientCount: number };
  transientFailures?: number;
  providerEscalation?: string[];
}

export interface GenerateOptions {
  name: string;
  prompt: string;
  preset?: 'premium' | 'energetic' | 'subtle' | 'technical';
  outputDir?: string;
  maxIterations?: number;
  qualityThreshold?: number;
  retryPolicy?: Partial<RetryPolicy>;
  onIteration?: (iteration: number, score: number, passed: boolean, report: QualityReport, result?: GenerationResult) => void;
}

/**
 * Run quality-gated generation loop with bounded retry/backoff.
 */
export async function generateWithQualityGate(opts: GenerateOptions): Promise<QualityGatedResult> {
  const {
    name,
    prompt,
    preset,
    outputDir = path.join(process.cwd(), 'public/animations/final'),
    maxIterations = MAX_ITERATIONS,
    qualityThreshold = QUALITY_THRESHOLD,
    retryPolicy,
    onIteration,
  } = opts;

  // Ensure output dir exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const orchestrator = new RetryOrchestrator(retryPolicy);
  let currentPrompt = prompt;
  let iteration = 0;
  let bestResult: GenerationResult | null = null;
  let bestScore = 0;
  let bestReport: QualityReport | null = null;
  const providerEscalations: string[] = [];

  console.log(`\n🎬 Quality-gated generation: "${name}"`);
  console.log(`   Threshold: ${qualityThreshold}/100 | Max iterations: ${maxIterations}`);
  console.log(`   Prompt: "${prompt}"`);
  console.log(`   Preset: ${preset || 'premium'}`);

  while (orchestrator.shouldContinue()) {
    iteration++;
    const currentProvider = orchestrator.nextProvider();

    if (!currentProvider) {
      console.log('⚠️  All providers exhausted');
      break;
    }

    console.log(`\n── Iteration ${iteration}/${maxIterations} ──`);
    console.log(`   Provider: ${currentProvider}`);

    // Generate
    const result = await generateLottie(currentPrompt, preset);

    // Handle transient failures with backoff
    if (!result.success || !result.animation) {
      console.log(`⚠️  Generation failed (${result.error}), checking for backoff...`);

      orchestrator.recordProviderAttempt(currentProvider, { success: false, error: result.error ?? 'unknown' });

      if (orchestrator.shouldEscalate()) {
        console.log(`   ⚡ Transient failure threshold reached, escalating to next provider`);
        orchestrator.advanceProvider();
        providerEscalations.push(currentProvider);
        continue;
      }

      // Apply backoff before retry
      console.log(`   ⏳ Waiting ${orchestrator.lastBackoff()}ms before retry...`);
      await orchestrator.wait();

      // Retry with same provider
      const retryResult = await generateLottie(currentPrompt, preset);
      if (retryResult.success && retryResult.animation) {
        // Successfully retried
        const report = qualityGate(retryResult.animation);
        console.log(`   ✅ Retry succeeded, score: ${report.score}/100`);
        orchestrator.recordAttempt({ score: report.score, provider: currentProvider, model: retryResult.model ?? 'unknown', iteration, timestamp: Date.now() });

        if (report.score > bestScore) {
          bestScore = report.score;
          bestResult = retryResult;
          bestReport = report;
        }

        if (report.passed) {
          const finalPath = path.join(outputDir, `${name}.json`);
          fs.writeFileSync(finalPath, JSON.stringify(retryResult.animation, null, 2));
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
            provider: currentProvider,
            model: retryResult.model ?? 'unknown',
            retryPolicy: orchestrator.stats(),
            providerEscalation: providerEscalations.length > 0 ? providerEscalations : undefined,
          };
        }

        // Refine prompt for next iteration
        currentPrompt = refinePrompt(currentPrompt, report, iteration);
        continue;
      }

      // Retry also failed
      orchestrator.advanceProvider();
      providerEscalations.push(currentProvider);
      continue;
    }

    // Quality gate
    const report = qualityGate(result.animation!);
    console.log(`   Score: ${report.score}/100 | ${report.passed ? '✅ PASS' : '❌ FAIL'}`);
    if (report.strengths.length) console.log(`   + ${report.strengths.join(', ')}`);
    if (report.warns.length) console.log(`   ~ ${report.warns.join(', ')}`);
    if (report.issues.length) console.log(`   ✗ ${report.issues.join(', ')}`);

    // Record attempt
    orchestrator.recordAttempt({ score: report.score, provider: currentProvider, model: result.model ?? 'unknown', iteration, timestamp: Date.now() });

    // Track best
    if (report.score > bestScore) {
      bestScore = report.score;
      bestResult = result;
      bestReport = report;
    }

    // Notify caller
    onIteration?.(iteration, report.score, report.passed, report, result);

    // Auto-promote if passed
    if (report.passed) {
      const finalPath = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(finalPath, JSON.stringify(result.animation!, null, 2));
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
        provider: currentProvider,
        model: result.model ?? 'unknown',
        retryPolicy: orchestrator.stats(),
        providerEscalation: providerEscalations.length > 0 ? providerEscalations : undefined,
      };
    }

    // Refine prompt for next iteration
    currentPrompt = refinePrompt(currentPrompt, report, iteration);
    console.log(`   Refined prompt for next iteration`);
  }

  // Max iterations hit — save best result
  console.log(`\n⚠️  Reached max iterations (${iteration}), saving best result (score: ${bestScore}/100)`);

  if (bestResult?.animation && bestReport) {
    const finalPath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(finalPath, JSON.stringify(bestResult.animation, null, 2));
    console.log(`📦 Saved best result → ${finalPath}`);

    return {
      name,
      path: finalPath,
      score: bestReport.score,
      passed: false,
      iterations: iteration,
      strengths: bestReport.strengths,
      warns: bestReport.warns,
      issues: bestReport.issues,
      provider: bestResult.provider ?? 'unknown',
      model: bestResult.model ?? 'unknown',
      retryPolicy: orchestrator.stats(),
      providerEscalation: providerEscalations.length > 0 ? providerEscalations : undefined,
    };
  }

  throw new Error('No valid animation produced across all iterations');
}