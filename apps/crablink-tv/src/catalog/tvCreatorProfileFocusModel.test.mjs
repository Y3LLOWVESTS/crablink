import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CREATOR_PROFILE_FOCUS_KIND,
  TV_CREATOR_PROFILE_FOCUS_LIMITS,
  TV_CREATOR_PROFILE_FOCUS_REASON,
  TV_CREATOR_PROFILE_FOCUS_SCHEMA,
  createIdleTvCreatorProfileFocusRequest,
  createTvCreatorProfileFocusRequest,
  normalizeTvCreatorProfileFocusKey,
} from './tvCreatorProfileFocusModel.js';

test('creator profile focus constants and idle request are explicit and immutable', () => {
  assert.equal(
    TV_CREATOR_PROFILE_FOCUS_SCHEMA,
    'crablink.tv.creator-profile-focus.v1',
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_PROFILE_FOCUS_KIND,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_PROFILE_FOCUS_REASON,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_PROFILE_FOCUS_LIMITS,
    ),
    true,
  );

  const idle =
    createIdleTvCreatorProfileFocusRequest();

  assert.equal(
    idle.kind,
    TV_CREATOR_PROFILE_FOCUS_KIND.NONE,
  );

  assert.equal(
    idle.focusKey,
    null,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('valid creator profile focus keys produce frozen return requests', () => {
  const request =
    createTvCreatorProfileFocusRequest({
      returnFocusKey:
        'creator-browse-creator-space',

      reason:
        TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED,
    });

  assert.equal(
    request.schema,
    TV_CREATOR_PROFILE_FOCUS_SCHEMA,
  );

  assert.equal(
    request.kind,
    TV_CREATOR_PROFILE_FOCUS_KIND.RETURN,
  );

  assert.equal(
    request.focusKey,
    'creator-browse-creator-space',
  );

  assert.equal(
    request.reason,
    TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED,
  );

  assert.equal(
    Object.isFrozen(request),
    true,
  );
});

test('unsafe or empty focus keys fall back to creator browse search', () => {
  for (const value of [
    '',
    ' ',
    '../escape',
    '[bad]',
    'bad focus',
    '"quote"',
    'x'.repeat(180),
    null,
    undefined,
  ]) {
    assert.equal(
      normalizeTvCreatorProfileFocusKey(value),
      TV_CREATOR_PROFILE_FOCUS_LIMITS.FALLBACK_FOCUS_KEY,
      String(value),
    );
  }
});

test('catalog refresh focus request uses explicit refresh reason', () => {
  const request =
    createTvCreatorProfileFocusRequest({
      returnFocusKey:
        'creator-browse-refresh-card',

      reason:
        TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH,
    });

  assert.equal(
    request.kind,
    TV_CREATOR_PROFILE_FOCUS_KIND.RETURN,
  );

  assert.equal(
    request.focusKey,
    'creator-browse-refresh-card',
  );

  assert.equal(
    request.reason,
    TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH,
  );
});
