#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'motionproof-package-check-'));
const packDirectory = path.join(sandbox, 'pack');
const consumerDirectory = path.join(sandbox, 'consumer');

fs.mkdirSync(packDirectory);
fs.mkdirSync(consumerDirectory);

try {
  const packOutput = execFileSync(
    npm,
    ['pack', '--json', '--pack-destination', packDirectory],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  const packLines = packOutput.split('\n');
  let jsonStart = -1;
  for (let index = packLines.length - 1; index >= 0; index -= 1) {
    if (packLines[index].trim() === '[') {
      jsonStart = index;
      break;
    }
  }
  if (jsonStart < 0) throw new Error('npm pack did not return JSON metadata');
  const packed = JSON.parse(packLines.slice(jsonStart).join('\n')) as Array<{
    filename?: string;
    files?: Array<{ path?: string }>;
  }>;
  const filename = packed[0]?.filename;
  if (!filename) throw new Error('npm pack did not return a tarball filename');
  const packedFiles = new Set(
    packed[0]?.files?.map((file) => file.path).filter(Boolean),
  );
  for (const expected of [
    'dist/index.js',
    'dist/cli.js',
    'AGENTS.md',
    'SECURITY.md',
    'LICENSE.md',
    'LICENSE-MIT',
    'LICENSE-APACHE',
    'NOTICE',
    'OPEN_CORE.md',
    'TRADEMARKS.md',
    'docs/agent-integration.md',
    'docs/public-release-audit.md',
    'docs/motionproof-contract.md',
    'docs/assets/production-motion-showcase.gif',
    'plugins/motionproof/bin/motionproof-mcp.cjs',
  ]) {
    if (!packedFiles.has(expected)) {
      throw new Error(`npm package is missing ${expected}`);
    }
  }

  fs.writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({
      name: 'motionproof-package-consumer',
      private: true,
      scripts: {
        recipes: 'motionproof recipes --json',
        create: 'motionproof create A calm checkout confirmation --id package-smoke --out ./output --json',
      },
    }, null, 2),
  );

  execFileSync(
    npm,
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--prefer-offline',
      path.join(packDirectory, filename),
    ],
    { cwd: consumerDirectory, stdio: 'pipe' },
  );

  const sdkProbe = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      'import("motionproof").then((sdk) => console.log(typeof sdk.createMotion, typeof sdk.defineMotionProvider))',
    ],
    { cwd: consumerDirectory, encoding: 'utf8' },
  ).trim();
  if (sdkProbe !== 'function function') {
    throw new Error(`installed SDK exports are unavailable: ${sdkProbe}`);
  }

  const recipes = JSON.parse(execFileSync(
    npm,
    ['run', '--silent', 'recipes'],
    { cwd: consumerDirectory, encoding: 'utf8' },
  )) as { recipes?: unknown[] };
  if (recipes.recipes?.length !== 4) {
    throw new Error(`installed CLI returned ${recipes.recipes?.length ?? 0} recipes; expected 4`);
  }

  const result = JSON.parse(execFileSync(
    npm,
    ['run', '--silent', 'create'],
    { cwd: consumerDirectory, encoding: 'utf8' },
  )) as {
    ok?: boolean;
    certification?: { score?: number };
    artifacts?: Array<{ relativePath?: string }>;
  };
  const expectedArtifacts = new Set([
    'animation.json',
    'poster.png',
    'preview.html',
    'certification.json',
    'manifest.json',
  ]);
  const artifacts = new Set(
    result.artifacts?.map((artifact) => artifact.relativePath).filter(Boolean),
  );
  if (
    result.ok !== true
    || (result.certification?.score ?? 0) < 85
    || [...expectedArtifacts].some((artifact) => !artifacts.has(artifact))
  ) {
    throw new Error('installed package did not produce a complete certified bundle');
  }

  const pluginLauncher = path.join(
    consumerDirectory,
    'node_modules',
    'motionproof',
    'plugins',
    'motionproof',
    'bin',
    'motionproof-mcp.cjs',
  );
  const mcpOutput = execFileSync(process.execPath, [pluginLauncher], {
    cwd: consumerDirectory,
    encoding: 'utf8',
    input: [
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'package-check', version: '1.0.0' },
        },
      }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
      '',
    ].join('\n'),
  });
  const mcpMessages = mcpOutput.trim().split('\n').map((line) => JSON.parse(line)) as Array<{
    result?: { protocolVersion?: string; tools?: unknown[] };
  }>;
  if (
    mcpMessages[0]?.result?.protocolVersion !== '2025-11-25'
    || mcpMessages[1]?.result?.tools?.length !== 3
  ) {
    throw new Error('installed plugin launcher did not complete a current MCP handshake');
  }

  console.log(
    `✅ Package install: SDK loaded, ${filename}, ${recipes.recipes.length} recipes, `
    + `${result.certification?.score}/100 certification, ${artifacts.size} artifacts, `
    + `${mcpMessages[1].result?.tools?.length} MCP tools`,
  );
} finally {
  fs.rmSync(sandbox, { recursive: true, force: true });
}
