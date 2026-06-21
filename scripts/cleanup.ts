#!/usr/bin/env tsx
/**
 * Clean up staging and archived iterations.
 *
 * Usage:
 *   tsx scripts/cleanup.ts [name]    # Clean specific animation
 *   tsx scripts/cleanup.ts --all     # Clean all staging
 *   npm run cleanup --all
 *
 * Removes public/animations/staging/ (keeps public/animations/final/)
 */

import fs from 'fs';
import path from 'path';

const arg = process.argv[2];
const stagingDir = path.join(process.cwd(), 'public/animations/staging');

if (!fs.existsSync(stagingDir)) {
  console.log('✅ Nothing to clean — staging directory does not exist');
  process.exit(0);
}

if (arg === '--all') {
  // Remove entire staging directory
  fs.rmSync(stagingDir, { recursive: true, force: true });
  console.log('✅ Cleaned all staging files');
} else if (arg) {
  // Remove specific animation's staging files
  const name = arg.replace(/\.json$/, '');
  const pattern = new RegExp(`^${name}(-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2})?\\.json$`);
  const files = fs.readdirSync(stagingDir).filter(f => pattern.test(f));

  if (files.length === 0) {
    console.log(`No staging files found for: ${name}`);
    process.exit(0);
  }

  for (const file of files) {
    fs.unlinkSync(path.join(stagingDir, file));
    console.log(`🗑️  Removed: ${file}`);
  }
  console.log(`✅ Cleaned ${files.length} staging file(s) for: ${name}`);
} else {
  console.log('Usage:');
  console.log('  npm run cleanup <name>    # Clean specific animation');
  console.log('  npm run cleanup --all     # Clean all staging');
  process.exit(1);
}

// Recreate empty staging directory
if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}
