/**
 * RO:WHAT — Consumer Blog landing/archive presentation for resolved named Blog sites.
 * RO:WHY — FINAL_BETA Phase 13 needs a real reader surface backed by gateway publication summaries.
 * RO:INTERACTS — publicationAdapter, SiteCreatorProfileProof, blogReadModel, blogProductFlow, SiteRender.
 * RO:INVARIANTS — gateway-backed summaries only; exact Site reference; chronological order; typed article/post routes.
 * RO:SECURITY — read-only presentation; Comment handoff carries context only and does not publish or spend.
 * RO:TEST — blogReadPresentation.test.mjs plus Phase 13 production frontend build.
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
import LoadingState from '../../shared/components/LoadingState.jsx';
import {
  readPublicProfileCache,
} from '../../shared/profile/publicProfileCache.js';
import {
  beginBlogCommentIntent,
} from './blogProductFlow.js';
import {
  BLOG_READ_CATEGORIES,
  isResolvedBlogSite,
  projectResolvedBlogPublications,
} from './blogReadModel.js';
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

export default function BlogReaderPresentation({
  app,
  result,
}) {
  const blogSite =
    isResolvedBlogSite(
      result,
    );

  const summary =
    result?.summary ??
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
    category,
    setCategory,
  ] =
    useState(
      'all',
    );

  const [
    view,
    setView,
  ] =
    useState(
      'latest',
    );

  useEffect(
    () => {
      if (
        blogSite ===
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

      async function loadBlogPublications() {
        try {
          const page =
            await publicationClient
              .listCreatorPublications({
                username,

                cursor:
                  null,

                limit:
                  50,
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
                  page?.items,
                )
                  ? [
                      ...page.items,
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

      void loadBlogPublications();

      return () => {
        alive =
          false;
      };
    },
    [
      blogSite,
      creatorIdentity.username,
      publicationClient,
    ],
  );

  const projection =
    useMemo(
      () => {
        if (
          blogSite ===
          false ||
        siteCrabUrl ===
          ''
        ) {
          return null;
        }

        return projectResolvedBlogPublications({
          result,

          publications:
            readerState.items,

          category,
        });
      },
      [
        blogSite,
        category,
        readerState.items,
        result,
        siteCrabUrl,
      ],
    );

  if (
    blogSite ===
    false
  ) {
    return null;
  }

  function openPublication(
    crabUrl,
  ) {
    app?.navigate?.(
      crabUrl,
    );
  }

  function openAuthor() {
    if (
      creatorIdentity.profileRoute
    ) {
      app?.navigate?.(
        creatorIdentity.profileRoute,
      );
    }
  }

  function commentOnArticle(
    articleCrabUrl,
  ) {
    beginBlogCommentIntent({
      siteCrabUrl,

      articleCrabUrl,

      creatorDisplay:
        creatorIdentity.handle ??
        '',
    });

    app?.navigate?.(
      'crab://comment',
    );
  }

  return (
    <section
      className="site-resolved-stack"
      aria-label="Blog reader"
      data-final-beta-blog-reader="phase13a5"
    >
      <Card
        eyebrow="Blog"
        title={
          summary.title ||
          summary.siteName ||
          'Blog'
        }
        actions={
          <div className="site-page-actions">
            <Badge tone="success">
              chronological
            </Badge>

            {creatorIdentity.profileRoute && (
              <Button
                variant="secondary"
                onClick={
                  openAuthor
                }
              >
                Author Profile
              </Button>
            )}
          </div>
        }
      >
        {summary.description && (
          <p>
            {summary.description}
          </p>
        )}

        <div
          className="site-preview-badges"
          aria-label="Blog topics"
        >
          {projection?.siteTags
            ?.map(
              (tag) => (
                <Badge
                  key={tag}
                  tone="neutral"
                  uppercase={
                    false
                  }
                >
                  #{tag}
                </Badge>
              ),
            )}

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

        <div className="site-page-actions">
          <Button
            variant={
              view ===
              'latest'
                ? 'primary'
                : 'secondary'
            }
            onClick={() =>
              setView(
                'latest',
              )
            }
          >
            Latest
          </Button>

          <Button
            variant={
              view ===
              'archive'
                ? 'primary'
                : 'secondary'
            }
            onClick={() =>
              setView(
                'archive',
              )
            }
          >
            Archive
          </Button>
        </div>
      </Card>

      {readerState.status ===
        'loading' && (
        <LoadingState
          title="Loading Blog"
          copy="Reading public creator publications through the configured gateway."
          skeletonCount={4}
        />
      )}

      {readerState.status ===
        'unavailable' && (
        <Card
          eyebrow="Blog content"
          title="Publication listing unavailable"
        >
          <p>
            The named Blog resolved, but CrabLink does not have a
            backend-confirmed creator username or a configured public
            publication reader for this Site. The published Site root
            remains available below; CrabLink will not invent a Blog
            timeline.
          </p>
        </Card>
      )}

      {readerState.status ===
        'error' && (
        <Card
          eyebrow="Blog content"
          title="Unable to load publications"
        >
          <p>
            The Site resolved, but its creator publication list could
            not be read through the gateway.
          </p>

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
        </Card>
      )}

      {readerState.status ===
        'ready' &&
        projection &&
        projection.state ===
          'empty' && (
          <Card
            eyebrow="Blog"
            title="No published entries yet"
          >
            <p>
              No public Article or Post summaries currently reference
              this named Blog.
            </p>
          </Card>
        )}

      {readerState.status ===
        'ready' &&
        projection &&
        projection.state ===
          'ready' && (
          <>
            {view ===
              'latest' && (
              <>
                {projection.featured && (
                  <PublicationCard
                    item={
                      projection.featured
                    }
                    featured
                    onOpen={
                      openPublication
                    }
                    onComment={
                      commentOnArticle
                    }
                  />
                )}

                <Card
                  eyebrow="Browse"
                  title="Latest writing"
                  actions={
                    <div className="site-page-actions">
                      {BLOG_READ_CATEGORIES.map(
                        (candidate) => (
                          <Button
                            key={
                              candidate
                            }
                            variant={
                              category ===
                              candidate
                                ? 'primary'
                                : 'secondary'
                            }
                            size="sm"
                            onClick={() =>
                              setCategory(
                                candidate,
                              )
                            }
                          >
                            {categoryLabel(
                              candidate,
                            )}
                            {' '}
                            {
                              projection.counts[
                                candidate
                              ]
                            }
                          </Button>
                        ),
                      )}
                    </div>
                  }
                >
                  <p>
                    Newest first. No opaque ranking or paid placement.
                  </p>
                </Card>

                {projection.items.map(
                  (item) => (
                    <PublicationCard
                      key={
                        item.crabUrl
                      }
                      item={item}
                      onOpen={
                        openPublication
                      }
                      onComment={
                        commentOnArticle
                      }
                    />
                  ),
                )}
              </>
            )}

            {view ===
              'archive' && (
              <Card
                eyebrow="Archive"
                title="Publication archive"
              >
                {projection.archive.map(
                  (group) => (
                    <section
                      key={
                        group.key
                      }
                      aria-label={
                        group.label
                      }
                    >
                      <h3>
                        {group.label}
                      </h3>

                      {group.items.map(
                        (item) => (
                          <div
                            key={
                              item.crabUrl
                            }
                            className="site-page-actions"
                          >
                            <Button
                              variant="ghost"
                              onClick={() =>
                                openPublication(
                                  item.crabUrl,
                                )
                              }
                            >
                              {item.title}
                            </Button>

                            <Badge tone="neutral">
                              {item.kind}
                            </Badge>
                          </div>
                        ),
                      )}
                    </section>
                  ),
                )}
              </Card>
            )}
          </>
        )}
    </section>
  );
}

function PublicationCard({
  item,
  featured = false,
  onOpen,
  onComment,
}) {
  return (
    <Card
      eyebrow={
        featured
          ? 'Featured article'
          : item.kind ===
              'article'
            ? 'Article'
            : 'Post'
      }
      title={
        item.title
      }
      actions={
        <div className="site-page-actions">
          <Badge tone="neutral">
            {formatDate(
              item.publishedAt,
            )}
          </Badge>

          <Button
            variant="primary"
            onClick={() =>
              onOpen(
                item.crabUrl,
              )
            }
          >
            Read
          </Button>

          {item.kind ===
            'article' && (
            <Button
              variant="secondary"
              onClick={() =>
                onComment(
                  item.crabUrl,
                )
              }
            >
              Comment
            </Button>
          )}
        </div>
      }
    >
      {item.summary && (
        <p>
          {item.summary}
        </p>
      )}

      <div
        className="site-preview-badges"
        aria-label="Publication metadata"
      >
        <Badge tone="neutral">
          {item.kind}
        </Badge>

        <Badge tone="neutral">
          {item.access ||
            'access not returned'}
        </Badge>

        {item.creator
          ?.displayName && (
          <Badge
            tone="neutral"
            uppercase={
              false
            }
          >
            {item.creator.displayName}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function categoryLabel(
  category,
) {
  if (
    category ===
    'article'
  ) {
    return 'Articles';
  }

  if (
    category ===
    'post'
  ) {
    return 'Posts';
  }

  return 'All';
}

function formatDate(
  input,
) {
  const timestamp =
    Date.parse(
      input,
    );

  if (
    Number.isFinite(
      timestamp,
    ) ===
    false
  ) {
    return 'date unavailable';
  }

  return new Date(
    timestamp,
  ).toLocaleDateString(
    undefined,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    },
  );
}
