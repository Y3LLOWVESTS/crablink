/**
 * RO:WHAT — Read-only passport summary for the React passport drawer.
 * RO:WHY — Keeps identity/wallet/public-profile display logic explicit, honest, and reusable.
 * RO:INTERACTS — PassportDrawer, appContext settings/storage, gateway identity/wallet DTOs, publicProfileCache.
 * RO:INVARIANTS — local settings are labels/preferences, not backend truth; no fake balance or username confirmation.
 * RO:METRICS — none.
 * RO:CONFIG — passportSubject, walletAccount, handle, usernameStatus, storage backend.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority.
 * RO:TEST — visual drawer smoke across no-passport, HTTP fallback, local labels, and gateway profile claim states.
 */

export default function PassportSummary({ view, identityState, walletState }) {
  return (
    <section className="cl-passport-summary" aria-label="Passport summary">
      <div className="cl-passport-hero-card">
        <div>
          <p className="cl-eyebrow">{view.identityStatusLabel}</p>
          <strong>{view.displayName}</strong>
          <span>{view.subtitle}</span>
        </div>
        <span className={`cl-passport-status-dot cl-passport-status-${view.statusTone}`} />
      </div>

      <div className="cl-passport-stat-grid" aria-label="Passport stats">
        <PassportStat label="Wallet" value={view.walletLabel} />
        <PassportStat label="ROC" value={view.balanceLabel} />
        <PassportStat label="Storage" value={view.storageLabel} />
        <PassportStat label="Gateway" value={view.gatewayLabel} />
      </div>

      <dl className="cl-passport-rows">
        <PassportRow label="Handle" value={view.handle || 'Not confirmed'} />
        <PassportRow label="Requested handle" value={view.requestedHandle || 'None'} />
        <PassportRow label="Passport subject" value={view.passportSubject || 'Not configured'} />
        <PassportRow label="Wallet account" value={view.walletAccount || 'Not configured'} />
        <PassportRow label="Public profile" value={view.publicProfileLabel} />
        <PassportRow label="Profile CID" value={view.publicProfileCid || 'Not published yet'} />
        <PassportRow label="Ledger status" value={view.ledgerStatus} />
        <PassportRow label="Extension origin" value={view.extensionOriginLabel} />
        <PassportRow label="Identity refresh" value={refreshLabel(identityState)} />
        <PassportRow label="Wallet refresh" value={refreshLabel(walletState)} />
        <PassportRow label="Identity source" value={view.identitySourceLabel} />
        <PassportRow label="Wallet source" value={view.walletSourceLabel} />
      </dl>
    </section>
  );
}

