/**
 * RO:WHAT — Consumer reader for resolved named Imageboard Sites.
 * RO:WHY — FINAL_BETA Phase 14A5 turns the durable A4 publication projection into a usable image-thread grid.
 * RO:INTERACTS — publicationAdapter, imageboardReadModel, imageboardProductFlow, SiteRender, siteClient gateway object URLs.
 * RO:INVARIANTS — public PublicationSummaryV1 is read truth; typed Image route owns full asset hydration; summary CIDs alone never become B3 verification.
 * RO:SECURITY — read-only publication listing; no session thread cache as read truth; no direct wallet, ledger, index, storage, publication, or moderation mutation.
 * RO:TEST — imageboardReaderPresentation.test.mjs plus focused JSX parse.
 */

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPublicationAdapter,
} from '../../adapters/publicationAdapter.js';

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import ContentCard from '../../shared/components/ContentCard.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';

import {
  readPublicProfileCache,
} from '../../shared/profile/publicProfileCache.js';

import {
  beginImageboardReplyIntent,
} from './imageboardProductFlow.js';

import {
  IMAGEBOARD_PUBLICATION_READ_LIMIT,
  isResolvedImageboardSite,
  projectResolvedImageboardPublications,
} from './imageboardReadModel.js';

import {
  resolveSiteCreatorIdentity,
} from './SiteCreatorProfileProof.jsx';

const EMPTY_READER_STATE =
  Object.freeze({
    status:
      'idle',

    items:
      Object.freeze([]),

    error:
      null,
  });

