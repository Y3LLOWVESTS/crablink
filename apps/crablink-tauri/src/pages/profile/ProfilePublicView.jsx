/**
 * RO:WHAT — Read-only public @username profile view for crab://@username and crab://username.profile.
 * RO:WHY — Makes the passport drawer's "Open public handle" action resolve backend-confirmed public profile truth.
 * RO:INTERACTS — ProfilePage, identityClient, publicProfileCache, route parser, PassportActions.
 * RO:INVARIANTS — gateway-only read; no profile edits; no fake profile CID; no fake REP/MOD; no wallet mutation.
 * RO:METRICS — gateway calls inherit x-correlation-id behavior through GatewayClient.
 * RO:CONFIG — uses configured gateway/passport/wallet labels from app context.
 * RO:SECURITY — no private keys, seed phrases, alt mappings, spend authority, or direct internal-service calls.
 * RO:TEST — open crab://@skinnycrabby, confirm profile auto-reads through gateway and drawer cache remains populated.
 */

// FINAL_BETA_PHASE7A3_PROFILE_TIMELINE_INTEGRATION_V1
// FINAL_BETA_PHASE8A7_PUBLIC_PROFILE_LOCAL_FOLLOW_UI_V1

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import {
  createIdentityClient,
  normalizeHandle,
  normalizeProfileUsername,
  normalizePublicProfileResponse,
} from '../../shared/api/identityClient.js';
import {
  createPublicationAdapter,
} from '../../adapters/publicationAdapter.js';
import {
  localFollowingPort,
} from '../../adapters/localFollowingAdapter.js';
import {
  followProfileLocalFollowing,
  readProfileLocalFollowing,
  unfollowProfileLocalFollowing,
} from './profileLocalFollowingController.js';
import ProfileTimelineSurface from './ProfileTimelineSurface.jsx';
import {
  createProfileTimelineModel,
  normalizeProfileTimelineTab,
} from './profileTimelineModel.js';
import {
  resolveOwnProfileHandle,
} from './ownProfileIdentity.js';
import {
  readPublicProfileCache,
  writePublicProfileCache,
} from '../../shared/profile/publicProfileCache.js';

const EMPTY_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  profile: null,
  response: null,
  error: null,
  cacheHit: false,
});

const EMPTY_TIMELINE_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  page: null,
  error: null,
  loadingMore: false,
});

const EMPTY_LOCAL_FOLLOWING_STATE = Object.freeze({
  status: 'idle',
  record: null,
  isFollowing: false,
  error: null,
});

