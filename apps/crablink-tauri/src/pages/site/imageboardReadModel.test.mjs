import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  IMAGEBOARD_B3_EVIDENCE_SOURCE,
  IMAGEBOARD_CONTENT_WARNING_SOURCE,
  IMAGEBOARD_PUBLICATION_READ_LIMIT,
  IMAGEBOARD_READ_MODEL_VERSION,
  IMAGEBOARD_READ_SOURCE,
  IMAGEBOARD_REPLY_COUNT_SOURCE,
  IMAGEBOARD_THREAD_CATEGORY_SOURCE,
  isResolvedImageboardSite,
  projectResolvedImageboardPublications,
} from './imageboardReadModel.js';

const SITE =
  'crab://picture-board';

function b3(
  character,
) {
  return `b3:${character.repeat(64)}`;
}

function imageUrl(
  number,
) {
  return `crab://${number
    .toString(16)
    .padStart(64, '0')}.image`;
}

function articleUrl(
  number,
) {
  return `crab://${number
    .toString(16)
    .padStart(64, '0')}.article`;
}

function publication({
  id = 1,
  kind = 'image',
  siteUrl = SITE,
  visibility = 'public',
  publishedAt = '2026-08-11T18:00:00.000Z',
  thumbnailCid = b3('a'),
  contentCid = b3('b'),
  title = 'Image thread',
} = {}) {
  const crabUrl =
    kind ===
      'image'
      ? imageUrl(
          id,
        )
      : articleUrl(
          id,
        );

  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId:
      `publication-${id}`,

    kind,

    crabUrl,

    title,

    summary:
      `Summary ${id}`,

    creator: {
      username:
        'alice',

      displayName:
        'Alice',

      profileUrl:
        'crab://@alice',

      avatarCid:
        b3('c'),
    },

    publishedAt,

    updatedAt:
      publishedAt,

    visibility,

    access:
      'free',

    thumbnail:
      kind ===
        'image'
        ? {
            kind:
              'image',

            cid:
              thumbnailCid,

            alt:
              `Image ${id}`,
          }
        : null,

    references: {
      manifestCid:
        b3('d'),

      contentCid,

      siteUrl,
    },

    pinned:
      false,
  };
}

function resolvedResult({
  templateId = 'imageboard',
} = {}) {
  return {
    summary: {
      crabUrl:
        SITE,

      siteName:
        'picture-board',

      templateId,
    },

    data: {
      templateId,
    },
  };
}

test(
  'Phase 14A4 locks durable Imageboard public-read identity and sources',
  () => {
    assert.equal(
      IMAGEBOARD_READ_MODEL_VERSION,
      'crablink.imageboard-read.v1',
    );

    assert.equal(
      IMAGEBOARD_READ_SOURCE,
      'publication_summary_v1',
    );

    assert.equal(
      IMAGEBOARD_PUBLICATION_READ_LIMIT,
      50,
    );

    assert.equal(
      IMAGEBOARD_THREAD_CATEGORY_SOURCE,
      'board_default_publication_summary_v1_has_no_thread_category',
    );

    assert.equal(
      IMAGEBOARD_CONTENT_WARNING_SOURCE,
      'unavailable_in_publication_summary_v1',
    );

    assert.equal(
      IMAGEBOARD_REPLY_COUNT_SOURCE,
      'unavailable_in_publication_summary_v1',
    );

    assert.equal(
      IMAGEBOARD_B3_EVIDENCE_SOURCE,
      'expected_cids_only_no_resolved_evidence',
    );
  },
);

test(
  'Phase 14A4 recognizes resolved Imageboard template identity',
  () => {
    assert.equal(
      isResolvedImageboardSite(
        resolvedResult(),
      ),
      true,
    );

    assert.equal(
      isResolvedImageboardSite(
        resolvedResult({
          templateId:
            'blog',
        }),
      ),
      false,
    );
  },
);

test(
  'Phase 14A4 projects only typed Images referencing the exact named Site',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,
          }),

          publication({
            id:
              2,

            siteUrl:
              'crab://other-board',
          }),

          publication({
            id:
              3,

            kind:
              'article',
          }),
        ],
      });

    assert.equal(
      projection.threadCount,
      1,
    );

    assert.equal(
      projection.items.length,
      1,
    );

    assert.equal(
      projection.items[0]
        .imageCrabUrl,
      imageUrl(
        1,
      ),
    );
  },
);

test(
  'Phase 14A4 private and unlisted Image roots stay out of the public grid',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,

            visibility:
              'public',
          }),

          publication({
            id:
              2,

            visibility:
              'private',
          }),

          publication({
            id:
              3,

            visibility:
              'unlisted',
          }),
        ],
      });

    assert.equal(
      projection.items.length,
      1,
    );

    assert.equal(
      projection.items[0]
        .imageCrabUrl,
      imageUrl(
        1,
      ),
    );
  },
);

