/**
 * RO:WHAT — Action controls for the React passport drawer.
 * RO:WHY — Centralizes safe identity/profile navigation and read-only refresh actions.
 * RO:INTERACTS — PassportDrawer, app navigation, identity/wallet clients through caller callbacks.
 * RO:INVARIANTS — read-only gateway refreshes only; no passport creation, no wallet mutation, no fake receipts.
 * RO:METRICS — refresh callbacks inherit gateway correlation IDs.
 * RO:CONFIG — walletAccount/handle/profileCrabUrl presence controls enabled states; dev mode may offer local labels.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority.
 * RO:TEST — manual refresh, dev-label, public-handle navigation, and profile workspace navigation smoke.
 */

export default function PassportActions({
  view,
  navigation,
  onClose,
  onRefreshIdentity,
  onRefreshWallet,
  onUseDevLabels,
  refreshingIdentity = false,
  refreshingWallet = false,
  canUseDevLabels = false,
}) {
  const canNavigate = typeof navigation?.navigate === 'function';
  const hasWallet = Boolean(view?.walletAccount);
  const publicHandleRoute = publicProfileRouteFor(view);
  const publicHandleLabel = view?.handle ? `Open ${view.handle}` : 'Open public handle';

  function navigateTo(route) {
    if (!canNavigate || !route) {
      return;
    }

    navigation.navigate(route);
    onClose?.();
  }

  return (
    <section className="cl-passport-actions" aria-label="Passport actions">
      <button type="button" onClick={onRefreshIdentity} disabled={refreshingIdentity}>
        {refreshingIdentity ? 'Checking identity…' : 'Refresh identity'}
      </button>

      <button type="button" onClick={onRefreshWallet} disabled={refreshingWallet || !hasWallet}>
        {refreshingWallet ? 'Checking wallet…' : 'Refresh wallet'}
      </button>

      {canUseDevLabels && (
        <button
          type="button"
          onClick={onUseDevLabels}
          title="Sets local dev labels only: passport:main:dev and acct_dev. This does not fake backend truth."
        >
          Use dev labels
        </button>
      )}

      <button type="button" onClick={() => navigateTo('crab://profile')} disabled={!canNavigate}>
        Open profile workspace
      </button>

      <button
        type="button"
        onClick={() => navigateTo(publicHandleRoute)}
        disabled={!canNavigate || !publicHandleRoute}
        title={publicHandleRoute ? publicHandleRoute : 'No backend-confirmed handle is loaded'}
      >
        {publicHandleLabel}
      </button>
    </section>
  );
}

function publicProfileRouteFor(view = {}) {
  const profileCrabUrl = String(view.profileCrabUrl || '').trim();

  if (profileCrabUrl.startsWith('crab://@')) {
    return profileCrabUrl;
  }

  const handle = String(view.handle || '').trim();

  if (handle.startsWith('@')) {
    return `crab://${handle}`;
  }

  if (handle) {
    return `crab://@${handle.replace(/^@/, '')}`;
  }

  return '';
}