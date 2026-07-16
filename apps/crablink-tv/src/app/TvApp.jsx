import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const INITIAL_NATIVE_STATUS = Object.freeze({
  state: 'idle',
  message: 'Native diagnostics have not been requested.',
});

export function TvApp() {
  const [nativeStatus, setNativeStatus] = useState(
    INITIAL_NATIVE_STATUS,
  );

  async function checkNativeBridge() {
    setNativeStatus({
      state: 'checking',
      message: 'Checking the narrow CrabLink TV command bridge…',
    });

    try {
      const diagnostics = await invoke('tv_diagnostics');

      setNativeStatus({
        state: 'ready',
        message:
          `${diagnostics.app} is running as a ` +
          `${diagnostics.profile} client-only surface.`,
      });
    } catch (error) {
      setNativeStatus({
        state: 'browser',
        message:
          'The static shell is available. Native diagnostics require ' +
          'the Tauri host.',
      });
    }
  }

  return (
    <main className="tv-shell">
      <header className="tv-header">
        <div>
          <p className="tv-eyebrow">CrabLink TV</p>
          <h1>Television client foundation</h1>
        </div>

        <span className="tv-profile-badge">
          HOST SCAFFOLD
        </span>
      </header>

      <section className="tv-hero" aria-labelledby="tv-phase-title">
        <p className="tv-kicker">TV Phase 1</p>
        <h2 id="tv-phase-title">
          A separate, remote-first CrabLink application
        </h2>
        <p>
          This shell is intentionally client-only. Android launcher,
          remote-focus, gateway, pairing, receipts, and media behavior
          arrive as later tested phases.
        </p>
      </section>

      <section
        className="tv-card-grid"
        aria-label="CrabLink TV foundation status"
      >
        <article className="tv-card">
          <p className="tv-card-label">Application</p>
          <h3>Separate TV package</h3>
          <p>
            Identifier:
            {' '}
            <code>com.rustyonions.crablink.tv</code>
          </p>
        </article>

        <article className="tv-card">
          <p className="tv-card-label">Authority</p>
          <h3>Client only</h3>
          <p>
            No local node, Service Node Operator Mode, wallet
            mutation, ledger mutation, or publishing commands.
          </p>
        </article>

        <article className="tv-card">
          <p className="tv-card-label">Android</p>
          <h3>Deferred</h3>
          <p>
            Android SDK, NDK, ADB, launcher metadata, and APK work
            remain deferred until TV Phase 2.
          </p>
        </article>
      </section>

      <section className="tv-native-panel">
        <div>
          <p className="tv-card-label">Native boundary</p>
          <h2>Minimal command registry</h2>
          <p
            className={`tv-native-status tv-native-status--${nativeStatus.state}`}
            aria-live="polite"
          >
            {nativeStatus.message}
          </p>
        </div>

        <button
          className="tv-action"
          type="button"
          onClick={checkNativeBridge}
        >
          Check native bridge
        </button>
      </section>

      <footer className="tv-footer">
        CrabLink TV Alpha implementation has started. No backend or
        economic truth is created by this shell.
      </footer>
    </main>
  );
}
