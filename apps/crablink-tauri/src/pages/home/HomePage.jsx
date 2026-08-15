/**
 * RO:WHAT — CrabLink React home dashboard for route smoke testing, local catalog proof, and migration status.
 * RO:WHY — App Integration; Concerns: DX/SEC; gives the React lane a safe control room after protected-route proofs.
 * RO:INTERACTS — HomeQuickActions, localCatalog, recentReceipts, shared PageHeader/Card/TruthBoundary components.
 * RO:INVARIANTS — navigation/display only; no fake backend truth; no paid action; no wallet mutation; no CID creation.
 * RO:METRICS — none.
 * RO:CONFIG — route context from App and extension settings.
 * RO:SECURITY — reads public local display caches only; no private keys, tokens, alt mappings, or spend authority.
 * RO:TEST — manual crab://home smoke after profile/site/image/receipt activity in light/dark mode.
 */

import { useEffect, useMemo, useState } from 'react';

import {
  isExplicitDeveloperSurface,
} from '../../app/developerSurfaceMode.js';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import FeedCard from '../../shared/components/FeedCard.jsx';
import {
  readLocalCatalog,
  subscribeLocalCatalog,
} from '../../shared/catalog/localCatalog.js';
import {
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import {
  createPublicationAdapter,
} from '../../adapters/publicationAdapter.js';
import {
  localFollowingPort,
} from '../../adapters/localFollowingAdapter.js';
import {
  readLocalFollowingFeedCache,
  writeLocalFollowingFeedCache,
} from '../../adapters/localFollowingFeedCacheAdapter.js';
import {
  refreshLocalFollowingFeed,
} from './localFollowingFeedRefresh.js';
import {
  loadOfflineLocalFollowingFeed,
} from './localFollowingOfflineFeedProjection.js';
import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

const FALLBACK_PROOF_SITE = 'crab://ron7';
const FALLBACK_PROOF_REACT_IMAGE =
  'crab://ad1e9bef7834d7a37fde676abdf095c33c59de8e3d667fe99b5f091e6444e8d1.image';
const PROOF_PROFILE = 'crab://profile';

const FINAL_BETA_PHASE5A2_HOME_CONSUMER_MODE =
  'FINAL_BETA_PHASE5A2_HOME_CONSUMER_MODE_V1';

const FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER =
  'FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER_WIRING_V1';

const EMPTY_CATALOG = Object.freeze({
  schema: 'crablink.local-catalog.v1',
  generatedAt: '',
  profiles: [],
  sites: [],
  assets: [],
  all: [],
});

const HOME_FEED_CACHE_PORT =
  Object.freeze({
    readLocalFollowingFeedCache,
    writeLocalFollowingFeedCache,
  });

const EMPTY_CONSUMER_FEED_STATE =
  Object.freeze({
    status:
      'idle',
    source:
      'none',
    items:
      Object.freeze([]),
    cachedAt:
      null,
    message:
      '',
  });

export default function HomePage({ app }) {
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || settings.baseUrl || 'http://127.0.0.1:8090';
  const passport = onboardingIdentityLabel(settings);
  const wallet = settings.walletAccount || 'not configured';

  const [catalog, setCatalog] = useState(() => safeReadCatalog());
  const [receipts, setReceipts] = useState(() => safeReadReceipts());

  useEffect(() => subscribeLocalCatalog(setCatalog), []);
  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const proof = useMemo(
    () => buildHomeProof({
      catalog,
      receipts,
    }),
    [catalog, receipts],
  );

  const proofSite = proof.site?.crabUrl || FALLBACK_PROOF_SITE;
  const proofImage = proof.image?.crabUrl || FALLBACK_PROOF_REACT_IMAGE;
  const proofProfile = proof.profile?.crabUrl || PROOF_PROFILE;

  const developerSurfaceEnabled =
    isExplicitDeveloperSurface({
      buildDev:
        import.meta.env?.DEV === true,

      settings:
        app?.settings,
    });

  if (!developerSurfaceEnabled) {
    return (
      <ConsumerHome
        app={app}
        passport={passport}
        receiptCount={receipts.length}
      />
    );
  }

  return (
    <section
      className="cl-page home-page"
      data-final-beta-home-mode="developer"
      data-final-beta-developer-surface={
        FINAL_BETA_PHASE5A2_HOME_CONSUMER_MODE
      }
    >
      <PageHeader
        eyebrow="Developer Mode"
        title="Engineering Dashboard"
        copy="Route smoke tools, local proof memory, diagnostic context, and manual regression sequences are visible because explicit Developer Mode is enabled."
        meta={
          <>
            <Badge tone="warning">developer tools</Badge>
            <Badge tone="neutral">local diagnostics</Badge>
            <Badge tone="info">display only</Badge>
          </>
        }
      />

      <section className="cl-home-hero-grid" aria-label="React lane status">
        <StatusCard
          eyebrow="Local catalog"
          title="Profiles"
          value={String(proof.counts.profiles)}
          tone={proof.counts.profiles > 0 ? 'success' : 'info'}
          copy="Backend-confirmed or local display profile entries discovered from the public profile cache and safe local catalog scans."
        />

        <StatusCard
          eyebrow="Local catalog"
          title="Sites"
          value={String(proof.counts.sites)}
          tone={proof.counts.sites > 0 ? 'success' : 'info'}
          copy="Named site entries discovered from site visits, site creation, receipts, or local display memory."
        />

        <StatusCard
          eyebrow="Local catalog"
          title="Assets"
          value={String(proof.counts.assets)}
          tone={proof.counts.assets > 0 ? 'success' : 'info'}
          copy="Typed crab assets discovered from image creation, asset routes, receipts, and local display memory."
        />
      </section>

      <TruthBoundary
        tone="info"
        title="Local proof memory, not backend authority"
        copy="The home dashboard reads CrabLink local display caches. It can help you reopen recently proven profiles, sites, assets, and receipts, but it does not prove ownership, authorize spending, mutate wallets, or replace gateway/ledger truth."
      />

      <section className="cl-home-proof-grid" aria-label="Current local proof anchors">
        <ProofCard
          eyebrow="Profile proof"
          title={proof.profile?.title || 'Profile route'}
          route={proofProfile}
          status={proof.profile?.status || 'route available'}
          detail={proof.profile?.detail || 'Profile workspace / backend-confirmed profile cache when available'}
          tone={proof.profile ? 'success' : 'info'}
          app={app}
        />

        <ProofCard
          eyebrow="Site proof"
          title={proof.site?.title || 'Named site proof'}
          route={proofSite}
          status={proof.site?.status || 'fallback proof route'}
          detail={proof.site?.detail || 'Open a paid or recently created site to refresh this local proof anchor'}
          tone={proof.site ? 'success' : 'warning'}
          app={app}
        />

        <ProofCard
          eyebrow="Image asset proof"
          title={proof.image?.title || 'Typed image asset'}
          route={proofImage}
          status={proof.image?.status || 'fallback proof route'}
          detail={proof.image?.detail || 'Create or open an image asset to refresh this local proof anchor'}
          tone={proof.image ? 'success' : 'warning'}
          app={app}
        />

        <ProofCard
          eyebrow="Latest receipt"
          title={proof.receipt?.title || 'No receipt cached yet'}
          route={proof.receipt?.crabUrl || ''}
          status={proof.receipt?.receiptHash ? 'receipt-backed display cache' : 'receipt cache empty'}
          detail={receiptDetail(proof.receipt)}
          copyText={proof.receipt?.receiptHash || proof.receipt?.txid || ''}
          tone={proof.receipt ? 'success' : 'info'}
          app={app}
        />
      </section>

      <section className="cl-home-context-grid" aria-label="Current local context">
        <Card eyebrow="Local context" title="Passport / wallet display">
          <div className="cl-home-context-list">
            <ContextRow label="Gateway" value={gatewayUrl} />
            <ContextRow label="Passport" value={passport} />
            <ContextRow label="Wallet" value={wallet} />
            <ContextRow label="Profile" value={proofProfile} />
          </div>
          <p className="cl-home-muted">
            These values are local CrabLink context hints unless the gateway returns confirmed identity,
            wallet, profile, reputation, moderation, or publication truth.
          </p>
        </Card>

        <Card eyebrow="Local proof summary" title="What CrabLink remembers">
          <div className="cl-home-context-list">
            <ContextRow label="Profiles" value={String(proof.counts.profiles)} />
            <ContextRow label="Sites" value={String(proof.counts.sites)} />
            <ContextRow label="Assets" value={String(proof.counts.assets)} />
            <ContextRow label="Receipts" value={String(receipts.length)} />
            <ContextRow label="Generated" value={formatTimestamp(catalog?.generatedAt)} />
          </div>
          <p className="cl-home-muted">
            The passport drawer remains the detailed catalog/receipt view. Home now gives you quick proof anchors
            and counts after image, site, and profile work.
          </p>
        </Card>
      </section>

      <HomeQuickActions app={app} proofSite={proofSite} proofImage={proofImage} />

      <section className="cl-home-bottom-grid" aria-label="Testing and next work">
        <Card eyebrow="Recent local proof" title="Newest catalog entries">
          <p>
            These are safe local display entries from the catalog scanner and explicit write paths. Open them to
            regression-test route ownership quickly.
          </p>

          <div className="cl-home-next-list">
            {proof.recentCatalog.length > 0 ? (
              proof.recentCatalog.slice(0, 8).map((item, index) => (
                <span key={`${item.kind}:${item.crabUrl}:${index}`} title={item.crabUrl}>
                  {item.kind}: {shortLabel(item.title || item.crabUrl)}
                </span>
              ))
            ) : (
              <span>No local catalog entries yet</span>
            )}
          </div>
        </Card>

        <Card eyebrow="Manual smoke sequence" title="Route switching regression check">
          <p>
            After every route batch, use this sequence to confirm the previous page disappears before
            the next one appears and no old DOM patch leaks into the new route owner.
          </p>

          <ol className="cl-home-smoke-list">
            <li>{proofSite} → crab://site → crab://profile → crab://home</li>
            <li>crab://image → newest .image proof → crab://home</li>
            <li>crab://article → crab://post → crab://comment → crab://lyrics</li>
            <li>crab://video → crab://stream → crab://podcast → crab://music</li>
            <li>crab://ad → crab://algo → crab://code → crab://game</li>
          </ol>
        </Card>
      </section>
    </section>
  );
}


// FINAL_BETA_PHASE10A1_HOME_LOCAL_PRESENTATION_PAGINATION_V1

const HOME_FEED_PRESENTATION_PAGE_SIZE =
  10;

function ConsumerHome({
  app,
  passport,
  receiptCount = 0,
}) {
  const safeReceiptCount =
    Number.isSafeInteger(receiptCount) &&
    receiptCount >= 0
      ? receiptCount
      : 0;

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

  const [
    feedState,
    setFeedState,
  ] =
    useState(
      EMPTY_CONSUMER_FEED_STATE,
    );

  const [
    refreshSequence,
    setRefreshSequence,
  ] =
    useState(
      0,
    );


  const [
    visibleFeedCount,
    setVisibleFeedCount,
  ] =
    useState(
      HOME_FEED_PRESENTATION_PAGE_SIZE,
    );
  function open(route) {
    app?.navigate?.(route);
  }

  useEffect(
    () => {
      if (
        app?.isActiveTab ===
          false
      ) {
        return undefined;
      }

      let alive =
        true;

      async function projectOffline(
        liveFailure,
      ) {
        try {
          const offline =
            await loadOfflineLocalFollowingFeed({
              followingPort:
                localFollowingPort,
              cachePort:
                HOME_FEED_CACHE_PORT,
            });

          if (
            alive ===
              false
          ) {
            return;
          }

          if (
            offline.status ===
              'stale-offline' &&
            offline.items.length >
              0
          ) {
            setFeedState(
              freezeConsumerFeedState({
                status:
                  'stale-offline',
                source:
                  'cache',
                items:
                  offline.items,
                cachedAt:
                  offline.cachedAt,
                message:
                  'Showing previously verified public summaries from this device because live refresh is unavailable.',
              }),
            );

            return;
          }

          setFeedState(
            freezeConsumerFeedState({
              status:
                'offline-empty',
              source:
                'none',
              items:
                [],
              cachedAt:
                offline.cachedAt,
              message:
                liveFailure
                  ? 'Live following activity is unavailable and there is no usable offline activity for currently followed profiles.'
                  : 'There is no usable offline following activity for currently followed profiles.',
            }),
          );
        } catch (_offlineError) {
          if (
            alive ===
              false
          ) {
            return;
          }

          setFeedState(
            freezeConsumerFeedState({
              status:
                'error',
              source:
                'none',
              items:
                [],
              cachedAt:
                null,
              message:
                'CrabLink could not load live following activity or a valid local offline projection.',
            }),
          );
        }
      }

      async function loadFollowingFeed() {
        setVisibleFeedCount(
          HOME_FEED_PRESENTATION_PAGE_SIZE,
        );

        setFeedState(
          freezeConsumerFeedState({
            status:
              'loading',
            source:
              feedState.source,
            items:
              feedState.items,
            cachedAt:
              feedState.cachedAt,
            message:
              '',
          }),
        );

        if (
          publicationClient ===
            null
        ) {
          await projectOffline(
            true,
          );

          return;
        }

        try {
          const refresh =
            await refreshLocalFollowingFeed({
              followingPort:
                localFollowingPort,
              publicationPort:
                publicationClient,
              cachePort:
                HOME_FEED_CACHE_PORT,
              refreshedAt:
                new Date().toISOString(),
            });

          if (
            alive ===
              false
          ) {
            return;
          }

          if (
            refresh.status ===
              'error'
          ) {
            await projectOffline(
              true,
            );

            return;
          }

          setFeedState(
            freezeConsumerFeedState({
              status:
                refresh.status,
              source:
                'live',
              items:
                refresh.feed.items,
              cachedAt:
                refresh.cachePersistence
                  ?.cachedAt ||
                null,
              message:
                refresh.status ===
                  'partial'
                  ? 'Some followed profiles could not be refreshed. The activity shown below comes only from successful public timeline responses.'
                  : '',
            }),
          );
        } catch (_liveError) {
          await projectOffline(
            true,
          );
        }
      }

      void loadFollowingFeed();

      return () => {
        alive =
          false;
      };
    },
    [
      app?.isActiveTab,
      publicationClient,
      refreshSequence,
    ],
  );

  const feedItems =
    feedState.items;

  const visibleFeedItems =
    feedItems.slice(
      0,
      visibleFeedCount,
    );

  const hasMoreFeedItems =
    visibleFeedItems.length <
      feedItems.length;

  const feedTitle =
    feedItems.length ===
      1
      ? '1 followed publication'
      : `${feedItems.length} followed publications`;

  return (
    <section
      className="cl-page home-page"
      data-final-beta-home-mode="consumer"
      data-final-beta-consumer-home={
        FINAL_BETA_PHASE5A2_HOME_CONSUMER_MODE
      }
      data-final-beta-home-feed={
        FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER
      }
    >
      <PageHeader
        eyebrow="Home"
        title="Your following feed"
        copy="Recent public publication summaries from profiles you follow are combined locally in chronological order. CrabLink requests each followed creator timeline separately and does not upload your complete following list."
        meta={
          <>
            <Badge tone="success">
              private beta
            </Badge>

            <Badge
              tone={
                feedState.status ===
                  'stale-offline'
                  ? 'warning'
                  : feedState.status ===
                      'error'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {consumerFeedStatusLabel(
                feedState.status,
              )}
            </Badge>
          </>
        }
      />

      <TruthBoundary
        tone={
          feedState.status ===
            'stale-offline'
            ? 'warning'
            : 'info'
        }
        title="Local following, public timelines"
        copy="Your following list remains private local device state. Feed items come from reviewed public creator publication summaries. Offline cache entries are labeled stale and never establish deletion, freshness, ownership, entitlement, receipt, wallet, ledger, QuickChain, ROX, or Solana truth."
      />

      <Card
        eyebrow="Following feed"
        title={feedTitle}
        className="cl-home-feed-card"
        actions={
          <Button
            variant="secondary"
            size="sm"
            disabled={
              feedState.status ===
                'loading'
            }
            onClick={() => {
              setRefreshSequence(
                (value) =>
                  value + 1,
              );
            }}
          >
            {feedState.status ===
              'loading'
              ? 'Refreshing'
              : 'Refresh'}
          </Button>
        }
      >
        {feedState.status ===
          'loading' &&
        feedItems.length ===
          0 ? (
          <p className="cl-home-muted">
            Refreshing public activity from
            your locally followed profiles.
          </p>
        ) : null}

        {feedState.message ? (
          <p
            className="cl-home-feed-notice"
            role="status"
          >
            {feedState.message}
          </p>
        ) : null}

        {feedState.status ===
          'stale-offline' &&
        feedState.cachedAt ? (
          <p className="cl-home-muted">
            Offline cache timestamp:{' '}
            {formatFeedTimestamp(
              feedState.cachedAt,
            )}
          </p>
        ) : null}

        {feedItems.length >
          0 ? (
          <div
            className="cl-home-feed-list"
            aria-label="Followed creator activity"
          >
            {visibleFeedItems.map(
              (publication) => (
                <FeedCard
                  key={
                    `${publication.creator.username}:${publication.publicationId}`
                  }
                  contextLabel={
                    feedState.status ===
                      'stale-offline'
                      ? 'Cached followed activity'
                      : 'Followed activity'
                  }
                  kind={
                    publicationKindLabel(
                      publication.kind,
                    )
                  }
                  title={
                    publication.title ||
                    publication.publicationId
                  }
                  summary={
                    publication.summary
                  }
                  creator={
                    `@${publication.creator.username}`
                  }
                  timeLabel={
                    formatFeedTimestamp(
                      publication.publishedAt,
                    )
                  }
                  paidLabel={
                    publication.access ===
                      'paid'
                      ? 'Paid'
                      : ''
                  }
                  statusLabel={
                    feedState.status ===
                      'stale-offline'
                      ? 'Stale offline'
                      : ''
                  }
                  openLabel="Open publication"
                  onOpen={
                    publication.crabUrl
                      ?.startsWith(
                        'crab://',
                      )
                      ? () =>
                          open(
                            publication.crabUrl,
                          )
                      : null
                  }
                />
              ),
            )}
          </div>
        ) : feedState.status !==
          'loading' ? (
          <div className="cl-home-feed-empty">
            <h3>
              No followed activity yet
            </h3>

            <p>
              Follow public creator profiles
              to build this local-first feed.
              Empty network responses and
              cache misses never create
              placeholder posts.
            </p>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                open(
                  'crab://explore',
                )
              }
            >
              Explore creators
            </Button>
          </div>
        ) : null}

            {feedItems.length >
              0 ? (
              <div
                className="cl-home-feed-pagination"
                aria-label="Following feed pagination"
              >
                <span>
                  Showing{' '}
                  {visibleFeedItems.length}
                  {' '}of{' '}
                  {feedItems.length}
                </span>

                {hasMoreFeedItems ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setVisibleFeedCount(
                        (value) =>
                          Math.min(
                            value +
                              HOME_FEED_PRESENTATION_PAGE_SIZE,
                            feedItems.length,
                          ),
                      );
                    }}
                  >
                    Load more
                  </Button>
                ) : (
                  <span>
                    All loaded
                  </span>
                )}
              </div>
            ) : null}

        <div className="cl-home-next-list">
          <span>Chronological</span>
          <span>Following only</span>
          <span>Public timelines</span>
          <span>Bounded summaries</span>
        </div>
      </Card>

      <section
        className="cl-home-context-grid"
        aria-label="CrabLink Home actions"
      >
        <Card
          eyebrow="Your identity"
          title={
            passport ||
            'Local Passport'
          }
        >
          <p>
            Open Profile Studio to review
            your local profile draft,
            public-profile route, and
            publishing identity.
          </p>

          <div className="cl-home-proof-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                open(
                  'crab://profile',
                )
              }
            >
              Open Profile Studio
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                open(
                  'crab://explore',
                )
              }
            >
              Explore
            </Button>
          </div>
        </Card>

        <Card
          eyebrow="Saved activity"
          title={
            safeReceiptCount ===
              1
              ? '1 saved receipt'
              : `${safeReceiptCount} saved receipts`
          }
        >
          <p>
            Receipts remain display-only
            local memory until refreshed
            from backend wallet and ledger
            truth. Library entries never
            prove ownership or paid access
            by themselves.
          </p>

          <div className="cl-home-proof-actions">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                open(
                  'crab://receipts',
                )
              }
            >
              View receipts
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                open(
                  'crab://library',
                )
              }
            >
              Open library
            </Button>
          </div>
        </Card>
      </section>

      <Card
        eyebrow="Create"
        title="Publish through reviewed CrabLink routes"
      >
        <p>
          Creator routes remain separate
          from feed composition. Backend
          responses remain the source of
          publication identifiers and
          receipts.
        </p>

        <div className="cl-home-proof-actions">
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              open(
                'crab://post',
              )
            }
          >
            Create a post
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              open(
                'crab://image',
              )
            }
          >
            Create an image
          </Button>
        </div>
      </Card>
    </section>
  );
}

