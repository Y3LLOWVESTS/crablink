/**
 * RO:WHAT — Explicit build-and-setting gate for Passport drawer development sessions and starter ROC controls.
 * RO:WHY — Keeps Creator/Visitor fixtures available for testing while making them unavailable in normal and production builds.
 * RO:INTERACTS — PassportDrawer.jsx, app settings devMode, Vite DEV flag, and devPassportSessions.js.
 * RO:INVARIANTS — both a development build and devMode=true are required; disabled posture returns no sessions or starter amount.
 * RO:METRICS — none.
 * RO:CONFIG — Vite import.meta.env.DEV and local settings.devMode.
 * RO:SECURITY — no identity, wallet, balance, or backend truth is created by this local visibility gate.
 * RO:TEST — passportDrawerDevGate.test.mjs.
 */

import {
  DEFAULT_DEV_STARTER_GRANT_MINOR,
  listDevPassportSessions,
} from '../../shared/utils/devPassportSessions.js';

import {
  isExplicitDeveloperSurface,
} from '../developerSurfaceMode.js';

const EMPTY_DEV_SESSIONS =
  Object.freeze([]);

export function isExplicitPassportDrawerDevSurface({
  buildDev = false,
  settings = {},
} = {}) {
  return isExplicitDeveloperSurface({
    buildDev,
    settings,
  });
}

export function listExplicitPassportDrawerDevSessions({
  enabled = false,
} = {}) {
  if (enabled !== true) {
    return EMPTY_DEV_SESSIONS;
  }

  return listDevPassportSessions();
}

export function explicitPassportDrawerStarterGrantMinor({
  enabled = false,
  activeSession = null,
} = {}) {
  if (enabled !== true) {
    return '';
  }

  return (
    String(
      activeSession?.starterGrantMinor ||
        '',
    ).trim() ||
    DEFAULT_DEV_STARTER_GRANT_MINOR
  );
}
