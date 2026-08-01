import {
  useState,
} from 'react';

import {
  androidDiagnosticsPort,
} from '../adapters/androidPlatform.js';
import {
  getAndroidRoute,
} from '../app/androidRouteRegistry.js';
import {
  useAndroidApp,
} from '../app/AndroidAppContext.jsx';
import { CompactNavigation } from './CompactNavigation.jsx';
import { ExpandedNavigation } from './ExpandedNavigation.jsx';
import { ListDetailLayout } from './ListDetailLayout.jsx';
import { MediumNavigation } from './MediumNavigation.jsx';
import {
  ANDROID_WINDOW_CLASSES,
  useAndroidWindowClass,
} from './windowClass.js';

function FoundationCard({ route }) {
  return (
    <article className="android-card">
      <p className="android-eyebrow">
        Adaptive Android scaffold
      </p>
      <h1>{route.label}</h1>
      <p>{route.description}</p>
      <dl className="android-facts">
        <div>
          <dt>Client authority</dt>
          <dd>Display and explicit user intent only</dd>
        </div>
        <div>
          <dt>Gateway</dt>
          <dd>Not connected</dd>
        </div>
        <div>
          <dt>Passport</dt>
          <dd>Not connected</dd>
        </div>
        <div>
          <dt>Wallet or ledger mutation</dt>
          <dd>Absent</dd>
        </div>
      </dl>
    </article>
  );
}

export function AndroidShell() {
  const {
    activeRouteId,
    navigate,
    goBack,
    canGoBack,
  } = useAndroidApp();

  const windowClass = useAndroidWindowClass();
  const route = getAndroidRoute(activeRouteId);
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagnosticsError, setDiagnosticsError] = useState('');

  const readDiagnostics = async () => {
    setDiagnostics(null);
    setDiagnosticsError('');

    try {
      const result =
        await androidDiagnosticsPort.getDiagnostics();

      setDiagnostics(result);
    } catch (_error) {
      setDiagnosticsError(
        'Native diagnostics are unavailable outside the Tauri host.',
      );
    }
  };

  const navigationProps = {
    activeRouteId,
    onNavigate: navigate,
  };

  const compact =
    windowClass.sizeClass ===
      ANDROID_WINDOW_CLASSES.compact ||
    windowClass.compactHeight;

  const expanded = [
    ANDROID_WINDOW_CLASSES.expanded,
    ANDROID_WINDOW_CLASSES.large,
    ANDROID_WINDOW_CLASSES.extraLarge,
  ].includes(windowClass.sizeClass);

  return (
    <div
      className="android-app"
      data-window-class={windowClass.sizeClass}
      data-compact-height={
        windowClass.compactHeight
          ? 'true'
          : 'false'
      }
    >
      {!compact ? (
        expanded ? (
          <ExpandedNavigation {...navigationProps} />
        ) : (
          <MediumNavigation {...navigationProps} />
        )
      ) : null}

      <main className="android-main">
        <header className="android-topbar">
          <button
            type="button"
            className="android-button android-button--quiet"
            disabled={!canGoBack}
            onClick={goBack}
          >
            Back
          </button>
          <div>
            <strong>CrabLink</strong>
            <span>
              {windowClass.sizeClass}
              {' · '}
              {Math.round(windowClass.width)}×
              {Math.round(windowClass.height)}
            </span>
          </div>
        </header>

        <div className="android-content">
          {expanded ? (
            <ListDetailLayout
              primary={(
                <FoundationCard route={route} />
              )}
              detail={(
                <section className="android-card">
                  <h2>Foundation status</h2>
                  <p>
                    The mobile presentation shell is present.
                    Product routes remain deliberately unavailable
                    until their focused phases.
                  </p>
                  <button
                    type="button"
                    className="android-button"
                    onClick={readDiagnostics}
                  >
                    Read native diagnostics
                  </button>
                  {diagnostics ? (
                    <pre className="android-diagnostics">
                      {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                  ) : null}
                  {diagnosticsError ? (
                    <p role="status">{diagnosticsError}</p>
                  ) : null}
                </section>
              )}
              supporting={(
                <section className="android-card">
                  <h2>Security posture</h2>
                  <p>
                    No PIN, recovery phrase, private key,
                    capability, wallet mutation, or ledger
                    mutation surface exists in this scaffold.
                  </p>
                </section>
              )}
            />
          ) : (
            <>
              <FoundationCard route={route} />
              <section className="android-card">
                <h2>Native bridge</h2>
                <button
                  type="button"
                  className="android-button"
                  onClick={readDiagnostics}
                >
                  Read native diagnostics
                </button>
                {diagnostics ? (
                  <pre className="android-diagnostics">
                    {JSON.stringify(diagnostics, null, 2)}
                  </pre>
                ) : null}
                {diagnosticsError ? (
                  <p role="status">{diagnosticsError}</p>
                ) : null}
              </section>
            </>
          )}
        </div>
      </main>

      {compact ? (
        <CompactNavigation {...navigationProps} />
      ) : null}
    </div>
  );
}
