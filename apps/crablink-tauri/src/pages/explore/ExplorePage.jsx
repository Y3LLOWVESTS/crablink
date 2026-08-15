/**
 * RO:WHAT — Consumer Explore surface backed by the reviewed public discovery projection.
 * RO:WHY — FINAL_BETA Phase 10 separates transparent public discovery from the local following Home feed.
 * RO:INTERACTS — ExploreDiscoveryClient, GatewayClient, FeedCard, ContentCard, SiteCard, shared state components, and crab route navigation.
 * RO:INVARIANTS — recent content is backend-reviewed chronology, creators are alphabetical, sites are update ordered, and inactive retained tabs make no discovery request.
 * RO:SECURITY — public read only; React receives validated display projections and grants no transport, relationship, ranking, payment, wallet, ledger, or settlement authority.
 * RO:TEST — ExplorePage.discovery.source.test.mjs and phase10HomeExploreSeparation.test.mjs.
 */

// FINAL_BETA_PHASE10A3F_EXPLORE_DISCOVERY_UI_V1

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createExploreDiscoveryClient,
} from '../../shared/api/exploreDiscoveryClient.js';

import Button from '../../shared/components/Button.jsx';
import ContentCard from '../../shared/components/ContentCard.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import ErrorState from '../../shared/components/ErrorState.jsx';
import FeedCard from '../../shared/components/FeedCard.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import SiteCard from '../../shared/components/SiteCard.jsx';

import './explore.css';

export default function ExplorePage({
  app,
}) {
  const gateway =
    app?.clients?.gateway ||
    app?.gateway ||
    null;

  const discoveryClient =
    useMemo(
      () =>
        createExploreDiscoveryClient(
          gateway,
        ),
      [
        gateway,
      ],
    );

  const [
    refreshSequence,
    setRefreshSequence,
  ] =
    useState(
      0,
    );

  const [
    state,
    setState,
  ] =
    useState({
      status:
        'idle',

      discovery:
        null,

      response:
        null,

      error:
        null,
    });

  const refresh =
    useCallback(
      () => {
        setRefreshSequence(
          (value) =>
            value + 1,
        );
      },
      [],
    );

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

      async function loadDiscovery() {
        if (
          discoveryClient.ready ===
            false
        ) {
          setState({
            status:
              'error',

            discovery:
              null,

            response:
              null,

            error:
              null,
          });

          return;
        }

        setState(
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
            await discoveryClient
              .getExploreDiscovery();

          if (
            alive ===
              false
          ) {
            return;
          }

          setState({
            status:
              'resolved',

            discovery:
              result.discovery,

            response:
              result.response,

            error:
              null,
          });
        } catch (
          error
        ) {
          if (
            alive ===
              false
          ) {
            return;
          }

          setState({
            status:
              'error',

            discovery:
              null,

            response:
              null,

            error,
          });
        }
      }

      void loadDiscovery();

      return () => {
        alive =
          false;
      };
    },
    [
      app?.isActiveTab,
      discoveryClient,
      refreshSequence,
    ],
  );

  const loading =
    state.status ===
      'loading' ||
    state.status ===
      'idle';

  const correlationId =
    safeCorrelationId(
      state.error,
    );

  return (
    <section className="cl-page explore-page">
      <PageHeader
        eyebrow="Explore"
        title="Discover CrabLink"
        copy="Browse bounded public discovery with transparent ordering: recent content by publish time, creators alphabetically, and reviewed sites by update time."
      />

      <section
        className="cl-explore-toolbar"
        aria-label="Explore controls"
      >
        <p className="cl-explore-order">
          Recent: newest first
          <span aria-hidden="true"> · </span>
          Creators: A–Z
          <span aria-hidden="true"> · </span>
          Sites: newest updated
        </p>

        <Button
          variant="secondary"
          size="sm"
          busy={loading}
          busyLabel="Refreshing…"
          onClick={refresh}
        >
          Refresh
        </Button>
      </section>

      {loading && (
        <LoadingState
          title="Loading Explore"
          copy="CrabLink is loading the bounded public discovery projection."
          detail="Recent content, public creators, and reviewed template sites."
          skeletonCount={4}
        />
      )}

      {state.status ===
        'error' && (
        <ErrorState
          title="Explore is unavailable"
          copy="CrabLink could not load the public discovery projection."
          reason="No unreviewed discovery data was accepted."
          correlationId={correlationId}
          retryLabel="Try again"
          onRetry={refresh}
        />
      )}

      {state.status ===
        'resolved' &&
        state.discovery && (
        <ExploreResults
          discovery={
            state.discovery
          }
          app={app}
        />
      )}
    </section>
  );
}

