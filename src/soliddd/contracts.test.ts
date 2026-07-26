import assert from 'node:assert/strict';
import test from 'node:test';

import { SolidddRequestSchema, SolidddThemeSchema } from './contracts.ts';

test('Soliddd request applies safe defaults and rejects unknown fields', () => {
  const parsed = SolidddRequestSchema.parse({
    prompt: 'A restrained save confirmation',
  });

  assert.equal(parsed.preset, 'calm');
  assert.equal(parsed.maxAttempts, 2);
  assert.throws(() => SolidddRequestSchema.parse({
    prompt: 'A restrained save confirmation',
    providerApiKey: 'excluded',
  }));
});

test('Soliddd theme accepts portable hex tokens only', () => {
  assert.deepEqual(
    SolidddThemeSchema.parse({ primary: '#2f70ff', accent: '#EF6545' }),
    { primary: '#2f70ff', accent: '#EF6545' },
  );
  assert.throws(() => SolidddThemeSchema.parse({ primary: 'blue' }));
  assert.throws(() => SolidddThemeSchema.parse({ primary: '#fff' }));
});

test('request ids are safe output-directory names', () => {
  assert.doesNotThrow(() => SolidddRequestSchema.parse({
    id: 'checkout-success',
    prompt: 'Confirm checkout completion',
  }));
  assert.throws(() => SolidddRequestSchema.parse({
    id: '../checkout',
    prompt: 'Confirm checkout completion',
  }));
});