export default function ProfilePublicView({ app, route }) {
  const routeHandle = String(route?.params?.handle || '').trim();
  const username = normalizeProfileUsername(routeHandle);
  const displayHandle = normalizeHandle(username);
  const passportSubject = stringValue(
    app?.settings?.passportSubject,
    app?.clients?.gateway?.passportSubject,
    '',
  );
  const walletAccount = stringValue(
    app?.settings?.walletAccount,
    app?.clients?.gateway?.walletAccount,
    '',
  );

  const ownHandle =
    resolveOwnProfileHandle({
      settings:
        app?.settings || {},
    });

  const isOwner =
    username.length > 0 &&
    normalizeProfileUsername(
      ownHandle,
    ) === username;

  const identityClient = useMemo(() => {
    if (app?.clients?.identity?.getPassportProfile) {
      return app.clients.identity;
    }

    if (app?.clients?.gateway) {
      return createIdentityClient(app.clients.gateway);
    }

    return null;
  }, [app?.clients]);

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

  const followingClient =
    useMemo(
      () => {
        const injected =
          app?.clients
            ?.localFollowing;

        if (
          typeof injected
            ?.readLocalFollowing ===
              'function' &&
          typeof injected
            ?.writeLocalFollowing ===
              'function'
        ) {
          return injected;
        }

        return localFollowingPort;
      },
      [
        app?.clients,
      ],
    );

  const [state, setState] = useState(() => {
    const cached = readMatchingCache(username);

    if (cached?.profile) {
      return {
        ...EMPTY_STATE,
        status: 'cached',
        checkedAt: cached.meta?.cachedAt || '',
        profile: cached.profile,
        response: null,
        error: null,
        cacheHit: true,
      };
    }

    return EMPTY_STATE;
  });

  const [
    timelineTab,
    setTimelineTab,
  ] =
    useState(
      'posts',
    );

  const [
    publicationState,
    setPublicationState,
  ] =
    useState(
      EMPTY_TIMELINE_STATE,
    );

  const [
    localFollowingState,
    setLocalFollowingState,
  ] =
    useState(
      EMPTY_LOCAL_FOLLOWING_STATE,
    );

  const [
    localFollowingRefreshTick,
    setLocalFollowingRefreshTick,
  ] =
    useState(
      0,
    );

  useEffect(() => {
    let alive = true;

    async function readProfile() {
      if (!username) {
        setState({
          ...EMPTY_STATE,
          status: 'error',
          error: makePublicProfileError(
            'Public profile route requires an @username.',
            'missing_username',
          ),
        });
        return;
      }

      const cached = readMatchingCache(username);

      setState({
        status: cached?.profile ? 'loading_cached' : 'loading',
        checkedAt: cached?.meta?.cachedAt || '',
        profile: cached?.profile || null,
        response: null,
        error: null,
        cacheHit: Boolean(cached?.profile),
      });

      if (!identityClient?.getPassportProfile) {
        setState({
          status: cached?.profile ? 'cached_error' : 'error',
          checkedAt: cached?.meta?.cachedAt || '',
          profile: cached?.profile || null,
          response: null,
          error: makePublicProfileError(
            'Gateway identity client is unavailable.',
            'missing_identity_client',
          ),
          cacheHit: Boolean(cached?.profile),
        });
        return;
      }

      try {
        const response = await identityClient.getPassportProfile(username, {
          passportSubject,
          walletAccount,
          label: `Public profile ${username}`,
        });
        const profile = normalizePublicProfileResponse(response?.data || response?.body || response);

        writePublicProfileCache(profile, {
          action: 'read',
          source: 'svc-gateway public profile route',
          route: response?.route || `/identity/passport/profile/${username}`,
          correlationId: response?.correlationId || response?.response?.correlationId || '',
        });

        if (!alive) {
          return;
        }

        setState({
          status: 'success',
          checkedAt: new Date().toISOString(),
          profile,
          response,
          error: null,
          cacheHit: false,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          status: cached?.profile ? 'cached_error' : 'error',
          checkedAt: cached?.meta?.cachedAt || '',
          profile: cached?.profile || null,
          response: null,
          error,
          cacheHit: Boolean(cached?.profile),
        });
      }
    }

    void readProfile();

    return () => {
      alive = false;
    };
  }, [
    username,
    passportSubject,
    walletAccount,
    identityClient,
    route?.refreshTick,
  ]);

  useEffect(
    () => {
      let alive =
        true;

      async function readPublications() {
        if (
          username.length === 0
        ) {
          setPublicationState({
            ...EMPTY_TIMELINE_STATE,
            status:
              'error',
            error:
              makePublicProfileError(
                'Publication timeline requires an @username.',
                'missing_publication_username',
              ),
          });

          return;
        }

        setPublicationState(
          (current) => ({
            ...current,
            status:
              current.page
                ? 'stale'
                : 'loading',
            error:
              null,
            loadingMore:
              false,
          }),
        );

        if (
          publicationClient === null
        ) {
          setPublicationState(
            (current) => ({
              ...current,
              status:
                current.page
                  ? 'offline'
                  : 'error',
              error:
                makePublicProfileError(
                  'Gateway publication client is unavailable.',
                  'missing_publication_client',
                ),
              loadingMore:
                false,
            }),
          );

          return;
        }

        try {
          const page =
            await publicationClient
              .listCreatorPublications({
                username,
                limit:
                  20,
              });

          reviewTimelinePage(
            username,
            page,
          );

          if (
            alive === false
          ) {
            return;
          }

          setPublicationState({
            status:
              'ready',
            checkedAt:
              new Date()
                .toISOString(),
            page,
            error:
              null,
            loadingMore:
              false,
          });
        } catch (error) {
          if (
            alive === false
          ) {
            return;
          }

          setPublicationState(
            (current) => ({
              ...current,
              status:
                timelineFailureStatus(
                  error,
                  Boolean(
                    current.page,
                  ),
                ),
              error,
              loadingMore:
                false,
            }),
          );
        }
      }

      void readPublications();

      return () => {
        alive =
          false;
      };
    },
    [
      username,
      publicationClient,
      route?.refreshTick,
    ],
  );

  useEffect(
    () => {
      let alive =
        true;

      async function readLocalFollowing() {
        if (
          isOwner === true
        ) {
          setLocalFollowingState({
            ...EMPTY_LOCAL_FOLLOWING_STATE,
            status:
              'owner',
          });

          return;
        }

        if (
          username.length === 0
        ) {
          setLocalFollowingState(
            EMPTY_LOCAL_FOLLOWING_STATE,
          );

          return;
        }

        setLocalFollowingState(
          (current) => ({
            ...current,
            status:
              'loading',
            error:
              null,
          }),
        );

        try {
          const result =
            await readProfileLocalFollowing({
              port:
                followingClient,
              username,
            });

          if (
            alive === false
          ) {
            return;
          }

          setLocalFollowingState({
            status:
              'ready',
            record:
              result.record,
            isFollowing:
              result.isFollowing,
            error:
              null,
          });
        } catch (error) {
          if (
            alive === false
          ) {
            return;
          }

          setLocalFollowingState(
            (current) => ({
              ...current,
              status:
                'error',
              error,
            }),
          );
        }
      }

      void readLocalFollowing();

      return () => {
        alive =
          false;
      };
    },
    [
      followingClient,
      isOwner,
      username,
      localFollowingRefreshTick,
    ],
  );

  const timelineModel =
    useMemo(
      () => {
        if (
          username.length === 0
        ) {
          return null;
        }

        return createProfileTimelineModel({
          username,
          page:
            publicationState.page,
          activeTab:
            timelineTab,
          status:
            publicationState.status,
          isOwner,
          errorMessage:
            publicationState.error
              ?.message || '',
          lastUpdatedAt:
            publicationState.checkedAt,
        });
      },
      [
        username,
        publicationState.page,
        publicationState.status,
        publicationState.error,
        publicationState.checkedAt,
        timelineTab,
        isOwner,
      ],
    );

  function selectTimelineTab(
    tab,
  ) {
    setTimelineTab(
      normalizeProfileTimelineTab(
        tab,
      ),
    );
  }

  async function loadMorePublications(
    cursor,
  ) {
    if (
      publicationClient === null ||
      publicationState.page === null ||
      publicationState.loadingMore
    ) {
      return;
    }

    const currentItems =
      publicationState.page.items;

    const remaining =
      50 - currentItems.length;

    if (
      remaining <= 0
    ) {
      return;
    }

    setPublicationState(
      (current) => ({
        ...current,
        loadingMore:
          true,
      }),
    );

    try {
      const nextPage =
        await publicationClient
          .listCreatorPublications({
            username,
            cursor,
            limit:
              Math.min(
                20,
                remaining,
              ),
          });

      reviewTimelinePage(
        username,
        nextPage,
      );

      const mergedPage =
        mergeTimelinePages(
          publicationState.page,
          nextPage,
        );

      reviewTimelinePage(
        username,
        mergedPage,
      );

      setPublicationState({
        status:
          'ready',
        checkedAt:
          new Date()
            .toISOString(),
        page:
          mergedPage,
        error:
          null,
        loadingMore:
          false,
      });
    } catch (error) {
      setPublicationState(
        (current) => ({
          ...current,
          status:
            timelineFailureStatus(
              error,
              Boolean(
                current.page,
              ),
            ),
          error,
          loadingMore:
            false,
        }),
      );
    }
  }

  function openTimelinePublication(
    publicationRoute,
  ) {
    const normalized =
      String(
        publicationRoute || '',
      ).trim();

    if (
      normalized.startsWith(
        'crab://',
      )
    ) {
      app?.navigate?.(
        normalized,
      );
    }
  }

  function openProfileWorkspace() {
    app?.navigate?.('crab://profile');
  }

  async function followPublicProfileLocally() {
    if (
      localFollowingState.status ===
        'saving'
    ) {
      return;
    }

    setLocalFollowingState(
      (current) => ({
        ...current,
        status:
          'saving',
        error:
          null,
      }),
    );

    try {
      const result =
        await followProfileLocalFollowing({
          port:
            followingClient,
          username,
          record:
            localFollowingState.record,
          followedAt:
            new Date()
              .toISOString(),
        });

      setLocalFollowingState({
        status:
          'ready',
        record:
          result.record,
        isFollowing:
          result.isFollowing,
        error:
          null,
      });
    } catch (error) {
      setLocalFollowingState(
        (current) => ({
          ...current,
          status:
            'error',
          error,
        }),
      );
    }
  }

  async function unfollowPublicProfileLocally() {
    if (
      localFollowingState.status ===
        'saving'
    ) {
      return;
    }

    setLocalFollowingState(
      (current) => ({
        ...current,
        status:
          'saving',
        error:
          null,
      }),
    );

    try {
      const result =
        await unfollowProfileLocalFollowing({
          port:
            followingClient,
          username,
          record:
            localFollowingState.record,
          updatedAt:
            new Date()
              .toISOString(),
        });

      setLocalFollowingState({
        status:
          'ready',
        record:
          result.record,
        isFollowing:
          result.isFollowing,
        error:
          null,
      });
    } catch (error) {
      setLocalFollowingState(
        (current) => ({
          ...current,
          status:
            'error',
          error,
        }),
      );
    }
  }

  function retryLocalFollowing() {
    setLocalFollowingRefreshTick(
      (current) =>
        current + 1,
    );
  }

  function retry() {
    app?.refreshRoute?.();
  }

  if (state.status === 'loading' && !state.profile) {
    return (
      <section className="cl-page profile-page">
        <LoadingState
          title={`Reading ${displayHandle || 'public profile'}`}
          copy="CrabLink is asking the gateway for backend-confirmed public profile truth."
        />
      </section>
    );
  }

  if (state.status === 'error' && !state.profile) {
    return (
      <section className="cl-page profile-page">
        <ErrorPanel
          title="Public profile unavailable"
          copy={`CrabLink could not read ${displayHandle || routeHandle || 'this profile'} through the gateway.`}
          error={state.error}
          actions={
            <div className="profile-gateway-actions">
              <Button variant="secondary" onClick={retry}>
                Retry
              </Button>
              <Button variant="secondary" onClick={openProfileWorkspace}>
                Open profile workspace
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const profile = state.profile || {};
  const backendConfirmed = profile.backendConfirmed === true || profile.usernameStatus === 'confirmed';
  const handle = profile.handle || displayHandle || '@username';
  const profileCrabUrl = profile.profileCrabUrl || `crab://${handle}`;
  const displayName = profile.displayName || handle;
  const bio = profile.bio || 'This profile has no public bio yet.';
  const initials = initialsFor(displayName || handle);
  const rep = valueOrFallback(profile.reputationScore, 'not computed');
  const mod = valueOrFallback(profile.moderatorScore, 'not computed');
  const avatarImage = profile.avatarImage || '';
  const warningCount = Array.isArray(profile.warnings) ? profile.warnings.length : 0;

  return (
    <section className="cl-page profile-page profile-public-page">
      <section className="profile-hero" aria-label="Public profile hero">
        <div className="profile-hero-card profile-public-hero-card">
          <div className="profile-hero-banner" aria-hidden="true">
            <div className="profile-hero-banner-inner">
              <span>{profileCrabUrl}</span>
              <strong>Gateway-confirmed public profile</strong>
            </div>
          </div>

          <div className="profile-hero-content">
            <div className="profile-avatar profile-avatar-hero profile-public-avatar" aria-label="Public profile avatar">
              {avatarImage ? (
                <div>
                  <span>IMG</span>
                  <small>{avatarImage}</small>
                </div>
              ) : (
                <strong>{initials}</strong>
              )}
            </div>

            <div className="profile-hero-identity">
              <div className="profile-hero-title-row">
                <div>
                  <p className="cl-eyebrow">Public RON profile</p>
                  <h1>{displayName}</h1>
                  <p className="profile-handle">{handle}</p>
                </div>

                <div className="profile-editor-buttons">
                  {isOwner === false && (
                    <ProfileLocalFollowingActions
                      state={
                        localFollowingState
                      }
                      onFollow={
                        followPublicProfileLocally
                      }
                      onUnfollow={
                        unfollowPublicProfileLocally
                      }
                      onRetry={
                        retryLocalFollowing
                      }
                    />
                  )}

                  <Button variant="secondary" onClick={retry}>
                    Refresh
                  </Button>
                  <CopyButton text={profileCrabUrl} label="Copy URL" />
                  <Button variant="secondary" onClick={openProfileWorkspace}>
                    Workspace
                  </Button>
                </div>
              </div>

              <p className="profile-bio">{bio}</p>

              <div className="profile-badges" aria-label="Public profile status badges">
                <Badge tone={backendConfirmed ? 'success' : 'warning'}>
                  username {backendConfirmed ? 'confirmed' : 'not confirmed'}
                </Badge>
                <Badge tone={state.cacheHit ? 'warning' : 'success'}>
                  {state.cacheHit ? 'session cache displayed' : 'gateway read'}
                </Badge>
                <Badge tone={profile.publicProfileCid ? 'success' : 'neutral'}>
                  profile CID {profile.publicProfileCid ? 'published' : 'null'}
                </Badge>
                <Badge tone="neutral">REP {rep}</Badge>
                <Badge tone="neutral">MOD {mod}</Badge>
                {warningCount > 0 && <Badge tone="warning">{warningCount} warning(s)</Badge>}
              </div>
            </div>
          </div>

          <div className="profile-hero-stats" aria-label="Public profile truth stats">
            <HeroStat label="Status" value={profile.usernameStatusLabel || profile.usernameStatus || 'unknown'} />
            <HeroStat label="REP" value={rep} />
            <HeroStat label="MOD" value={mod} />
            <HeroStat label="Profile CID" value={profile.publicProfileCid ? 'published' : 'null'} />
            <HeroStat label="Source" value={state.cacheHit ? 'cache + refresh' : 'gateway'} />
          </div>

          <div className="profile-route-strip" aria-label="Public profile route facts">
            <span>{route?.normalizedInput || profileCrabUrl}</span>
            <span>{profile.passportSubject || 'passport subject unavailable'}</span>
            <span>{profile.passportKind || 'passport kind unavailable'}</span>
            <span>{profile.schema || 'profile schema unavailable'}</span>
            <span>{state.checkedAt ? `checked ${state.checkedAt}` : 'not checked'}</span>
          </div>
        </div>
      </section>

      {state.error && state.profile && (
        <Card eyebrow="Warning" title="Showing cached profile while refresh failed" className="profile-gateway-card">
          <p>
            CrabLink has a cached public profile for this handle, but the latest gateway read failed. The cache is a
            display bridge only; backend ownership remains with svc-passport.
          </p>
          <div className="profile-gateway-error" role="alert">
            <Badge tone="warning">{state.error.reason || state.error.code || 'profile_refresh_error'}</Badge>
            <strong>{state.error.message || String(state.error)}</strong>
          </div>
        </Card>
      )}

      {timelineModel && (
        <ProfileTimelineSurface
          model={timelineModel}
          about={{
            displayName,
            handle,
            bio,
            profileCrabUrl,
          }}
          onSelectTab={
            selectTimelineTab
          }
          onLoadMore={
            loadMorePublications
          }
          onOpenPublication={
            openTimelinePublication
          }
          onEditProfile={
            openProfileWorkspace
          }
        />
      )}

      <Card
        eyebrow="Gateway facts"
        title="Public profile truth boundary"
        className="profile-gateway-card"
        actions={<Badge tone={backendConfirmed ? 'success' : 'warning'}>{backendConfirmed ? 'confirmed' : 'unconfirmed'}</Badge>}
      >
        <div className="profile-gateway-facts">
          <Fact label="Handle" value={handle} />
          <Fact label="Username" value={profile.username || normalizeProfileUsername(handle)} />
          <Fact label="Profile crab URL" value={profileCrabUrl} />
          <Fact label="Passport subject" value={profile.passportSubject || 'not returned'} />
          <Fact label="Passport kind" value={profile.passportKind || 'not returned'} />
          <Fact label="Public profile CID" value={profile.publicProfileCid || 'not published yet'} />
          <Fact label="Avatar image" value={avatarImage || 'not set'} />
          <Fact label="Reputation" value={rep} />
          <Fact label="Moderation" value={mod} />
          <Fact label="Gateway route" value={`/identity/passport/profile/${profile.username || username}`} />
          <Fact label="Correlation" value={state.response?.correlationId || state.response?.response?.correlationId || 'not returned'} />
          <Fact label="Checked" value={state.checkedAt || 'not checked'} />
        </div>

        <p className="profile-panel-note">
          Public profile truth remains read-only and comes through the configured svc-gateway route. Follow and
          Unfollow change only this device's private local following preference. They do not create a public graph
          edge, follower count, receipt, creator notification, or network confirmation. This view does not edit the
          profile, create a passport, publish a profile CID, mutate a wallet, calculate REP/MOD, or expose alt mappings.
        </p>

        <JsonPreview
          label="Public profile response"
          data={{
            status: state.status,
            checked_at: state.checkedAt,
            profile,
            response: summarizeResponse(state.response),
            error: serializeError(state.error),
            truth_boundary:
              'username_status=confirmed is backend profile truth; profile CID, REP, and MOD remain null/uncomputed unless backend returns them.',
          }}
          initiallyOpen={false}
        />
      </Card>
    </section>
  );
}

function ProfileLocalFollowingActions({
  state,
  onFollow,
  onUnfollow,
  onRetry,
}) {
  if (
    state.status === 'idle' ||
    state.status === 'loading'
  ) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        Loading follow state
      </Button>
    );
  }

  if (
    state.status === 'saving'
  ) {
    return (
      <Button
        variant="secondary"
        disabled
      >
        {state.isFollowing
          ? 'Saving unfollow'
          : 'Saving follow'}
      </Button>
    );
  }

  if (
    state.status === 'error'
  ) {
    return (
      <>
        <Badge tone="warning">
          Local follow unavailable
        </Badge>

        <Button
          variant="secondary"
          onClick={onRetry}
        >
          Retry follow state
        </Button>
      </>
    );
  }

  if (
    state.isFollowing === true
  ) {
    return (
      <>
        <Badge tone="success">
          Following locally
        </Badge>

        <Button
          variant="secondary"
          onClick={onUnfollow}
        >
          Unfollow
        </Button>
      </>
    );
  }

  return (
    <Button
      onClick={onFollow}
    >
      Follow
    </Button>
  );
}

function reviewTimelinePage(
  username,
  page,
) {
  createProfileTimelineModel({
    username,
    page,
    activeTab:
      'posts',
    status:
      'ready',
    isOwner:
      false,
  });

  return page;
}

function mergeTimelinePages(
  currentPage,
  nextPage,
) {
  const items = [];
  const seen =
    new Set();

  for (
    const item
    of [
      ...currentPage.items,
      ...nextPage.items,
    ]
  ) {
    const identifier =
      String(
        item?.publicationId ||
        item?.id ||
        '',
      ).trim();

    if (
      identifier &&
      seen.has(
        identifier,
      )
    ) {
      continue;
    }

    if (identifier) {
      seen.add(
        identifier,
      );
    }

    items.push(
      item,
    );

    if (
      items.length >= 50
    ) {
      break;
    }
  }

  const hasRoom =
    items.length < 50;

  const hasMore =
    hasRoom &&
    nextPage.hasMore === true &&
    typeof nextPage.nextCursor ===
      'string' &&
    nextPage.nextCursor.length > 0;

  return {
    schema:
      'crablink.publication-page.v1',
    items,
    nextCursor:
      hasMore
        ? nextPage.nextCursor
        : null,
    hasMore,
  };
}

function timelineFailureStatus(
  error,
  hasPage,
) {
  const status =
    Number(
      error?.status ||
      error?.response?.status ||
      0,
    );

  const reason =
    String(
      error?.reason ||
      error?.code ||
      error?.message ||
      '',
    ).toLowerCase();

  const offline =
    status === 0 ||
    reason.includes(
      'connect',
    ) ||
    reason.includes(
      'unavailable',
    ) ||
    reason.includes(
      'offline',
    ) ||
    reason.includes(
      'timeout',
    );

  if (hasPage) {
    return offline
      ? 'offline'
      : 'stale';
  }

  return 'error';
}

function HeroStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value === null || value === undefined || value === '' ? 'n/a' : String(value)}</strong>
    </div>
  );
}

function readMatchingCache(username) {
  const safeUsername = normalizeProfileUsername(username);
  const envelope = readPublicProfileCache();
  const profile = envelope?.profile || null;

  if (!safeUsername || !profile) {
    return null;
  }

  const cachedUsername = normalizeProfileUsername(profile.username || profile.handle);

  return cachedUsername === safeUsername ? envelope : null;
}

function summarizeResponse(response) {
  if (!response) {
    return null;
  }

  return {
    status: response.status || response.response?.status || 0,
    correlation_id: response.correlationId || response.response?.correlationId || '',
    route: response.route || response.response?.route || '',
    data: response.data || response.body || response,
  };
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    reason: error.reason || error.code || '',
    status: Number(error.status || error.response?.status || 0),
    correlationId: error.correlationId || error.response?.correlationId || '',
  };
}

function makePublicProfileError(message, reason) {
  const error = new Error(message);
  error.reason = reason;
  error.code = reason;
  return error;
}

function initialsFor(value) {
  const parts = String(value || '')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return 'RO';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}

function valueOrFallback(value, fallback) {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}