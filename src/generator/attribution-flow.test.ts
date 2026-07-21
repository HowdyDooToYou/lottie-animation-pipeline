import assert from 'node:assert/strict';
import test from 'node:test';
import { ATTRIBUTION_FLOW_MOTION_SPEC } from './archetypes.ts';
import { buildAttributionFlowAnimation } from './attribution-flow.ts';
import { productionQualityGate } from './production-quality.ts';
import { validateLottie } from './schema.ts';

for (const variant of ['desktop', 'mobile'] as const) {
  test(`attribution flow ${variant} is strict-valid and production promotable`, () => {
    const animation = buildAttributionFlowAnimation(variant);
    assert.doesNotThrow(() => validateLottie(animation));
    const report = productionQualityGate(animation, ATTRIBUTION_FLOW_MOTION_SPEC, variant);
    assert.equal(report.passed, true, report.issues.join('; '));
    assert.equal(report.score, 100);
    assert.ok(report.linearAnimatedChannels > 0, 'transport packets should use an explicit constant-velocity exception');
  });
}

test('production gate rejects a missing responsive companion', () => {
  const animation = buildAttributionFlowAnimation('desktop');
  const production = ((animation.meta as Record<string, unknown>).production as Record<string, unknown>);
  production.companionVariants = [];
  const report = productionQualityGate(animation, ATTRIBUTION_FLOW_MOTION_SPEC, 'desktop');
  assert.equal(report.passed, false);
  assert.ok(report.issues.some((issue) => issue.includes('companion variant')));
});
