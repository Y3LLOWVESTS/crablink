import {
  TV_RESOURCE_MODES,
  TV_THEME_MODES,
  describeTvResourceMode,
} from './tvPreferences.js';

const THEME_LABELS = Object.freeze({
  dark: 'Dark',
  light: 'Light',
  system: 'System',
});

const RESOURCE_LABELS = Object.freeze({
  low: 'Low',
  balanced: 'Balanced',
  'plugged-in': 'Plugged in',
});

export function TvSettingsPanel({
  preferences,
  onThemeMode,
  onResourceMode,
  onVerificationEnabled,
  onActivity,
}) {
  function announce(message) {
    onActivity?.(message);
  }

  return (
    <section
      className="tv-settings-panel"
      aria-labelledby="tv-settings-title"
    >
      <div className="tv-section-heading">
        <p className="tv-card-label">
          Local device preferences
        </p>

        <h2 id="tv-settings-title">
          Theme and participation controls
        </h2>

        <p className="tv-settings-intro">
          These controls store local intent only. They do not
          start a verifier, create reward evidence, change a
          ROC balance, or unlock paid content.
        </p>
      </div>

      <div className="tv-settings-groups">
        <fieldset className="tv-settings-group">
          <legend>Theme</legend>

          <p>
            Current display: {preferences.resolvedTheme}.
          </p>

          <div className="tv-choice-row">
            {TV_THEME_MODES.map((mode) => (
              <button
                key={mode}
                className="tv-choice"
                type="button"
                data-tv-focusable="true"
                data-tv-focus-key={`settings-theme-${mode}`}
                aria-pressed={
                  preferences.themeMode === mode
                }
                onClick={() => {
                  onThemeMode(mode);
                  announce(
                    `${THEME_LABELS[mode]} theme preference saved locally.`,
                  );
                }}
              >
                {THEME_LABELS[mode]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="tv-settings-group">
          <legend>Verification resources</legend>

          <p>
            {describeTvResourceMode(
              preferences.resourceMode,
            )}
          </p>

          <div className="tv-choice-row">
            {TV_RESOURCE_MODES.map((mode) => (
              <button
                key={mode}
                className="tv-choice"
                type="button"
                data-tv-focusable="true"
                data-tv-focus-key={`settings-resource-${mode}`}
                aria-pressed={
                  preferences.resourceMode === mode
                }
                onClick={() => {
                  onResourceMode(mode);
                  announce(
                    `${RESOURCE_LABELS[mode]} resource preference saved. No verification work was started.`,
                  );
                }}
              >
                {RESOURCE_LABELS[mode]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="tv-settings-group">
          <legend>Participation preference</legend>

          <p>
            CrabLink users participate through the shared
            micronode path. Until that path is attached here,
            this setting records scheduling intent only.
          </p>

          <div className="tv-choice-row">
            <button
              className="tv-choice"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key="settings-verification-enabled"
              aria-pressed={
                preferences.verificationEnabled
              }
              onClick={() => {
                onVerificationEnabled(true);
                announce(
                  'Verification participation is enabled for future micronode attachment. No evidence or ROC was created.',
                );
              }}
            >
              Participate
            </button>

            <button
              className="tv-choice"
              type="button"
              data-tv-focusable="true"
              data-tv-focus-key="settings-verification-paused"
              aria-pressed={
                !preferences.verificationEnabled
              }
              onClick={() => {
                onVerificationEnabled(false);
                announce(
                  'Verification participation preference is paused. No ledger or reward state changed.',
                );
              }}
            >
              Pause
            </button>
          </div>
        </fieldset>
      </div>

      <div className="tv-settings-truth">
        <strong>Current truth</strong>

        <span>
          Theme: {preferences.themeMode}
        </span>

        <span>
          Resource mode: {preferences.resourceMode}
        </span>

        <span>
          Participation preference:{' '}
          {preferences.verificationEnabled
            ? 'enabled'
            : 'paused'}
        </span>

        <span>
          Micronode attachment: not active in this build
        </span>
      </div>
    </section>
  );
}
