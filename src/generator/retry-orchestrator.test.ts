import test from 'node:test';
import assert from 'node:assert/strict';

import { RetryOrchestrator, type RetryPolicy } from './retry-orchestrator.ts';

test('RetryOrchestrator classifies transient failures correctly', () => {
  const orch = new RetryOrchestrator();

  assert.equal(orch.classifyFailure('timeout after 180s'), 'transient');
  assert.equal(orch.classifyFailure('500 Internal Server Error'), 'transient');
  assert.equal(orch.classifyFailure('network reset by peer'), 'transient');
  assert.equal(orch.classifyFailure('ECONNREFUSED'), 'transient');
  assert.equal(orch.classifyFailure('schema validation failed'), 'schema');
  assert.equal(orch.classifyFailure('invalid Lottie JSON'), 'schema');
  assert.equal(orch.classifyFailure('score 45/100 below threshold'), 'quality');
  assert.equal(orch.classifyFailure('no providers remaining'), 'terminal');
});

test('RetryOrchestrator respects maxProviderRetries', () => {
  const policy: RetryPolicy = { maxProviderRetries: 2, maxTotalAttempts: 10, backoffBaseMs: 10, backoffMaxMs: 50, noImprovementCeiling: 3 };
  const orch = new RetryOrchestrator(policy);

  // Record transient failures for first provider
  orch.recordProviderAttempt('ollama-fast', { success: false, error: 'timeout' });
  orch.recordProviderAttempt('ollama-fast', { success: false, error: 'timeout' });
  orch.recordProviderAttempt('ollama-fast', { success: false, error: 'timeout' });

  // Provider retry count should be 3 (all failed attempts)
  assert.equal(orch.providerRetryCount('ollama-fast'), 3);

  // Should escalate since transientFailureCount >= maxProviderRetries
  assert.equal(orch.shouldEscalate(), true);
});

test('RetryOrchestrator tracks best score correctly', () => {
  const orch = new RetryOrchestrator();

  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 1, timestamp: Date.now() });
  orch.recordAttempt({ score: 52, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 2, timestamp: Date.now() });
  orch.recordAttempt({ score: 38, provider: 'ollama-smart', model: 'gemma3:27b', iteration: 3, timestamp: Date.now() });

  const best = orch.bestResult();
  assert.equal(best?.score, 52);
  assert.equal(best?.provider, 'ollama-fast');
});

test('RetryOrchestrator blocks when no-improvement ceiling hit', () => {
  const policy: RetryPolicy = { maxProviderRetries: 2, maxTotalAttempts: 10, backoffBaseMs: 10, backoffMaxMs: 50, noImprovementCeiling: 3 };
  const orch = new RetryOrchestrator(policy);

  // Record 4 attempts all with same score (no improvement)
  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 1, timestamp: Date.now() });
  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 2, timestamp: Date.now() });
  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 3, timestamp: Date.now() });
  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 4, timestamp: Date.now() });

  assert.equal(orch.shouldContinue(), false);
});

test('RetryOrchestrator computes backoff delay with jitter', () => {
  const policy: RetryPolicy = { maxProviderRetries: 5, maxTotalAttempts: 10, backoffBaseMs: 100, backoffMaxMs: 1000, noImprovementCeiling: 5 };
  const orch = new RetryOrchestrator(policy);

  const delay1 = orch.computeBackoffDelay(1);
  const delay2 = orch.computeBackoffDelay(2);
  const delay3 = orch.computeBackoffDelay(3);

  assert.ok(delay1 >= 100 && delay1 <= 150, `delay1=${delay1}`);
  assert.ok(delay2 >= 200 && delay2 <= 300, `delay2=${delay2}`);
  assert.ok(delay3 >= 400 && delay3 <= 600, `delay3=${delay3}`);
});

test('RetryOrchestrator blocks when total attempts cap reached', () => {
  const policy: RetryPolicy = { maxProviderRetries: 5, maxTotalAttempts: 3, backoffBaseMs: 100, backoffMaxMs: 1000, noImprovementCeiling: 10 };
  const orch = new RetryOrchestrator(policy);

  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 1, timestamp: Date.now() });
  orch.recordAttempt({ score: 48, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 2, timestamp: Date.now() });

  // Should continue with 2 attempts < maxTotalAttempts (3)
  assert.equal(orch.shouldContinue(), true);

  orch.recordAttempt({ score: 50, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 3, timestamp: Date.now() });

  // Should stop with 3 attempts >= maxTotalAttempts (3)
  assert.equal(orch.shouldContinue(), false);
});

test('RetryOrchestrator stats returns correct summary', () => {
  const orch = new RetryOrchestrator({ maxTotalAttempts: 10 });

  orch.recordAttempt({ score: 45, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 1, timestamp: Date.now() });
  orch.recordAttempt({ score: 52, provider: 'ollama-fast', model: 'qwen2.5:7b', iteration: 2, timestamp: Date.now() });

  const stats = orch.stats();
  assert.equal(stats.totalAttempts, 2);
  assert.equal(stats.bestScore, 52);
  assert.equal(stats.currentProvider, 'antigravity-cli');
  assert.equal(stats.transientCount, 0);
});