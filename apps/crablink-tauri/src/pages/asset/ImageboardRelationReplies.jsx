/**
 * RO:WHAT — Durable direct-reply reader mounted beneath a resolved typed Image asset.
 * RO:WHY — FINAL_BETA Phase 14A6E3 connects the public relation route to the real typed Image detail surface opened from an Imageboard.
 * RO:INTERACTS — publicationRelationAdapter, imageboardRelationReadModel, imageboardModel reply presentation, AssetResolver.
 * RO:INVARIANTS — canonical Image parent only; first bounded relation page only; exact direct parent and thread root; relation summaries remain previews rather than full Comment bodies.
 * RO:SECURITY — read-only gateway relation path; no direct Omnigate or svc-index access; no local/session cache truth; no reply publication or economic mutation.
 * RO:TEST — imageboardRelationReplies.source.test.mjs plus imageboardReplyPreview.test.mjs.
 */

// FINAL_BETA_PHASE14A6E3_TYPED_IMAGE_RELATION_READER_V1
// FINAL_BETA_PHASE14A6F5_VERIFIED_COMMENT_BODY_UI_V1

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPublicationRelationAdapter,
} from '../../adapters/publicationRelationAdapter.js';

import {
  hydrateVerifiedCommentContent,
} from '../../shared/api/verifiedCommentContent.js';

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';

import {
  mapPublicationRelationPageToImageboardReplies,
} from '../site/imageboardRelationReadModel.js';

import {
  projectImageboardReplyPreview,
} from '../site/imageboardModel.js';

const IMAGEBOARD_RELATION_READ_LIMIT =
  50;

const IMAGE_CRAB_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.image$/u;

const EMPTY_RELATION_STATE =
  Object.freeze({
    status:
      'idle',

    items:
      Object.freeze([]),

    page:
      null,

    siteCrabUrl:
      '',

    error:
      null,
  });

