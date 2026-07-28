import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CREATOR_PROFILE_KIND,
  TV_CREATOR_PROFILE_LIMITS,
  TV_CREATOR_PROFILE_SCHEMA,
  createIdleTvCreatorProfile,
  projectTvCreatorProfile,
} from './tvCreatorProfileModel.js';

const IMAGE_HASH =
  'a'.repeat(64);

test('creator profile constants and idle state are explicit and immutable', () => {
  assert.equal(
    TV_CREATOR_PROFILE_SCHEMA,
    'crablink.tv.creator-profile.v1',
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_PROFILE_KIND,
    ),
    true,
  );

  assert.equal(
    Object.isFrozen(
      TV_CREATOR_PROFILE_LIMITS,
    ),
    true,
  );

  const idle =
    createIdleTvCreatorProfile();

  assert.equal(
    idle.kind,
    TV_CREATOR_PROFILE_KIND.IDLE,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('catalog creator site routes become bounded creator profiles', () => {
  const profile =
    projectTvCreatorProfile(
      {
        kind:
          'creator',

        title:
          'Creator Space',

        subtitle:
          'Reviewed videos and streams',

        crabUrl:
          'CRAB://Creator Space',
      },
      {
        initiatingFocusKey:
          'creator-browse-creator-space',
      },
    );

  assert.equal(
    profile.schema,
    TV_CREATOR_PROFILE_SCHEMA,
  );

  assert.equal(
    profile.kind,
    TV_CREATOR_PROFILE_KIND.READY,
  );

  assert.equal(
    profile.title,
    'Creator Space',
  );

  assert.equal(
    profile.siteName,
    'creator-space',
  );

  assert.equal(
    profile.profileCrabUrl,
    'crab://creator-space',
  );

  assert.equal(
    profile.returnFocusKey,
    'creator-browse-creator-space',
  );

  assert.equal(
    Object.isFrozen(profile.route),
    true,
  );
});

test('non-creator and non-site routes fail closed', () => {
  for (const item of [
    {
      kind:
        'asset',

      title:
        'Image asset',

      crabUrl:
        `crab://${IMAGE_HASH}.image`,
    },
    {
      kind:
        'creator',

      title:
        'Foreign route',

      crabUrl:
        'https://example.invalid/profile',
    },
    {
      kind:
        'creator',

      title:
        'Malformed route',

      crabUrl:
        'not a route',
    },
  ]) {
    const profile =
      projectTvCreatorProfile(
        item,
      );

    assert.equal(
      profile.kind,
      TV_CREATOR_PROFILE_KIND.REJECTED,
      item.title,
    );

    assert.equal(
      profile.profileCrabUrl,
      null,
    );
  }
});

test('creator profile bounds text and return focus key', () => {
  const profile =
    projectTvCreatorProfile(
      {
        kind:
          'creator',

        title:
          'T'.repeat(160),

        subtitle:
          'S'.repeat(260),

        crabUrl:
          'crab://Long Creator',
      },
      {
        initiatingFocusKey:
          'f'.repeat(220),
      },
    );

  assert.equal(
    profile.kind,
    TV_CREATOR_PROFILE_KIND.READY,
  );

  assert.equal(
    profile.title.length,
    TV_CREATOR_PROFILE_LIMITS.TITLE_CHARS,
  );

  assert.equal(
    profile.subtitle.length,
    TV_CREATOR_PROFILE_LIMITS.SUBTITLE_CHARS,
  );

  assert.equal(
    profile.returnFocusKey.length,
    TV_CREATOR_PROFILE_LIMITS.FOCUS_KEY_CHARS,
  );
});
