/**
 * RO:WHAT — Interactive passport chip for the trusted CrabLink React shell.
 * RO:WHY — Opens the passport drawer while displaying identity state honestly in extension and HTTP test contexts.
 * RO:INTERACTS — appContext settings/storage, TopBar, PassportDrawer, future identity/profile routes.
 * RO:INVARIANTS — only backend-confirmed usernames may be labeled confirmed; HTTP React test mode must not fake extension storage.
 * RO:METRICS — none.
 * RO:CONFIG — passportSubject, handle, requestedHandle, usernameStatus, storage backend.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority are stored/rendered here.
 * RO:TEST — manual identity chip/drawer smoke in extension and Vite/HTTP contexts.
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
  const httpFallback = Boolean(storage?.isDevFallback);

  const display = confirmed
    ? settings.handle
    : requested
      ? `${requested} draft`
      : passportSubject
        ? passportSubject
        : httpFallback
          ? 'HTTP test mode'
          : 'No passport';

  const title = passportTitle({
    settings,
    storage,
    confirmed,
    requested,
    passportSubject,
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

function passportTitle({ settings, storage, confirmed, requested, passportSubject, httpFallback }) {
  if (confirmed) {
    return `Backend-confirmed passport handle: ${settings.handle}`;
  }

  if (requested) {
    return `${requested} is a local draft until RustyOnions confirms it through the gateway.`;
  }

  if (passportSubject) {
    return `Configured passport label: ${passportSubject}`;
  }

  if (httpFallback) {
    return [
      'React lane is running outside the Chrome extension origin.',
      'It cannot read chrome.storage.local from the loaded extension.',
      `Current storage backend: ${storage?.backend || 'fallback'}.`,
    ].join(' ');
  }

  return 'No passport label is loaded in this React session.';
}