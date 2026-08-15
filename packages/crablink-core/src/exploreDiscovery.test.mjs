import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPLORE_DISCOVERY_AUTHORITY,
  EXPLORE_DISCOVERY_CATEGORIES,
  EXPLORE_DISCOVERY_DEFAULT_CREATOR_LIMIT,
  EXPLORE_DISCOVERY_DEFAULT_PUBLICATION_LIMIT,
  EXPLORE_DISCOVERY_DEFAULT_SITE_LIMIT,
  EXPLORE_DISCOVERY_MAX_CREATORS,
  EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
  EXPLORE_DISCOVERY_MAX_SITES,
  EXPLORE_DISCOVERY_SCHEMA,
  createEmptyExploreDiscovery,
  normalizeExploreDiscoveryRequest,
  normalizeExploreDiscoveryV1,
} from './exploreDiscovery.js';

const CID =
  `b3:${'a'.repeat(64)}`;

function creator(
  username,
) {
  return {
    username,
    displayName:
      username
        .charAt(0)
        .toUpperCase() +
      username.slice(1),
    profileUrl:
      `crab://@${username}`,
    avatarCid:
      CID,
  };
}

function publication({
  username = 'alice',
  publicationId = 'post-1',
  publishedAt = '2026-08-09T22:00:00.000Z',
  visibility = 'public',
} = {}) {
  return {
    schema:
      'crablink.publication-summary.v1',
    publicationId,
    kind:
      'post',
    crabUrl:
      `crab://${publicationId}.post`,
    title:
      publicationId,
    summary:
      'Public Explore fixture.',
    creator:
      creator(
        username,
      ),
    publishedAt,
    updatedAt:
      publishedAt,
    visibility,
    access:
      'free',
    thumbnail:
      null,
    references:
      null,
    pinned:
      false,
  };
}

function site({
  username = 'alice',
  siteUrl = 'crab://alice-site',
  updatedAt = '2026-08-09T21:00:00.000Z',
  templateId = 'creator_landing',
} = {}) {
  return {
    siteUrl,
    title:
      `${username} site`,
    summary:
      'Public template site.',
    creator:
      creator(
        username,
      ),
    templateId,
    updatedAt,
  };
}

test(
  'phase10a3a creates a strict empty Explore discovery projection',
  () => {
    const value =
      createEmptyExploreDiscovery();

    assert.equal(
      value.schema,
      EXPLORE_DISCOVERY_SCHEMA,
    );

    assert.deepEqual(
      value.recentPublications,
      [],
    );

    assert.deepEqual(
      value.publicCreators,
      [],
    );

    assert.deepEqual(
      value.templateSites,
      [],
    );
  },
);

test(
  'phase10a3a recent public content is canonical PublicationSummaryV1 newest first',
  () => {
    const value =
      normalizeExploreDiscoveryV1({
        schema:
          EXPLORE_DISCOVERY_SCHEMA,

        recentPublications: [
          publication({
            username:
              'bob',
            publicationId:
              'older',
            publishedAt:
              '2026-08-09T20:00:00.000Z',
          }),
          publication({
            username:
              'alice',
            publicationId:
              'newer',
            publishedAt:
              '2026-08-09T22:00:00.000Z',
          }),
        ],

        publicCreators:
          [],

        templateSites:
          [],
      });

    assert.deepEqual(
      value.recentPublications.map(
        (item) =>
          item.publicationId,
      ),
      [
        'newer',
        'older',
      ],
    );
  },
);

test(
  'phase10a3a non-public publication summaries fail closed',
  () => {
    for (
      const visibility
      of [
        'unlisted',
        'private',
        'deleted',
        'blocked',
        'moderated',
      ]
    ) {
      assert.throws(
        () =>
          normalizeExploreDiscoveryV1({
            schema:
              EXPLORE_DISCOVERY_SCHEMA,
            recentPublications: [
              publication({
                visibility,
              }),
            ],
            publicCreators:
              [],
            templateSites:
              [],
          }),
        /public summaries only/,
      );
    }
  },
);

test(
  'phase10a3a duplicate publication identities fail closed',
  () => {
    assert.throws(
      () =>
        normalizeExploreDiscoveryV1({
          schema:
            EXPLORE_DISCOVERY_SCHEMA,
          recentPublications: [
            publication(),
            publication(),
          ],
          publicCreators:
            [],
          templateSites:
            [],
        }),
      /duplicate identity/,
    );
  },
);

test(
  'phase10a3a public creators use transparent username ordering',
  () => {
    const value =
      normalizeExploreDiscoveryV1({
        schema:
          EXPLORE_DISCOVERY_SCHEMA,
        recentPublications:
          [],
        publicCreators: [
          creator(
            'zoe',
          ),
          creator(
            'alice',
          ),
          creator(
            'bob',
          ),
        ],
        templateSites:
          [],
      });

    assert.deepEqual(
      value.publicCreators.map(
        (item) =>
          item.username,
      ),
      [
        'alice',
        'bob',
        'zoe',
      ],
    );
  },
);

test(
  'phase10a3a public creator summaries reject counters ranking and unknown fields',
  () => {
    assert.throws(
      () =>
        normalizeExploreDiscoveryV1({
          schema:
            EXPLORE_DISCOVERY_SCHEMA,
          recentPublications:
            [],
          publicCreators: [
            {
              ...creator(
                'alice',
              ),
              followerCount:
                9000,
            },
          ],
          templateSites:
            [],
        }),
      /unsupported field/,
    );
  },
);

