import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCHETYPES, buildArchetypePrompt, buildVariantPlan } from './archetypes.ts';

test('buildVariantPlan returns multi-variant requests for a theme', () => {
  const plan = buildVariantPlan('revenue dashboard motion');

  assert.ok(plan.length > 0);
  assert.ok(plan.every((item) => item.prompt.includes('revenue dashboard motion')));
  assert.ok(plan.some((item) => item.preset === 'technical'));
});

test('buildArchetypePrompt layers archetype intent on top of a base theme', () => {
  const prompt = buildArchetypePrompt(ARCHETYPES[0], 'pipeline quality signal');

  assert.match(prompt, /pipeline quality signal/i);
  assert.match(prompt, /stacked indicator bars/i);
  assert.match(prompt, /electric blue/i);
});

test('production archetypes carry explicit runtime and accessibility contracts', () => {
  const attribution = ARCHETYPES.find((archetype) => archetype.slug === 'attribution-flow');
  assert.ok(attribution?.motionSpec);
  assert.equal(attribution.motionSpec.trigger, 'in-view');
  assert.equal(attribution.motionSpec.responsiveVariants.length, 2);
  assert.doesNotMatch(buildArchetypePrompt(attribution, 'buyer evidence'), /bounce|elastic/i);
});
