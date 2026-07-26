#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pluginRoot = path.resolve(__dirname, '..');
const packageRoot = path.resolve(pluginRoot, '..', '..');
const localCli = path.join(packageRoot, 'dist', 'cli.js');
const { version } = require(path.join(pluginRoot, '.claude-plugin', 'plugin.json'));

const useLocalCli = fs.existsSync(localCli);
const command = useLocalCli
  ? process.execPath
  : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = useLocalCli
  ? [localCli, 'mcp']
  : ['--yes', `motionproof@${version}`, 'mcp'];

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: !useLocalCli && process.platform === 'win32',
});

child.on('error', (error) => {
  process.stderr.write(`Unable to start MotionProof MCP: ${error.message}\n`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (signal && process.platform !== 'win32') {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
