/**
 * RO:WHAT — Shared stats/completeness panel for local creator draft routes.
 * RO:WHY — CrabLink refactor; avoids duplicate side-panel metrics across lyrics/post/comment/article/etc.
 * RO:INTERACTS — Card, Badge, StatChip, local creator route state.
 * RO:INVARIANTS — display only; caller owns truth source; local draft metrics are not backend facts.
 * RO:METRICS — none.
 * RO:CONFIG — stats/completeness/notes props.
 * RO:SECURITY — no backend calls; no wallet mutation.
 * RO:TEST — manual route smoke on crab://lyrics and future creator routes.
 */

import Badge from './Badge.jsx';
import Card from './Card.jsx';
import StatChip from './StatChip.jsx';

export default function DraftStatsPanel({
  title = 'Local metrics',
  eyebrow = 'Draft stats',
  stats = [],
  completeness = null,
  notes = [],
  className = '',
}) {
  const hasCompleteness = Number.isFinite(Number(completeness));
  const boundedCompleteness = hasCompleteness
    ? Math.max(0, Math.min(100, Number(completeness)))
    : null;

  return (
    <Card eyebrow={eyebrow} title={title} className={['cl-draft-stats-panel', className].filter(Boolean).join(' ')}>
      {hasCompleteness && (
        <div className="cl-draft-completeness" aria-label="Draft completeness">
          <div>
            <strong>{boundedCompleteness}%</strong>
            <span>complete</span>
          </div>
          <div className="cl-draft-completeness-bar" aria-hidden="true">
            <span style={{ width: `${boundedCompleteness}%` }} />
          </div>
        </div>
      )}

      <div className="cl-draft-stat-grid">
        {stats.map((stat) => (
          <StatChip
            key={stat.label}
            label={stat.label}
            value={stat.value}
            help={stat.help || ''}
            tone={stat.tone || 'neutral'}
            size={stat.size || 'md'}
          />
        ))}
      </div>

      {notes.length > 0 && (
        <div className="cl-draft-note-list" aria-label="Draft notes">
          {notes.map((note) => (
            <Badge key={note} tone="neutral" uppercase={false}>
              {note}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}