export default function ImageboardReaderPresentation({
  app,
  result,
  siteClient,
}) {
  const imageboardSite =
    isResolvedImageboardSite(
      result,
    );

  const summary =
    result?.summary ||
    {};

  const siteCrabUrl =
    String(
      summary.crabUrl ??
      (
        summary.siteName
          ? `crab://${summary.siteName}`
          : ''
      ),
    )
      .trim()
      .toLowerCase();

  const publicationClient =
    useMemo(
      () => {
        if (
          app?.clients?.publications
            ?.listCreatorPublications
        ) {
          return app.clients.publications;
        }

        if (
          app?.clients?.gateway
            ?.request
        ) {
          return createPublicationAdapter(
            app.clients.gateway,
          );
        }

        return null;
      },
      [
        app?.clients,
      ],
    );

  const creatorIdentity =
    useMemo(
      () =>
        resolveSiteCreatorIdentity({
          app,

          result,

          summary,

          cachedProfileEnvelope:
            readPublicProfileCache(),
        }),
      [
        app,
        result,
        summary,
      ],
    );

  const [
    readerState,
    setReaderState,
  ] =
    useState(
      EMPTY_READER_STATE,
    );

  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );

  const [
    revealWarnings,
    setRevealWarnings,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      setPage(
        1,
      );

      setRevealWarnings(
        false,
      );
    },
    [
      siteCrabUrl,
    ],
  );

  useEffect(
    () => {
      if (
        imageboardSite ===
        false
      ) {
        setReaderState(
          EMPTY_READER_STATE,
        );

        return undefined;
      }

      const username =
        String(
          creatorIdentity.username ??
          '',
        )
          .trim()
          .toLowerCase();

      if (
        username ===
          '' ||
        publicationClient ===
          null
      ) {
        setReaderState({
          status:
            'unavailable',

          items:
            Object.freeze([]),

          error:
            null,
        });

        return undefined;
      }

      let alive =
        true;

      setReaderState({
        status:
          'loading',

        items:
          Object.freeze([]),

        error:
          null,
      });

      async function loadImageboardPublications() {
        try {
          const publicationPage =
            await publicationClient
              .listCreatorPublications({
                username,

                cursor:
                  null,

                limit:
                  IMAGEBOARD_PUBLICATION_READ_LIMIT,
              });

          if (
            alive ===
            false
          ) {
            return;
          }

          setReaderState({
            status:
              'ready',

            items:
              Object.freeze(
                Array.isArray(
                  publicationPage?.items,
                )
                  ? [
                      ...publicationPage.items,
                    ]
                  : [],
              ),

            error:
              null,
          });
        } catch (error) {
          if (
            alive ===
            false
          ) {
            return;
          }

          setReaderState({
            status:
              'error',

            items:
              Object.freeze([]),

            error,
          });
        }
      }

      void loadImageboardPublications();

      return () => {
        alive =
          false;
      };
    },
    [
      imageboardSite,
      creatorIdentity.username,
      publicationClient,
    ],
  );

  const projection =
    useMemo(
      () => {
        if (
          imageboardSite ===
            false ||
          siteCrabUrl ===
            ''
        ) {
          return null;
        }

        return projectResolvedImageboardPublications({
          result,

          publications:
            readerState.items,

          page,

          revealWarnings,
        });
      },
      [
        imageboardSite,
        page,
        readerState.items,
        result,
        revealWarnings,
        siteCrabUrl,
      ],
    );

  const accessByImageCrabUrl =
    useMemo(
      () =>
        buildAccessMap(
          readerState.items,
          siteCrabUrl,
        ),
      [
        readerState.items,
        siteCrabUrl,
      ],
    );

  if (
    imageboardSite ===
    false
  ) {
    return null;
  }

  function openThread(
    item,
  ) {
    if (
      threadIsInteractive(
        item,
      )
    ) {
      app?.navigate?.(
        item.imageCrabUrl,
      );
    }
  }

  function replyToThread(
    item,
  ) {
    if (
      threadIsInteractive(
        item,
      ) ===
      false
    ) {
      return;
    }

    beginImageboardReplyIntent({
      siteCrabUrl,

      imageCrabUrl:
        item.imageCrabUrl,

      creatorDisplay:
        currentCreatorDisplay(
          app,
        ),
    });

    app?.navigate?.(
      'crab://comment',
    );
  }

  return (
    <section
      className="site-resolved-stack imageboard-reader"
      aria-label="Imageboard reader"
      data-final-beta-imageboard-reader="phase14a5"
    >
      <Card
        eyebrow="Imageboard"
        title={
          summary.title ||
          summary.siteName ||
          'Imageboard'
        }
        actions={
          <div className="site-page-actions">
            <Badge tone="success">
              newest first
            </Badge>

            <Badge tone="neutral">
              public network summaries
            </Badge>

            <Badge
              tone={
                creatorIdentity.username
                  ? 'success'
                  : 'warning'
              }
            >
              {creatorIdentity.username
                ? `@${creatorIdentity.username}`
                : 'creator unavailable'}
            </Badge>
          </div>
        }
      >
        {summary.description && (
          <p>
            {summary.description}
          </p>
        )}

        <p className="site-panel-note">
          The board is built from public Image publication summaries
          that reference this exact named Site. Session navigation memory
          is not used as board truth.
        </p>

        <div
          className="site-preview-badges"
          aria-label="Imageboard reader truth"
        >
          <Badge tone="neutral">
            typed .image threads
          </Badge>

          <Badge tone="neutral">
            B3 expected CIDs only
          </Badge>

          <Badge tone="warning">
            not B3-verified here
          </Badge>

          <Badge tone="neutral">
            category metadata unavailable
          </Badge>
        </div>

        <div className="site-page-actions">
          <Button
            variant="secondary"
            onClick={() =>
              setRevealWarnings(
                (value) =>
                  value ===
                  false,
              )
            }
          >
            {revealWarnings
              ? 'Hide warned previews'
              : 'Reveal warned previews'}
          </Button>

          {creatorIdentity.profileRoute && (
            <Button
              variant="ghost"
              onClick={() =>
                app?.navigate?.(
                  creatorIdentity.profileRoute,
                )
              }
            >
              Creator Profile
            </Button>
          )}
        </div>
      </Card>

      {readerState.status ===
        'loading' && (
        <LoadingState
          title="Loading Imageboard"
          copy="Reading bounded public creator publications through the configured gateway."
          skeletonCount={6}
        />
      )}

      {readerState.status ===
        'unavailable' && (
        <Card
          eyebrow="Imageboard"
          title="Publication listing unavailable"
        >
          <p>
            This named Imageboard resolved, but CrabLink does not have
            a backend-confirmed creator username or a configured public
            publication reader. CrabLink will not invent a thread grid.
          </p>
        </Card>
      )}

      {readerState.status ===
        'error' && (
        <Card
          eyebrow="Imageboard"
          title="Unable to load image threads"
          actions={
            <div className="site-page-actions">
              <Button
                variant="secondary"
                onClick={
                  app?.refreshRoute
                }
              >
                Retry
              </Button>
            </div>
          }
        >
          <p>
            The Site resolved, but its creator publication list could
            not be read through the configured gateway.
          </p>
        </Card>
      )}

      {readerState.status ===
        'ready' &&
        projection &&
        projection.state ===
          'empty' && (
        <Card
          eyebrow="Imageboard"
          title="No public image threads yet"
        >
          <p>
            No valid public Image summaries currently reference this
            named Imageboard.
          </p>
        </Card>
      )}

      {readerState.status ===
        'ready' &&
        projection &&
        projection.state ===
          'ready' && (
        <>
          <Card
            eyebrow="Browse"
            title="Image threads"
            actions={
              <div className="site-page-actions">
                <Badge tone="neutral">
                  page {projection.page} of {projection.totalPages}
                </Badge>

                <Badge tone="neutral">
                  {projection.totalItems} thread(s)
                </Badge>
              </div>
            }
          >
            <p>
              Newest first. No opaque ranking or paid placement.
              Per-thread category, warning, and reply-count fields are
              not invented when the public summary contract does not
              provide them.
            </p>
          </Card>

          <div
            className="imageboard-reader-grid"
            aria-label="Image thread thumbnail grid"
          >
            {projection.items.map(
              (item) => (
                <ImageboardThreadCard
                  key={
                    item.imageCrabUrl
                  }
                  item={
                    item
                  }
                  access={
                    accessByImageCrabUrl.get(
                      item.imageCrabUrl,
                    ) ??
                    'unknown'
                  }
                  siteClient={
                    siteClient
                  }
                  onOpen={
                    openThread
                  }
                  onReply={
                    replyToThread
                  }
                />
              ),
            )}
          </div>

          <Card
            eyebrow="Pagination"
            title="Browse more threads"
            actions={
              <div className="site-page-actions">
                <Button
                  variant="secondary"
                  disabled={
                    projection.hasPrevious ===
                    false
                  }
                  onClick={() =>
                    setPage(
                      (value) =>
                        Math.max(
                          1,
                          value - 1,
                        ),
                    )
                  }
                >
                  Previous
                </Button>

                <Button
                  variant="secondary"
                  disabled={
                    projection.hasNext ===
                    false
                  }
                  onClick={() =>
                    setPage(
                      (value) =>
                        value + 1,
                    )
                  }
                >
                  Next
                </Button>
              </div>
            }
          >
            <p>
              This reader uses the bounded A4 Imageboard projection over
              the creator publication page returned by the gateway.
            </p>
          </Card>
        </>
      )}
    </section>
  );
}

