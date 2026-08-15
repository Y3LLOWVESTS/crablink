import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const profileUrl =
  new URL(
    '../pages/profile/ProfilePublicView.jsx',
    import.meta.url,
  );

const controllerUrl =
  new URL(
    '../pages/profile/profileLocalFollowingController.js',
    import.meta.url,
  );

const homeUrl =
  new URL(
    '../pages/home/HomePage.jsx',
    import.meta.url,
  );

const appUrl =
  new URL(
    '../app/App.jsx',
    import.meta.url,
  );

async function sourceOf(
  url,
) {
  return readFile(
    url,
    'utf8',
  );
}

function compact(
  value,
) {
  return value
    .split(/\s+/u)
    .join('');
}

test(
  'Phase 10A4 public Profile Follow persists through the reviewed local-following controller',
  async () => {
    const profile =
      await sourceOf(
        profileUrl,
      );

    assert.match(
      profile,
      /followProfileLocalFollowing/,
    );

    assert.match(
      profile,
      /followPublicProfileLocally/,
    );

    assert.match(
      profile,
      /port:\s*followingClient/,
    );

    assert.match(
      profile,
      /record:\s*localFollowingState\.record/,
    );

    assert.match(
      profile,
      /record:\s*result\.record/,
    );

    assert.match(
      profile,
      /isFollowing:\s*result\.isFollowing/,
    );
  },
);

test(
  'Phase 10A4 local following controller writes only after a real local domain change',
  async () => {
    const controller =
      await sourceOf(
        controllerUrl,
      );

    assert.match(
      controller,
      /followLocalProfile/,
    );

    assert.match(
      controller,
      /mutation\.changed ===\s*false/,
    );

    assert.match(
      controller,
      /writeLocalFollowing/,
    );

    assert.match(
      controller,
      /changed:\s*true/,
    );
  },
);

test(
  'Phase 10A4 local following controller grants no network relationship authority',
  async () => {
    const controller =
      await sourceOf(
        controllerUrl,
      );

    for (
      const forbidden
      of [
        'fetch(',
        '.request(',
        'gateway.request',
        'callTauri',
        '/social/follow',
        '/social/unfollow',
        '/followers',
        '/following',
      ]
    ) {
      assert.equal(
        controller.includes(
          forbidden,
        ),
        false,
        `forbidden relationship transport token: ${forbidden}`,
      );
    }
  },
);

test(
  'Phase 10A4 Home refresh re-reads the reviewed local following port',
  async () => {
    const home =
      await sourceOf(
        homeUrl,
      );

    assert.match(
      home,
      /refreshLocalFollowingFeed/,
    );

    assert.match(
      home,
      /followingPort:\s*localFollowingPort/,
    );

    assert.match(
      home,
      /publicationPort:\s*publicationClient/,
    );
  },
);

test(
  'Phase 10A4 retained inactive Home performs no background refresh',
  async () => {
    const home =
      await sourceOf(
        homeUrl,
      );

    assert.match(
      home,
      /app\?\.isActiveTab ===\s*false/,
    );

    const inactiveGuard =
      home.indexOf(
        'app?.isActiveTab ===',
      );

    const refreshCall =
      home.indexOf(
        'await refreshLocalFollowingFeed',
      );

    assert.equal(
      inactiveGuard >= 0,
      true,
    );

    assert.equal(
      refreshCall > inactiveGuard,
      true,
    );
  },
);

test(
  'Phase 10A4 Home refresh lifecycle depends on active-tab transition',
  async () => {
    const home =
      compact(
        await sourceOf(
          homeUrl,
        ),
      );

    assert.match(
      home,
      /app\?\.isActiveTab,publicationClient,refreshSequence/,
    );
  },
);

test(
  'Phase 10A4 app shell supplies active-tab truth to retained routes',
  async () => {
    const app =
      compact(
        await sourceOf(
          appUrl,
        ),
      );

    assert.match(
      app,
      /isActiveTab:Boolean\(active\)/,
    );

    assert.match(
      app,
      /data-active=\{active\?'true':'false'\}/,
    );

    assert.match(
      app,
      /inert=\{active\?undefined:''\}/,
    );
  },
);

test(
  'Phase 10A4 same-tab route changes replace the rendered page key',
  async () => {
    const app =
      compact(
        await sourceOf(
          appUrl,
        ),
      );

    assert.match(
      app,
      /constrouteKey=\[/,
    );

    assert.match(
      app,
      /route\?\.kind\|\|'home'/,
    );

    assert.match(
      app,
      /route\?\.normalizedInput\|\|route\?\.rawInput\|\|'crab:\/\/home'/,
    );

    assert.match(
      app,
      /route\?\.refreshTick\|\|0/,
    );

    assert.match(
      app,
      /<Pagekey=\{routeKey\}/,
    );
  },
);

test(
  'Phase 10A4 profile Follow handler does not directly drive Home transport',
  async () => {
    const profile =
      await sourceOf(
        profileUrl,
      );

    assert.equal(
      profile.includes(
        'listCreatorPublications',
      ),
      true,
      'Profile timeline publication reads must remain available',
    );

    const followStart =
      profile.indexOf(
        'async function followPublicProfileLocally()',
      );

    const followEnd =
      profile.indexOf(
        'async function unfollowPublicProfileLocally()',
        followStart,
      );

    assert.equal(
      followStart >= 0,
      true,
      'Follow handler start missing',
    );

    assert.equal(
      followEnd > followStart,
      true,
      'Follow handler boundary missing',
    );

    const followBody =
      profile.slice(
        followStart,
        followEnd,
      );

    assert.equal(
      followBody.includes(
        'followProfileLocalFollowing',
      ),
      true,
      'Follow handler must use reviewed local-following controller',
    );

    for (
      const forbidden
      of [
        'refreshLocalFollowingFeed',
        'loadOfflineLocalFollowingFeed',
        'listCreatorPublications',
        'publicationClient',
        'crab://home?refresh',
      ]
    ) {
      assert.equal(
        followBody.includes(
          forbidden,
        ),
        false,
        `Follow handler must not directly drive Home transport: ${forbidden}`,
      );
    }
  },
);

test(
  'Phase 10A4 acceptance preserves local-first social and economic boundaries',
  async () => {
    const profile =
      await sourceOf(
        profileUrl,
      );

    const controller =
      await sourceOf(
        controllerUrl,
      );

    const home =
      await sourceOf(
        homeUrl,
      );

    const reviewed =
      [
        profile,
        controller,
        home,
      ]
        .join(
          '\n',
        );

    for (
      const forbidden
      of [
        'followerCount',
        'followingCount',
        'globalFeedCursor',
        'paidRanking',
        '/social/follow',
        '/social/unfollow',
      ]
    ) {
      assert.equal(
        reviewed.includes(
          forbidden,
        ),
        false,
        `forbidden Phase 10A4 authority token: ${forbidden}`,
      );
    }
  },
);