test(
  'Phase 14A4 deleted blocked and moderated summaries use existing placeholder projection',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,

            visibility:
              'deleted',
          }),

          publication({
            id:
              2,

            visibility:
              'blocked',
          }),

          publication({
            id:
              3,

            visibility:
              'moderated',
          }),
        ],
      });

    assert.deepEqual(
      projection.items.map(
        (item) =>
          item.moderationState,
      ),
      [
        'deleted',
        'blocked',
        'moderated',
      ],
    );

    for (
      const item
      of projection.items
    ) {
      assert.equal(
        item.thumbnail,
        null,
      );

      assert.equal(
        item.creator,
        null,
      );
    }
  },
);

test(
  'Phase 14A4 public grid is newest first and uses bounded model pagination',
  () => {
    const publications =
      Array.from(
        {
          length:
            30,
        },
        (
          _unused,
          index,
        ) =>
          publication({
            id:
              index + 1,

            publishedAt:
              new Date(
                Date.UTC(
                  2026,
                  7,
                  1,
                  0,
                  index,
                  0,
                ),
              ).toISOString(),
          }),
      );

    const first =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications,

        page:
          1,
      });

    const second =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications,

        page:
          2,
      });

    assert.equal(
      first.pageSize,
      24,
    );

    assert.equal(
      first.items.length,
      24,
    );

    assert.equal(
      first.hasNext,
      true,
    );

    assert.equal(
      second.items.length,
      6,
    );

    assert.equal(
      second.hasPrevious,
      true,
    );

    assert.equal(
      first.items[0]
        .imageCrabUrl,
      imageUrl(
        30,
      ),
    );
  },
);

test(
  'Phase 14A4 malformed or incomplete Image summaries fail closed instead of becoming threads',
  () => {
    const malformed = {
      ...publication({
        id:
          1,
      }),

      references: {
        siteUrl:
          SITE,
      },
    };

    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          malformed,
        ],
      });

    assert.equal(
      projection.threadCount,
      0,
    );

    assert.equal(
      projection.state,
      'empty',
    );
  },
);

test(
  'Phase 14A4 retains canonical thumbnail and content B3 expectations without claiming verification',
  () => {
    const expectedThumbnail =
      b3('a');

    const expectedContent =
      b3('b');

    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,

            thumbnailCid:
              expectedThumbnail,

            contentCid:
              expectedContent,
          }),
        ],
      });

    const item =
      projection.items[0];

    assert.equal(
      item.thumbnail.cid,
      expectedThumbnail,
    );

    assert.equal(
      item.b3.expectedThumbnailCid,
      expectedThumbnail,
    );

    assert.equal(
      item.b3.expectedContentCid,
      expectedContent,
    );

    assert.equal(
      item.b3.verified,
      false,
    );

    assert.equal(
      item.b3.reason,
      'resolved_content_cid_required',
    );
  },
);

test(
  'Phase 14A4 PublicationSummary metadata alone never becomes resolved B3 evidence',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,
          }),
        ],
      });

    assert.equal(
      projection.truth.b3Verified,
      false,
    );

    assert.equal(
      projection.truth.thumbnailBytesResolved,
      false,
    );

    assert.equal(
      projection.truth.contentBytesResolved,
      false,
    );

    assert.equal(
      projection.items[0]
        .b3
        .evidenceSource,
      IMAGEBOARD_B3_EVIDENCE_SOURCE,
    );
  },
);

test(
  'Phase 14A4 does not invent thread category warning or reply-count truth absent from PublicationSummaryV1',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,
          }),
        ],
      });

    assert.equal(
      projection.items[0]
        .category,
      'general',
    );

    assert.equal(
      projection.items[0]
        .contentWarning,
      null,
    );

    assert.equal(
      projection.items[0]
        .replyCount,
      0,
    );

    assert.equal(
      projection.truth.categorySource,
      IMAGEBOARD_THREAD_CATEGORY_SOURCE,
    );

    assert.equal(
      projection.truth.contentWarningSource,
      IMAGEBOARD_CONTENT_WARNING_SOURCE,
    );

    assert.equal(
      projection.truth.replyCountSource,
      IMAGEBOARD_REPLY_COUNT_SOURCE,
    );
  },
);

test(
  'Phase 14A4 read projection never consumes A3 session context',
  () => {
    const projection =
      projectResolvedImageboardPublications({
        result:
          resolvedResult(),

        publications: [
          publication({
            id:
              1,
          }),
        ],
      });

    assert.equal(
      projection.truth
        .sessionContextUsed,
      false,
    );
  },
);

test(
  'Phase 14A4 source has no session-memory or Imageboard-specific backend read authority',
  async () => {
    const source =
      await readFile(
        new URL(
          './imageboardReadModel.js',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'imageboardProductFlow',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'sessionStorage',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'sessionStorage.',
      ),
      false,
    );

    assert.equal(
      source.includes(
        '/imageboard/',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'createImageboardThreadFromPublication',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'projectImageboardGrid',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'verifyImageboardB3',
      ),
      true,
    );
  },
);
