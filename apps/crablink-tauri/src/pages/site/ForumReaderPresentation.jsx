/**
 * RO:WHAT — Consumer Forum reader for resolved named Forum Sites.
 * RO:WHY — FINAL_BETA Phase 15 wires durable Post roots, nested Comment replies, latest activity, categories, and creator handoffs into Site presentation.
 * RO:INTERACTS — forumPublicRead, forumModel, forumProductFlow, SiteRender, GatewayClient.
 * RO:INVARIANTS — backend roots/replies are read truth; reply count/activity come only from complete relation traversal; sticky/locked remain reviewed-policy only.
 * RO:SECURITY — display and explicit navigation intent only; no direct index/storage, publication/moderation mutation, wallet, ledger, follow, QuickChain, ROX, or Solana authority.
 * RO:TEST — forumReaderPresentation.source.test.mjs plus Vite build at integration verification.
 */

// FINAL_BETA_PHASE15_FORUM_READER_PRESENTATION_V1

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';

import {
  beginForumReplyIntent,
  beginForumThreadIntent,
} from './forumProductFlow.js';

import {
  projectForumThreadList,
} from './forumModel.js';

import {
  createForumPublicReader,
  isResolvedForumSite,
  mergeForumReadPages,
} from './forumPublicRead.js';

const EMPTY =
  Object.freeze({
    status:
      'idle',

    result:
      null,

    error:
      null,
  });

