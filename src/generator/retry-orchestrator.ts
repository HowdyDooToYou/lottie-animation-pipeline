export type FailureType = 'transient' | 'schema' | 'quality' | 'terminal';

export interface RetryPolicy {
  maxProviderRetries: number;   // retries per provider before moving on
  maxTotalAttempts: number;     // hard cap on all attempts
  backoffBaseMs: number;      // initial backoff delay
  backoffMaxMs: number;       // maximum backoff delay
  noImprovementCeiling: number; // stop if no improvement after N attempts
}

export interface AttemptRecord {
  score: number;
  provider: string;
  model: string;
  iteration: number;
  timestamp: number;
}

export interface GenerationResult {
  success: boolean;
  animation?: Record<string, unknown>;
  error?: string;
  provider?: string;
  model?: string;
}

export class RetryOrchestrator {
  private policy: Required<RetryPolicy>;
  private attempts: AttemptRecord[] = [];
  private providerAttempts: Map<string, number> = new Map();
  private currentProviderIndex = 0;
  private providers: string[];
  private transientFailureCount = 0;
  private lastBackoffMs = 0;

  constructor(
    policy?: Partial<RetryPolicy>,
    providers: string[] = [
      'antigravity-cli',
      'gemini-api',
      'gemini-cli',
      'ollama-fast(qwen2.5:7b)',
      'ollama-smart(gemma3:27b)',
      'openrouter-free',
      'openrouter-cheap',
    ],
  ) {
    this.policy = {
      maxProviderRetries: 3,
      maxTotalAttempts: 10,
      backoffBaseMs: 2000,
      backoffMaxMs: 5000,
      noImprovementCeiling: 3,
      ...policy,
    };
    this.providers = providers;
  }

  /** Classify failure reason into type */
  classifyFailure(error: string): FailureType {
    const lower = error.toLowerCase();
    if (lower.includes('timeout') || lower.includes('500') || lower.includes('network') ||
        lower.includes('econnrefused') || lower.includes('econnreset') || lower.includes('abort')) {
      return 'transient';
    }
    if (lower.includes('schema') || lower.includes('json') || lower.includes('parse')) {
      return 'schema';
    }
    if (lower.includes('score') || lower.includes('threshold') || lower.includes('quality')) {
      return 'quality';
    }
    return 'terminal';
  }

  /** Record a generation attempt */
  recordAttempt(result: AttemptRecord): void {
    this.attempts.push(result);
    this.transientFailureCount = 0; // reset on any real attempt
  }

  /** Record provider attempt (for transient failures) */
  recordProviderAttempt(provider: string, result: { success: boolean; error?: string }): void {
    const count = this.providerAttempts.get(provider) ?? 0;
    this.providerAttempts.set(provider, count + 1);

    if (!result.success) {
      const failureType = this.classifyFailure(result.error ?? '');
      if (failureType === 'transient') {
        this.transientFailureCount++;
      }
    }
  }

  /** Get best result so far */
  bestResult(): AttemptRecord | undefined {
    if (this.attempts.length === 0) return undefined;
    let best = this.attempts[0];
    for (let i = 1; i < this.attempts.length; i++) {
      if (this.attempts[i].score > best.score) best = this.attempts[i];
    }
    return best;
  }

  /** Provider retry count for a given provider */
  providerRetryCount(provider: string): number {
    return this.providerAttempts.get(provider) ?? 0;
  }

  /** Should we continue the generation loop? */
  shouldContinue(): boolean {
    const totalAttempts = this.attempts.length;
    const bestScore = this.bestResult()?.score ?? 0;

    // Check total attempt cap
    if (totalAttempts >= this.policy.maxTotalAttempts) {
      return false;
    }

    // Check no-improvement ceiling
    if (totalAttempts >= this.policy.noImprovementCeiling) {
      const recentScores = this.attempts.slice(-this.policy.noImprovementCeiling);
      const bestRecent = Math.max(...recentScores.map(r => r.score));
      if (bestRecent <= bestScore && recentScores.length >= this.policy.noImprovementCeiling) {
        return false;
      }
    }

    // Check if all providers exhausted
    const currentProviderRetries = this.providerRetryCount(this.providers[this.currentProviderIndex] ?? '');
    if (currentProviderRetries >= this.policy.maxProviderRetries) {
      this.currentProviderIndex++;
      return this.currentProviderIndex < this.providers.length && this.shouldContinue();
    }

    return true;
  }

  /** Get next provider to try */
  nextProvider(): string | null {
    if (this.currentProviderIndex >= this.providers.length) {
      return null;
    }
    return this.providers[this.currentProviderIndex];
  }

  /** Move to next provider */
  advanceProvider(): void {
    this.currentProviderIndex++;
    this.transientFailureCount = 0;
  }

  /** Compute backoff delay with jitter */
  computeBackoffDelay(attempt: number): number {
    const expDelay = Math.min(
      this.policy.backoffBaseMs * Math.pow(2, attempt - 1),
      this.policy.backoffMaxMs,
    );
    // Use crypto.getRandomValues for browser compatibility
    const jitter = Math.floor(Math.random() * Math.floor(expDelay * 0.5));
    const delay = Math.min(expDelay + jitter, this.policy.backoffMaxMs);
    this.lastBackoffMs = delay;
    return delay;
  }

  /** Get last backoff duration */
  lastBackoff(): number {
    return this.lastBackoffMs;
  }

  /** Sleep for backoff period */
  async wait(): Promise<void> {
    const delay = this.computeBackoffDelay(this.transientFailureCount);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /** Check if we should escalate due to transient failures */
  shouldEscalate(): boolean {
    return this.transientFailureCount >= this.policy.maxProviderRetries;
  }

  /** Reset provider retry counter */
  resetProviderRetries(): void {
    this.providerAttempts.clear();
    this.transientFailureCount = 0;
  }

  /** Get summary stats */
  stats(): { totalAttempts: number; bestScore: number; currentProvider: string; transientCount: number } {
    return {
      totalAttempts: this.attempts.length,
      bestScore: this.bestResult()?.score ?? 0,
      currentProvider: this.providers[this.currentProviderIndex] ?? 'none',
      transientCount: this.transientFailureCount,
    };
  }
}