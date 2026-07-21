import test from 'node:test';
import assert from 'node:assert/strict';

import { AnimatedValue, validateLottie, autoFixLottie } from './schema.ts';

const baseAnimation = (kso: unknown) => ({
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 60,
  w: 400,
  h: 400,
  layers: [
    {
      ty: 4,
      st: 0,
      ks: { o: kso, p: { a: 0, k: [200, 200] }, s: { a: 0, k: [100, 100] } },
      ip: 0,
      op: 60,
      shapes: [
        { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
        { ty: 'fl', c: { a: 0, k: [0.25, 0.56, 0.96, 1] } },
      ],
    },
  ],
});

test('AnimatedValue accepts static and animated forms', () => {
  assert.ok(AnimatedValue.safeParse({ a: 0, k: 100 }).success);
  assert.ok(AnimatedValue.safeParse({ a: 0, k: [200, 200] }).success);
  assert.ok(AnimatedValue.safeParse({
    a: 1,
    k: [{ t: 0, s: [0] }, { t: 30, s: [100] }],
  }).success);
});

test('AnimatedValue rejects a=1 with non-keyframe k', () => {
  assert.equal(AnimatedValue.safeParse({ a: 1, k: 100 }).success, false);
  assert.equal(AnimatedValue.safeParse({ a: 1, k: [] }).success, false);
  assert.equal(AnimatedValue.safeParse({ a: 1, k: [0, 100] }).success, false);
});

test('AnimatedValue rejects a=0 with keyframe-array k', () => {
  assert.equal(AnimatedValue.safeParse({
    a: 0,
    k: [{ t: 0, s: [0] }, { t: 30, s: [100] }],
  }).success, false);
});

test('validateLottie rejects animation with mismatched animated flag', () => {
  assert.throws(() => validateLottie(baseAnimation({ a: 1, k: 100 })));
});

test('groups without tr are rejected strictly and repaired by autofix', () => {
  const anim = {
    v: '5.7.4', fr: 60, ip: 0, op: 60, w: 400, h: 400,
    layers: [{
      ty: 4,
      st: 0,
      ks: { o: { a: 0, k: 100 } },
      ip: 0, op: 60,
      shapes: [{
        ty: 'gr',
        nm: 'NoTrGroup',
        it: [
          { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [80, 80] } },
          { ty: 'fl', c: { a: 0, k: [0.25, 0.56, 0.96, 1] } },
        ],
      }],
    }],
  };

  assert.throws(() => validateLottie(anim), /missing its tr/);

  const fixed = autoFixLottie(anim as Record<string, unknown>);
  assert.doesNotThrow(() => validateLottie(fixed));
  const it = ((fixed.layers as any[])[0].shapes[0].it as any[]);
  assert.equal(it[it.length - 1].ty, 'tr');
});

test('missing layer start time is rejected strictly and repaired by autofix', () => {
  const anim = baseAnimation({ a: 0, k: 100 });
  delete (anim.layers[0] as { st?: number }).st;

  assert.throws(() => validateLottie(anim), /st/);

  const fixed = autoFixLottie(anim as Record<string, unknown>);
  assert.doesNotThrow(() => validateLottie(fixed));
  assert.equal((fixed.layers as Array<{ st: number }>)[0].st, 0);
});

test('autoFixLottie repairs animated-flag mismatches so strict parse passes', () => {
  // a=1 with static k → downgraded to a=0
  const fixed1 = autoFixLottie(baseAnimation({ a: 1, k: 100 }) as Record<string, unknown>);
  assert.doesNotThrow(() => validateLottie(fixed1));

  // a=0 with keyframe k → upgraded to a=1
  const fixed2 = autoFixLottie(
    baseAnimation({ a: 0, k: [{ t: 0, s: [0] }, { t: 30, s: [100] }] }) as Record<string, unknown>,
  );
  assert.doesNotThrow(() => validateLottie(fixed2));
  const ks = (fixed2.layers as Record<string, unknown>[])[0].ks as Record<string, { a: number }>;
  assert.equal(ks.o.a, 1);
});
