import assert from 'node:assert/strict';
import test from 'node:test';
import { ATTRIBUTION_FLOW_MOTION_SPEC } from './archetypes.ts';
import { describeMotionSpec, validateMotionSpec } from './motion-spec.ts';

test('production motion specification validates semantic, responsive, and reduced-motion contracts', () => {
  const spec = validateMotionSpec(ATTRIBUTION_FLOW_MOTION_SPEC);
  assert.equal(spec.responsiveVariants.filter((variant) => variant.required).length, 2);
  assert.ok(spec.semanticRoles.some((role) => role.kind === 'outcome'));
  assert.deepEqual(spec.reducedMotion.preserveRoles, ['sources', 'rails', 'decision-hub', 'outcome']);
});

test('motion specification rejects reduced-motion roles that do not exist', () => {
  const invalid = structuredClone(ATTRIBUTION_FLOW_MOTION_SPEC);
  invalid.reducedMotion.preserveRoles.push('missing-role');
  assert.throws(() => validateMotionSpec(invalid), /missing-role/);
});

test('motion contract produces generation-ready guidance', () => {
  const prompt = describeMotionSpec(ATTRIBUTION_FLOW_MOTION_SPEC);
  assert.match(prompt, /desktop 16:9 horizontal/);
  assert.match(prompt, /Reduced motion: poster/);
  assert.match(prompt, /Constant-velocity linear easing/);
});
