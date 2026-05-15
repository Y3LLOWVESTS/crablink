/**
 * RO:WHAT — Dev-only per-window passport session helpers for CrabLink React testing.
 * RO:WHY — Lets one Chrome extension install open separate creator/visitor windows before real passport vaults/alts exist.
 * RO:INTERACTS — app/settings.js, PassportDrawer.jsx, chrome-extension react.html entry.
 * RO:INVARIANTS — local labels only; no fake backend truth; no fake ROC; no private keys; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — URL params: crablinkSession, session, passportSubject, walletAccount, handle.
 * RO:SECURITY — does not store secrets; does not grant spend authority; does not claim privacy/anonymity.
 * RO:TEST — scripts/check-react-lane.sh; manual open Creator A and Visitor B windows from PassportDrawer.
 */

export const DEV_PASSPORT_SESSION_PARAM = 'crablinkSession';
export const DEFAULT_DEV_STARTER_GRANT_MINOR = '1776';

export const DEV_PASSPORT_SESSIONS = Object.freeze([
  Object.freeze({
    id: 'creator-a',
    label: 'Creator A',
    role: 'creator',
    passportSubject: 'passport:main:dev',
    walletAccount: 'acct_dev',
    handle: '@creator-a',
    usernameStatus: 'local_dev',
    starterGrantMinor: DEFAULT_DEV_STARTER_GRANT_MINOR,
    description: 'Use this window to create images, posts, articles, comments, and sites.',
  }),
  Object.freeze({
    id: 'visitor-b',
    label: 'Visitor B',
    role: 'visitor',
    passportSubject: 'passport:main:visitor-b',
    walletAccount: 'acct_visitor_b',
    handle: '@visitor-b',
    usernameStatus: 'local_dev',
    starterGrantMinor: DEFAULT_DEV_STARTER_GRANT_MINOR,
    description: 'Use this window to visit another passport’s site and test future paid-view behavior.',
  }),
]);

export function listDevPassportSessions() {
  return DEV_PASSPORT_SESSIONS.map((session) => Object.freeze({ ...session }));
}

export function getDevPassportSession(id) {
  const safeId = normalizeSessionId(id);

  return DEV_PASSPORT_SESSIONS.find((session) => session.id === safeId) || null;
}

export function getDevPassportSessionFromLocation(locationLike = globalThis.location) {
  const search = String(locationLike?.search || '');
  const params = new URLSearchParams(search);
  const explicitId =
    params.get(DEV_PASSPORT_SESSION_PARAM) ||
    params.get('session') ||
    params.get('passportSession') ||
    '';
  const explicitSession = getDevPassportSession(explicitId);

  const passportSubject = cleanString(
    params.get('passportSubject') ||
      params.get('passport') ||
      params.get('xRonPassport') ||
      '',
  );
  const walletAccount = cleanString(
    params.get('walletAccount') ||
      params.get('wallet') ||
      params.get('account') ||
      '',
  );
  const handle = normalizeHandle(params.get('handle') || params.get('username') || '');
  const starterGrantMinor = normalizePositiveInteger(
    params.get('starterGrantMinor') ||
      params.get('starter') ||
      '',
  );

  if (explicitSession) {
    return Object.freeze({
      ...explicitSession,
      passportSubject: passportSubject || explicitSession.passportSubject,
      walletAccount: walletAccount || explicitSession.walletAccount,
      handle: handle || explicitSession.handle,
      starterGrantMinor: starterGrantMinor || explicitSession.starterGrantMinor || DEFAULT_DEV_STARTER_GRANT_MINOR,
      source: 'url_session',
      active: true,
    });
  }

  if (passportSubject || walletAccount || handle) {
    return Object.freeze({
      id: 'custom-url',
      label: 'Custom URL session',
      role: 'custom',
      passportSubject,
      walletAccount,
      handle,
      usernameStatus: 'local_dev',
      starterGrantMinor: starterGrantMinor || DEFAULT_DEV_STARTER_GRANT_MINOR,
      description: 'Custom URL-provided local dev labels.',
      source: 'url_custom',
      active: true,
    });
  }

  return null;
}

