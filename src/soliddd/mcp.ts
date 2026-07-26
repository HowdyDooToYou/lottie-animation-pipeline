import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

import packageJson from '../../package.json';
import { createMotion } from './create-motion.ts';
import {
  SolidddThemeSchema,
  type SolidddRequestInput,
} from './contracts.ts';
import { createCandidateProvider } from './provider.ts';
import { listBuiltInRecipes } from './recipes.ts';

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

const MCP_TOOLS = [
  {
    name: 'create_motion',
    title: 'Create certified motion',
    description: 'Create a deterministic, browser-certified motion bundle from a natural-language prompt.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', minLength: 3, maxLength: 2_000 },
        id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        recipe: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        preset: { type: 'string', enum: ['calm', 'snappy', 'technical', 'ambient'] },
        description: { type: 'string', minLength: 3, maxLength: 500 },
        theme: {
          type: 'object',
          additionalProperties: false,
          properties: {
            primary: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            accent: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            success: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            background: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            foreground: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
          },
        },
        outputDirectory: { type: 'string', minLength: 1 },
        overwrite: { type: 'boolean' },
      },
    },
  },
  {
    name: 'certify_motion',
    title: 'Certify existing Lottie',
    description: 'Validate, browser-render, and package an existing Lottie JSON candidate without repairing it.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['candidatePath', 'prompt'],
      properties: {
        candidatePath: { type: 'string', minLength: 1 },
        prompt: { type: 'string', minLength: 3, maxLength: 2_000 },
        id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        description: { type: 'string', minLength: 3, maxLength: 500 },
        outputDirectory: { type: 'string', minLength: 1 },
        overwrite: { type: 'boolean' },
      },
    },
  },
  {
    name: 'list_motion_recipes',
    title: 'List motion recipes',
    description: 'List zero-key deterministic recipes and example prompts.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {},
    },
  },
] as const;

export async function handleMcpRequest(
  request: JsonRpcRequest,
): Promise<JsonRpcResponse | undefined> {
  const id = request.id ?? null;
  if (request.method === 'notifications/initialized') return undefined;
  if (request.method === 'initialize') {
    const params = request.params && typeof request.params === 'object'
      && !Array.isArray(request.params)
      ? request.params as Record<string, unknown>
      : {};
    const requestedVersion = typeof params.protocolVersion === 'string'
      ? params.protocolVersion
      : undefined;
    const protocolVersion = requestedVersion
      && SUPPORTED_PROTOCOL_VERSIONS.includes(
        requestedVersion as typeof SUPPORTED_PROTOCOL_VERSIONS[number],
      )
      ? requestedVersion
      : SUPPORTED_PROTOCOL_VERSIONS[0];

    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'soliddd-motion', version: packageJson.version },
        instructions: 'Use create_motion for a zero-key certified bundle. Use certify_motion when another agent or model already produced Lottie JSON. Only successful SOLIDDD results are production artifacts.',
      },
    };
  }
  if (request.method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  }
  if (request.method !== 'tools/call') {
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Unsupported method: ${String(request.method)}` },
    };
  }

  try {
    const params = expectRecord(request.params, 'params');
    const name = expectString(params.name, 'tool name');
    const args = expectRecord(params.arguments ?? {}, 'tool arguments');

    if (name === 'list_motion_recipes') {
      rejectUnknown(args, [], name);
      return toolResult(id, { recipes: listBuiltInRecipes() });
    }
    if (name === 'create_motion') {
      rejectUnknown(
        args,
        ['prompt', 'id', 'recipe', 'preset', 'description', 'theme', 'outputDirectory', 'overwrite'],
        name,
      );
      const requestInput: SolidddRequestInput = {
        prompt: expectString(args.prompt, 'prompt'),
        id: optionalString(args.id, 'id'),
        recipe: optionalString(args.recipe, 'recipe'),
        preset: optionalPreset(args.preset),
        description: optionalString(args.description, 'description'),
        theme: args.theme === undefined ? undefined : SolidddThemeSchema.parse(args.theme),
      };
      const result = await createMotion(requestInput, {
        outputDirectory: optionalString(args.outputDirectory, 'outputDirectory'),
        overwrite: optionalBoolean(args.overwrite, 'overwrite'),
      });
      return toolResult(id, result, !result.ok);
    }
    if (name === 'certify_motion') {
      rejectUnknown(
        args,
        ['candidatePath', 'prompt', 'id', 'description', 'outputDirectory', 'overwrite'],
        name,
      );
      const candidatePath = path.resolve(expectString(args.candidatePath, 'candidatePath'));
      const animation = JSON.parse(await fs.readFile(candidatePath, 'utf8')) as Record<string, unknown>;
      const result = await createMotion({
        prompt: expectString(args.prompt, 'prompt'),
        id: optionalString(args.id, 'id'),
        description: optionalString(args.description, 'description'),
        maxAttempts: 1,
      }, {
        provider: createCandidateProvider(animation, {
          id: 'soliddd/mcp-candidate',
          model: path.basename(candidatePath),
        }),
        outputDirectory: optionalString(args.outputDirectory, 'outputDirectory'),
        overwrite: optionalBoolean(args.overwrite, 'overwrite'),
      });
      return toolResult(id, result, !result.ok);
    }

    return toolFailure(id, `Unknown Soliddd tool: ${name}`);
  } catch (error) {
    return toolFailure(id, sanitize(error instanceof Error ? error.message : String(error)));
  }
}

export async function startMcpServer(): Promise<void> {
  const lines = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line.trim()) continue;
    let response: JsonRpcResponse | undefined;
    try {
      response = await handleMcpRequest(JSON.parse(line) as JsonRpcRequest);
    } catch (error) {
      response = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: sanitize(error instanceof Error ? error.message : String(error)),
        },
      };
    }
    if (response) process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

function toolResult(
  id: string | number | null,
  value: unknown,
  isError = false,
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      content: [{ type: 'text', text: JSON.stringify(value) }],
      structuredContent: value,
      ...(isError ? { isError: true } : {}),
    },
  };
}

function toolFailure(id: string | number | null, message: string): JsonRpcResponse {
  return toolResult(id, { error: message }, true);
}

function expectRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}

function expectString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown, name: string): string | undefined {
  return value === undefined ? undefined : expectString(value, name);
}

function optionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${name} must be a boolean`);
  return value;
}

function optionalPreset(
  value: unknown,
): 'calm' | 'snappy' | 'technical' | 'ambient' | undefined {
  if (value === undefined) return undefined;
  const allowed = ['calm', 'snappy', 'technical', 'ambient'] as const;
  if (typeof value !== 'string' || !allowed.includes(value as typeof allowed[number])) {
    throw new Error(`preset must be one of: ${allowed.join(', ')}`);
  }
  return value as typeof allowed[number];
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: string[],
  name: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new Error(`${name} contains unknown fields: ${unknown.join(', ')}`);
  }
}

function sanitize(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/AIza[A-Za-z0-9_-]{16,}/g, '[REDACTED]');
}
