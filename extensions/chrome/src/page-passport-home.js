/**
 * RO:WHAT — Legacy cleanup shim for the removed Passport drawer expansion card.
 * RO:WHY — The Passport drawer must stay compact; deeper profile/assets UX belongs in dedicated .profile/assets pages or modals.
 * RO:INTERACTS — page.html, page.js Passport drawer.
 * RO:INVARIANTS — no UI injection; no backend calls; no wallet/passport mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no identity claims, no SSO claims, no local profile truth.
 * RO:TEST — node --check; scripts/check-chrome.sh; manual Passport drawer clutter check.
 */

function removeLegacyPassportExpansion() {
  const legacy = document.getElementById('passportNextLevelCard');
  if (legacy) {
    legacy.remove();
  }

  for (const selector of [
    '.passport-next-level-card',
    '.passport-permission-grid',
    '.passport-home-actions',
    '.passport-username-form'
  ]) {
    for (const el of document.querySelectorAll(selector)) {
      el.remove();
    }
  }
}

function boot() {
  removeLegacyPassportExpansion();

  const drawer = document.getElementById('passportDrawer');
  if (!drawer) return;

  const observer = new MutationObserver(removeLegacyPassportExpansion);
  observer.observe(drawer, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}