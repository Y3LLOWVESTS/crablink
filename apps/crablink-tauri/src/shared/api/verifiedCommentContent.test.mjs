import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_VERIFIED_COMMENT_CONTENT_BYTES,
  VERIFIED_COMMENT_CONTENT_SCHEMA,
  VerifiedCommentContentError,
  createVerifiedCommentContentHydrator,
} from './verifiedCommentContent.js';

const HASH =
  'a'.repeat(64);

const EXPECTED_CID =
  `b3:${HASH}`;

const COMMENT_URL =
  `crab://${HASH}.comment`;

const SITE =
  'crab://picture-board';

const IMAGE =
  `crab://${'1'.repeat(64)}.image`;

function relationReply(
  overrides =
    {},
) {
  return {
    siteCrabUrl:
      SITE,

    threadCrabUrl:
      IMAGE,

    crabUrl:
      COMMENT_URL,

    parentCrabUrl:
      IMAGE,

    body:
      'relation preview',

    creator:
      null,

    createdAt:
      '2023-11-14T22:13:20.000Z',

    visibility:
      'public',

    b3:
      {
        expectedContentCid:
          EXPECTED_CID,

        expectedContentCidSource:
          'publication_relation_v1',

        contentVerified:
          false,

        resolvedContentCid:
          null,
      },

    contentWarning:
      null,

    ...overrides,
  };
}

function contentEnvelope(
  overrides =
    {},
) {
  return {
    schema:
      'ron.comment-content.v1',

    kind:
      'comment',

    asset_kind:
      'comment',

    format:
      'text/plain; charset=utf-8',

    title:
      'Comment',

    body:
      'This is the complete verified Comment body.',

    metadata:
      {
        comment_kind:
          'reply',

        language:
          'en',

        visibility:
          'public_preview',
      },

    relations:
      {
        site:
          SITE,

        parent:
          IMAGE,

        target:
          IMAGE,

        thread:
          IMAGE,
      },

    site_connection:
      {
        required:
          true,

        relation:
          'comment_on_site',

        crab_url:
          SITE,
      },

    parent_reference:
      {
        relation:
          'comment_parent',

        crab_url:
          IMAGE,

        asset_kind:
          'image',
      },

    thread_reference:
      {
        relation:
          'thread_context',

        crab_url:
          IMAGE,

        asset_kind:
          'image',
      },

    creator_display:
      '@alice',

    created_at_ms:
      1_700_000_000_000,

    ...overrides,
  };
}

function bytesOf(
  value,
) {
  return Array.from(
    new TextEncoder().encode(
      typeof value ===
        'string'
        ? value
        : JSON.stringify(
            value,
          ),
    ),
  );
}

function fetchResponse(
  bodyBytes,
  overrides =
    {},
) {
  return {
    schema:
      'crablink.tauri.asset-bytes-fetch-response.v1',

    method:
      'GET',

    route:
      `/o/${EXPECTED_CID}`,

    status:
      200,

    ok:
      true,

    correlationId:
      'phase14a6f4',

    contentType:
      'application/json; charset=utf-8',

    bytes:
      bodyBytes.length,

    bodyBytes,

    ...overrides,
  };
}

function hashResponse(
  bodyBytes,
  cid =
    EXPECTED_CID,
) {
  return {
    schema:
      'crablink.tauri.b3-byte-hash-response.v1',

    bytes:
      bodyBytes.length,

    hash:
      cid.slice(
        3,
      ),

    cid,
  };
}

