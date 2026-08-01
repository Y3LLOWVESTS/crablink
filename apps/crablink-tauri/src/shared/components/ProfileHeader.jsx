/**
 * RO:WHAT — Shared consumer-facing profile header.
 * RO:WHY — FINAL_BETA Phase 2C1; public profiles and owner studio need one coherent identity presentation contract.
 * RO:INTERACTS — public profile, Profile Studio, avatar projection, relationship actions, and design-system tokens.
 * RO:INVARIANTS — caller supplies confirmed/draft labels; component does not infer identity ownership or relationship truth.
 * RO:SECURITY — no Passport secrets, device material, raw capability, profile mutation, follow mutation, or network request.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

export default function ProfileHeader({
  avatar = null,
  displayName,
  username,
  bio = '',
  statusLabel = '',
  stats = null,
  actions = null,
  className = '',
}) {
  return (
    <header
      className={[
        'cl-profile-header',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="cl-profile-avatar">
        {avatar || (
          <span aria-hidden="true">
            {profileInitial(
              displayName,
              username,
            )}
          </span>
        )}
      </div>

      <div className="cl-profile-identity">
        <div className="cl-profile-title-row">
          <div>
            <h1>{displayName}</h1>

            <p className="cl-profile-username">
              {normalizeUsername(username)}
            </p>
          </div>

          {statusLabel && (
            <span className="cl-product-label">
              {statusLabel}
            </span>
          )}
        </div>

        {bio && (
          <p className="cl-profile-bio">
            {bio}
          </p>
        )}

        {stats && (
          <div className="cl-profile-stats">
            {stats}
          </div>
        )}

        {actions && (
          <div className="cl-profile-actions">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

function normalizeUsername(username) {
  const value = String(
    username || '',
  ).trim();

  if (!value) {
    return '';
  }

  return value.startsWith('@')
    ? value
    : `@${value}`;
}

function profileInitial(
  displayName,
  username,
) {
  const source = String(
    displayName || username || '?',
  ).trim();

  return source
    .slice(0, 1)
    .toUpperCase();
}