export default function ForumReaderPresentation({
  app,
  result,
}) {
  const forumSite =
    isResolvedForumSite(
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

  const reader =
    useMemo(
      () => {
        if (
          app?.clients?.gateway
            ?.request
        ) {
          return createForumPublicReader({
            gateway:
              app.clients.gateway,
          });
        }

        return null;
      },
      [
        app?.clients?.gateway,
      ],
    );

  const [
    state,
    setState,
  ] =
    useState(
      EMPTY,
    );

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState(
      'all',
    );

  const [
    selectedThread,
    setSelectedThread,
  ] =
    useState(
      '',
    );

  useEffect(
    () => {
      setSelectedCategory(
        'all',
      );

      setSelectedThread(
        '',
      );
    },
    [
      siteCrabUrl,
    ],
  );

  useEffect(
    () => {
      if (
        forumSite ===
          false
      ) {
        setState(
          EMPTY,
        );

        return undefined;
      }

      if (
        siteCrabUrl ===
          '' ||
        reader ===
          null
      ) {
        setState({
          status:
            'unavailable',

          result:
            null,

          error:
            null,
        });

        return undefined;
      }

      let alive =
        true;

      setState({
        status:
          'loading',

        result:
          null,

        error:
          null,
      });

      async function loadForum() {
        try {
          const loaded =
            await reader
              .loadPage({
                siteCrabUrl,
              });

          if (
            alive ===
              false
          ) {
            return;
          }

          setState({
            status:
              'ready',

            result:
              loaded,

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

          setState({
            status:
              'error',

            result:
              null,

            error,
          });
        }
      }

      void loadForum();

      return () => {
        alive =
          false;
      };
    },
    [
      forumSite,
      reader,
      siteCrabUrl,
    ],
  );

  const list =
    useMemo(
      () => {
        if (
          state.result ===
            null
        ) {
          return null;
        }

        return projectForumThreadList({
          threads:
            state.result
              .threads,

          settings:
            state.result
              .settings,

          category:
            selectedCategory,

          page:
            1,
        });
      },
      [
        selectedCategory,
        state.result,
      ],
    );

  const selectedRecord =
    useMemo(
      () =>
        state.result
          ?.records
          ?.find(
            (record) =>
              record.thread
                .postCrabUrl ===
              selectedThread,
          ) ||
        null,
      [
        selectedThread,
        state.result,
      ],
    );

  if (
    forumSite ===
      false
  ) {
    return null;
  }

  async function loadMore() {
    if (
      state.status !==
        'ready' ||
      state.result?.hasMore !==
        true ||
      state.result?.nextCursor ==
        null
    ) {
      return;
    }

    try {
      const next =
        await reader
          .loadPage({
            siteCrabUrl,

            cursor:
              state.result
                .nextCursor,
          });

      setState({
        status:
          'ready',

        result:
          mergeForumReadPages(
            state.result,
            next,
          ),

        error:
          null,
      });
    } catch (error) {
      setState({
        status:
          'error',

        result:
          state.result,

        error,
      });
    }
  }

  function createThread() {
    const category =
      selectedCategory ===
        'all'
        ? state.result
            ?.settings
            ?.categories
            ?.[0]
            ?.id ||
          'general'
        : selectedCategory;

    beginForumThreadIntent({
      siteCrabUrl,

      creatorDisplay:
        currentCreatorDisplay(
          app,
        ),

      category,
    });

    app?.navigate?.(
      'crab://post',
    );
  }

  function replyTo(
    parentCrabUrl,
  ) {
    const threadCrabUrl =
      selectedRecord
        ?.thread
        ?.postCrabUrl ||
      '';

    if (
      threadCrabUrl ===
        ''
    ) {
      return;
    }

    beginForumReplyIntent({
      siteCrabUrl,

      threadCrabUrl,

      parentCrabUrl:
        parentCrabUrl ||
        threadCrabUrl,

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
      className="site-resolved-stack forum-reader"
      aria-label="Forum reader"
      data-final-beta-forum-reader="phase15"
    >
      <Card
        eyebrow="Forum"
        title={
          summary.title ||
          summary.siteName ||
          'Forum'
        }
        actions={
          <div className="site-page-actions">
            <Badge tone="success">
              durable threads
            </Badge>

            <Badge tone="success">
              durable replies
            </Badge>

            <Button
              variant="primary"
              onClick={
                createThread
              }
            >
              New Thread
            </Button>
          </div>
        }
      >
        <p>
          Forum threads are typed Posts. Replies are typed Comments.
          Thread activity and exact loaded reply counts come from the
          reviewed public relation graph.
        </p>

        {state.status ===
          'loading' && (
          <LoadingState
            title="Loading Forum"
            copy="Reading durable Site roots and Comment relations through the configured gateway."
          />
        )}

        {state.status ===
          'unavailable' && (
          <p>
            Gateway access is unavailable for this Forum reader.
          </p>
        )}

        {state.status ===
          'error' && (
          <div>
            <Badge tone="warning">
              read error
            </Badge>

            <p>
              {String(
                state.error
                  ?.message ||
                'Forum read failed.',
              )}
            </p>
          </div>
        )}

        {state.status ===
          'ready' && (
          <>
            <div className="site-page-actions">
              <Button
                variant={
                  selectedCategory ===
                    'all'
                    ? 'primary'
                    : 'secondary'
                }
                onClick={() =>
                  setSelectedCategory(
                    'all',
                  )
                }
              >
                All
              </Button>

              {state.result
                .settings
                .categories
                .map(
                  (category) => (
                    <Button
                      key={
                        category.id
                      }
                      variant={
                        selectedCategory ===
                          category.id
                          ? 'primary'
                          : 'secondary'
                      }
                      onClick={() =>
                        setSelectedCategory(
                          category.id,
                        )
                      }
                    >
                      {category.label}
                    </Button>
                  ),
                )}
            </div>

            {list?.items
              ?.length ===
              0 && (
              <p>
                No public discussions are available in this category yet.
              </p>
            )}

            {list?.items
              ?.map(
                (thread) => (
                  <Card
                    key={
                      thread.postCrabUrl
                    }
                    eyebrow={
                      thread.category
                    }
                    title={
                      thread.title
                    }
                    actions={
                      <div className="site-page-actions">
                        {thread.sticky && (
                          <Badge tone="info">
                            Sticky
                          </Badge>
                        )}

                        {thread.locked && (
                          <Badge tone="warning">
                            Locked
                          </Badge>
                        )}

                        <Badge tone="neutral">
                          {thread.replyCount}{' '}
                          replies
                        </Badge>

                        <Button
                          variant="secondary"
                          disabled={
                            thread.canOpen ===
                              false
                          }
                          onClick={() =>
                            setSelectedThread(
                              thread.postCrabUrl,
                            )
                          }
                        >
                          Open
                        </Button>
                      </div>
                    }
                  >
                    {thread.summary && (
                      <p>
                        {thread.summary}
                      </p>
                    )}

                    <small>
                      Latest activity:{' '}
                      {formatDate(
                        thread.latestActivityAt,
                      )}
                    </small>
                  </Card>
                ),
              )}

            {state.result
              .hasMore && (
              <div className="site-page-actions">
                <Button
                  variant="secondary"
                  onClick={
                    loadMore
                  }
                >
                  Load More Threads
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {selectedRecord && (
        <Card
          eyebrow="Thread"
          title={
            selectedRecord
              .detail
              .thread
              .title
          }
          actions={
            <div className="site-page-actions">
              <Badge tone="neutral">
                {
                  selectedRecord
                    .detail
                    .replies
                    .totalItems
                }{' '}
                replies
              </Badge>

              {selectedRecord
                .detail
                .thread
                .locked && (
                <Badge tone="warning">
                  Locked
                </Badge>
              )}

              <Button
                variant="primary"
                disabled={
                  selectedRecord
                    .detail
                    .canReply ===
                    false
                }
                onClick={() =>
                  replyTo(
                    selectedRecord
                      .thread
                      .postCrabUrl,
                  )
                }
              >
                Reply
              </Button>
            </div>
          }
        >
          <p>
            {selectedRecord
              .detail
              .thread
              .summary}
          </p>

          <small>
            Latest activity:{' '}
            {formatDate(
              selectedRecord
                .detail
                .latestActivityAt,
            )}
          </small>

          {selectedRecord
            .detail
            .replies
            .items
            .length ===
            0 && (
            <p>
              No public replies yet.
            </p>
          )}

          {selectedRecord
            .detail
            .replies
            .items
            .map(
              (reply) => (
                <Card
                  key={
                    reply.crabUrl
                  }
                  eyebrow="Reply"
                  title={
                    reply
                      .moderationState ===
                      'visible'
                      ? (
                          reply.creator
                            ?.displayName ||
                          'Forum participant'
                        )
                      : moderationLabel(
                          reply
                            .moderationState,
                        )
                  }
                  actions={
                    reply
                      .moderationState ===
                      'visible' &&
                    selectedRecord
                      .detail
                      .canReply
                      ? (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              replyTo(
                                reply.crabUrl,
                              )
                            }
                          >
                            Reply
                          </Button>
                        )
                      : null
                  }
                >
                  {reply.body && (
                    <p>
                      {reply.body}
                    </p>
                  )}

                  <small>
                    {formatDate(
                      reply.createdAt,
                    )}
                  </small>
                </Card>
              ),
            )}
        </Card>
      )}
    </section>
  );
}

function moderationLabel(
  state,
) {
  if (
    state ===
      'deleted'
  ) {
    return 'Deleted reply';
  }

  if (
    state ===
      'blocked'
  ) {
    return 'Blocked reply';
  }

  if (
    state ===
      'moderated'
  ) {
    return 'Moderated reply';
  }

  return 'Forum reply';
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
