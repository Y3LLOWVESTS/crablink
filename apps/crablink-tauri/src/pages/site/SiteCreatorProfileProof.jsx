/**
 * RO:WHAT — Read-only creator identity proof for gateway-resolved named sites.
 * RO:WHY — NEXT_LEVEL wants site creator @username/REP/MOD surfaces without faking backend site DTO truth.
 * RO:INTERACTS — SiteResolvedProof, publicProfileCache, profile gateway reads, app navigation.
 * RO:INVARIANTS — display-only; no site mutation; no wallet mutation; no fake creator identity; no fake REP/MOD.
 * RO:METRICS — displays response/cache source and profile route where available.
 * RO:CONFIG — uses app settings only as local display hints when they match returned owner labels.
 * RO:SECURITY — no private passport data, private alt mapping, spend authority, or direct internal-service calls.
 * RO:TEST — visit crab://ron7 after profile claim/read, confirm creator resolves to @skinnycrabby when owner passport matches.
 */

import { useMemo } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { readPublicProfileCache } from '../../shared/profile/publicProfileCache.js';

export default function SiteCreatorProfileProof({ app, result, summary }) {
  const identity = useMemo(
    () =>
      resolveSiteCreatorIdentity({
        app,
        result,
        summary,
        cachedProfileEnvelope: readPublicProfileCache(),
      }),
    [app, result, summary],
  );

  function openCreatorProfile() {
    if (!identity.profileRoute || typeof app?.navigate !== 'function') {
      return;
    }

    app.navigate(identity.profileRoute);
  }

  const title = identity.handle
    ? `Site creator: ${identity.handle}`
    : 'Site creator identity';
  const isConfirmed = identity.truthLevel === 'backend_confirmed_profile';
  const hasAnyIdentity =
    Boolean(identity.handle) ||
    Boolean(identity.passportSubject) ||
    Boolean(identity.walletAccount);

  return (
    <Card
      eyebrow="Creator"
      title={title}
      className="site-resolved-card site-creator-profile-proof"
      actions={
        <div className="site-page-actions">
          <Badge tone={isConfirmed ? 'success' : hasAnyIdentity ? 'warning' : 'neutral'}>
            {identity.badge}
          </Badge>
          <Button
            variant="secondary"
            disabled={!identity.profileRoute}
            onClick={openCreatorProfile}
            title={identity.profileRoute || 'No backend-confirmed profile route available'}
          >
            Open profile
          </Button>
          <CopyButton
            text={identity.profileRoute || identity.handle || ''}
            label="Copy profile"
            disabled={!identity.profileRoute && !identity.handle}
          />
        </div>
      }
    >
      <p className="site-panel-note">
        {identity.copy}
      </p>

      <div className="site-resolved-grid">
        <Fact label="Handle" value={identity.handle || 'not returned'} />
        <Fact label="Profile route" value={identity.profileRoute || 'not published yet'} />
        <Fact label="Passport subject" value={identity.passportSubject || 'not returned'} />
        <Fact label="Wallet account" value={identity.walletAccount || 'not returned'} />
        <Fact label="Profile CID" value={identity.publicProfileCid || 'not published yet'} />
        <Fact label="Reputation" value={valueOrFallback(identity.reputationScore, 'not computed')} />
        <Fact label="Moderation" value={valueOrFallback(identity.moderatorScore, 'not computed')} />
        <Fact label="Identity source" value={identity.sourceLabel} />
      </div>

      <div className="site-preview-badges" aria-label="Creator identity badges">
        <Badge tone={isConfirmed ? 'success' : 'warning'}>
          username {isConfirmed ? 'confirmed' : 'not confirmed by site DTO'}
        </Badge>
        <Badge tone={identity.publicProfileCid ? 'success' : 'neutral'}>
          profile CID {identity.publicProfileCid ? 'published' : 'null'}
        </Badge>
        <Badge tone="neutral">
          REP {valueOrFallback(identity.reputationScore, 'not computed')}
        </Badge>
        <Badge tone="neutral">
          MOD {valueOrFallback(identity.moderatorScore, 'not computed')}
        </Badge>
      </div>

      <JsonPreview
        label="Creator identity proof"
        data={{
          resolved_identity: identity,
          site_summary_owner: {
            owner_passport: summary?.ownerPassport || null,
            owner_wallet: summary?.ownerWallet || null,
            payout_recipient: summary?.payoutRecipient || null,
          },
          truth_boundary:
            'Creator @username is trusted only when it came from the site DTO or from a backend-confirmed cached profile whose passport subject matches the site owner passport. REP/MOD remain uncomputed unless backend returns them.',
        }}
      />
    </Card>
  );
}