function freezeConsumerFeedState(
  value,
) {
  return Object.freeze({
    status:
      value.status,
    source:
      value.source,
    items:
      Object.freeze([
        ...(Array.isArray(
          value.items,
        )
          ? value.items
          : []),
      ]),
    cachedAt:
      value.cachedAt ||
      null,
    message:
      String(
        value.message ||
        '',
      )
        .trim()
        .slice(
          0,
          320,
        ),
  });
}

function consumerFeedStatusLabel(
  status,
) {
  if (
    status ===
      'ready'
  ) {
    return 'live';
  }

  if (
    status ===
      'partial'
  ) {
    return 'partial';
  }

  if (
    status ===
      'stale-offline'
  ) {
    return 'stale offline';
  }

  if (
    status ===
      'loading'
  ) {
    return 'refreshing';
  }

  if (
    status ===
      'error'
  ) {
    return 'unavailable';
  }

  if (
    status ===
      'offline-empty'
  ) {
    return 'offline';
  }

  if (
    status ===
      'empty'
  ) {
    return 'empty';
  }

  return 'local first';
}

function publicationKindLabel(
  kind,
) {
  const normalized =
    String(
      kind ||
      'publication',
    )
      .trim()
      .toLowerCase();

  if (
    normalized.length ===
      0
  ) {
    return 'Publication';
  }

  return (
    normalized
      .charAt(
        0,
      )
      .toUpperCase() +
    normalized.slice(
      1,
    )
  );
}

