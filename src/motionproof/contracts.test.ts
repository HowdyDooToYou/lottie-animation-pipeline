import assert from 'node:assert/strict';
import test from 'node:test';

import { MotionProofRequestSchema, MotionProofThemeSchema } from './contracts.ts';

test('MotionProof request applies safe defaults and rejects unknown fields', () => {
  const parsed = MotionProofRequestSchema.parse({
    prompt: 'A restrained save confirmation',
  });

  assert.equal(parsed.preset, 'calm');
  assert.equal(parsed.maxAttempts, 2);
  assert.throws(() => MotionProofRequestSchema.parse({
    prompt: 'A restrained save confirmation',
    providerApiKey: 'excluded',
  }));
});

test('MotionProof theme accepts portable hex tokens only', () => {
  assert.deepEqual(
    MotionProofThemeSchema.parse({ primary: '#2f70ff', accent: '#EF6545' }),
    { primary: '#2f70ff', accent: '#EF6545' },
  );
  assert.throws(() => MotionProofThemeSchema.parse({ primary: 'blue' }));
  assert.throws(() => MotionProofThemeSchema.parse({ primary: '#fff' }));
});

test('request ids are safe output-directory names', () => {
  assert.doesNotThrow(() => MotionProofRequestSchema.parse({
    id: 'checkout-success',
    prompt: 'Confirm checkout completion',
  }));
  assert.throws(() => MotionProofRequestSchema.parse({
    id: '../checkout',
    prompt: 'Confirm checkout completion',
  }));
});
