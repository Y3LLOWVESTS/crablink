/**
 * Local, non-authoritative CrabLink TV preferences.
 *
 * These values control presentation and future verifier scheduling intent.
 * They cannot start a micronode, create evidence, award ROC, unlock content,
 * or mutate wallet or ledger truth.
 */

export const TV_THEME_STORAGE_KEY =
  'crablink.theme.mode';

export const TV_RESOURCE_MODE_STORAGE_KEY =
  'crablink.tv.resourceMode';

export const TV_VERIFICATION_ENABLED_STORAGE_KEY =
  'crablink.tv.verificationEnabled';

export const TV_THEME_MODES = Object.freeze([
  'dark',
  'light',
  'system',
]);

export const TV_RESOURCE_MODES = Object.freeze([
  'low',
  'balanced',
  'plugged-in',
]);

export function normalizeTvThemeMode(value) {
  return TV_THEME_MODES.includes(value)
    ? value
    : 'dark';
}

export function normalizeTvResourceMode(value) {
  return TV_RESOURCE_MODES.includes(value)
    ? value
    : 'balanced';
}

export function normalizeVerificationEnabled(
  value,
) {
  if (value === false || value === 'false') {
    return false;
  }

  if (value === true || value === 'true') {
    return true;
  }

  // CrabLink users participate by default, but this remains only a
  // local scheduling preference until the real verifier is attached.
  return true;
}

export function resolveTvTheme(
  mode,
  systemDark,
) {
  const safeMode = normalizeTvThemeMode(mode);

  if (safeMode === 'system') {
    return systemDark ? 'dark' : 'light';
  }

  return safeMode;
}

function safeRead(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function safeWrite(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readTvPreferences(storage) {
  return {
    themeMode: normalizeTvThemeMode(
      safeRead(storage, TV_THEME_STORAGE_KEY),
    ),
    resourceMode: normalizeTvResourceMode(
      safeRead(
        storage,
        TV_RESOURCE_MODE_STORAGE_KEY,
      ),
    ),
    verificationEnabled:
      normalizeVerificationEnabled(
        safeRead(
          storage,
          TV_VERIFICATION_ENABLED_STORAGE_KEY,
        ),
      ),
  };
}

export function writeTvThemeMode(
  storage,
  value,
) {
  const mode = normalizeTvThemeMode(value);

  safeWrite(
    storage,
    TV_THEME_STORAGE_KEY,
    mode,
  );

  return mode;
}

export function writeTvResourceMode(
  storage,
  value,
) {
  const mode = normalizeTvResourceMode(value);

  safeWrite(
    storage,
    TV_RESOURCE_MODE_STORAGE_KEY,
    mode,
  );

  return mode;
}

export function writeVerificationEnabled(
  storage,
  value,
) {
  const enabled =
    normalizeVerificationEnabled(value);

  safeWrite(
    storage,
    TV_VERIFICATION_ENABLED_STORAGE_KEY,
    String(enabled),
  );

  return enabled;
}

export function describeTvResourceMode(mode) {
  switch (normalizeTvResourceMode(mode)) {
    case 'low':
      return (
        'Small bounded verification batches with the most ' +
        'conservative CPU and network posture.'
      );

    case 'plugged-in':
      return (
        'Larger bounded verification batches when the device is ' +
        'powered and the future verifier reports that work is permitted.'
      );

    default:
      return (
        'Moderate bounded verification work with balanced CPU ' +
        'and network limits.'
      );
  }
}
