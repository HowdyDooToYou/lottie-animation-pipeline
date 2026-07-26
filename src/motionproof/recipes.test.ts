import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { qualityGate } from '../generator/quality-gate.ts';
import { validateLottie } from '../generator/schema.ts';
import {
  buildRecipeCandidate,
  listBuiltInRecipes,
  selectBuiltInRecipe,
  type BuiltInRecipeId,
} from './recipes.ts';

test('recipe matcher selects useful semantic defaults', () => {
  assert.equal(selectBuiltInRecipe('Confirm the checkout succeeded').id, 'success-seal');
  assert.equal(selectBuiltInRecipe('Route data among three agents').id, 'signal-flow');
  assert.equal(selectBuiltInRecipe('A calm intelligence platform hero').id, 'executive-orbit');
  assert.equal(selectBuiltInRecipe('Celebrate our launch milestone').id, 'milestone-bloom');
});

test('every built-in recipe is strictly valid and clears the structural quality gate', () => {
  for (const recipe of listBuiltInRecipes()) {
    const candidate = buildRecipeCandidate({
      prompt: recipe.promptExample,
      recipe: recipe.id,
      preset: 'technical',
      maxAttempts: 1,
    });
    assert.doesNotThrow(
      () => validateLottie(candidate.animation),
      `${recipe.id} must remain strict Lottie`,
    );
    const report = qualityGate(candidate.animation);
    assert.equal(report.passed, true, `${recipe.id} scored ${report.score}: ${report.warns.join('; ')}`);
  }
});

test('themes replace known recipe colors without mutating the source recipe', () => {
  const request = {
    prompt: 'A platform intelligence orbit',
    recipe: 'executive-orbit' as BuiltInRecipeId,
    preset: 'ambient' as const,
    maxAttempts: 1,
  };
  const original = JSON.stringify(buildRecipeCandidate(request).animation);
  const themed = JSON.stringify(buildRecipeCandidate({
    ...request,
    theme: { primary: '#ff0000', accent: '#00ff00' },
  }).animation);
  const rebuilt = JSON.stringify(buildRecipeCandidate(request).animation);

  assert.notEqual(themed, original);
  assert.equal(rebuilt, original);
});

test('public recipe demos match the SDK recipe sources', async () => {
  for (const filename of [
    'check-mark-01.json',
    'sample-executive-orbit-01.json',
    'sample-milestone-bloom-01.json',
    'sample-signal-convergence-01.json',
  ]) {
    const [source, publicDemo] = await Promise.all([
      fs.readFile(path.join('src', 'motionproof', 'recipe-assets', filename), 'utf8'),
      fs.readFile(path.join('public', 'animations', 'final', filename), 'utf8'),
    ]);
    assert.equal(publicDemo, source, `${filename} public demo must match the SDK source`);
  }
});
