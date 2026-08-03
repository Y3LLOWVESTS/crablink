/**
 * RO:WHAT — Interactive consumer Passport chip for the trusted CrabLink React shell.
 * RO:WHY — FINAL_BETA Phase 3; opens the Passport drawer without exposing raw engineering identifiers in normal shell chrome.
 * RO:INTERACTS — appContext settings/storage, TopBar, PassportDrawer, future identity/profile routes.
 * RO:INVARIANTS — only backend-confirmed usernames may be labeled confirmed; raw Passport subjects stay out of normal shell display.
 * RO:METRICS — none.
 * RO:CONFIG — passportSubject presence, handle, requestedHandle, usernameStatus, storage backend.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, raw Passport subjects, or spend authority are rendered here.
 * RO:TEST — finalBetaPhase3ShellAcceptance.source.test.mjs; manual identity chip/drawer smoke.
 *
 * FINAL_BETA_PHASE3A4_CONCISE_PASSPORT_STATUS_V1
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useAppContext } from '../appContext.js';
import PassportDrawer from './PassportDrawer.jsx';

export default function PassportChip({ navigation }) {
  const { settings, storage } = useAppContext();
  const [open, setOpen] = useState(false);
  const shellRef = useRef(null);
  const drawerId = useId();

  const status = settings?.usernameStatus || '';
  const confirmed = Boolean(settings?.handle && status === 'confirmed');
  const requested = String(settings?.requestedHandle || '').trim();
  const passportSubject = String(settings?.passportSubject || '').trim();
  const hasPassport = Boolean(passportSubject);
  const httpFallback = Boolean(storage?.isDevFallback);

  const display = confirmed
    ? settings.handle
    : requested
      ? `${requested} draft`
      : hasPassport
        ? 'Passport ready'
        : httpFallback
          ? 'Preview mode'
          : 'No passport';

  const title = passportTitle({
    settings,
    storage,
    confirmed,
    requested,
    hasPassport,
    httpFallback,
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function onPointerDown(event) {
      if (!shellRef.current || shellRef.current.contains(event.target)) {
        return;
      }

      setOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="cl-passport-shell" ref={shellRef}>
      <button
        className={`cl-chip cl-passport-chip ${confirmed ? 'cl-chip-verified' : ''}`}
        type="button"
        title={title}
        aria-haspopup="dialog"
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={open ? drawerId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{confirmed ? '●' : '◎'}</span>
        <span className="cl-chip-text">{display}</span>
      </button>

      {open && (
        <PassportDrawer
          id={drawerId}
          navigation={navigation}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function passportTitle({
  settings,
  storage,
  confirmed,
  requested,
  hasPassport,
  httpFallback,
}) {
  if (confirmed) {
    return `Backend-confirmed Passport handle: ${settings.handle}`;
  }

  if (requested) {
    return `${requested} is a local draft until RustyOnions confirms it through the gateway.`;
  }

  if (hasPassport) {
    return 'A local Passport is configured. Open the Passport panel for status and account details.';
  }

  if (httpFallback) {
    return [
      'React lane is running outside the packaged CrabLink origin.',
      'It cannot read the packaged application storage adapter.',
      `Current storage backend: ${storage?.backend || 'fallback'}.`,
    ].join(' ');
  }

  return 'No Passport is configured in this CrabLink session.';
}
