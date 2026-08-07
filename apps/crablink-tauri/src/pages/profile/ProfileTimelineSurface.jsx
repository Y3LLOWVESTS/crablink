/**
 * RO:WHAT — Read-only React surface for the FINAL_BETA public-profile timeline.
 * RO:WHY — Public profiles need polished Posts, About, and conditional Sites presentation.
 * RO:INTERACTS — profileTimelineModel, ProfilePublicView, Button, Badge, and publication navigation.
 * RO:INVARIANTS — consumes an already-reviewed model; preserves backend order and opaque cursors.
 * RO:SECURITY — no local-catalog authority, publication mutation, relationship mutation, or economic truth.
 * RO:TEST — ProfileTimelineSurface.source.test.mjs and focused JSX syntax verification.
 */

// FINAL_BETA_PHASE7A2_PROFILE_TIMELINE_SURFACE_V1

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import './profileTimeline.css';

export default function ProfileTimelineSurface({
  model,
  about = {},
  onSelectTab,
  onLoadMore,
  onOpenPublication,
  onEditProfile,
}) {
  if (
    model === null ||
    typeof model !== 'object'
  ) {
    return (
      <section
        className="profile-timeline-surface"
        aria-label="Public profile publications"
      >
        <TimelineNotice
          tone="warning"
          title="Publications unavailable"
          message="The public-profile timeline model was not available."
        />
      </section>
    );
  }

  const visibleTabs =
    model.tabs.filter(
      (tab) =>
        tab.visible !== false,
    );

  return (
    <section
      className="profile-timeline-surface"
      aria-label="Public profile publications"
      data-profile-timeline-status={model.status}
    >
      <header className="profile-timeline-header">
        <div>
          <p className="cl-eyebrow">
            Public profile
          </p>

          <h2>
            Publications
          </h2>

          <p className="profile-timeline-subtitle">
            Backend-derived public content from @{model.username}
          </p>
        </div>

        <div className="profile-timeline-header-actions">
          <Badge
            tone={
              model.freshness.live
                ? 'success'
                : model.status === 'error'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {model.freshness.label}
          </Badge>

          {model.owner.editAction && (
            <Button
              variant="secondary"
              onClick={() =>
                onEditProfile?.(
                  model.owner.editAction,
                )
              }
            >
              {model.owner.editAction.label}
            </Button>
          )}
        </div>
      </header>

      <nav
        className="profile-timeline-tabs"
        role="tablist"
        aria-label="Public profile sections"
      >
        {visibleTabs.map(
          (tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={
                tab.selected
                  ? 'true'
                  : 'false'
              }
              className={
                tab.selected
                  ? 'profile-timeline-tab is-selected'
                  : 'profile-timeline-tab'
              }
              onClick={() =>
                onSelectTab?.(
                  tab.id,
                )
              }
            >
              {tab.label}
            </button>
          ),
        )}
      </nav>

      <div
        className="profile-timeline-panel"
        role="tabpanel"
      >
        {model.activeTab === 'about' && (
          <ProfileAboutPanel
            model={model}
            about={about}
          />
        )}

        {model.activeTab === 'sites' && (
          <PublicationCollection
            title="Sites"
            items={model.siteItems}
            emptyTitle="No public sites yet"
            emptyMessage={`@${model.username} has not published a public site.`}
            onOpenPublication={onOpenPublication}
          />
        )}

        {model.activeTab === 'posts' && (
          <PostsPanel
            model={model}
            onOpenPublication={onOpenPublication}
          />
        )}
      </div>

      {model.activeTab === 'posts' &&
        model.pagination.canLoadMore && (
          <footer className="profile-timeline-pagination">
            <Button
              variant="secondary"
              onClick={() =>
                onLoadMore?.(
                  model.pagination.nextCursor,
                )
              }
            >
              Load more
            </Button>

            <span>
              Cursor available for the next bounded page
            </span>
          </footer>
        )}

      <footer className="profile-timeline-truth">
        <span>
          Public content source: backend publication projection
        </span>

        <span>
          Local catalog authority: none
        </span>
      </footer>
    </section>
  );
}

function PostsPanel({
  model,
  onOpenPublication,
}) {
  if (model.status === 'loading') {
    return (
      <TimelineNotice
        title="Loading publications"
        message="CrabLink is reading the creator timeline through the gateway."
      />
    );
  }

  if (model.status === 'error') {
    return (
      <TimelineNotice
        tone="warning"
        title="Publications unavailable"
        message={
          model.error ||
          'The creator timeline could not be loaded.'
        }
      />
    );
  }

  return (
    <div className="profile-timeline-posts">
      {model.status === 'stale' && (
        <TimelineNotice
          tone="warning"
          title="Timeline may be out of date"
          message="The last successful public timeline snapshot is being displayed."
        />
      )}

      {model.status === 'offline' && (
        <TimelineNotice
          tone="warning"
          title="Offline copy"
          message="CrabLink is displaying a previously read public timeline snapshot."
        />
      )}

      {model.pinnedPublication && (
        <section
          className="profile-pinned-publication"
          aria-label="Pinned publication"
        >
          <div className="profile-pinned-label">
            <Badge tone="success">
              Pinned
            </Badge>
          </div>

          <PublicationCard
            publication={model.pinnedPublication}
            featured
            onOpenPublication={onOpenPublication}
          />
        </section>
      )}

      {model.empty && model.emptyState && (
        <TimelineNotice
          title={model.emptyState.title}
          message={model.emptyState.message}
        />
      )}

      {model.postItems.length > 0 && (
        <PublicationCollection
          title="Posts"
          items={model.postItems}
          onOpenPublication={onOpenPublication}
        />
      )}
    </div>
  );
}

function ProfileAboutPanel({
  model,
  about,
}) {
  const displayName =
    cleanText(
      about.displayName,
    ) ||
    `@${model.username}`;

  const handle =
    cleanText(
      about.handle,
    ) ||
    `@${model.username}`;

  const bio =
    cleanText(
      about.bio,
    ) ||
    'This creator has not published a public bio yet.';

  const profileUrl =
    cleanText(
      about.profileCrabUrl,
    ) ||
    `crab://@${model.username}`;

  return (
    <section
      className="profile-about-panel"
      aria-label="About this creator"
    >
      <p className="cl-eyebrow">
        About
      </p>

      <h3>
        {displayName}
      </h3>

      <p className="profile-about-handle">
        {handle}
      </p>

      <p className="profile-about-bio">
        {bio}
      </p>

      <dl className="profile-about-facts">
        <div>
          <dt>
            Public profile
          </dt>

          <dd>
            {profileUrl}
          </dd>
        </div>

        <div>
          <dt>
            Timeline source
          </dt>

          <dd>
            Backend publication projection
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PublicationCollection({
  title,
  items,
  emptyTitle,
  emptyMessage,
  onOpenPublication,
}) {
  if (items.length === 0) {
    return (
      <TimelineNotice
        title={
          emptyTitle ||
          `No ${title.toLowerCase()} yet`
        }
        message={
          emptyMessage ||
          'No public content was returned for this section.'
        }
      />
    );
  }

  return (
    <section
      className="profile-publication-collection"
      aria-label={title}
    >
      <div className="profile-publication-collection-heading">
        <h3>
          {title}
        </h3>

        <span>
          {items.length}
        </span>
      </div>

      <div className="profile-publication-grid">
        {items.map(
          (publication) => (
            <PublicationCard
              key={
                publication.publicationId ||
                publication.id
              }
              publication={publication}
              onOpenPublication={onOpenPublication}
            />
          ),
        )}
      </div>
    </section>
  );
}

function PublicationCard({
  publication,
  featured = false,
  onOpenPublication,
}) {
  const publicationId =
    cleanText(
      publication.publicationId,
    ) ||
    cleanText(
      publication.id,
    ) ||
    'publication';

  const title =
    cleanText(
      publication.title,
    ) ||
    `Publication ${publicationId}`;

  const summary =
    cleanText(
      publication.summary,
    ) ||
    cleanText(
      publication.excerpt,
    ) ||
    'No public summary was returned.';

  const kind =
    cleanText(
      publication.kind,
    ) ||
    cleanText(
      publication.contentKind,
    ) ||
    'content';

  const route =
    publicationRoute(
      publication,
    );

  const timestamp =
    cleanText(
      publication.publishedAt,
    ) ||
    cleanText(
      publication.updatedAt,
    ) ||
    '';

  return (
    <article
      className={
        featured
          ? 'profile-publication-card is-featured'
          : 'profile-publication-card'
      }
      data-publication-kind={kind}
    >
      <div
        className="profile-publication-card-media"
        aria-hidden="true"
      >
        <span>
          {kindLabel(kind)}
        </span>
      </div>

      <div className="profile-publication-card-body">
        <div className="profile-publication-card-meta">
          <Badge tone="neutral">
            {kindLabel(kind)}
          </Badge>

          {timestamp && (
            <time>
              {timestamp}
            </time>
          )}
        </div>

        <h4>
          {title}
        </h4>

        <p>
          {summary}
        </p>

        <div className="profile-publication-card-footer">
          <span>
            {publicationId}
          </span>

          {route && (
            <Button
              variant="secondary"
              onClick={() =>
                onOpenPublication?.(
                  route,
                  publication,
                )
              }
            >
              Open
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function TimelineNotice({
  tone = 'neutral',
  title,
  message,
}) {
  return (
    <div
      className={`profile-timeline-notice is-${tone}`}
      role={
        tone === 'warning'
          ? 'alert'
          : 'status'
      }
    >
      <strong>
        {title}
      </strong>

      <p>
        {message}
      </p>
    </div>
  );
}

function publicationRoute(
  publication,
) {
  const candidates = [
    publication.route,
    publication.crabUrl,
    publication.publicationCrabUrl,
    publication.url,
  ];

  for (const candidate of candidates) {
    const normalized =
      cleanText(
        candidate,
      );

    if (
      normalized.startsWith(
        'crab://',
      )
    ) {
      return normalized;
    }
  }

  return '';
}

function kindLabel(
  value,
) {
  const normalized =
    cleanText(
      value,
    ) ||
    'content';

  return normalized
    .split(/[-_]/u)
    .filter(Boolean)
    .map(
      (part) =>
        part.slice(
          0,
          1,
        ).toUpperCase() +
        part.slice(
          1,
        ),
    )
    .join(' ');
}

function cleanText(
  value,
) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}