export default function ImageboardRelationReplies({
  route,
  app,
}) {
  const imageCrabUrl =
    useMemo(
      () =>
        imageCrabUrlFromRoute(
          route,
        ),
      [
        route?.normalizedInput,
        route?.params,
      ],
    );

  const relationClient =
    useMemo(
      () => {
        if (
          app?.clients
            ?.publicationRelations
            ?.listPublicationRelations
        ) {
          return app
            .clients
            .publicationRelations;
        }

        const gateway =
          app?.clients?.gateway ??
          app?.gateway ??
          null;

        if (
          gateway?.request
        ) {
          return createPublicationRelationAdapter(
            gateway,
          );
        }

        return null;
      },
      [
        app?.clients,
        app?.gateway,
      ],
    );

  const [
    relationState,
    setRelationState,
  ] =
    useState(
      EMPTY_RELATION_STATE,
    );

  const [
    reloadToken,
    setReloadToken,
  ] =
    useState(
      0,
    );

  useEffect(
    () => {
      if (
        imageCrabUrl ===
          ''
      ) {
        setRelationState(
          EMPTY_RELATION_STATE,
        );

        return undefined;
      }

      if (
        relationClient ===
          null
      ) {
        setRelationState({
          status:
            'unavailable',

          items:
            Object.freeze([]),

          page:
            null,

          siteCrabUrl:
            '',

          error:
            null,
        });

        return undefined;
      }

      let alive =
        true;

      setRelationState({
        status:
          'loading',

        items:
          Object.freeze([]),

        page:
          null,

        siteCrabUrl:
          '',

        error:
          null,
      });

      async function loadDurableImageReplies() {
        try {
          const rawPage =
            await relationClient
              .listPublicationRelations({
                parentCrabUrl:
                  imageCrabUrl,

                cursor:
                  null,

                limit:
                  IMAGEBOARD_RELATION_READ_LIMIT,
              });

          const mapped =
            mapPublicationRelationPageToImageboardReplies(
              rawPage,
            );

          const siteContexts =
            new Set();

          const items =
            mapped.replies
              .map(
                (reply) => {
                  if (
                    (
                      reply.parentCrabUrl ===
                        imageCrabUrl
                    ) ===
                      false
                  ) {
                    throw new Error(
                      'Durable Image reply parent does not match the requested Image.',
                    );
                  }

                  if (
                    (
                      reply.threadCrabUrl ===
                        imageCrabUrl
                    ) ===
                      false
                  ) {
                    throw new Error(
                      'Durable Image reply thread root does not match the requested Image.',
                    );
                  }

                  siteContexts.add(
                    reply.siteCrabUrl,
                  );

                  const preview =
                    projectImageboardReplyPreview(
                      reply,
                    );

                  return Object.freeze({
                    relation:
                      reply,

                    preview,

                    hydration:
                      initialReplyHydration(
                        preview,
                      ),
                  });
                },
              );

          if (
            siteContexts.size >
              1
          ) {
            throw new Error(
              'Durable Image replies disagree about their Site context.',
            );
          }

          if (
            alive ===
              false
          ) {
            return;
          }

          setRelationState({
            status:
              'ready',

            items:
              Object.freeze(
                items,
              ),

            page:
              mapped.page,

            siteCrabUrl:
              items.length >
                0
                ? items[0]
                    .relation
                    .siteCrabUrl
                : '',

            error:
              null,
          });

          void hydrateVisibleReplyBodies(
            items,
          );
        } catch (error) {
          if (
            alive ===
              false
          ) {
            return;
          }

          setRelationState({
            status:
              'error',

            items:
              Object.freeze([]),

            page:
              null,

            siteCrabUrl:
              '',

            error,
          });
        }
      }

      async function hydrateVisibleReplyBodies(
        items,
      ) {
        for (
          const item
          of items
        ) {
          if (
            item.preview
              .moderationState ===
              'visible'
          ) {
            try {
              const verified =
                await hydrateVerifiedCommentContent(
                  item.relation,
                );

              if (
                alive ===
                  false
              ) {
                return;
              }

              setRelationState(
                (current) =>
                  replaceReplyHydration(
                    current,
                    item.relation.crabUrl,
                    Object.freeze({
                      status:
                        'verified',

                      body:
                        verified.body,

                      expectedContentCid:
                        verified.expectedContentCid,

                      resolvedContentCid:
                        verified.resolvedContentCid,

                      contentVerified:
                        true,

                      errorReason:
                        '',
                    }),
                  ),
              );
            } catch (error) {
              if (
                alive ===
                  false
              ) {
                return;
              }

              setRelationState(
                (current) =>
                  replaceReplyHydration(
                    current,
                    item.relation.crabUrl,
                    Object.freeze({
                      status:
                        'error',

                      body:
                        '',

                      expectedContentCid:
                        item.relation
                          .b3
                          .expectedContentCid,

                      resolvedContentCid:
                        null,

                      contentVerified:
                        false,

                      errorReason:
                        String(
                          error?.reason ??
                            'verified_comment_hydration_failed',
                        ),
                    }),
                  ),
              );
            }
          }
        }
      }

      void loadDurableImageReplies();

      return () => {
        alive =
          false;
      };
    },
    [
      imageCrabUrl,
      relationClient,
      reloadToken,
    ],
  );

  if (
    imageCrabUrl ===
      ''
  ) {
    return null;
  }

  if (
    relationState.status ===
      'loading'
  ) {
    return (
      <LoadingState
        title="Loading durable replies"
        copy="CrabLink is reading the first bounded page of direct Comment relations for this typed Image through the public gateway."
        skeletonCount={3}
      />
    );
  }

  if (
    relationState.status ===
      'unavailable'
  ) {
    return (
      <Card
        eyebrow="Image thread"
        title="Durable reply reader unavailable"
      >
        <p className="asset-description">
          This typed Image resolved, but no configured public publication-relation reader is available.
          CrabLink will not substitute session memory or local draft state for durable replies.
        </p>
      </Card>
    );
  }

  if (
    relationState.status ===
      'error'
  ) {
    return (
      <Card
        eyebrow="Image thread"
        title="Unable to load durable replies"
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              setReloadToken(
                (value) =>
                  value + 1,
              )
            }
          >
            Retry replies
          </Button>
        }
      >
        <p className="asset-description">
          The typed Image remains available, but its durable relation page could not be validated.
          No local reply fallback is shown.
        </p>
      </Card>
    );
  }

  if (
    relationState.status ===
      'ready' &&
    relationState.items.length ===
      0
  ) {
    return (
      <Card
        eyebrow="Image thread"
        title="No durable direct replies yet"
        actions={
          relationState.page?.hasMore
            ? (
                <Badge tone="warning">
                  more relations reported
                </Badge>
              )
            : null
        }
      >
        <p className="asset-description">
          The public relation reader returned no displayable direct Comment relations for this Image.
        </p>

        <p className="asset-description">
          There are no visible Comment bodies to verify for this bounded relation page.
        </p>
      </Card>
    );
  }

  if (
    relationState.status !==
      'ready'
  ) {
    return null;
  }

  return (
    <Card
      eyebrow="Image thread"
      title="Durable direct replies"
      actions={
        <div className="asset-copy-actions">
          <Badge tone="success">
            {relationState.items.length} shown
          </Badge>

          <Badge tone="neutral">
            oldest first
          </Badge>

          {relationState.page?.hasMore && (
            <Badge tone="warning">
              more replies available
            </Badge>
          )}
        </div>
      }
    >
      <p className="asset-description">
        These entries came from the durable publication-relation read path for this exact typed Image parent.
        Relation summaries remain the fallback until the full Comment bytes pass exact B3 and envelope verification.
      </p>

      {relationState.siteCrabUrl && (
        <p className="asset-description">
          Relation Site context: {relationState.siteCrabUrl}
        </p>
      )}

      <div
        className="asset-attempt-list"
        aria-label="Durable Imageboard reply previews"
      >
        {relationState.items.map(
          ({
            relation,
            preview,
            hydration,
          }) => {
            const creator =
              preview.creator?.displayName ??
              (
                preview.creator?.username
                  ? `@${preview.creator.username}`
                  : ''
              );

            const verified =
              hydration?.status ===
                'verified' &&
              hydration?.contentVerified ===
                true;

            const displayBody =
              preview.moderationState ===
                'visible'
                ? (
                    verified
                      ? hydration.body
                      : preview.body
                  )
                : '';

            return (
              <article
                key={
                  preview.crabUrl
                }
              >
                <span>
                  {preview.moderationState ===
                    'visible'
                    ? (
                        verified
                          ? 'verified full reply'
                          : 'reply preview'
                      )
                    : moderationLabel(
                        preview.moderationState,
                      )}
                </span>

                <strong>
                  {creator ||
                    'creator not returned'}
                </strong>

                <small>
                  {formatDate(
                    preview.createdAt,
                  )}
                </small>

                {displayBody && (
                  <p>
                    {displayBody}
                  </p>
                )}

                {preview.moderationState ===
                  'visible' &&
                  hydration?.status ===
                    'pending' && (
                  <small>
                    Relation summary preview shown while the full Comment body is verified.
                  </small>
                )}

                {preview.moderationState ===
                  'visible' &&
                  hydration?.status ===
                    'error' && (
                  <small>
                    Full Comment body was not displayed because verification did not complete.
                    The durable relation summary preview remains visible.
                  </small>
                )}

                {verified && (
                  <small>
                    Full Comment body verified against {shortCrabUrl(
                      hydration.resolvedContentCid,
                    )}.
                  </small>
                )}

                {preview.moderationState !==
                  'visible' && (
                  <p>
                    Reply content is hidden by the existing Imageboard moderation projection.
                  </p>
                )}

                <small>
                  {shortCrabUrl(
                    preview.crabUrl,
                  )}
                </small>

                <small>
                  parent {shortCrabUrl(
                    relation.parentCrabUrl,
                  )}
                </small>
              </article>
            );
          },
        )}
      </div>

      {relationState.page?.hasMore && (
        <p className="asset-description">
          This phase reads only the first bounded page. The backend reports additional direct replies;
          cursor expansion remains a separate bounded follow-up.
        </p>
      )}
    </Card>
  );
}

