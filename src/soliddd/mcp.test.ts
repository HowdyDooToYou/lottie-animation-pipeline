import assert from 'node:assert/strict';
import test from 'node:test';

import { handleMcpRequest } from './mcp.ts';

test('MCP server advertises the certified motion contract', async () => {
  const initialized = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'soliddd-test', version: '1.0.0' },
    },
  });
  assert.equal(
    (initialized?.result as { serverInfo?: { name?: string } }).serverInfo?.name,
    'soliddd-motion',
  );
  assert.equal(
    (initialized?.result as { protocolVersion?: string }).protocolVersion,
    '2025-11-25',
  );

  const listed = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });
  const names = (
    listed?.result as { tools: Array<{ name: string }> }
  ).tools.map((tool) => tool.name);
  assert.deepEqual(names, [
    'create_motion',
    'certify_motion',
    'list_motion_recipes',
  ]);
  const tools = (listed?.result as {
    tools: Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
  }).tools;
  assert.equal(
    tools.find((tool) => tool.name === 'list_motion_recipes')
      ?.annotations?.readOnlyHint,
    true,
  );
});

test('MCP recipe listing is read-only and model-free', async () => {
  const response = await handleMcpRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list_motion_recipes',
      arguments: {},
    },
  });
  const structured = (response?.result as {
    structuredContent: { recipes: unknown[] };
  }).structuredContent;
  assert.equal(structured.recipes.length, 4);
});
