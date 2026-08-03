/**
 * Compact shell-level utility and status presentation.
 *
 * All displayed status remains caller-derived and creates no backend truth.
 *
 * FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2
 */

export default function UtilityBar({
  label = 'Application utilities',
  leading = null,
  children = null,
  trailing = null,
  statusLabel = '',
  statusTone = 'neutral',
  className = '',
}) {
  return (
    <aside
      className={[
        'cl-utility-bar',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      {leading && (
        <div className="cl-utility-bar-leading">
          {leading}
        </div>
      )}

      <div className="cl-utility-bar-content">
        {statusLabel && (
          <span
            className={[
              'cl-utility-status',
              `is-${statusTone}`,
            ].join(' ')}
          >
            {statusLabel}
          </span>
        )}

        {children}
      </div>

      {trailing && (
        <div className="cl-utility-bar-trailing">
          {trailing}
        </div>
      )}
    </aside>
  );
}
