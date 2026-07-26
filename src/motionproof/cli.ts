#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { createMotion } from './create-motion.ts';
import type { MotionProofRequestInput, MotionProofResult, MotionProofTheme } from './contracts.ts';
import { startMcpServer } from './mcp.ts';
import { createCandidateProvider } from './provider.ts';
import { listBuiltInRecipes } from './recipes.ts';

interface CliIo {
  stdout: Pick<NodeJS.WriteStream, 'write'>;
  stderr: Pick<NodeJS.WriteStream, 'write'>;
}

const HELP = `MotionProof — motion that ships

Usage:
  motionproof create "A calm checkout success state" [options]
  motionproof certify ./candidate.json --prompt "Describe the intended motion" [options]
  motionproof recipes [--json]
  motionproof mcp

Options:
  --id <slug>                 Bundle id (lowercase kebab-case)
  --recipe <id>               Force a built-in recipe
  --preset <name>             calm | snappy | technical | ambient
  --out <directory>           Output root (default: ./motionproof-output)
  --description <text>        Accessible description
  --primary <#rrggbb>         Theme primary
  --accent <#rrggbb>          Theme accent
  --success <#rrggbb>         Theme success
  --background <#rrggbb>      Theme background
  --foreground <#rrggbb>      Theme foreground
  --chromium <path>           Chrome/Chromium executable
  --overwrite                 Atomically replace an existing bundle
  --json                      Machine-readable stdout
  --help                      Show this help
`;

export async function runCli(
  argv: string[],
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  const [command = 'help', ...rest] = argv;
  if (command === 'help' || command === '--help' || command === '-h') {
    io.stdout.write(HELP);
    return 0;
  }
  if (command === 'mcp') {
    await startMcpServer();
    return 0;
  }
  if (command === 'recipes') {
    const json = rest.includes('--json');
    const recipes = listBuiltInRecipes();
    if (json) {
      io.stdout.write(`${JSON.stringify({ recipes }, null, 2)}\n`);
    } else {
      io.stdout.write('Built-in recipes — no API key required\n\n');
      for (const recipe of recipes) {
        io.stdout.write(`${recipe.id.padEnd(18)} ${recipe.name}\n`);
        io.stdout.write(`${' '.repeat(19)}${recipe.description}\n`);
      }
    }
    return 0;
  }
  if (command !== 'create' && command !== 'certify') {
    io.stderr.write(`Unknown command "${command}".\n\n${HELP}`);
    return 2;
  }

  try {
    const parsed = parseFlags(rest);
    const json = parsed.flags.has('json');
    const outputDirectory = parsed.values.get('out');
    const chromiumPath = parsed.values.get('chromium');
    const overwrite = parsed.flags.has('overwrite');
    let result: MotionProofResult;

    if (command === 'certify') {
      const candidatePath = parsed.positionals[0];
      const prompt = parsed.values.get('prompt');
      if (!candidatePath || !prompt) {
        throw new UsageError('certify requires a candidate path and --prompt');
      }
      const absoluteCandidatePath = path.resolve(candidatePath);
      const animation = JSON.parse(
        await fs.readFile(absoluteCandidatePath, 'utf8'),
      ) as Record<string, unknown>;
      result = await createMotion(buildRequest(parsed, prompt, 1), {
        provider: createCandidateProvider(animation, {
          id: 'motionproof/cli-candidate',
          model: path.basename(absoluteCandidatePath),
        }),
        outputDirectory,
        chromiumPath,
        overwrite,
      });
    } else {
      const prompt = parsed.values.get('prompt')
        ?? parsed.positionals.join(' ').trim();
      if (!prompt) throw new UsageError('create requires a motion prompt');
      result = await createMotion(buildRequest(parsed, prompt), {
        outputDirectory,
        chromiumPath,
        overwrite,
      });
    }

    if (json) {
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else if (result.ok) {
      io.stdout.write(`\nMOTIONPROOF · ${result.certification.score}/100 · certified\n`);
      io.stdout.write(`${result.outputDirectory}\n\n`);
      for (const artifact of result.artifacts) {
        io.stdout.write(`  ${artifact.kind.padEnd(10)} ${artifact.relativePath}\n`);
      }
    } else {
      io.stderr.write(`\nMotionProof stopped at ${result.stage}; no production bundle was promoted.\n`);
      for (const issue of result.issues) io.stderr.write(`  - ${issue.message}\n`);
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    if (error instanceof UsageError) io.stderr.write(`\n${HELP}`);
    return error instanceof UsageError ? 2 : 1;
  }
}

function buildRequest(
  parsed: ParsedFlags,
  prompt: string,
  maxAttempts?: number,
): MotionProofRequestInput {
  const theme = buildTheme(parsed);
  return {
    prompt,
    id: parsed.values.get('id'),
    recipe: parsed.values.get('recipe'),
    preset: parsePreset(parsed.values.get('preset')),
    description: parsed.values.get('description'),
    maxAttempts,
    theme: Object.keys(theme).length > 0 ? theme : undefined,
  };
}

interface ParsedFlags {
  positionals: string[];
  values: Map<string, string>;
  flags: Set<string>;
}

function parseFlags(args: string[]): ParsedFlags {
  const valueFlags = new Set([
    'id', 'recipe', 'preset', 'out', 'description', 'primary', 'accent',
    'success', 'background', 'foreground', 'chromium', 'prompt',
  ]);
  const booleanFlags = new Set(['json', 'overwrite']);
  const positionals: string[] = [];
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const name = arg.slice(2);
    if (booleanFlags.has(name)) {
      flags.add(name);
      continue;
    }
    if (!valueFlags.has(name)) throw new UsageError(`Unknown option --${name}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new UsageError(`Option --${name} requires a value`);
    }
    values.set(name, value);
    index += 1;
  }

  return { positionals, values, flags };
}

function buildTheme(parsed: ParsedFlags): MotionProofTheme {
  const theme: MotionProofTheme = {};
  for (const key of ['primary', 'accent', 'success', 'background', 'foreground'] as const) {
    const value = parsed.values.get(key);
    if (value) theme[key] = value;
  }
  return theme;
}

function parsePreset(
  value: string | undefined,
): 'calm' | 'snappy' | 'technical' | 'ambient' | undefined {
  if (!value) return undefined;
  if (!['calm', 'snappy', 'technical', 'ambient'].includes(value)) {
    throw new UsageError('preset must be calm, snappy, technical, or ambient');
  }
  return value as 'calm' | 'snappy' | 'technical' | 'ambient';
}

class UsageError extends Error {}
