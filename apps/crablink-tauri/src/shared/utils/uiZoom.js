/**
 * RO:WHAT — UI-only zoom helpers for the CrabLink Tauri React shell.
 * RO:WHY — Tauri WebView does not reliably honor browser Command +/- zoom shortcuts, so CrabLink owns bounded display zoom.
 * RO:INTERACTS — TopBar.jsx, Shell.css, window.localStorage, document.documentElement CSS variables.
 * RO:INVARIANTS — zoom is display-only; it does not change route, wallet, receipt, asset, passport, or backend truth.
 * RO:SECURITY — stores only a numeric UI preference; no secrets, tokens, capabilities, or spend authority.
 * RO:TEST — manual Command+/Command-/Command+0 plus settings zoom controls in Tauri.
 */

export const ZOOM_STORAGE_KEY = 'crablink.ui.zoomScale.v1';
export const DEFAULT_ZOOM_SCALE = 1;
export const MIN_ZOOM_SCALE = 0.75;
export const MAX_ZOOM_SCALE = 1.5;
export const ZOOM_STEP = 0.1;

export function readStoredZoomScale() {
  try {
    const raw = globalThis.localStorage?.getItem?.(ZOOM_STORAGE_KEY);
    return clampZoomScale(raw || DEFAULT_ZOOM_SCALE);
  } catch (_error) {
    return DEFAULT_ZOOM_SCALE;
  }
}

export function writeStoredZoomScale(value) {
  const scale = clampZoomScale(value);

  try {
    globalThis.localStorage?.setItem?.(ZOOM_STORAGE_KEY, String(scale));
  } catch (_error) {
    // Zoom is convenience-only display state. Failing to persist must not break the app.
  }

  applyZoomScale(scale);
  return scale;
}

export function stepStoredZoomScale(direction) {
  const current = readStoredZoomScale();
  const step = Number(direction || 0) >= 0 ? ZOOM_STEP : -ZOOM_STEP;
  return writeStoredZoomScale(current + step);
}

export function resetStoredZoomScale() {
  return writeStoredZoomScale(DEFAULT_ZOOM_SCALE);
}

export function applyZoomScale(value, documentLike = globalThis.document) {
  const scale = clampZoomScale(value);

  try {
    const root = documentLike?.documentElement;

    if (root?.style?.setProperty) {
      root.style.setProperty('--cl-app-zoom-scale', String(scale));
      root.style.setProperty('font-size', `${Math.round(scale * 100)}%`);
      root.dataset.crablinkZoom = formatZoomPercent(scale);
    }
  } catch (_error) {
    // Display zoom must fail closed to normal scale.
  }

  return scale;
}

export function clampZoomScale(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_ZOOM_SCALE;
  }

  const rounded = Math.round(number * 100) / 100;
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, rounded));
}

export function formatZoomPercent(value) {
  return `${Math.round(clampZoomScale(value) * 100)}%`;
}