function ImageboardThreadCard({
  item,
  access,
  siteClient,
  onOpen,
  onReply,
}) {
  const interactive =
    threadIsInteractive(
      item,
    );

  const thumbnailObjectUrl =
    interactive &&
    access ===
      'free' &&
    item.thumbnail?.cid &&
    siteClient
      ?.objectUrlFromCid
    ? siteClient.objectUrlFromCid(
        item.thumbnail.cid,
      )
    : '';

  const preview =
    item.thumbnail
      ? (
          <div className="imageboard-reader-thumbnail">
            {thumbnailObjectUrl
              ? (
                  <img
                    src={
                      thumbnailObjectUrl
                    }
                    alt={
                      item.thumbnail.alt ||
                      item.title ||
                      'Imageboard thread thumbnail'
                    }
                    loading="lazy"
                  />
                )
              : (
                  <div className="imageboard-reader-thumbnail-placeholder">
                    <strong>
                      Preview withheld
                    </strong>

                    <span>
                      {access ===
                        'paid'
                        ? 'Open the typed Image route for access review.'
                        : 'No reviewed thumbnail bytes are available here.'}
                    </span>
                  </div>
                )}
          </div>
        )
      : null;

  const creator =
    item.creator?.displayName ||
    (
      item.creator?.username
        ? `@${item.creator.username}`
        : ''
    );

  const expectedCid =
    item.b3
      ?.expectedContentCid ??
    '';

  return (
    <ContentCard
      kind={
        interactive
          ? 'Image thread'
          : moderationLabel(
              item.moderationState,
            )
      }
      title={
        item.title
      }
      summary={
        item.summary
      }
      creator={
        creator
      }
      timeLabel={
        formatDate(
          item.publishedAt,
        )
      }
      thumbnail={
        preview
      }
      statusLabel={
        interactive
          ? 'network summary'
          : item.moderationState
      }
      metadata={
        <div className="site-preview-badges">
          <Badge tone="neutral">
            {access ===
              'unknown'
              ? 'access not returned'
              : access}
          </Badge>

          <Badge tone="neutral">
            B3 expected
          </Badge>

          <Badge tone="warning">
            not verified here
          </Badge>

          {expectedCid && (
            <span
              className="imageboard-reader-cid"
              title={
                expectedCid
              }
            >
              {shortCid(
                expectedCid,
              )}
            </span>
          )}
        </div>
      }
      actions={
        <div className="site-page-actions">
          <Button
            variant="secondary"
            disabled={
              interactive ===
              false
            }
            onClick={() =>
              onReply(
                item,
              )
            }
          >
            Reply
          </Button>
        </div>
      }
      openLabel="Open thread"
      onOpen={
        interactive
          ? () =>
              onOpen(
                item,
              )
          : null
      }
      className="imageboard-reader-thread-card"
    />
  );
}

