import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const viewUrl =
  new URL(
    './ProfilePublicView.jsx',
    import.meta.url,
  );

async function source() {
  return readFile(
    viewUrl,
    'utf8',
  );
}

test(
  'phase8a7 marks the public-profile local following integration',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /FINAL_BETA_PHASE8A7_PUBLIC_PROFILE_LOCAL_FOLLOW_UI_V1/,
    );

    assert.match(
      value,
      /profileLocalFollowingController/,
    );

    assert.match(
      value,
      /localFollowingPort/,
    );
  },
);

test(
  'phase8a7 prefers an injected reviewed port and falls back to desktop adapter',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /app\?\.clients[\s\S]*\?\.localFollowing/,
    );

    assert.match(
      value,
      /readLocalFollowing/,
    );

    assert.match(
      value,
      /writeLocalFollowing/,
    );
  },
);

test(
  'phase8a7 reads local following state for visitor profiles',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /readProfileLocalFollowing/,
    );

    assert.match(
      value,
      /isOwner === true/,
    );

    assert.match(
      value,
      /setLocalFollowingState/,
    );
  },
);

test(
  'phase8a7 wires local Follow through reviewed domain and persistence orchestration',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /followProfileLocalFollowing/,
    );

    assert.match(
      value,
      /followPublicProfileLocally/,
    );

    assert.match(
      value,
      />\s*Follow\s*</,
    );
  },
);

test(
  'phase8a7 displays Following locally and explicit Unfollow',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /Following locally/,
    );

    assert.match(
      value,
      /unfollowProfileLocalFollowing/,
    );

    assert.match(
      value,
      />\s*Unfollow\s*</,
    );
  },
);

test(
  'phase8a7 hides local follow controls from the profile owner',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /isOwner === false[\s\S]*ProfileLocalFollowingActions/,
    );
  },
);

test(
  'phase8a7 provides honest loading saving and failure states',
  async () => {
    const value =
      await source();

    for (const required of [
      "status === 'loading'",
      "status === 'saving'",
      "status === 'error'",
      'Loading follow state',
      'Saving follow',
      'Saving unfollow',
      'Local follow unavailable',
      'Retry follow state',
    ]) {
      assert.equal(
        value.includes(
          required,
        ),
        true,
        `missing local following state: ${required}`,
      );
    }
  },
);

test(
  'phase8a7 adds no public counts browser storage or network relationship call',
  async () => {
    const value =
      await source();

    for (const forbidden of [
      'localStorage',
      'sessionStorage',
      'followerCount',
      'followingCount',
      'uploadFollowing',
      'networkConfirmed',
      'creatorNotified',
      'follow_profile_network',
      'unfollow_profile_network',
    ]) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
        `public profile contains forbidden following surface: ${forbidden}`,
      );
    }
  },
);