export function resolveSiteCreatorIdentity({
  app = {},
  result = {},
  summary = {},
  cachedProfileEnvelope = null,
} = {}) {
  const raw = objectValue(result?.data || result?.raw || {});
  const siteObjects = [
    summary,
    raw.summary,
    raw.site,
    raw.creator,
    raw.owner,
    raw.passport,
    raw.public_profile,
    raw.publicProfile,
    raw.manifest,
    raw.manifest?.creator,
    raw.manifest?.owner,
    raw.manifest?.passport,
    raw.manifest?.public_profile,
    raw.manifest?.publicProfile,
  ].map(objectValue);

  const siteDtoHandle = normalizeHandle(
    firstString(
      ...siteObjects.flatMap((item) => [
        item.handle,
        item.username,
        item.creator_handle,
        item.creatorHandle,
        item.creator_username,
        item.creatorUsername,
        item.owner_handle,
        item.ownerHandle,
        item.owner_username,
        item.ownerUsername,
        item.profile_handle,
        item.profileHandle,
      ]),
    ),
  );

  const siteDtoProfileRoute = normalizeProfileRoute(
    firstString(
      ...siteObjects.flatMap((item) => [
        item.profile_crab_url,
        item.profileCrabUrl,
        item.public_profile_url,
        item.publicProfileUrl,
        item.creator_profile_crab_url,
        item.creatorProfileCrabUrl,
        item.owner_profile_crab_url,
        item.ownerProfileCrabUrl,
      ]),
    ),
  );

  const passportSubject = firstString(
    summary.ownerPassport,
    summary.owner_passport,
    summary.passportSubject,
    summary.passport_subject,
    ...siteObjects.flatMap((item) => [
      item.passport_subject,
      item.passportSubject,
      item.owner_passport,
      item.ownerPassport,
      item.creator_passport,
      item.creatorPassport,
      item.subject,
    ]),
  );

  const walletAccount = firstString(
    summary.ownerWallet,
    summary.owner_wallet,
    summary.payoutRecipient,
    summary.payout_recipient,
    ...siteObjects.flatMap((item) => [
      item.wallet_account,
      item.walletAccount,
      item.owner_wallet,
      item.ownerWallet,
      item.creator_wallet,
      item.creatorWallet,
      item.payout_recipient,
      item.payoutRecipient,
    ]),
  );

  const publicProfileCid = firstString(
    ...siteObjects.flatMap((item) => [
      item.public_profile_cid,
      item.publicProfileCid,
      item.profile_cid,
      item.profileCid,
    ]),
  );

  const reputationScore = firstNumber(
    ...siteObjects.flatMap((item) => [
      item.reputation_score,
      item.reputationScore,
      item.reputation?.score,
      item.rep,
      item.rep_score,
      item.repScore,
    ]),
  );

  const moderatorScore = firstNumber(
    ...siteObjects.flatMap((item) => [
      item.moderator_score,
      item.moderatorScore,
      item.moderation_score,
      item.moderationScore,
      item.moderation?.score,
      item.mod,
      item.mod_score,
      item.modScore,
    ]),
  );

  if (siteDtoHandle || siteDtoProfileRoute || publicProfileCid) {
    const handle = siteDtoHandle || handleFromProfileRoute(siteDtoProfileRoute);

    return {
      truthLevel: 'site_dto',
      badge: 'site DTO identity',
      copy:
        'The site response included creator/profile identity fields. CrabLink displays them as backend-provided site DTO data and does not calculate REP/MOD locally.',
      handle,
      username: normalizeUsername(handle),
      profileRoute: siteDtoProfileRoute || routeFromHandle(handle),
      passportSubject,
      walletAccount,
      publicProfileCid,
      reputationScore,
      moderatorScore,
      sourceLabel: 'site DTO / gateway response',
    };
  }

  const cachedProfile = objectValue(cachedProfileEnvelope?.profile || cachedProfileEnvelope);
  const cachedConfirmed =
    cachedProfile.backendConfirmed === true ||
    normalizeStatus(cachedProfile.usernameStatus || cachedProfile.username_status) === 'confirmed';
  const cachedPassport = firstString(cachedProfile.passportSubject, cachedProfile.passport_subject);
  const cachedWallet = firstString(cachedProfile.walletAccount, cachedProfile.wallet_account);
  const cachedHandle = normalizeHandle(firstString(cachedProfile.handle, cachedProfile.username));
  const cachedMatchesOwner =
    cachedConfirmed &&
    Boolean(cachedHandle) &&
    (
      (passportSubject && cachedPassport && sameLabel(passportSubject, cachedPassport)) ||
      (walletAccount && cachedWallet && sameLabel(walletAccount, cachedWallet))
    );

  if (cachedMatchesOwner) {
    return {
      truthLevel: 'backend_confirmed_profile',
      badge: 'profile matched owner',
      copy:
        'The site DTO did not include a creator @username, but the returned owner passport/wallet matches a backend-confirmed public profile already read through the gateway. CrabLink shows that profile as a display bridge, not as a site manifest rewrite.',
      handle: cachedHandle,
      username: normalizeUsername(cachedHandle),
      profileRoute: normalizeProfileRoute(cachedProfile.profileCrabUrl || cachedProfile.profile_crab_url) || routeFromHandle(cachedHandle),
      passportSubject,
      walletAccount,
      publicProfileCid: firstString(cachedProfile.publicProfileCid, cachedProfile.public_profile_cid),
      reputationScore: firstNumber(cachedProfile.reputationScore, cachedProfile.reputation_score),
      moderatorScore: firstNumber(cachedProfile.moderatorScore, cachedProfile.moderator_score),
      sourceLabel: 'cached backend-confirmed profile matched site owner',
    };
  }

  const localHandle = normalizeHandle(
    firstString(
      app?.settings?.handle,
      app?.settings?.requestedHandle,
      app?.settings?.username,
      app?.settings?.requestedUsername,
    ),
  );
  const localPassport = firstString(app?.settings?.passportSubject, app?.clients?.gateway?.passportSubject);
  const localWallet = firstString(app?.settings?.walletAccount, app?.clients?.gateway?.walletAccount);
  const localMatchesOwner =
    Boolean(localHandle) &&
    (
      (passportSubject && localPassport && sameLabel(passportSubject, localPassport)) ||
      (walletAccount && localWallet && sameLabel(walletAccount, localWallet))
    );

  if (localMatchesOwner) {
    return {
      truthLevel: 'local_display_hint',
      badge: 'local display hint',
      copy:
        'The site owner labels match this local browser profile settings, but the site DTO did not publish a creator @username. CrabLink labels this as a local display hint only.',
      handle: localHandle,
      username: normalizeUsername(localHandle),
      profileRoute: routeFromHandle(localHandle),
      passportSubject,
      walletAccount,
      publicProfileCid: '',
      reputationScore: null,
      moderatorScore: null,
      sourceLabel: 'local settings matched site owner labels',
    };
  }

  return {
    truthLevel: 'unconfirmed',
    badge: 'creator not confirmed',
    copy:
      'This resolved site did not include backend-confirmed creator @username/profile fields, and no backend-confirmed cached profile matched the returned owner labels. CrabLink will not invent creator identity.',
    handle: '',
    username: '',
    profileRoute: '',
    passportSubject,
    walletAccount,
    publicProfileCid: '',
    reputationScore,
    moderatorScore,
    sourceLabel: 'owner labels only / no confirmed public profile',
  };
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value === null || value === undefined || value === '' ? 'n/a' : String(value)}</strong>
    </div>
  );
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstString(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^crab:\/\/@?/i, '')
    .replace(/^profile\/@?/i, '')
    .replace(/\.profile$/i, '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

function normalizeHandle(value) {
  const username = normalizeUsername(value);
  return username ? `@${username}` : '';
}

function routeFromHandle(handle) {
  const safeHandle = normalizeHandle(handle);
  return safeHandle ? `crab://${safeHandle}` : '';
}

function handleFromProfileRoute(value) {
  return normalizeHandle(value);
}

function normalizeProfileRoute(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  if (clean.startsWith('crab://@')) {
    return clean;
  }

  if (/^crab:\/\/[a-z0-9][a-z0-9_.-]*\.profile$/i.test(clean)) {
    const name = clean.replace(/^crab:\/\//i, '').replace(/\.profile$/i, '');
    return `crab://@${name}`;
  }

  const handle = normalizeHandle(clean);
  return handle ? `crab://${handle}` : '';
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
}

function sameLabel(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

function valueOrFallback(value, fallback) {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}