function buildAccessMap(
  publications,
  siteCrabUrl,
) {
  const map =
    new Map();

  for (
    const raw
    of Array.isArray(
      publications,
    )
      ? publications
      : []
  ) {
    const crabUrl =
      String(
        raw?.crabUrl ??
        '',
      )
        .trim()
        .toLowerCase();

    const referencedSite =
      String(
        raw?.references
          ?.siteUrl ??
        '',
      )
        .trim()
        .toLowerCase();

    if (
      /^crab:\/\/[0-9a-f]{64}\.image$/.test(
        crabUrl,
      ) &&
      referencedSite ===
        siteCrabUrl
    ) {
      const access =
        String(
          raw?.access ??
          '',
        )
          .trim()
          .toLowerCase();

      map.set(
        crabUrl,
        access ===
          'free' ||
        access ===
          'paid'
          ? access
          : 'unknown',
      );
    }
  }

  return map;
}

function threadIsInteractive(
  item,
) {
  return (
    item?.moderationState ===
      'visible' ||
    item?.moderationState ===
      'content_warning'
  );
}

function moderationLabel(
  value,
) {
  if (
    value ===
    'deleted'
  ) {
    return 'Deleted thread';
  }

  if (
    value ===
    'blocked'
  ) {
    return 'Blocked thread';
  }

  if (
    value ===
    'moderated'
  ) {
    return 'Moderated thread';
  }

  return 'Image thread';
}

function currentCreatorDisplay(
  app,
) {
  return String(
    app?.settings?.handle ??
    app?.settings
      ?.passportSubject ??
    '',
  )
    .trim();
}

function formatDate(
  input,
) {
  const parsed =
    Date.parse(
      String(
        input ??
        '',
      ),
    );

  if (
    Number.isFinite(
      parsed,
    ) ===
    false
  ) {
    return '';
  }

  return new Date(
    parsed,
  ).toLocaleString();
}

function shortCid(
  cid,
) {
  const value =
    String(
      cid ??
      '',
    );

  if (
    value.length <=
    22
  ) {
    return value;
  }

  return `${value.slice(
    0,
    12,
  )}…${value.slice(
    -8,
  )}`;
}
