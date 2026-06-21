/**
 * Lottie generation client with multi-provider fallback.
 * Cost hierarchy: Local Ollama (free) → OpenRouter free tier → OpenRouter cheap paid
 */

import { buildSystemPrompt } from './system-prompt.ts';
import { isLottieJson, autoFixLottie, validateLottie } from './schema.ts';

// Dynamic imports for Node.js-only operations (used in CLI scripts)
const getNodeFs = async () => {
  const fs = await import('fs');
  const path = await import('path');
  return { fs, path };
};

// ── Provider configs ─────────────────────────────────────────────────────

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://127.0.0.1:21434/v1';
const OLLAMA_FAST_MODEL = process.env.OLLAMA_FAST_MODEL || 'qwen2.5:7b';      // Fast, schema-following
const OLLAMA_SMART_MODEL = process.env.OLLAMA_SMART_MODEL || 'gemma3:27b';    // Slower but better quality

const OPENROUTER_KEY = (() => {
  // Pull from Linux keyring first
  try {
    const { execSync } = require('child_process');
    const key = execSync('secret-tool lookup service openrouter', { encoding: 'utf-8' }).trim();
    if (key) return key;
  } catch {
    // secret-tool not available or key not set
  }
  // Fallback to env var
  return process.env.OPENROUTER_API_KEY || '';
})();
const OPENROUTER_FREE_MODEL = 'qwen/qwen3-coder:free'; // Or: 'openrouter/free'
const OPENROUTER_CHEAP_MODEL = 'deepseek/deepseek-chat-v3-0324:free'; // Cheap fallback

// ── Types ────────────────────────────────────────────────────────────────

interface GenerationResult {
  success: boolean;
  animation?: Record<string, unknown>;
  error?: string;
  provider?: string;
  model?: string;
  tokens?: { prompt: number; completion: number };
}
interface ProviderConfig {
  name: string;
  generate: (systemPrompt: string, userPrompt: string) => Promise<string | null>;
}

// ── Provider: Local Ollama ───────────────────────────────────────────────

async function generateOllama(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(180_000), // 3min timeout for local inference
    });

    if (!res.ok) {
      console.error(`Ollama [${model}] error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error(`Ollama [${model}] unavailable:`, (err as Error).message);
    return null;
  }
}

// ── Provider: OpenRouter ─────────────────────────────────────────────────

async function generateOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string | null> {
  if (!OPENROUTER_KEY) {
    console.log('OpenRouter key not set, skipping');
    return null;
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Lottie Animation Pipeline',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      console.error(`OpenRouter error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('OpenRouter error:', (err as Error).message);
    return null;
  }
}

// ── Extraction & Validation ──────────────────────────────────────────────

function extractJson(response: string): Record<string, unknown> | null {
  // Strip markdown fences
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');

  // Try parsing the whole thing
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Main Generation Pipeline ─────────────────────────────────────────────

export async function generateLottie(
  userPrompt: string,
  motionPreset?: 'premium' | 'energetic' | 'subtle' | 'technical',
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt(motionPreset);

  // Provider chain: local first (fast then smart), then cloud fallbacks
  const providers: ProviderConfig[] = [
    {
      name: `ollama-fast(${OLLAMA_FAST_MODEL})`,
      generate: () => generateOllama(systemPrompt, userPrompt, OLLAMA_FAST_MODEL),
    },
    {
      name: `ollama-smart(${OLLAMA_SMART_MODEL})`,
      generate: () => generateOllama(systemPrompt, userPrompt, OLLAMA_SMART_MODEL),
    },
    {
      name: 'openrouter-free',
      generate: () => generateOpenRouter(systemPrompt, userPrompt, OPENROUTER_FREE_MODEL),
    },
    {
      name: 'openrouter-cheap',
      generate: () => generateOpenRouter(systemPrompt, userPrompt, OPENROUTER_CHEAP_MODEL),
    },
  ];

  for (const provider of providers) {
    console.log(`\n[generate] Trying ${provider.name}...`);

    const response = await provider.generate(systemPrompt, userPrompt);
    if (!response) continue;

    console.log(`[generate] Got response from ${provider.name}:`);
    console.log(response.substring(0, 200) + '...\n');

    // Extract JSON
    let raw = extractJson(response);
    if (!raw) {
      console.warn(`[generate] No JSON found in ${provider.name} response`);
      continue;
    }

    // Validate
    const isValid = isLottieJson(raw);
    if (!isValid) {
      console.warn(`[generate] ${provider.name} returned invalid Lottie, attempting auto-fix...`);
      raw = autoFixLottie(raw);
      if (!isLottieJson(raw)) {
        console.warn(`[generate] Auto-fix failed for ${provider.name}`);
        continue;
      }
    }

    // Full validation with zod
    try {
      validateLottie(raw);
    } catch (err) {
      console.warn(`[generate] Zod validation failed for ${provider.name}:`, (err as Error).message);
      // Still return it — it passed basic Lottie structure check
    }

    console.log(`[generate] ✅ Success with ${provider.name}`);
    return {
      success: true,
      animation: raw,
      provider: provider.name,
      model: provider.name.includes('ollama')
        ? (provider.name.includes('fast') ? OLLAMA_FAST_MODEL : OLLAMA_SMART_MODEL)
        : (provider.name.includes('free') ? OPENROUTER_FREE_MODEL : OPENROUTER_CHEAP_MODEL),
    };
  }

  return {
    success: false,
    error: 'All providers failed to generate valid Lottie JSON',
  };
}

// ── CLI Entry Point ──────────────────────────────────────────────────────

export async function generateToFile(
  userPrompt: string,
  filename: string,
  motionPreset?: 'premium' | 'energetic' | 'subtle' | 'technical',
): Promise<void> {
  const result = await generateLottie(userPrompt, motionPreset);

  if (!result.success) {
    console.error('❌ Generation failed:', result.error);
    process.exit(1);
  }

  // @ts-ignore - Dynamic imports for Node.js-only fs operations
  const { fs, path } = await getNodeFs();
  const outputPath = path.join(process.cwd(), 'public/animations', filename);
  // @ts-ignore - Dynamic imports for Node.js-only fs operations
  fs.writeFileSync(outputPath, JSON.stringify(result.animation, null, 2));

  console.log(`\n✅ Saved to ${outputPath}`);
  console.log(`Provider: ${result.provider} (${result.model})`);
  if (result.tokens) {
    console.log(`Tokens: ${result.tokens.prompt} in / ${result.tokens.completion} out`);
  }
}

// ── Direct CLI invocation ────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv[2];
  const filename = process.argv[3] || 'generated.json';
  const preset = process.argv[4] as 'premium' | 'energetic' | 'subtle' | 'technical' | undefined;

  if (!prompt) {
    console.error('Usage: tsx src/generator/client.ts "<prompt>" [filename.json] [preset]');
    process.exit(1);
  }

  generateToFile(prompt, filename, preset).catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
