import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import puppeteer from 'puppeteer-core';

import { findChromium } from '../generator/render-validation.ts';
import { createMotion } from './create-motion.ts';
import { createCandidateProvider } from './provider.ts';
import { chromiumLaunchArguments } from './render.ts';

test('createMotion promotes one complete certified bundle with verifiable hashes', async (t) => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'motionproof-test-'));
  t.after(async () => fs.rm(outputRoot, { recursive: true, force: true }));

  const result = await createMotion({
    id: 'test-success',
    prompt: 'A calm checkout success confirmation',
    recipe: 'success-seal',
    maxAttempts: 1,
  }, { outputDirectory: outputRoot });

  assert.ok(
    result.ok,
    `Expected a certified bundle, received:\n${JSON.stringify(result, null, 2)}`,
  );
  assert.equal(result.certification.certified, true);
  assert.equal(result.artifacts.length, 5);

  const poster = await fs.readFile(path.join(result.outputDirectory, 'poster.png'));
  assert.deepEqual([...poster.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);

  const manifest = JSON.parse(
    await fs.readFile(path.join(result.outputDirectory, 'manifest.json'), 'utf8'),
  ) as {
    artifacts: Array<{ path: string; sha256: string }>;
  };
  for (const artifact of manifest.artifacts) {
    const content: Buffer = await fs.readFile(
      path.join(result.outputDirectory, artifact.path),
    );
    assert.equal(
      createHash('sha256').update(content).digest('hex'),
      artifact.sha256,
      `${artifact.path} hash must match its manifest`,
    );
  }

  const browser = await puppeteer.launch({
    executablePath: findChromium(),
    headless: true,
    args: chromiumLaunchArguments(),
  });
  try {
    const page = await browser.newPage();
    const browserErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserErrors.push(message.text());
    });
    page.on('pageerror', (error: unknown) => {
      browserErrors.push(error instanceof Error ? error.message : String(error));
    });
    await page.setContent(
      await fs.readFile(path.join(result.outputDirectory, 'preview.html'), 'utf8'),
      { waitUntil: 'load' },
    );
    await page.waitForSelector('#animation svg');
    assert.equal(
      await page.$$eval('#animation svg path', (paths) => paths.length > 0),
      true,
    );
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser.close();
  }

  const duplicate = await createMotion({
    id: 'test-success',
    prompt: 'A calm checkout success confirmation',
    recipe: 'success-seal',
    maxAttempts: 1,
  }, { outputDirectory: outputRoot });
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) assert.equal(duplicate.issues[0]?.code, 'write.output-exists');
});

test('createMotion fails closed and writes no bundle for invalid provider output', async (t) => {
  const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'motionproof-failure-'));
  t.after(async () => fs.rm(outputRoot, { recursive: true, force: true }));

  const result = await createMotion({
    id: 'invalid-candidate',
    prompt: 'An invalid candidate must not ship',
    maxAttempts: 1,
  }, {
    provider: createCandidateProvider({ layers: [] }),
    outputDirectory: outputRoot,
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.stage, 'schema');
  await assert.rejects(fs.access(path.join(outputRoot, 'invalid-candidate')));
});
