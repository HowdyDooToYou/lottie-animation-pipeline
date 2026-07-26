import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectCandidate } from './certification.ts';
import { buildRecipeCandidate } from './recipes.ts';

function recipeAnimation(): Record<string, unknown> {
  return buildRecipeCandidate({
    prompt: 'Route evidence into a verified decision',
    recipe: 'signal-flow',
    preset: 'technical',
    maxAttempts: 1,
  }).animation;
}

test('certification rejects executable Lottie expressions', () => {
  const animation = recipeAnimation();
  const layers = animation.layers as Array<Record<string, unknown>>;
  const transform = layers[0].ks as Record<string, unknown>;
  transform.o = {
    a: 0,
    k: 100,
    x: '$bm_rt = value;',
  };

  assert.throws(
    () => inspectCandidate(animation),
    /expression-free vector Lottie/,
  );
});

test('certification rejects external or embedded media assets', () => {
  const animation = recipeAnimation();
  animation.assets = [{
    id: 'remote-image',
    p: 'tracking-pixel.png',
    u: 'https://example.invalid/',
  }];

  assert.throws(
    () => inspectCandidate(animation),
    /external or embedded media asset/,
  );
});
