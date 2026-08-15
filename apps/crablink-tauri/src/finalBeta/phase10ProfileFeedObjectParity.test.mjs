import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  assertPublicationPageV1,
  assertPublicationSummaryV1,
} from '../../../../packages/crablink-core/src/publicationSummary.js';

import {
  composeLocalFollowingFeed,
} from '../../../../packages/crablink-core/src/localFollowingFeed.js';

import {
  createProfileTimelineModel,
} from '../pages/profile/profileTimelineModel.js';

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const HASH_C =
  'c'.repeat(
    64,
  );

const profileModelUrl =
  new URL(
    '../pages/profile/profileTimelineModel.js',
    import.meta.url,
  );

const homeFeedUrl =
  new URL(
    '../../../../packages/crablink-core/src/localFollowingFeed.js',
    import.meta.url,
  );

function publication(
  {
    publicationId =
      'parity-001',

    publishedAt =
      '2026-08-10T01:00:00.000Z',

    updatedAt =
      publishedAt,

    pinned =
      false,

    access =
      'paid',

    kind =
      'post',
  } = {},
) {
  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId,

    kind,

    crabUrl:
      `crab://${HASH_A}.${kind}`,

    title:
      `Publication ${publicationId}`,

    summary:
      `Summary for ${publicationId}`,

    creator: {
      username:
        'alice',

      displayName:
        'Alice',

      profileUrl:
        'crab://@alice',

      avatarCid:
        `b3:${HASH_B}`,
    },

    publishedAt,
    updatedAt,

    visibility:
      'public',

    access,

    thumbnail: {
      kind:
        'image',

      cid:
        `b3:${HASH_C}`,

      alt:
        'Parity thumbnail',
    },

    references: {
      manifestCid:
        `b3:${HASH_A}`,

      contentCid:
        `b3:${HASH_B}`,

      siteUrl:
        'crab://site/example',
    },

    pinned,
  };
}

function page(
  items,
) {
  return {
    schema:
      'crablink.publication-page.v1',

    items,

    nextCursor:
      null,

    hasMore:
      false,
  };
}

function followingRecord() {
  return {
    schema:
      'crablink.local-following.v1',

    entries: [
      {
        profileRef:
          'crab://@alice',

        username:
          'alice',

        followedAt:
          '2026-08-10T00:00:00.000Z',

        lastTimelineCursor:
          null,

        lastRefreshAt:
          null,
      },
    ],

    updatedAt:
      '2026-08-10T00:00:00.000Z',
  };
}

function profileModelFor(
  items,
) {
  return createProfileTimelineModel({
    username:
      'alice',

    status:
      'ready',

    activeTab:
      'posts',

    isOwner:
      false,

    page:
      page(
        items,
      ),
  });
}

function homeFeedFor(
  items,
) {
  return composeLocalFollowingFeed({
    followingRecord:
      followingRecord(),

    creatorPages: [
      {
        username:
          'alice',

        page:
          page(
            items,
          ),
      },
    ],
  });
}

test(
  'Phase 10A5 canonical PublicationSummaryV1 carries the complete shared display object',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    assert.deepEqual(
      Object.keys(
        reviewed,
      ),
      [
        'schema',
        'publicationId',
        'kind',
        'crabUrl',
        'title',
        'summary',
        'creator',
        'publishedAt',
        'updatedAt',
        'visibility',
        'access',
        'thumbnail',
        'references',
        'pinned',
      ],
    );

    assert.equal(
      reviewed.schema,
      'crablink.publication-summary.v1',
    );
  },
);

test(
  'Phase 10A5 Profile preserves the canonical publication object without a second DTO',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    const reviewedPage =
      assertPublicationPageV1(
        page([
          reviewed,
        ]),
      );

    const model =
      createProfileTimelineModel({
        username:
          'alice',

        status:
          'ready',

        page:
          reviewedPage,
      });

    assert.deepEqual(
      model.postItems[0],
      reviewed,
    );
  },
);

test(
  'Phase 10A5 Home preserves the canonical publication object without a second DTO',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    const feed =
      homeFeedFor([
        reviewed,
      ]);

    assert.deepEqual(
      feed.items[0],
      reviewed,
    );
  },
);

test(
  'Phase 10A5 Profile and Home expose exactly equal publication objects',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    const profile =
      profileModelFor([
        reviewed,
      ]);

    const home =
      homeFeedFor([
        reviewed,
      ]);

    assert.deepEqual(
      profile.postItems[0],
      home.items[0],
    );

    assert.deepEqual(
      Object.keys(
        profile.postItems[0],
      ),
      Object.keys(
        home.items[0],
      ),
    );
  },
);

