import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLottie } from './schema.ts';

const finalDir = path.resolve(import.meta.dirname, '../../public/animations/final');

test('every production animation is strictly schema-valid', () => {
  const files = fs.readdirSync(finalDir).filter((file) => file.endsWith('.json'));

  assert.ok(files.length > 0, 'production animation directory must not be empty');

  for (const file of files) {
    const animation = JSON.parse(fs.readFileSync(path.join(finalDir, file), 'utf-8'));
    assert.doesNotThrow(
      () => validateLottie(animation),
      `${file} must be strictly valid before it is eligible for export`,
    );
  }
});
