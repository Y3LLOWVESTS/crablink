/**
 * Controlled primary-navigation presentation.
 *
 * Items, labels, active state, and navigation behavior remain caller-owned.
 *
 * FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2
 */

export default function PrimaryNavigation({
  items = [],
  activeId = '',
  onSelect = null,
  label = 'Primary navigation',
  compact = false,
  className = '',
}) {
  return (
    <nav
      className={[
        'cl-primary-navigation',
        compact
          ? 'is-compact'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      <ul className="cl-primary-navigation-list">
        {items.map((item, index) => {
          const id = String(
            item?.id ||
            `navigation-item-${index}`,
          );

          const active =
            id === activeId ||
            Boolean(item?.active);

          return (
            <li key={id}>
              <button
                className={[
                  'cl-primary-navigation-item',
                  active
                    ? 'is-active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                type="button"
                disabled={Boolean(
                  item?.disabled,
                )}
                aria-current={
                  active
                    ? 'page'
                    : undefined
                }
                onClick={(event) => {
                  item?.onSelect?.(
                    item,
                    event,
                  );

                  onSelect?.(
                    item,
                    event,
                  );
                }}
              >
                {item?.icon && (
                  <span
                    className="cl-primary-navigation-icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                )}

                <span className="cl-primary-navigation-label">
                  {item?.label || id}
                </span>

                {item?.badge && (
                  <span className="cl-primary-navigation-badge">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
