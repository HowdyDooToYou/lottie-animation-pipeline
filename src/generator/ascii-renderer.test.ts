import test from 'node:test';
import assert from 'node:assert/strict';

import { renderAsciiAnimation, clearFrame, setPixel } from './ascii-renderer.ts';

test('renderAsciiAnimation generates valid frame sequence', () => {
  const anim = {
    frames: [
      { width: 10, height: 5, content: '.....\n.....\n.....\n.....\n.....' },
      { width: 10, height: 5, content: '..*..\n.....\n.....\n.....\n.....' },
    ],
    fps: 10,
  };

  const result = renderAsciiAnimation(anim);
  assert.ok(result.includes('*'));
  assert.ok(result.includes('```'));
});

test('renderAsciiAnimation handles empty animation', () => {
  const anim = {
    frames: [],
    fps: 10,
  };

  const result = renderAsciiAnimation(anim);
  assert.ok(result.includes('empty'));
});

test('clearFrame creates empty frame', () => {
  const frame = clearFrame(10, 5);
  assert.equal(frame.width, 10);
  assert.equal(frame.height, 5);
  assert.ok(frame.content.includes('.'));
});

test('setPixel modifies frame content', () => {
  const frame = clearFrame(10, 5);
  const modified = setPixel(frame, 2, 2, '*');
  assert.ok(modified.content.includes('*'));
});