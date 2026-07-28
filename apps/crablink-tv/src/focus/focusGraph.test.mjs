import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chooseNextFocus,
  wrappedFocusIndex,
} from './focusGraph.js';

function rect(left, top, width = 100, height = 100) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

test('moves right to the closest same-row target', () => {
  const result = chooseNextFocus(
    rect(0, 0),
    [
      {
        id: 'diagonal',
        rect: rect(110, 180),
      },
      {
        id: 'same-row',
        rect: rect(120, 8),
      },
      {
        id: 'far-row',
        rect: rect(350, 0),
      },
    ],
    'right',
  );

  assert.equal(result?.id, 'same-row');
});

test('moves down to the closest same-column target', () => {
  const result = chooseNextFocus(
    rect(0, 0),
    [
      {
        id: 'diagonal',
        rect: rect(170, 120),
      },
      {
        id: 'same-column',
        rect: rect(4, 130),
      },
    ],
    'down',
  );

  assert.equal(result?.id, 'same-column');
});

test('rejects candidates outside the requested direction', () => {
  const result = chooseNextFocus(
    rect(200, 200),
    [
      {
        id: 'left',
        rect: rect(20, 200),
      },
      {
        id: 'up',
        rect: rect(200, 20),
      },
    ],
    'right',
  );

  assert.equal(result, null);
});

test('returns deterministic first-source ordering for ties', () => {
  const result = chooseNextFocus(
    rect(0, 0),
    [
      {
        id: 'first',
        rect: rect(120, 0),
      },
      {
        id: 'second',
        rect: rect(120, 0),
      },
    ],
    'right',
  );

  assert.equal(result?.id, 'first');
});

test('rejects unknown directions without guessing', () => {
  const result = chooseNextFocus(
    rect(0, 0),
    [
      {
        id: 'candidate',
        rect: rect(120, 0),
      },
    ],
    'forward',
  );

  assert.equal(result, null);
});


test('modal Tab focus advances and wraps', () => {
  assert.equal(
    wrappedFocusIndex(0, 3),
    1,
  );

  assert.equal(
    wrappedFocusIndex(2, 3),
    0,
  );
});

test('modal Shift+Tab focus reverses and wraps', () => {
  assert.equal(
    wrappedFocusIndex(2, 3, true),
    1,
  );

  assert.equal(
    wrappedFocusIndex(0, 3, true),
    2,
  );
});

test('modal focus enters a valid edge when current focus is outside', () => {
  assert.equal(
    wrappedFocusIndex(-1, 4),
    0,
  );

  assert.equal(
    wrappedFocusIndex(-1, 4, true),
    3,
  );
});

test('modal focus rejects empty or invalid scopes', () => {
  assert.equal(
    wrappedFocusIndex(0, 0),
    -1,
  );

  assert.equal(
    wrappedFocusIndex(0, Number.NaN),
    -1,
  );
});