export function applyDevPassportSessionToSettings(settings = {}, locationLike = globalThis.location) {
  const session = getDevPassportSessionFromLocation(locationLike);

  if (!session) {
    return {
      settings: { ...(settings || {}) },
      session: null,
    };
  }

  const next = {
    ...(settings || {}),
    devMode: true,
    passportSubject: session.passportSubject || settings.passportSubject || '',
    walletAccount: session.walletAccount || settings.walletAccount || '',
    handle: session.handle || settings.handle || '',
    username: normalizeUsername(session.handle) || settings.username || '',
    usernameStatus: session.usernameStatus || settings.usernameStatus || 'local_dev',
    profileCrabUrl: session.handle ? `crab://${session.handle}` : settings.profileCrabUrl || '',
  };

  return {
    settings: next,
    session,
  };
}

export function buildDevPassportSessionUrl({
  sessionId = 'creator-a',
  target = 'crab://site',
  lane = 'react',
  extra = {},
} = {}) {
  const safeTarget = normalizeTarget(target);
  const safeSession = getDevPassportSession(sessionId) ? normalizeSessionId(sessionId) : 'creator-a';
  const session = getDevPassportSession(safeSession);
  const params = new URLSearchParams({
    url: safeTarget,
    [DEV_PASSPORT_SESSION_PARAM]: safeSession,
    starterGrantMinor: session?.starterGrantMinor || DEFAULT_DEV_STARTER_GRANT_MINOR,
    ...cleanExtraParams(extra),
  });

  const page = lane === 'legacy' ? 'page.html' : 'react.html';

  if (globalThis.chrome?.runtime?.getURL) {
    return globalThis.chrome.runtime.getURL(`${page}?${params.toString()}`);
  }

  const base = new URL(page, globalThis.location?.href || 'http://127.0.0.1:4173/react.html');
  base.search = params.toString();
  return base.toString();
}

export async function openDevPassportSessionWindow({
  sessionId = 'creator-a',
  target = 'crab://site',
  lane = 'react',
  focused = true,
  width = 1280,
  height = 920,
} = {}) {
  const url = buildDevPassportSessionUrl({ sessionId, target, lane });

  if (globalThis.chrome?.windows?.create) {
    return globalThis.chrome.windows.create({
      url,
      type: 'normal',
      focused,
      width,
      height,
    });
  }

  const opened = globalThis.window?.open?.(
    url,
    `_crablink_${normalizeSessionId(sessionId)}`,
    `popup=yes,width=${Number(width) || 1280},height=${Number(height) || 920},noopener`,
  );

  if (!opened) {
    throw new Error('Browser blocked the CrabLink dev session window.');
  }

  return opened;
}

export function sessionLabel(session = null) {
  if (!session) {
    return 'Stored session';
  }

  const label = cleanString(session.label || session.id || 'Dev session');
  const passport = cleanString(session.passportSubject);
  const wallet = cleanString(session.walletAccount);

  if (passport && wallet) {
    return `${label}: ${passport} / ${wallet}`;
  }

  if (passport) {
    return `${label}: ${passport}`;
  }

  return label;
}

export function sessionTargetFromNavigation(navigation = {}) {
  return normalizeTarget(
    navigation?.route?.normalizedInput ||
      navigation?.route?.rawInput ||
      navigation?.route?.url ||
      navigation?.settings?.lastCrabUrl ||
      'crab://site',
  );
}

function cleanExtraParams(extra = {}) {
  return Object.fromEntries(
    Object.entries(extra || {})
      .map(([key, value]) => [cleanString(key), cleanString(value)])
      .filter(([key, value]) => key && value),
  );
}

function normalizeTarget(value) {
  const raw = cleanString(value);

  if (!raw) {
    return 'crab://site';
  }

  if (raw.startsWith('crab://') || raw.startsWith('b3:')) {
    return raw;
  }

  return `crab://${raw.replace(/^\/+/, '')}`;
}

function normalizePositiveInteger(value) {
  const raw = cleanString(value);

  if (/^[0-9]+$/.test(raw) && raw !== '0') {
    return raw;
  }

  return '';
}

function normalizeSessionId(value) {
  return cleanString(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeHandle(value) {
  const raw = cleanString(value).toLowerCase();
  const withoutAt = raw.replace(/^@+/, '');

  if (!withoutAt) {
    return '';
  }

  return `@${withoutAt.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)}`;
}

function normalizeUsername(value) {
  return normalizeHandle(value).replace(/^@/, '');
}

function cleanString(value) {
  return String(value ?? '').trim();
}