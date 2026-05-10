/**
 * RO:WHAT — Persists and resolves the CrabLink UI theme mode.
 * RO:WHY — App Integration; Concerns: DX; keeps light/dark/system behavior uniform across all route-owned pages.
 * RO:INTERACTS — ThemeProvider.jsx, themeTokens.css, Shell, TopBar, route-owned pages.
 * RO:INVARIANTS — light is default; theme is local UI preference only; no backend truth or secrets.
 * RO:METRICS — none.
 * RO:CONFIG — localStorage key crablink.theme.mode.
 * RO:SECURITY — no PII, wallet, token, or passport data stored here.
 * RO:TEST — npm run build; manual light/dark/system visual smoke.
 */

const THEME_STORAGE_KEY = 'crablink.theme.mode';
const VALID_MODES = new Set(['light', 'dark', 'system']);
let memoryThemeMode = 'light';

export function readThemeMode() {
  const stored = readLocalThemeMode();
  return normalizeThemeMode(stored || memoryThemeMode);
}

export function writeThemeMode(mode) {
  const safeMode = normalizeThemeMode(mode);
  memoryThemeMode = safeMode;

  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, safeMode);
  } catch (_error) {
    // Some extension/dev contexts deny localStorage. The memory fallback keeps this session usable.
  }

  return safeMode;
}

export function normalizeThemeMode(mode) {
  const safeMode = String(mode || '').trim().toLowerCase();
  return VALID_MODES.has(safeMode) ? safeMode : 'light';
}

export function resolveThemeMode(mode, systemTheme = getSystemTheme()) {
  const safeMode = normalizeThemeMode(mode);

  if (safeMode === 'system') {
    return systemTheme === 'dark' ? 'dark' : 'light';
  }

  return safeMode;
}

export function getSystemTheme() {
  try {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  } catch (_error) {
    return 'light';
  }
}

export function subscribeSystemTheme(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  const query = globalThis.matchMedia?.('(prefers-color-scheme: dark)');

  if (!query) {
    return () => {};
  }

  const listener = () => callback(getSystemTheme());

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }

  if (typeof query.addListener === 'function') {
    query.addListener(listener);
    return () => query.removeListener(listener);
  }

  return () => {};
}

function readLocalThemeMode() {
  try {
    return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) || '';
  } catch (_error) {
    return '';
  }
}
