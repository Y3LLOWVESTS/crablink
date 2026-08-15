/**
 * RO:WHAT — Durable public-read projection for resolved named Imageboard Sites.
 * RO:WHY — Builds Imageboard grid truth from canonical PublicationSummaryV1 records instead of A3 session navigation memory.
 * RO:INTERACTS — PublicationSummaryV1 and imageboardModel deterministic thread/grid/B3 review behavior.
 * RO:INVARIANTS — exact named Site reference; Image roots only; bounded creator-publication page; no invented category, warning, reply, or B3 verification truth.
 * RO:SECURITY — read projection only; no sessionStorage, publication mutation, index mutation, wallet authority, ledger authority, or fake asset verification.
 * RO:TEST — node --test imageboardReadModel.test.mjs.
 */

import {
  assertPublicationSummaryV1,
} from '../../../../../packages/crablink-core/src/publicationSummary.js';

import {
  createImageboardThreadFromPublication,
  projectImageboardGrid,
  verifyImageboardB3,
} from './imageboardModel.js';

export const IMAGEBOARD_READ_MODEL_VERSION =
  'crablink.imageboard-read.v1';

export const IMAGEBOARD_PUBLICATION_READ_LIMIT =
  50;

export const IMAGEBOARD_READ_SOURCE =
  'publication_summary_v1';

export const IMAGEBOARD_THREAD_CATEGORY_SOURCE =
  'board_default_publication_summary_v1_has_no_thread_category';

export const IMAGEBOARD_CONTENT_WARNING_SOURCE =
  'unavailable_in_publication_summary_v1';

export const IMAGEBOARD_REPLY_COUNT_SOURCE =
  'unavailable_in_publication_summary_v1';

export const IMAGEBOARD_B3_EVIDENCE_SOURCE =
  'expected_cids_only_no_resolved_evidence';

export function isResolvedImageboardSite(
  result,
) {
  const candidates = [
    result?.summary?.templateId,
    result?.summary?.template_id,
    result?.summary?.template?.id,
    result?.data?.templateId,
    result?.data?.template_id,
    result?.data?.template?.id,
    result?.data?.site?.templateId,
    result?.data?.site?.template_id,
  ];

  return candidates.some(
    (candidate) =>
      clean(
        candidate,
      )
        .toLowerCase() ===
      'imageboard',
  );
}

export function projectResolvedImageboardPublications({
  result,
  publications = [],
  settings = {},
  category = 'all',
  page = 1,
  revealWarnings = false,
} = {}) {
  if (
    Array.isArray(
      publications,
    ) ===
    false
  ) {
    throw new TypeError(
      'Imageboard read publications must be an array.',
    );
  }

  const siteCrabUrl =
    resolveNamedSiteCrabUrl(
      result,
    );

  const threads =
    publications
      .slice(
        0,
        IMAGEBOARD_PUBLICATION_READ_LIMIT,
      )
      .map(
        (raw) =>
          projectPublicationThread(
            raw,
            {
              siteCrabUrl,
              settings,
            },
          ),
      )
      .filter(
        Boolean,
      );

  const grid =
    projectImageboardGrid({
      threads,
      settings,
      category,
      page,
      revealWarnings,
    });

  const b3ByImageCrabUrl =
    new Map(
      threads.map(
        (thread) => [
          thread.imageCrabUrl,
          projectExpectedB3(
            thread,
          ),
        ],
      ),
    );

  const items =
    grid.items.map(
      (item) => ({
        ...item,

        b3:
          b3ByImageCrabUrl.get(
            item.imageCrabUrl,
          ) ??
          null,
      }),
    );

  return deepFreeze({
    modelVersion:
      IMAGEBOARD_READ_MODEL_VERSION,

    source:
      IMAGEBOARD_READ_SOURCE,

    siteCrabUrl,

    state:
      grid.state,

    ordering:
      grid.ordering,

    category:
      grid.category,

    page:
      grid.page,

    pageSize:
      grid.pageSize,

    totalItems:
      grid.totalItems,

    totalPages:
      grid.totalPages,

    hasPrevious:
      grid.hasPrevious,

    hasNext:
      grid.hasNext,

    items,

    threadCount:
      threads.length,

    publicationReadLimit:
      IMAGEBOARD_PUBLICATION_READ_LIMIT,

    truth: {
      sessionContextUsed:
        false,

      categorySource:
        IMAGEBOARD_THREAD_CATEGORY_SOURCE,

      contentWarningSource:
        IMAGEBOARD_CONTENT_WARNING_SOURCE,

      replyCountSource:
        IMAGEBOARD_REPLY_COUNT_SOURCE,

      b3EvidenceSource:
        IMAGEBOARD_B3_EVIDENCE_SOURCE,

      thumbnailBytesResolved:
        false,

      contentBytesResolved:
        false,

      b3Verified:
        false,
    },
  });
}

function projectPublicationThread(
  raw,
  {
    siteCrabUrl,
    settings,
  },
) {
  let summary;

  try {
    summary =
      assertPublicationSummaryV1(
        raw,
      );
  } catch (_error) {
    return null;
  }

  if (
    summary.kind !==
    'image'
  ) {
    return null;
  }

  const publicationSiteUrl =
    clean(
      summary.references
        ?.siteUrl,
    )
      .toLowerCase();

  if (
    publicationSiteUrl !==
    siteCrabUrl
  ) {
    return null;
  }

  try {
    return createImageboardThreadFromPublication(
      summary,
      {
        siteCrabUrl,
        settings,

        // PublicationSummaryV1 does not expose a per-thread
        // Imageboard category. The deterministic model therefore
        // uses the configured board default rather than inventing one.
        category:
          undefined,

        // PublicationSummaryV1 has no content-warning field.
        contentWarning:
          false,

        // PublicationSummaryV1 has no reply-count projection.
        replyCount:
          0,
      },
    );
  } catch (_error) {
    return null;
  }
}

function projectExpectedB3(
  thread,
) {
  const review =
    verifyImageboardB3(
      thread,
      {},
    );

  return deepFreeze({
    expectedContentCid:
      thread.b3
        .expectedContentCid,

    expectedThumbnailCid:
      thread.b3
        .expectedThumbnailCid,

    verified:
      false,

    contentVerified:
      false,

    thumbnailVerified:
      null,

    reason:
      review.reason,

    evidenceSource:
      IMAGEBOARD_B3_EVIDENCE_SOURCE,
  });
}

function resolveNamedSiteCrabUrl(
  result,
) {
  const raw =
    result?.summary?.crabUrl ??
    (
      result?.summary?.siteName
        ? `crab://${result.summary.siteName}`
        : ''
    );

  const value =
    clean(
      raw,
    )
      .toLowerCase();

  if (
    /^crab:\/\/[a-z0-9_.-]{1,80}$/.test(
      value,
    )
  ) {
    return value;
  }

  throw new TypeError(
    'Imageboard read projection requires a named Site URL.',
  );
}

function clean(
  value,
) {
  return String(
    value ??
    '',
  ).trim();
}

function deepFreeze(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    Object.isFrozen(
      value,
    ) ===
      false
  ) {
    for (
      const child
      of Object.values(
        value,
      )
    ) {
      deepFreeze(
        child,
      );
    }

    Object.freeze(
      value,
    );
  }

  return value;
}
