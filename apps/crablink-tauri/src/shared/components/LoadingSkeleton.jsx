/**
 * RO:WHAT — Shared accessible loading placeholder.
 * RO:WHY — FINAL_BETA Phase 2; gives list, card, and page hydration one consistent non-fake loading pattern.
 * RO:INTERACTS — feed, profile, content, site, receipt, and media surfaces plus designSystemFoundation.css.
 * RO:INVARIANTS — placeholder only; never displays invented content or success state.
 * RO:METRICS — none.
 * RO:CONFIG — variant, count, label, and className.
 * RO:SECURITY — no data or authority.
 * RO:TEST — designSystemFoundation.test.mjs.
 */

export default function LoadingSkeleton({
  variant = 'line',
  count = 1,
  label = 'Loading content',
  className = '',
}) {
  const safeCount = Math.max(
    1,
    Math.min(12, Number(count) || 1),
  );

  const itemClass =
    variant === 'title'
      ? 'cl-skeleton-title'
      : variant === 'card'
        ? 'cl-skeleton-card'
        : variant === 'circle'
          ? 'cl-skeleton-circle'
          : 'cl-skeleton-line';

  return (
    <div
      className={[
        'cl-skeleton-stack',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      {Array.from(
        { length: safeCount },
        (_, index) => (
          <span
            key={`${variant}-${index}`}
            className={[
              'cl-skeleton',
              itemClass,
            ].join(' ')}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}