test(
  'phase14a6f4 fetches bounded exact bytes hashes before parsing and returns verified full Comment body truth',
  async () => {
    const bodyBytes =
      bytesOf(
        contentEnvelope(),
      );

    const events =
      [];

    const hydrator =
      createVerifiedCommentContentHydrator({
        fetchBytes:
          async (
            request,
          ) => {
            events.push(
              'fetch',
            );

            assert.deepEqual(
              request,
              {
                expectedContentCid:
                  EXPECTED_CID,

                route:
                  `/o/${EXPECTED_CID}`,

                maxBytes:
                  MAX_VERIFIED_COMMENT_CONTENT_BYTES,
              },
            );

            return fetchResponse(
              bodyBytes,
            );
          },

        hashBytes:
          async (
            bytes,
          ) => {
            events.push(
              'hash',
            );

            assert.deepEqual(
              bytes,
              bodyBytes,
            );

            return hashResponse(
              bodyBytes,
            );
          },
      });

    const result =
      await hydrator.hydrate(
        relationReply(),
      );

    events.push(
      'complete',
    );

    assert.deepEqual(
      events,
      [
        'fetch',
        'hash',
        'complete',
      ],
    );

    assert.equal(
      result.schema,
      VERIFIED_COMMENT_CONTENT_SCHEMA,
    );

    assert.equal(
      result.body,
      'This is the complete verified Comment body.',
    );

    assert.equal(
      result.expectedContentCid,
      EXPECTED_CID,
    );

    assert.equal(
      result.resolvedContentCid,
      EXPECTED_CID,
    );

    assert.equal(
      result.contentVerified,
      true,
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
  'phase14a6f4 rejects relation URL and expected CID disagreement before fetch',
  async () => {
    let fetchCount =
      0;

    let hashCount =
      0;

    const hydrator =
      createVerifiedCommentContentHydrator({
        fetchBytes:
          async () => {
            fetchCount +=
              1;

            return {};
          },

        hashBytes:
          async () => {
            hashCount +=
              1;

            return {};
          },
      });

    await assert.rejects(
      hydrator.hydrate(
        relationReply({
          crabUrl:
            `crab://${'b'.repeat(64)}.comment`,
        }),
      ),

      (
        error,
      ) => {
        assert.equal(
          error.reason,
          'comment_url_content_cid_mismatch',
        );

        return true;
      },
    );

    assert.equal(
      fetchCount,
      0,
    );

    assert.equal(
      hashCount,
      0,
    );
  },
);

test(
  'phase14a6f4 rejects B3 mismatch before parsing fetched bytes as JSON',
  async () => {
    const invalidJsonBytes =
      bytesOf(
        'deliberately not json',
      );

    const hydrator =
      createVerifiedCommentContentHydrator({
        fetchBytes:
          async () =>
            fetchResponse(
              invalidJsonBytes,
            ),

        hashBytes:
          async () =>
            hashResponse(
              invalidJsonBytes,
              `b3:${'b'.repeat(64)}`,
            ),
      });

    await assert.rejects(
      hydrator.hydrate(
        relationReply(),
      ),

      (
        error,
      ) => {
        assert.equal(
          error.reason,
          'comment_content_cid_mismatch',
        );

        return true;
      },
    );
  },
);

test(
  'phase14a6f4 parses only after matching B3 and then rejects invalid Comment JSON',
  async () => {
    const invalidJsonBytes =
      bytesOf(
        'still not json',
      );

    const hydrator =
      createVerifiedCommentContentHydrator({
        fetchBytes:
          async () =>
            fetchResponse(
              invalidJsonBytes,
            ),

        hashBytes:
          async () =>
            hashResponse(
              invalidJsonBytes,
            ),
      });

    await assert.rejects(
      hydrator.hydrate(
        relationReply(),
      ),

      (
        error,
      ) => {
        assert.equal(
          error.reason,
          'invalid_comment_content_json',
        );

        return true;
      },
    );
  },
);

test(
  'phase14a6f4 rejects verified Comment envelopes that disagree with durable Site parent or thread truth',
  async () => {
    const candidates =
      [
        {
          envelope:
            contentEnvelope({
              relations:
                {
                  site:
                    'crab://wrong-site',

                  parent:
                    IMAGE,

                  target:
                    IMAGE,

                  thread:
                    IMAGE,
                },
            }),

          reason:
            'comment_content_site_mismatch',
        },

        {
          envelope:
            contentEnvelope({
              relations:
                {
                  site:
                    SITE,

                  parent:
                    `crab://${'2'.repeat(64)}.image`,

                  target:
                    IMAGE,

                  thread:
                    IMAGE,
                },
            }),

          reason:
            'comment_content_parent_mismatch',
        },

        {
          envelope:
            contentEnvelope({
              relations:
                {
                  site:
                    SITE,

                  parent:
                    IMAGE,

                  target:
                    IMAGE,

                  thread:
                    `crab://${'3'.repeat(64)}.image`,
                },
            }),

          reason:
            'comment_content_thread_mismatch',
        },
      ];

    for (
      const candidate
      of candidates
    ) {
      const bodyBytes =
        bytesOf(
          candidate.envelope,
        );

      const hydrator =
        createVerifiedCommentContentHydrator({
          fetchBytes:
            async () =>
              fetchResponse(
                bodyBytes,
              ),

          hashBytes:
            async () =>
              hashResponse(
                bodyBytes,
              ),
        });

      await assert.rejects(
        hydrator.hydrate(
          relationReply(),
        ),

        (
          error,
        ) => {
          assert.equal(
            error.reason,
            candidate.reason,
          );

          return true;
        },
      );
    }
  },
);

test(
  'phase14a6f4 fails closed on unsuccessful empty oversized and inconsistent native byte responses',
  async () => {
    const validBytes =
      bytesOf(
        contentEnvelope(),
      );

    const cases =
      [
        {
          response:
            fetchResponse(
              validBytes,
              {
                status:
                  404,

                ok:
                  false,
              },
            ),

          reason:
            'comment_fetch_not_successful',
        },

        {
          response:
            fetchResponse(
              [],
            ),

          reason:
            'empty_comment_content_bytes',
        },

        {
          response:
            fetchResponse(
              validBytes,
              {
                bytes:
                  validBytes.length +
                  1,
              },
            ),

          reason:
            'comment_fetch_byte_count_mismatch',
        },
      ];

    for (
      const candidate
      of cases
    ) {
      let hashCount =
        0;

      const hydrator =
        createVerifiedCommentContentHydrator({
          fetchBytes:
            async () =>
              candidate.response,

          hashBytes:
            async () => {
              hashCount +=
                1;

              return hashResponse(
                validBytes,
              );
            },
        });

      await assert.rejects(
        hydrator.hydrate(
          relationReply(),
        ),

        (
          error,
        ) => {
          assert.equal(
            error.reason,
            candidate.reason,
          );

          return true;
        },
      );

      assert.equal(
        hashCount,
        0,
      );
    }

    const oversized =
      new Uint8Array(
        MAX_VERIFIED_COMMENT_CONTENT_BYTES +
          1,
      );

    let oversizeHashCount =
      0;

    const oversizedHydrator =
      createVerifiedCommentContentHydrator({
        fetchBytes:
          async () =>
            fetchResponse(
              oversized,
            ),

        hashBytes:
          async () => {
            oversizeHashCount +=
              1;

            return hashResponse(
              oversized,
            );
          },
      });

    await assert.rejects(
      oversizedHydrator.hydrate(
        relationReply(),
      ),

      (
        error,
      ) => {
        assert.equal(
          error instanceof
            VerifiedCommentContentError,
          true,
        );

        assert.equal(
          error.reason,
          'comment_content_bytes_too_large',
        );

        return true;
      },
    );

    assert.equal(
      oversizeHashCount,
      0,
    );
  },
);
