/**
 * Shared visual layout primitive for the CrabLink desktop frame.
 *
 * The active shell, route stack, Passport state, and economic truth remain
 * caller-owned.
 *
 * FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2
 */

export default function AppShell({
  brand = null,
  navigation = null,
  utility = null,
  address = null,
  children,
  drawer = null,
  toastRegion = null,
  contentId = 'cl-app-content',
  className = '',
}) {
  return (
    <div
      className={[
        'cl-app-shell',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <a
        className="cl-skip-link"
        href={`#${contentId}`}
      >
        Skip to content
      </a>

      <header className="cl-app-shell-header">
        {brand && (
          <div className="cl-app-shell-brand">
            {brand}
          </div>
        )}

        {address && (
          <div className="cl-app-shell-address">
            {address}
          </div>
        )}

        {utility && (
          <div className="cl-app-shell-utility">
            {utility}
          </div>
        )}
      </header>

      <div className="cl-app-shell-body">
        {navigation && (
          <aside className="cl-app-shell-navigation">
            {navigation}
          </aside>
        )}

        <main
          id={contentId}
          className="cl-app-shell-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>

      {drawer}
      {toastRegion}
    </div>
  );
}
