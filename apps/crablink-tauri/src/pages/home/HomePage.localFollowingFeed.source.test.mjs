import assert from 'node:assert/strict';
import {
  readFileSync,
} from 'node:fs';
import test from 'node:test';

const page =
  readFileSync(
    new URL(
      './HomePage.jsx',
      import.meta.url,
    ),
    'utf8',
  );

const css =
  readFileSync(
    new URL(
      './home.css',
      import.meta.url,
    ),
    'utf8',
  );

function consumerSource() {
  const start =
    page.indexOf(
      'function ConsumerHome(',
    );

  const end =
    page.indexOf(
      'function onboardingIdentityLabel',
      start,
    );

  assert.ok(
    start >= 0,
  );

  assert.ok(
    end >
      start,
  );

  return page.slice(
    start,
    end,
  );
}

test(
  'phase9a12 consumer Home marker is installed',
  () => {
    assert.match(
      page,
      /FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER_WIRING_V1/,
    );

    assert.match(
      page,
      /data-final-beta-home-feed/,
    );
  },
);

test(
  'phase9a12 reuses the reviewed publication adapter boundary',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /app\?\.clients\?\.publications/,
    );

    assert.match(
      consumer,
      /createPublicationAdapter/,
    );

    assert.match(
      consumer,
      /app\.clients\.gateway/,
    );
  },
);

test(
  'phase9a12 reuses local following and durable cache adapters',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /followingPort:\s*localFollowingPort/,
    );

    assert.match(
      consumer,
      /cachePort:\s*HOME_FEED_CACHE_PORT/,
    );

    assert.match(
      page,
      /readLocalFollowingFeedCache/,
    );

    assert.match(
      page,
      /writeLocalFollowingFeedCache/,
    );
  },
);

test(
  'phase9a12 live consumer invokes the reviewed refresh coordinator',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /refreshLocalFollowingFeed/,
    );

    assert.match(
      consumer,
      /publicationPort:\s*publicationClient/,
    );

    assert.match(
      consumer,
      /new Date\(\)\.toISOString\(\)/,
    );
  },
);

test(
  'phase9a12 live failure falls back to reviewed offline projection',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /loadOfflineLocalFollowingFeed/,
    );

    assert.match(
      consumer,
      /stale-offline/,
    );

    assert.match(
      consumer,
      /source:\s*'cache'/,
    );
  },
);

test(
  'phase9a12 does not treat empty cache as fabricated feed activity',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /No followed activity yet/,
    );

    assert.match(
      consumer,
      /cache misses never create\s+placeholder posts/,
    );
  },
);

test(
  'phase9a12 renders reviewed publication summaries through FeedCard',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /<FeedCard/,
    );

    assert.match(
      consumer,
      /publication\.creator\.username/,
    );

    assert.match(
      consumer,
      /publication\.publishedAt/,
    );

    assert.match(
      consumer,
      /publication\.summary/,
    );
  },
);

test(
  'phase9a12 publication opening stays inside crab route navigation',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /publication\.crabUrl/,
    );

    assert.match(
      consumer,
      /startsWith\(\s*'crab:\/\/'/,
    );

    assert.match(
      consumer,
      /app\?\.navigate/,
    );
  },
);

test(
  'phase9a12 inactive retained Home tabs do not start refresh activity',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /app\?\.isActiveTab\s*===\s*false/,
    );

    assert.match(
      consumer,
      /return undefined/,
    );
  },
);

test(
  'phase9a12 consumer exposes explicit refresh without inventing polling',
  () => {
    const consumer =
      consumerSource();

    assert.match(
      consumer,
      /setRefreshSequence/,
    );

    assert.match(
      consumer,
      /\?\s*'Refreshing'\s*:\s*'Refresh'/,
    );

    assert.doesNotMatch(
      consumer,
      /setInterval/,
    );
  },
);

test(
  'phase9a12 consumer grants no direct transport social graph ranking or economic authority',
  () => {
    const consumer =
      consumerSource();

    for (
      const forbidden
      of [
        'fetch(',
        'XMLHttpRequest',
        'callTauri(',
        'invoke(',
        'localStorage',
        'sessionStorage',
        'followerCount',
        'followingCount',
        'walletMutation',
        'ledgerMutation',
        'receiptAuthority',
        'settlementAuthority',
        'paidRank',
        'globalFeedCursor',
      ]
    ) {
      assert.equal(
        consumer.includes(
          forbidden,
        ),
        false,
        `forbidden Home consumer authority token: ${forbidden}`,
      );
    }
  },
);

test(
  'phase9a12 Home feed styling uses route-owned shared theme tokens',
  () => {
    for (
      const required
      of [
        'FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER_WIRING_V1',
        '.cl-home-feed-card',
        '.cl-home-feed-list',
        '.cl-home-feed-notice',
        '.cl-home-feed-empty',
        'var(--cl-border)',
        'var(--cl-surface)',
        'var(--cl-muted)',
      ]
    ) {
      assert.equal(
        css.includes(
          required,
        ),
        true,
        `missing Phase 9A12 Home CSS fragment: ${required}`,
      );
    }
  },
);
