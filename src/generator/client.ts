/**
 * Lottie generation client with multi-provider fallback.
 * Cost hierarchy:
 *   Gemini CLI (Google AI Pro OAuth quota, $0)
 *   → Gemini API (AI Studio key, separate quota bucket, $0 on free tier)
 *   → Local Ollama (free)
 *   → OpenRouter free tier
 *   → OpenRouter cheap paid
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

// :21434 is intentional — NOT a typo for Ollama's standard :11434. On this
// WSL2 host the native ollama is masked; a node bridge on :21434 forwards to
// the Windows-side GPU ollama (see memory: reference_ollama_gpu_routing).
// Override with OLLAMA_BASE on hosts with a standard local install.
const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://127.0.0.1:21434/v1';
const OLLAMA_FAST_MODEL = process.env.OLLAMA_FAST_MODEL || 'qwen2.5:7b';      // Fast, schema-following
const OLLAMA_SMART_MODEL = process.env.OLLAMA_SMART_MODEL || 'gemma3:27b';    // Slower but better quality

const OPENROUTER_KEY = (() => {
  // Env first — the keyring copy can go stale (it 401'd on the ascii pipeline
  // 2026-07-05) and doesn't exist on non-Linux/CI hosts.
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  try {
    const { execSync } = require('child_process');
    const key = execSync('secret-tool lookup service openrouter', { encoding: 'utf-8' }).trim();
    if (key) return key;
  } catch {
    // secret-tool not available or key not set
  }
  return '';
})();
const OPENROUTER_FREE_MODEL = 'qwen/qwen3-coder:free'; // Or: 'openrouter/free'
const OPENROUTER_CHEAP_MODEL = 'deepseek/deepseek-chat-v3-0324:free'; // Cheap fallback

// Antigravity CLI (agy): the official channel for Google AI Pro subscription
// quota since Gemini CLI sunset for Pro/Ultra users (2026-06-18). Headless
// via `agy -p`. Auth: browser OAuth cached in libsecret, or ANTIGRAVITY_API_KEY.
const AGY_BIN = process.env.AGY_BIN
  || `${process.env.HOME || '/home/tempest'}/.local/bin/agy`;
const ANTIGRAVITY_MODEL = process.env.ANTIGRAVITY_MODEL || 'Gemini 3.5 Flash (Medium)';
const AGY_TIMEOUT_MS = Number(process.env.AGY_TIMEOUT_MS) || 180_000;

// Gemini (legacy buckets, kept as fallbacks):
//   1. gemini CLI OAuth — sunset for AI Pro accounts; fails fast if unusable.
//   2. Direct API with an AI Studio key — separate per-model free-tier quota.
const GEMINI_CLI_BIN = process.env.GEMINI_CLI_BIN
  || `${process.env.HOME || '/home/tempest'}/.local/bin/gemini`;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_CLI_TIMEOUT_MS = Number(process.env.GEMINI_CLI_TIMEOUT_MS) || 180_000;
const GEMINI_DISABLED = process.env.LOTTIE_NO_GEMINI === '1';

const GEMINI_API_KEY = (() => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const { execSync } = require('child_process');
    const key = execSync('secret-tool lookup service gemini', { encoding: 'utf-8' }).trim();
    if (key) return key;
  } catch {
    // secret-tool not available or key not set
  }
  return '';
})();

// Anthropic (paid, most capable — last resort in the cost hierarchy)
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

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
  model: string;
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

async function generateAnthropic(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  if (!ANTHROPIC_KEY) {
    console.log('Anthropic key not set (ANTHROPIC_API_KEY), skipping');
    return null;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      console.error(`Anthropic error: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    const data = await res.json() as {
      stop_reason?: string;
      content?: Array<{ type: string; text?: string }>;
    };
    if (data.stop_reason === 'refusal') {
      console.error('Anthropic: request refused, falling through');
      return null;
    }
    return data.content?.find((b) => b.type === 'text')?.text || null;
  } catch (err) {
    console.error('Anthropic error:', (err as Error).message);
    return null;
  }
}

// ── CLI providers (spawn a headless coding-agent CLI) ────────────────────

// Agentic CLIs block forever on interactive auth prompts when their cached
// token is expired. Detect the prompt and bail so the chain can fall back.
const AUTH_PROMPT_RE = /Opening authentication page|Do you want to continue\?|sign.?in|log.?in to|one.?time code|authoriz/i;

async function runCliProvider(
  label: string,
  bin: string,
  args: string[],
  timeoutMs: number,
  reauthHint: string,
): Promise<string | null> {
  if (typeof window !== 'undefined') return null; // Node-only provider

  let spawn: typeof import('child_process').spawn;
  try {
    spawn = (await import('child_process')).spawn;
    const fs = await import('fs');
    if (!fs.existsSync(bin)) {
      console.log(`${label} not found at ${bin}, skipping`);
      return null;
    }
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.env.HOME,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (value: string | null, reason?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (reason) console.error(`${label}: ${reason}`);
      if (!child.killed) child.kill('SIGKILL');
      resolve(value);
    };

    const timer = setTimeout(
      () => finish(null, `timed out after ${timeoutMs}ms`),
      timeoutMs,
    );

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
      // Only sniff early output for auth prompts — generated JSON payloads
      // may legitimately contain matching words later in the stream.
      if (stdout.length < 2000 && AUTH_PROMPT_RE.test(stdout)) {
        finish(null, `auth required — ${reauthHint}`);
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length < 2000 && AUTH_PROMPT_RE.test(stderr)) {
        finish(null, `auth required — ${reauthHint}`);
      }
    });

    child.on('error', (err) => finish(null, `failed to launch: ${err.message}`));
    child.on('close', (code) => {
      if (code !== 0) {
        finish(null, `exited ${code}: ${stderr.slice(0, 200)}`);
      } else {
        finish(stdout.trim() || null);
      }
    });
  });
}

// Neither CLI has a separate system-prompt flag in headless mode; prepend it.
function cliPrompt(systemPrompt: string, userPrompt: string): string {
  return `${systemPrompt}\n\n---\n\n${userPrompt}\n\nRespond with the raw Lottie JSON only. No markdown, no commentary, no tool calls.`;
}

// ── Provider: Antigravity CLI (Google AI Pro subscription quota) ─────────

export async function generateAntigravityCli(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  return runCliProvider(
    'Antigravity CLI',
    AGY_BIN,
    ['--model', ANTIGRAVITY_MODEL, '-p', cliPrompt(systemPrompt, userPrompt)],
    AGY_TIMEOUT_MS,
    'run `agy` interactively once to sign in, or set ANTIGRAVITY_API_KEY',
  );
}

// ── Provider: Gemini CLI (legacy — sunset for AI Pro accounts) ───────────

export async function generateGeminiCli(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  return runCliProvider(
    'Gemini CLI',
    GEMINI_CLI_BIN,
    ['--skip-trust', '-m', GEMINI_MODEL, '-p', cliPrompt(systemPrompt, userPrompt)],
    GEMINI_CLI_TIMEOUT_MS,
    'run `gemini` interactively once to re-authenticate',
  );
}

// ── Provider: Gemini API (AI Studio key, separate quota bucket) ──────────

async function generateGeminiApi(
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.log('Gemini API key not set (secret-tool service gemini / GEMINI_API_KEY), skipping');
    return null;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(60_000),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Gemini API error: ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini API error:', (err as Error).message);
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

  // Provider chain: Google quota buckets first (Antigravity CLI = AI Pro sub,
  // Gemini API = AI Studio key, legacy gemini CLI last of the three),
  // then local Ollama, then OpenRouter fallbacks
  const providers: ProviderConfig[] = [
    ...(GEMINI_DISABLED ? [] : [
      {
        name: `antigravity-cli(${ANTIGRAVITY_MODEL})`,
        model: ANTIGRAVITY_MODEL,
        generate: () => generateAntigravityCli(systemPrompt, userPrompt),
      },
      {
        name: `gemini-api(${GEMINI_MODEL})`,
        model: GEMINI_MODEL,
        generate: () => generateGeminiApi(systemPrompt, userPrompt),
      },
      {
        name: `gemini-cli(${GEMINI_MODEL})`,
        model: GEMINI_MODEL,
        generate: () => generateGeminiCli(systemPrompt, userPrompt),
      },
    ]),
    {
      name: `ollama-fast(${OLLAMA_FAST_MODEL})`,
      model: OLLAMA_FAST_MODEL,
      generate: () => generateOllama(systemPrompt, userPrompt, OLLAMA_FAST_MODEL),
    },
    {
      name: `ollama-smart(${OLLAMA_SMART_MODEL})`,
      model: OLLAMA_SMART_MODEL,
      generate: () => generateOllama(systemPrompt, userPrompt, OLLAMA_SMART_MODEL),
    },
    {
      name: 'openrouter-free',
      model: OPENROUTER_FREE_MODEL,
      generate: () => generateOpenRouter(systemPrompt, userPrompt, OPENROUTER_FREE_MODEL),
    },
    {
      name: 'openrouter-cheap',
      model: OPENROUTER_CHEAP_MODEL,
      generate: () => generateOpenRouter(systemPrompt, userPrompt, OPENROUTER_CHEAP_MODEL),
    },
    {
      name: `anthropic(${ANTHROPIC_MODEL})`,
      model: ANTHROPIC_MODEL,
      generate: () => generateAnthropic(systemPrompt, userPrompt),
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

    // Validate with auto-fix
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
      model: provider.model,
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
