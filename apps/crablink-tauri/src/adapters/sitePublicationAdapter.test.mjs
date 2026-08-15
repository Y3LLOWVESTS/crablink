import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readFile,
} from 'node:fs/promises';

import {
  SITE_PUBLICATION_PAGE_SCHEMA,
  SitePublicationReadError,
  assertSitePublicationPageV1,
  createSitePublicationAdapter,
} from './sitePublicationAdapter.js';

const SITE =
  'crab://rusty-forum';

const POST =
  `crab://${'a'.repeat(
    64,
  )}.post`;

const MANIFEST =
  `b3:${'b'.repeat(
    64,
  )}`;

const CONTENT =
  `b3:${'c'.repeat(
    64,
  )}`;

function publication(
  overrides =
    {},
) {
  return {
    schema:
      'crablink.site-publication.v1',

    publicationId:
      'thread-a',

    kind:
      'post',

    crabUrl:
      POST,

    title:
      'Durable Forum thread',

    summary:
      'Backend Site-publication root.',

    creatorDisplay:
      '@alice',

    createdAtMs:
      1_700_000_000_000,

    visibility:
      'public',

    references: {
      manifestCid:
        MANIFEST,

      contentCid:
        CONTENT,

      siteUrl:
        SITE,
    },

    tags: [
      'forum',
      'forum-category:general',
    ],

    siteCrabUrl:
      SITE,

    ...overrides,
  };
}

function page(
  overrides =
    {},
) {
  return {
    schema:
      SITE_PUBLICATION_PAGE_SCHEMA,

    items: [
      publication(),
    ],

    nextCursor:
      null,

    hasMore:
      false,

    ...overrides,
  };
}

function gatewayFixture(
  responder,
) {
  const calls =
    [];

  return {
    calls,

    client:
      Object.freeze({
        async request(
          path,
          options =
            {},
        ) {
          calls.push({
            path,
            options,
          });

          return responder(
            path,
            options,
          );
        },
      }),
  };
}

test(
  'phase15a4a2c3 adapter reads strict Site roots through the public gateway route',
  async () => {
    const gateway =
      gatewayFixture(
        async () => ({
          data:
            page({
              nextCursor:
                's_00000002',

              hasMore:
                true,
            }),
        }),
      );

    const adapter =
      createSitePublicationAdapter(
        gateway.client,
      );

    const result =
      await adapter
        .listSitePublications({
          siteCrabUrl:
            SITE,

          cursor:
            's_00000001',

          limit:
            25,
        });

    assert.equal(
      result.schema,
      SITE_PUBLICATION_PAGE_SCHEMA,
    );

    assert.equal(
      result.items.length,
      1,
    );

    assert.equal(
      result.items[0]
        .creatorDisplay,
      '@alice',
    );

    assert.equal(
      gateway.calls.length,
      1,
    );

    assert.equal(
      gateway.calls[0].path,
      `/site-publications?siteCrabUrl=${encodeURIComponent(
        SITE,
      )}&cursor=s_00000001&limit=25`,
    );

    assert.equal(
      gateway.calls[0]
        .options
        .label,
      'Site publications',
    );
  },
);

test(
  'phase15a4a2c3 adapter rejects bad Site cursor and limit before gateway IO',
  async () => {
    const gateway =
      gatewayFixture(
        async () =>
          page(),
      );

    const adapter =
      createSitePublicationAdapter(
        gateway.client,
      );

    await assert.rejects(
      adapter.listSitePublications({
        siteCrabUrl:
          'https://example.com/forum',
      }),
      SitePublicationReadError,
    );

    await assert.rejects(
      adapter.listSitePublications({
        siteCrabUrl:
          SITE,

        cursor:
          'x'.repeat(
            129,
          ),
      }),
      SitePublicationReadError,
    );

    await assert.rejects(
      adapter.listSitePublications({
        siteCrabUrl:
          SITE,

        limit:
          101,
      }),
      SitePublicationReadError,
    );

    assert.equal(
      gateway.calls.length,
      0,
    );
  },
);

test(
  'phase15a4a2c3 strict parser rejects unknown authority-shaped fields and Site mismatches',
  () => {
    assert.throws(
      () =>
        assertSitePublicationPageV1({
          ...page(),

          walletBalance:
            '100',
        }),
      (error) =>
        error.reason ===
          'unknown_site_publication_field',
    );

    assert.throws(
      () =>
        assertSitePublicationPageV1(
          page({
            items: [
              publication({
                profileUrl:
                  'crab://@alice',
              }),
            ],
          }),
        ),
      (error) =>
        error.reason ===
          'unknown_site_publication_field',
    );

    assert.throws(
      () =>
        assertSitePublicationPageV1(
          page({
            items: [
              publication({
                references: {
                  manifestCid:
                    MANIFEST,

                  contentCid:
                    CONTENT,

                  siteUrl:
                    'crab://other-forum',
                },
              }),
            ],
          }),
        ),
      (error) =>
        error.reason ===
          'site_publication_site_mismatch',
    );
  },
);

test(
  'phase15a4a2c3 parser preserves display-only creator text moderation visibility and bounded taxonomy',
  () => {
    const result =
      assertSitePublicationPageV1(
        page({
          items: [
            publication({
              visibility:
                'moderated',

              creatorDisplay:
                'Forum Author',

              tags: [
                'forum',
                'forum-category:development',
              ],
            }),
          ],
        }),
      );

    assert.equal(
      result.items[0]
        .creatorDisplay,
      'Forum Author',
    );

    assert.equal(
      result.items[0]
        .visibility,
      'moderated',
    );

    assert.deepEqual(
      result.items[0]
        .tags,
      [
        'forum',
        'forum-category:development',
      ],
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );
  },
);

test(
  'phase15a4a2c3 adapter remains gateway-only and non-authoritative',
  async () => {
    const source =
      await readFile(
        new URL(
          './sitePublicationAdapter.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (
      const required
      of [
        'gateway.request',
        '/site-publications?',
        'siteCrabUrl',
        'crablink.site-publication-page.v1',
        'creatorDisplay',
      ]
    ) {
      assert.equal(
        source.includes(
          required,
        ),
        true,
        `missing Site-publication adapter fragment: ${required}`,
      );
    }

    for (
      const forbidden
      of [
        '/v1/index/',
        'omnigate.request',
        'publishSitePublication',
        'walletMutation',
        'ledgerMutation',
        'receiptAuthority',
        'paidEntitlementAuthority',
        'followMutation',
        'settlementAuthority',
        'privateKey',
        'recoveryPhrase',
        'capabilityToken',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden Site-publication adapter authority: ${forbidden}`,
      );
    }
  },
);
