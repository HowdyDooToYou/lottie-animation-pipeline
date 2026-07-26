#!/usr/bin/env tsx

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'LICENSE.md',
  'LICENSE-MIT',
  'LICENSE-APACHE',
  'NOTICE',
  'OPEN_CORE.md',
  'TRADEMARKS.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/public-release-audit.md',
  '.github/workflows/ci.yml',
  '.github/ISSUE_TEMPLATE/premium-interest.yml',
];
const allowedLicenses = new Set([
  'MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD',
  'CC0-1.0', 'CC-BY-4.0', 'BlueOak-1.0.0', 'Python-2.0', 'MPL-2.0',
  'MIT OR Apache-2.0', 'Apache-2.0 OR MIT',
]);
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /AIza[A-Za-z0-9_-]{20,}/,
  /-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----/,
  /(?:api[_-]?key|token|secret)\s*[:=]\s*["'][A-Za-z0-9_./+-]{16,}["']/i,
];
const privatePathPatterns = [
  /\/home\/[A-Za-z0-9._-]+\//,
  /\/mnt\/[a-z]\/Users\//i,
  /[A-Za-z]:\\Users\\/,
];

const issues: string[] = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) issues.push(`missing required public-release file: ${file}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  version?: string;
  license?: string;
  repository?: { url?: string };
};
if (packageJson.license !== 'MIT OR Apache-2.0') {
  issues.push('package.json must declare the dual-license choice: MIT OR Apache-2.0');
}
if (!packageJson.version || packageJson.version.startsWith('0.')) issues.push('public production release must use a stable major version');
if (!packageJson.repository?.url?.includes('HowdyDooToYou/lottie-animation-pipeline')) issues.push('package.json repository URL is missing or incorrect');

const tracked = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
for (const file of tracked) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  if (secretPatterns.some((pattern) => pattern.test(content))) issues.push(`credential-like material detected in ${file}`);
  if (privatePathPatterns.some((pattern) => pattern.test(content))) issues.push(`private absolute path detected in ${file}`);
}

const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')) as {
  packages?: Record<string, { license?: string; link?: boolean }>;
};
for (const [packagePath, dependency] of Object.entries(lock.packages ?? {})) {
  if (!packagePath.startsWith('node_modules/') || dependency.link) continue;
  if (!dependency.license) issues.push(`dependency license missing: ${packagePath}`);
  else if (!allowedLicenses.has(dependency.license)) issues.push(`dependency license requires review: ${packagePath} (${dependency.license})`);
}

if (issues.length) {
  console.error(`Public-readiness check failed with ${issues.length} issue(s):`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`✅ Public readiness: ${requiredFiles.length} release files, ${tracked.length} source files, and ${Object.keys(lock.packages ?? {}).length - 1} dependency records checked`);
