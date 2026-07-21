import assert from 'node:assert/strict';
import test from 'node:test';
import { ATTRIBUTION_FLOW_MOTION_SPEC, CONTEXT_SEQUENCE_MOTION_SPEC } from '../generator/archetypes.ts';
import { resolvePlaybackPolicy } from './playback-policy.ts';

test('production playback pauses transport while out of view', () => {
  assert.equal(resolvePlaybackPolicy(ATTRIBUTION_FLOW_MOTION_SPEC, { inView: false, reducedMotion: false }).mode, 'pause');
  assert.equal(resolvePlaybackPolicy(ATTRIBUTION_FLOW_MOTION_SPEC, { inView: true, reducedMotion: false }).mode, 'play');
});

test('reduced motion always resolves to the declared poster', () => {
  const policy = resolvePlaybackPolicy(ATTRIBUTION_FLOW_MOTION_SPEC, { inView: true, reducedMotion: true });
  assert.deepEqual(policy, { mode: 'poster', loop: false, posterFrame: 0.52 });
});

test('step-driven narratives require an explicit active state', () => {
  assert.equal(resolvePlaybackPolicy(CONTEXT_SEQUENCE_MOTION_SPEC, { inView: true, reducedMotion: false }).mode, 'pause');
  assert.equal(resolvePlaybackPolicy(CONTEXT_SEQUENCE_MOTION_SPEC, { inView: true, reducedMotion: false, active: true }).mode, 'play');
});