function formatFeedTimestamp(
  value,
) {
  const raw =
    String(
      value ||
      '',
    )
      .trim();

  if (
    raw.length ===
      0
  ) {
    return '';
  }

  const parsed =
    Date.parse(
      raw,
    );

  if (
    Number.isFinite(
      parsed,
    ) ===
      false
  ) {
    return raw;
  }

  return new Date(
    parsed,
  ).toLocaleString();
}

function onboardingIdentityLabel(settings = {}) {
  const status =
    String(settings.usernameStatus || '')
      .trim()
      .toLowerCase();

  const confirmedHandle =
    String(settings.handle || '')
      .trim();

  if (
    confirmedHandle &&
    status === 'confirmed'
  ) {
    return `${confirmedHandle} backend confirmed`;
  }

  const requestedHandle =
    String(
      settings.requestedHandle ||
      settings.requestedUsername ||
      '',
    )
      .replace(/^@?/, '@')
      .trim();

  if (requestedHandle !== '@') {
    return `${requestedHandle} local draft`;
  }

  const passportSubject =
    String(
      settings.passportSubject || '',
    )
      .trim();

  return (
    passportSubject ||
    'not configured'
  );
}

function StatusCard({ eyebrow, title, value, copy, tone = 'neutral' }) {
  return (
    <article className={`cl-home-status-card is-${tone}`}>
      <p className="cl-eyebrow">{eyebrow}</p>
      <div>
        <strong>{value}</strong>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </article>
  );
}

