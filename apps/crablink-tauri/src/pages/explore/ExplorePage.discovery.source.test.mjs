import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
} from 'node:url';

const HERE =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const page =
  fs.readFileSync(
    path.join(
      HERE,
      'ExplorePage.jsx',
    ),
    'utf8',
  );

const css =
  fs.readFileSync(
    path.join(
      HERE,
      'explore.css',
    ),
    'utf8',
  );

test(
  'phase10a3f replaces the Phase 3 placeholder with the reviewed discovery client',
  () => {
    assert.match(
      page,
      /FINAL_BETA_PHASE10A3F_EXPLORE_DISCOVERY_UI_V1/,
    );

    assert.match(
      page,
      /createExploreDiscoveryClient/,
    );

    assert.doesNotMatch(
      page,
      /Public discovery is not connected yet/,
    );
  },
);

test(
  'phase10a3f retained inactive Explore tabs perform no discovery request',
  () => {
    assert.match(
      page,
      /app\?\.isActiveTab ===\s*false/,
    );

    assert.match(
      page,
      /getExploreDiscovery/,
    );

    assert.match(
      page,
      /setRefreshSequence/,
    );
  },
);

test(
  'phase10a3f exposes explicit loading error empty and retry states',
  () => {
    for (
      const marker
      of [
        'LoadingState',
        'ErrorState',
        'EmptyState',
        'Try again',
        'Loading Explore',
      ]
    ) {
      assert.match(
        page,
        new RegExp(
          marker,
        ),
      );
    }
  },
);

test(
  'phase10a3f recent discovery renders through FeedCard',
  () => {
    assert.match(
      page,
      /recentPublications/,
    );

    assert.match(
      page,
      /<FeedCard/,
    );

    assert.match(
      page,
      /publication\.publishedAt/,
    );

    assert.match(
      page,
      /publication\.crabUrl/,
    );
  },
);

test(
  'phase10a3f creator discovery uses reviewed public profile projection without counters',
  () => {
    assert.match(
      page,
      /publicCreators/,
    );

    assert.match(
      page,
      /<ContentCard/,
    );

    assert.match(
      page,
      /creator\.profileUrl/,
    );

    assert.match(
      page,
      /Public profile/,
    );
  },
);

test(
  'phase10a3f site discovery uses SiteCard and remains truthful while metadata is absent',
  () => {
    assert.match(
      page,
      /templateSites/,
    );

    assert.match(
      page,
      /<SiteCard/,
    );

    assert.match(
      page,
      /No reviewed template sites yet/,
    );

    assert.match(
      page,
      /will not invent site cards from incomplete pointers/,
    );
  },
);

test(
  'phase10a3f navigation is restricted to crab routes',
  () => {
    assert.match(
      page,
      /startsWith\(\s*'crab:\/\/'/,
    );

    assert.match(
      page,
      /app\.navigate/,
    );
  },
);

test(
  'phase10a3f adds no direct transport polling or local following dependency',
  () => {
    for (
      const forbidden
      of [
        'fetch(',
        'callTauri',
        'invoke(',
        'setInterval(',
        'setTimeout(',
        'localFollowing',
        'refreshLocalFollowingFeed',
      ]
    ) {
      assert.equal(
        page.includes(
          forbidden,
        ),
        false,
        `forbidden Explore dependency: ${forbidden}`,
      );
    }
  },
);

test(
  'phase10a3f adds no social graph or ranking fields',
  () => {
    for (
      const forbidden
      of [
        'followerCount',
        'followingCount',
        'engagementScore',
        'paidRanking',
        'globalFeedCursor',
      ]
    ) {
      assert.equal(
        page.includes(
          forbidden,
        ),
        false,
        `forbidden Explore product field: ${forbidden}`,
      );
    }
  },
);

test(
  'phase10a3f route CSS uses shared theme tokens without local color ownership',
  () => {
    assert.match(
      css,
      /FINAL_BETA_PHASE10A3F_EXPLORE_DISCOVERY_UI_V1/,
    );

    for (
      const token
      of [
        '--cl-border',
        '--cl-surface',
        '--cl-surface-raised',
        '--cl-muted',
        '--cl-text',
        '--cl-space-',
        '--cl-radius-',
      ]
    ) {
      assert.match(
        css,
        new RegExp(
          token,
        ),
      );
    }

    assert.doesNotMatch(
      css,
      /--cl-explore-/,
    );

    assert.doesNotMatch(
      css,
      /#[0-9a-f]{3,8}\b/i,
    );

    assert.doesNotMatch(
      css,
      /rgba?\(/i,
    );

    assert.doesNotMatch(
      css,
      /hsla?\(/i,
    );
  },
);