function initialReplyHydration(
  preview,
) {
  if (
    preview?.moderationState ===
      'visible'
  ) {
    return Object.freeze({
      status:
        'pending',

      body:
        '',

      expectedContentCid:
        null,

      resolvedContentCid:
        null,

      contentVerified:
        false,

      errorReason:
        '',
    });
  }

  return Object.freeze({
    status:
      'redacted',

    body:
      '',

    expectedContentCid:
      null,

    resolvedContentCid:
      null,

    contentVerified:
      false,

    errorReason:
      '',
  });
}

function replaceReplyHydration(
  current,
  crabUrl,
  hydration,
) {
  if (
    current?.status !==
      'ready'
  ) {
    return current;
  }

  let changed =
    false;

  const items =
    current.items.map(
      (item) => {
        if (
          item.relation.crabUrl ===
            crabUrl
        ) {
          changed =
            true;

          return Object.freeze({
            ...item,

            hydration,
          });
        }

        return item;
      },
    );

  if (
    changed ===
      false
  ) {
    return current;
  }

  return {
    ...current,

    items:
      Object.freeze(
        items,
      ),
  };
}

function imageCrabUrlFromRoute(
  route,
) {
  const candidates =
    [
      route?.normalizedInput,
      route?.params?.assetUrl,
      route?.params?.crabUrl,
    ];

  for (
    const candidate
    of candidates
  ) {
    const value =
      String(
        candidate ??
          '',
      )
        .trim()
        .toLowerCase();

    if (
      IMAGE_CRAB_URL_PATTERN
        .test(
          value,
        )
    ) {
      return value;
    }
  }

  return '';
}

function moderationLabel(
  value,
) {
  if (
    value ===
      'deleted'
  ) {
    return 'deleted reply';
  }

  if (
    value ===
      'blocked'
  ) {
    return 'blocked reply';
  }

  if (
    value ===
      'moderated'
  ) {
    return 'moderated reply';
  }

  if (
    value ===
      'content_warning'
  ) {
    return 'content warning';
  }

  return 'reply preview';
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
    return 'time not returned';
  }

  return new Date(
    parsed,
  ).toLocaleString();
}

function shortCrabUrl(
  value,
) {
  const clean =
    String(
      value ??
        '',
    ).trim();

  if (
    clean.length <=
      32
  ) {
    return clean;
  }

  return `${clean.slice(
    0,
    20,
  )}…${clean.slice(
    -8,
  )}`;
}