function ProofCard({
  eyebrow,
  title,
  route,
  status,
  detail,
  copyText = '',
  tone = 'neutral',
  app,
}) {
  const hasRoute = Boolean(route);

  function openRoute() {
    if (hasRoute) {
      app?.navigate?.(route);
    }
  }

  return (
    <article className={`cl-home-proof-card is-${tone}`}>
      <div className="cl-home-proof-head">
        <div>
          <span>{eyebrow}</span>
          <strong>{title || 'Proof item'}</strong>
        </div>
        <Badge tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral'}>
          {status || 'local display'}
        </Badge>
      </div>

      {route && (
        <div className="cl-home-route-proof">
          <span>Route</span>
          <code>{route}</code>
        </div>
      )}

      <p>{detail || 'Local display memory only.'}</p>

      <div className="cl-home-proof-actions">
        {hasRoute && (
          <Button variant="primary" size="sm" onClick={openRoute}>
            Open
          </Button>
        )}
        {hasRoute && <CopyButton text={route} label="Copy URL" />}
        {copyText && <CopyButton text={copyText} label="Copy proof" />}
      </div>
    </article>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="cl-home-context-row">
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function buildHomeProof({ catalog = EMPTY_CATALOG, receipts = [] }) {
  const profiles = safeArray(catalog.profiles);
  const sites = safeArray(catalog.sites);
  const assets = safeArray(catalog.assets);
  const all = safeArray(catalog.all);
  const safeReceipts = safeArray(receipts);

  const sortedCatalog = all.length
    ? sortByTime(all)
    : sortByTime([...profiles, ...sites, ...assets]);

  const image =
    sortByTime(assets).find((item) => item.kind === 'image' || /\.image$/i.test(item.crabUrl || '')) || null;

  const site =
    sortByTime(sites).find((item) => /^crab:\/\/[^@][^/]+$/i.test(item.crabUrl || '')) ||
    sortByTime(sites)[0] ||
    null;

  const profile =
    sortByTime(profiles).find((item) => /^crab:\/\/@/i.test(item.crabUrl || '') || /\.profile$/i.test(item.crabUrl || '')) ||
    sortByTime(profiles)[0] ||
    null;

  const receipt = sortByTime(safeReceipts)[0] || null;

  return {
    counts: {
      profiles: profiles.length,
      sites: sites.length,
      assets: assets.length,
      all: sortedCatalog.length,
      receipts: safeReceipts.length,
    },
    profile,
    site,
    image,
    receipt,
    recentCatalog: sortedCatalog,
  };
}

function sortByTime(items = []) {
  return safeArray(items)
    .slice()
    .sort((a, b) => timestampForSort(b) - timestampForSort(a));
}

function safeReadCatalog() {
  try {
    return readLocalCatalog() || EMPTY_CATALOG;
  } catch (_error) {
    return EMPTY_CATALOG;
  }
}

function safeReadReceipts() {
  try {
    return readRecentReceipts() || [];
  } catch (_error) {
    return [];
  }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function timestampForSort(value) {
  const raw = String(value?.createdAt || value?.created_at || value?.generatedAt || '').trim();

  if (!raw) {
    return 0;
  }

  if (/^[0-9]+$/.test(raw)) {
    const n = Number(raw);
    return n > 10_000_000_000 ? n : n * 1000;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function receiptDetail(receipt) {
  if (!receipt) {
    return 'Pay a site visit or publish a paid asset to populate local receipt proof.';
  }

  const amount = receipt.amountMinor
    ? `${receipt.amountMinor} ${String(receipt.asset || 'roc').toUpperCase()}`
    : 'amount not returned';
  const proof = receipt.receiptHash || receipt.txid || 'proof not returned';

  return `${amount} · ${proof}`;
}

function formatTimestamp(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'not generated yet';
  }

  const parsed = Date.parse(raw);

  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return new Date(parsed).toLocaleString();
}

function shortLabel(value) {
  const text = String(value || '').trim();

  if (text.length <= 28) {
    return text || 'entry';
  }

  return `${text.slice(0, 25)}…`;
}