function ExploreResults({
  discovery,
  app,
}) {
  return (
    <div className="cl-explore-sections">
      <ExploreSection
        title="Recent"
        detail="Newest public publications first."
        count={
          discovery
            .recentPublications
            .length
        }
      >
        {discovery
          .recentPublications
          .length ===
          0 ? (
          <EmptyState
            compact
            icon="◉"
            title="No recent public content"
            copy="No reviewed public publication summaries were returned."
          />
        ) : (
          <div className="cl-explore-feed-list">
            {discovery
              .recentPublications
              .map(
                (
                  publication,
                ) => (
                  <FeedCard
                    key={
                      `${publication.creator.username}:${publication.publicationId}`
                    }
                    kind={
                      publication.kind
                    }
                    title={
                      publication.title
                    }
                    summary={
                      publication.summary
                    }
                    creator={
                      `@${publication.creator.username}`
                    }
                    timeLabel={
                      formatExploreTimestamp(
                        publication.publishedAt,
                      )
                    }
                    paidLabel={
                      publication.access ===
                        'paid'
                        ? 'Paid'
                        : ''
                    }
                    openLabel="Open"
                    onOpen={() =>
                      navigateCrab(
                        app,
                        publication.crabUrl,
                      )
                    }
                  />
                ),
              )}
          </div>
        )}
      </ExploreSection>

      <ExploreSection
        title="Creators"
        detail="Public creators ordered alphabetically by username."
        count={
          discovery
            .publicCreators
            .length
        }
      >
        {discovery
          .publicCreators
          .length ===
          0 ? (
          <EmptyState
            compact
            icon="◎"
            title="No public creators yet"
            copy="No reviewed public creator summaries were returned."
          />
        ) : (
          <div className="cl-explore-card-grid">
            {discovery
              .publicCreators
              .map(
                (
                  creator,
                ) => (
                  <ContentCard
                    key={
                      creator.username
                    }
                    kind="Creator"
                    title={
                      creator.displayName
                    }
                    summary={
                      `@${creator.username}`
                    }
                    statusLabel="Public profile"
                    openLabel="View profile"
                    onOpen={() =>
                      navigateCrab(
                        app,
                        creator.profileUrl,
                      )
                    }
                  />
                ),
              )}
          </div>
        )}
      </ExploreSection>

      <ExploreSection
        title="Sites"
        detail="Reviewed template sites ordered by most recent update."
        count={
          discovery
            .templateSites
            .length
        }
      >
        {discovery
          .templateSites
          .length ===
          0 ? (
          <EmptyState
            compact
            icon="◇"
            title="No reviewed template sites yet"
            copy="Site discovery is waiting for reviewed template metadata. CrabLink will not invent site cards from incomplete pointers."
          />
        ) : (
          <div className="cl-explore-card-grid">
            {discovery
              .templateSites
              .map(
                (
                  site,
                ) => (
                  <SiteCard
                    key={
                      site.siteUrl
                    }
                    title={
                      site.title
                    }
                    summary={
                      site.summary ||
                      ''
                    }
                    templateLabel={
                      formatTemplateLabel(
                        site.templateId,
                      )
                    }
                    ownerLabel={
                      `@${site.creator.username}`
                    }
                    updatedLabel={
                      formatExploreTimestamp(
                        site.updatedAt,
                      )
                    }
                    openLabel="Open site"
                    onOpen={() =>
                      navigateCrab(
                        app,
                        site.siteUrl,
                      )
                    }
                  />
                ),
              )}
          </div>
        )}
      </ExploreSection>
    </div>
  );
}

function ExploreSection({
  title,
  detail,
  count,
  children,
}) {
  return (
    <section className="cl-explore-section">
      <header className="cl-explore-section-head">
        <div>
          <p className="cl-eyebrow">
            Explore
          </p>

          <h2>{title}</h2>

          <p>
            {detail}
          </p>
        </div>

        <span className="cl-explore-count">
          {count}
        </span>
      </header>

      {children}
    </section>
  );
}

function navigateCrab(
  app,
  route,
) {
  const normalized =
    String(
      route ||
      '',
    ).trim();

  if (
    normalized.startsWith(
      'crab://',
    ) ===
      false
  ) {
    return false;
  }

  if (
    typeof app?.navigate !==
      'function'
  ) {
    return false;
  }

  app.navigate(
    normalized,
  );

  return true;
}

function safeCorrelationId(
  error,
) {
  const value =
    error?.correlationId ||
    error?.response?.correlationId ||
    '';

  return String(
    value,
  ).slice(
    0,
    160,
  );
}

function formatExploreTimestamp(
  value,
) {
  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      timestamp,
    ) ===
      false
  ) {
    return '';
  }

  return new Date(
    timestamp,
  )
    .toLocaleString(
      [],
      {
        dateStyle:
          'medium',

        timeStyle:
          'short',
      },
    );
}

function formatTemplateLabel(
  value,
) {
  const normalized =
    String(
      value ||
      'Site',
    )
      .replace(
        /[_-]+/g,
        ' ',
      )
      .trim();

  if (
    normalized.length ===
      0
  ) {
    return 'Site';
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