test(
  'phase10a3a template sites are newest-updated-first with deterministic ties',
  () => {
    const value =
      normalizeExploreDiscoveryV1({
        schema:
          EXPLORE_DISCOVERY_SCHEMA,
        recentPublications:
          [],
        publicCreators:
          [],
        templateSites: [
          site({
            username:
              'bob',
            siteUrl:
              'crab://z-site',
            updatedAt:
              '2026-08-09T20:00:00.000Z',
          }),
          site({
            username:
              'alice',
            siteUrl:
              'crab://b-site',
            updatedAt:
              '2026-08-09T22:00:00.000Z',
          }),
          site({
            username:
              'zoe',
            siteUrl:
              'crab://a-site',
            updatedAt:
              '2026-08-09T22:00:00.000Z',
          }),
        ],
      });

    assert.deepEqual(
      value.templateSites.map(
        (item) =>
          item.siteUrl,
      ),
      [
        'crab://a-site',
        'crab://b-site',
        'crab://z-site',
      ],
    );
  },
);

test(
  'phase10a3a duplicate template site identities fail closed',
  () => {
    assert.throws(
      () =>
        normalizeExploreDiscoveryV1({
          schema:
            EXPLORE_DISCOVERY_SCHEMA,
          recentPublications:
            [],
          publicCreators:
            [],
          templateSites: [
            site(),
            site(),
          ],
        }),
      /duplicate siteUrl/,
    );
  },
);

test(
  'phase10a3a discovery request limits are explicit and bounded',
  () => {
    assert.deepEqual(
      normalizeExploreDiscoveryRequest(),
      {
        publicationLimit:
          EXPLORE_DISCOVERY_DEFAULT_PUBLICATION_LIMIT,
        creatorLimit:
          EXPLORE_DISCOVERY_DEFAULT_CREATOR_LIMIT,
        siteLimit:
          EXPLORE_DISCOVERY_DEFAULT_SITE_LIMIT,
      },
    );

    assert.deepEqual(
      normalizeExploreDiscoveryRequest({
        publicationLimit:
          EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
        creatorLimit:
          EXPLORE_DISCOVERY_MAX_CREATORS,
        siteLimit:
          EXPLORE_DISCOVERY_MAX_SITES,
      }),
      {
        publicationLimit:
          EXPLORE_DISCOVERY_MAX_PUBLICATIONS,
        creatorLimit:
          EXPLORE_DISCOVERY_MAX_CREATORS,
        siteLimit:
          EXPLORE_DISCOVERY_MAX_SITES,
      },
    );

    assert.throws(
      () =>
        normalizeExploreDiscoveryRequest({
          publicationLimit:
            EXPLORE_DISCOVERY_MAX_PUBLICATIONS +
            1,
        }),
      /publicationLimit/,
    );
  },
);

test(
  'phase10a3a unknown request and response fields fail closed',
  () => {
    assert.throws(
      () =>
        normalizeExploreDiscoveryRequest({
          score:
            1,
        }),
      /unsupported field/,
    );

    assert.throws(
      () =>
        normalizeExploreDiscoveryV1({
          schema:
            EXPLORE_DISCOVERY_SCHEMA,
          recentPublications:
            [],
          publicCreators:
            [],
          templateSites:
            [],
          ranking:
            'popular',
        }),
      /unsupported field/,
    );
  },
);

test(
  'phase10a3a transparent categories publish exact ordering rules',
  () => {
    assert.deepEqual(
      EXPLORE_DISCOVERY_CATEGORIES,
      [
        {
          id:
            'recent_public_content',
          label:
            'Recent',
          rule:
            'published_at_desc',
        },
        {
          id:
            'public_creators',
          label:
            'Creators',
          rule:
            'username_asc',
        },
        {
          id:
            'template_sites',
          label:
            'Sites',
          rule:
            'updated_at_desc',
        },
      ],
    );
  },
);

test(
  'phase10a3a grants no ranking social graph or economic authority',
  () => {
    assert.deepEqual(
      EXPLORE_DISCOVERY_AUTHORITY,
      {
        publicReadProjectionOnly:
          true,
        engagementRanking:
          false,
        paidRanking:
          false,
        followerGraph:
          false,
        followerCounts:
          false,
        followingCounts:
          false,
        walletMutation:
          false,
        ledgerMutation:
          false,
        receiptAuthority:
          false,
        paidEntitlementAuthority:
          false,
        quickchainMutation:
          false,
        roxInteraction:
          false,
        solanaInteraction:
          false,
      },
    );
  },
);

test(
  'phase10a3a normalized projection is deeply immutable',
  () => {
    const value =
      normalizeExploreDiscoveryV1({
        schema:
          EXPLORE_DISCOVERY_SCHEMA,
        recentPublications: [
          publication(),
        ],
        publicCreators: [
          creator(
            'alice',
          ),
        ],
        templateSites: [
          site(),
        ],
      });

    for (
      const candidate
      of [
        value,
        value.recentPublications,
        value.publicCreators,
        value.templateSites,
        value.categories,
        value.authority,
      ]
    ) {
      assert.equal(
        Object.isFrozen(
          candidate,
        ),
        true,
      );
    }
  },
);
