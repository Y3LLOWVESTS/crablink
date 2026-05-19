/**
 * RO:WHAT — Shared two-column creator workspace layout for local-only CrabLink routes.
 * RO:WHY — CrabLink refactor; prevents every creator page from reinventing hero/principle/workspace structure.
 * RO:INTERACTS — PageHeader, Badge, route pages such as lyrics/post/comment/article/music.
 * RO:INVARIANTS — layout only; no fake backend truth; no CID creation; no wallet or ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — page-supplied title/copy/badges/principles/side panels.
 * RO:SECURITY — trusted UI only; untrusted crab content belongs in sandboxed renderers.
 * RO:TEST — manual route smoke in light/dark mode and React HTTP preview.
 */

import Badge from './Badge.jsx';
import Card from './Card.jsx';
import PageHeader from './PageHeader.jsx';

export default function CreatorWorkspaceLayout({
  eyebrow = '',
  title,
  copy = '',
  badges = [],
  principles = [],
  children,
  side = null,
  footer = null,
  className = '',
}) {
  return (
    <section className={['cl-page cl-creator-workspace', className].filter(Boolean).join(' ')}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        copy={copy}
        meta={badges.length ? <BadgeRow badges={badges} /> : null}
      />

      {principles.length > 0 && (
        <section className="cl-creator-principles" aria-label={`${title} principles`}>
          {principles.map((principle) => (
            <Card
              key={`${principle.title}-${principle.eyebrow || ''}`}
              eyebrow={principle.eyebrow || 'Principle'}
              title={principle.title}
              className="cl-creator-principle-card"
            >
              <p>{principle.copy}</p>
            </Card>
          ))}
        </section>
      )}

      <section className="cl-creator-workspace-grid" aria-label={`${title} workspace`}>
        <div className="cl-creator-main-column">{children}</div>
        {side && <aside className="cl-creator-side-column">{side}</aside>}
      </section>

      {footer && <footer className="cl-creator-footer">{footer}</footer>}
    </section>
  );
}

function BadgeRow({ badges }) {
  return (
    <div className="cl-creator-badge-row">
      {badges.map((badge) => {
        if (badge && typeof badge === 'object' && 'label' in badge) {
          return (
            <Badge
              key={badge.label}
              tone={badge.tone || 'neutral'}
              title={badge.title || ''}
              uppercase={badge.uppercase ?? true}
            >
              {badge.label}
            </Badge>
          );
        }

        return (
          <Badge key={String(badge)} tone="neutral">
            {badge}
          </Badge>
        );
      })}
    </div>
  );
}