test(
  'Phase 10A5 nested creator thumbnail and reference projections remain identical',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    const profile =
      profileModelFor([
        reviewed,
      ])
        .postItems[0];

    const home =
      homeFeedFor([
        reviewed,
      ])
        .items[0];

    assert.deepEqual(
      profile.creator,
      home.creator,
    );

    assert.deepEqual(
      profile.thumbnail,
      home.thumbnail,
    );

    assert.deepEqual(
      profile.references,
      home.references,
    );

    assert.equal(
      Object.isFrozen(
        profile.creator,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        home.creator,
      ),
      true,
    );
  },
);

test(
  'Phase 10A5 paid posture visibility and canonical route remain object-identical',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication({
          access:
            'paid',
        }),
      );

    const profile =
      profileModelFor([
        reviewed,
      ])
        .postItems[0];

    const home =
      homeFeedFor([
        reviewed,
      ])
        .items[0];

    for (
      const field
      of [
        'crabUrl',
        'visibility',
        'access',
        'publishedAt',
        'updatedAt',
      ]
    ) {
      assert.equal(
        profile[field],
        home[field],
      );
    }

    assert.equal(
      profile.access,
      'paid',
    );

    assert.equal(
      profile.visibility,
      'public',
    );
  },
);

test(
  'Phase 10A5 pinned Profile presentation does not create a different Home object',
  () => {
    const olderPinned =
      assertPublicationSummaryV1(
        publication({
          publicationId:
            'older-pinned',

          publishedAt:
            '2026-08-10T01:00:00.000Z',

          pinned:
            true,
        }),
      );

    const newerRegular =
      assertPublicationSummaryV1(
        publication({
          publicationId:
            'newer-regular',

          publishedAt:
            '2026-08-10T02:00:00.000Z',

          pinned:
            false,
        }),
      );

    const profile =
      profileModelFor([
        olderPinned,
        newerRegular,
      ]);

    const home =
      homeFeedFor([
        olderPinned,
        newerRegular,
      ]);

    assert.equal(
      profile.pinnedPublication
        .publicationId,
      'older-pinned',
    );

    assert.deepEqual(
      home.items.map(
        (
          item,
        ) =>
          item.publicationId,
      ),
      [
        'newer-regular',
        'older-pinned',
      ],
    );

    const homePinned =
      home.items.find(
        (
          item,
        ) =>
          item.publicationId ===
          'older-pinned',
      );

    assert.deepEqual(
      profile.pinnedPublication,
      homePinned,
    );
  },
);

test(
  'Phase 10A5 malformed publication fields fail closed on both Profile and Home',
  () => {
    const malformed = {
      ...publication(),
      followerCount:
        500,
    };

    assert.throws(
      () =>
        profileModelFor([
          malformed,
        ]),
    );

    assert.throws(
      () =>
        homeFeedFor([
          malformed,
        ]),
    );
  },
);

test(
  'Phase 10A5 Profile and Home core both invoke the canonical page validator',
  async () => {
    const [
      profileSource,
      homeSource,
    ] =
      await Promise.all([
        readFile(
          profileModelUrl,
          'utf8',
        ),

        readFile(
          homeFeedUrl,
          'utf8',
        ),
      ]);

    assert.match(
      profileSource,
      /assertPublicationPageV1/,
    );

    assert.match(
      homeSource,
      /assertPublicationPageV1/,
    );

    assert.match(
      profileSource,
      /FINAL_BETA_PHASE10A5_PROFILE_FEED_OBJECT_PARITY_V1/,
    );
  },
);

test(
  'Phase 10A5 canonical objects contain no graph ranking or economic confirmation fields',
  () => {
    const reviewed =
      assertPublicationSummaryV1(
        publication(),
      );

    const profile =
      profileModelFor([
        reviewed,
      ])
        .postItems[0];

    const home =
      homeFeedFor([
        reviewed,
      ])
        .items[0];

    for (
      const field
      of [
        'followerCount',
        'followingCount',
        'engagementScore',
        'rank',
        'paidRank',
        'networkConfirmed',
        'receipt',
        'entitlement',
        'walletBalance',
        'ledgerBalance',
      ]
    ) {
      assert.equal(
        profile[field],
        undefined,
      );

      assert.equal(
        home[field],
        undefined,
      );
    }
  },
);
