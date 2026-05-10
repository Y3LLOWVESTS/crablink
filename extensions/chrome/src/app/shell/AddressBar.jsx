/**
 * RO:WHAT — CrabLink address bar for route-owned React pages.
 * RO:WHY — App Integration; Concerns: DX/RES; centralizes user navigation instead of page-local route hacks.
 * RO:INTERACTS — appState.navigate, router.js, TopBar.
 * RO:INVARIANTS — frontend parsing is convenience only; backend validation remains canonical; no backend mutation.
 * RO:METRICS — none.
 * RO:CONFIG — current route URL.
 * RO:SECURITY — no secrets in address input; no hidden paid action.
 * RO:TEST — manual route entry smoke for all built-in crab:// routes.
 */

import { useEffect, useState } from 'react';

export default function AddressBar({ value = 'crab://home', onNavigate }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value || 'crab://home');
  }, [value]);

  function submit(event) {
    event.preventDefault();

    const next = draft.trim() || 'crab://home';

    if (typeof onNavigate === 'function') {
      onNavigate(next);
    }
  }

  return (
    <form className="cl-address" onSubmit={submit}>
      <label className="sr-only" htmlFor="cl-address-input">
        CrabLink address
      </label>
      <input
        id="cl-address-input"
        value={draft}
        placeholder="crab://site"
        spellCheck="false"
        autoCapitalize="none"
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
      />
      <button className="cl-address-go" type="submit">
        Go
      </button>
    </form>
  );
}