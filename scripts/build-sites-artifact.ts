#!/usr/bin/env tsx

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const hostingRoot = path.join(root, 'hosting');
const studioBuild = path.join(root, 'studio-dist');
const hostedStudio = path.join(hostingRoot, 'public', 'studio');
const generatedStudioIndex = path.join(hostingRoot, 'generated', 'studio-index.html');
const hostingBuild = path.join(hostingRoot, 'dist');
const hostingManifest = path.join(root, '.openai', 'hosting.json');
const deployedManifest = path.join(hostingBuild, '.openai', 'hosting.json');

run('npm', ['run', 'build'], {
  ...process.env,
  MOTIONPROOF_STUDIO_BASE: '/studio/',
});
run('npm', ['ci', '--prefix', hostingRoot]);

fs.rmSync(hostedStudio, { recursive: true, force: true });
fs.mkdirSync(path.dirname(hostedStudio), { recursive: true });
fs.cpSync(studioBuild, hostedStudio, { recursive: true });
fs.mkdirSync(path.dirname(generatedStudioIndex), { recursive: true });
fs.copyFileSync(path.join(studioBuild, 'index.html'), generatedStudioIndex);

run('npm', ['run', 'build', '--prefix', hostingRoot]);

fs.mkdirSync(path.dirname(deployedManifest), { recursive: true });
fs.copyFileSync(hostingManifest, deployedManifest);

const serverEntry = path.join(hostingBuild, 'server', 'index.js');
if (!fs.existsSync(serverEntry)) {
  throw new Error(`Sites build is missing its server entry: ${serverEntry}`);
}
if (!fs.existsSync(path.join(hostingBuild, 'client', 'studio', 'index.html'))) {
  throw new Error('Sites build is missing the MotionProof studio entry');
}

console.log('✅ Sites artifact: hosting/dist/server/index.js + hosted MotionProof studio');

function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}