function PassportStat({ label, value }) {
  return (
    <div className="cl-passport-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PassportRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function refreshLabel(state) {
  if (!state || state.status === 'idle') {
    return 'Not checked in this drawer';
  }

  if (state.status === 'checking') {
    return 'Checking…';
  }

  if (state.status === 'ok') {
    const route = state.response?.route ? ` via ${state.response.route}` : '';
    return state.checkedAt ? `OK at ${state.checkedAt}${route}` : `OK${route}`;
  }

  if (state.error?.message) {
    const reason = state.error.reason ? ` (${state.error.reason})` : '';
    const status = state.error.status ? ` HTTP ${state.error.status}` : '';
    return `${state.error.message}${reason}${status}`;
  }

  return 'Unavailable';
}

export function buildPassportView({
  settings = {},
  storage = {},
  identity = null,
  wallet = null,
  publicProfile = null,
} = {}) {
  const identityPassport = objectOrEmpty(identity?.passport || identity?.profile || identity?.identity);
  const identityWallet = objectOrEmpty(identity?.wallet);
  const walletBody = objectOrEmpty(wallet?.wallet || wallet?.balance || wallet);
  const profileTruth = normalizePublicProfile(publicProfile);

  const settingsHandle = normalizeHandle(settings.handle);
  const requestedHandle = normalizeHandle(settings.requestedHandle);
  const identityHandle = normalizeHandle(
    firstPresent(
      identityPassport.handle,
      identityPassport.username,
      identity?.handle,
      identity?.username,
      identity?.profile?.handle,
      identity?.profile?.username,
    ),
  );
  const publicHandle = profileTruth.backendConfirmed ? profileTruth.handle : '';

  const identityStatus = normalizeStatus(
    firstPresent(
      profileTruth.usernameStatus,
      identityPassport.username_status,
      identityPassport.usernameStatus,
      identityPassport.status,
      identity?.username_status,
      identity?.usernameStatus,
      identity?.status,
      settings.usernameStatus,
    ),
  );

  const backendIdentityConfirmed = Boolean(identity && (identityStatus === 'confirmed' || identityPassport.confirmed === true));
  const publicProfileConfirmed = Boolean(publicHandle && profileTruth.usernameStatus === 'confirmed');
  const localConfirmed = Boolean(settingsHandle && settings.usernameStatus === 'confirmed');
  const confirmed = publicProfileConfirmed || backendIdentityConfirmed || localConfirmed;

  const handle = confirmed ? publicHandle || identityHandle || settingsHandle : '';
  const passportSubject = String(
    firstPresent(
      profileTruth.passportSubject,
      identityPassport.passport_subject,
      identityPassport.passportSubject,
      identity?.passport_subject,
      identity?.passportSubject,
      settings.passportSubject,
    ) || '',
  ).trim();

  const walletAccount = String(
    firstPresent(
      identityWallet.account,
      identityWallet.wallet_account,
      identityWallet.walletAccount,
      walletBody.account,
      walletBody.wallet_account,
      walletBody.walletAccount,
      settings.walletAccount,
    ) || '',
  ).trim();

  const balanceLabel = formatBalance(firstPresent(
    walletBody.display,
    walletBody.balance_display,
    walletBody.balanceDisplay,
    walletBody.roc_balance,
    walletBody.rocBalance,
    walletBody.available,
    walletBody.available_minor,
    walletBody.availableMinor,
    walletBody.available_minor_units,
    walletBody.availableMinorUnits,
    walletBody.amount_minor,
    walletBody.amountMinor,
    walletBody.amount_minor_units,
    walletBody.amountMinorUnits,
    walletBody.balance_minor,
    walletBody.balanceMinor,
    walletBody.balance_minor_units,
    walletBody.balanceMinorUnits,
    settings.rocBalanceDisplay,
    settings.rocBalanceMinorUnits,
  ));

  const ledgerBacked =
    walletBody.ledger_backed === true ||
    walletBody.ledgerBacked === true ||
    walletBody.source === 'ledger';

  const httpFallback = Boolean(storage.isDevFallback);
  const storageLabel = storage.backend || (httpFallback ? 'fallback' : 'unknown');
  const extensionOriginLabel = storage.isExtensionContext
    ? 'Chrome extension origin'
    : httpFallback
      ? 'HTTP test mode'
      : 'Browser context';

  const displayName = confirmed
    ? handle
    : requestedHandle
      ? `${requestedHandle} draft`
      : passportSubject
        ? passportSubject
        : httpFallback
          ? 'HTTP test mode'
          : 'No passport';

  const identityStatusLabel = confirmed
    ? publicProfileConfirmed
      ? 'Gateway-confirmed public profile'
      : backendIdentityConfirmed
        ? 'Gateway-confirmed identity'
        : 'Confirmed local setting'
    : requestedHandle
      ? 'Local handle draft'
      : passportSubject
        ? 'Configured passport label'
        : httpFallback
          ? 'React HTTP test mode'
          : 'No passport loaded';

  const subtitle = confirmed
    ? publicProfileConfirmed
      ? 'Public @username claim returned by the gateway profile route.'
      : 'Identity display is confirmed by settings or gateway response.'
    : httpFallback
      ? 'React is outside the extension origin and cannot read loaded extension storage.'
      : 'Passport display is local or unavailable until gateway identity/profile is wired.';

  return {
    displayName,
    subtitle,
    identityStatusLabel,
    statusTone: confirmed ? 'ok' : httpFallback ? 'warn' : 'muted',
    handle,
    requestedHandle,
    passportSubject,
    walletAccount,
    walletLabel: walletAccount || 'Not set',
    balanceLabel: balanceLabel || '—',
    ledgerStatus: ledgerBacked ? 'Ledger-backed' : 'Unavailable / display-only',
    publicProfileLabel: publicProfileConfirmed
      ? `${profileTruth.handle} confirmed`
      : profileTruth.handle
        ? `${profileTruth.handle} ${profileTruth.usernameStatus || 'not confirmed'}`
        : 'Not loaded',
    publicProfileCid: profileTruth.publicProfileCid || '',
    profileCrabUrl: profileTruth.profileCrabUrl || (handle ? `crab://${handle}` : ''),
    identitySourceLabel: publicProfileConfirmed
      ? 'Gateway public profile route'
      : backendIdentityConfirmed
        ? 'Gateway response'
        : localConfirmed
          ? 'Local confirmed setting'
          : httpFallback
            ? 'HTTP preview fallback'
            : 'Local label / unavailable',
    walletSourceLabel: walletBody.source || (wallet ? 'Gateway response' : settings.rocBalanceSource ? `${settings.rocBalanceSource} (stored display hint)` : 'No gateway wallet response yet'),
    storageLabel,
    gatewayLabel: settings.gatewayUrl || 'Default local gateway',
    extensionOriginLabel,
  };
}

function normalizePublicProfile(value) {
  const raw = objectOrEmpty(value?.profile || value);

  const username = normalizeUsername(firstPresent(raw.username, raw.handle));
  const handle = normalizeHandle(firstPresent(raw.handle, username));
  const usernameStatus = normalizeStatus(firstPresent(raw.usernameStatus, raw.username_status, raw.status));

  return {
    handle,
    username,
    usernameStatus,
    backendConfirmed: usernameStatus === 'confirmed' && Boolean(handle),
    passportSubject: String(firstPresent(raw.passportSubject, raw.passport_subject) || '').trim(),
    profileCrabUrl: String(firstPresent(raw.profileCrabUrl, raw.profile_crab_url, handle ? `crab://${handle}` : '') || '').trim(),
    publicProfileCid: String(firstPresent(raw.publicProfileCid, raw.public_profile_cid) || '').trim(),
  };
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^crab:\/\/@?/i, '')
    .replace(/^profile\/@?/i, '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

function normalizeHandle(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.startsWith('@')) {
    return raw;
  }

  if (/^[a-z0-9][a-z0-9_.-]{1,62}$/i.test(raw)) {
    return `@${raw}`;
  }

  const username = normalizeUsername(raw);
  return username ? `@${username}` : '';
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
}

function formatBalance(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  if (/^\d+$/.test(raw)) {
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return raw.replace(/\s*ROC$/i, '');
}