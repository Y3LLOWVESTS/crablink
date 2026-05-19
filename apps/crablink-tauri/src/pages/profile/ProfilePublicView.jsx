/**
 * RO:WHAT — Read-only public @username profile view for crab://@username and crab://username.profile.
 * RO:WHY — Makes the passport drawer's "Open public handle" action resolve backend-confirmed public profile truth.
 * RO:INTERACTS — ProfilePage, identityClient, publicProfileCache, route parser, PassportActions.
 * RO:INVARIANTS — gateway-only read; no profile edits; no fake profile CID; no fake REP/MOD; no wallet mutation.
 * RO:METRICS — gateway calls inherit x-correlation-id behavior through GatewayClient.
 * RO:CONFIG — uses configured gateway/passport/wallet labels from app context.
 * RO:SECURITY — no private keys, seed phrases, alt mappings, spend authority, or direct internal-service calls.
 * RO:TEST — open crab://@skinnycrabby, confirm profile auto-reads through gateway and drawer cache remains populated.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import {
  createIdentityClient,
  normalizeHandle,
  normalizeProfileUsername,
  normalizePublicProfileResponse,
} from '../../shared/api/identityClient.js';
import {
  readPublicProfileCache,
  writePublicProfileCache,
} from '../../shared/profile/publicProfileCache.js';

const EMPTY_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  profile: null,
  response: null,
  error: null,
  cacheHit: false,
});

export default function ProfilePublicView({ app, route }) {
  const routeHandle = String(route?.params?.handle || '').trim();
  const username = normalizeProfileUsername(routeHandle);
  const displayHandle = normalizeHandle(username);
  const passportSubject = stringValue(
    app?.settings?.passportSubject,
    app?.clients?.gateway?.passportSubject,
    'passport:main:dev',
  );
  const walletAccount = stringValue(
    app?.settings?.walletAccount,
    app?.clients?.gateway?.walletAccount,
    'acct_dev',
  );

  const identityClient = useMemo(() => {
    if (app?.clients?.identity?.getPassportProfile) {
      return app.clients.identity;
    }

    if (app?.clients?.gateway) {
      return createIdentityClient(app.clients.gateway);
    }

    return null;
  }, [app?.clients]);

  const [state, setState] = useState(() => {
    const cached = readMatchingCache(username);

    if (cached?.profile) {
      return {
        ...EMPTY_STATE,
        status: 'cached',
        checkedAt: cached.meta?.cachedAt || '',
        profile: cached.profile,
        response: null,
        error: null,
        cacheHit: true,
      };
    }

    return EMPTY_STATE;
  });

  useEffect(() => {
    let alive = true;

    async function readProfile() {
      if (!username) {
        setState({
          ...EMPTY_STATE,
          status: 'error',
          error: makePublicProfileError(
            'Public profile route requires an @username.',
            'missing_username',
          ),
        });
        return;
      }

      const cached = readMatchingCache(username);

      setState({
        status: cached?.profile ? 'loading_cached' : 'loading',
        checkedAt: cached?.meta?.cachedAt || '',
        profile: cached?.profile || null,
        response: null,
        error: null,
        cacheHit: Boolean(cached?.profile),
      });

      if (!identityClient?.getPassportProfile) {
        setState({
          status: cached?.profile ? 'cached_error' : 'error',
          checkedAt: cached?.meta?.cachedAt || '',
          profile: cached?.profile || null,
          response: null,
          error: makePublicProfileError(
            'Gateway identity client is unavailable.',
            'missing_identity_client',
          ),
          cacheHit: Boolean(cached?.profile),
        });
        return;
      }

      try {
        const response = await identityClient.getPassportProfile(username, {
          passportSubject,
          walletAccount,
          label: `Public profile ${username}`,
        });
        const profile = normalizePublicProfileResponse(response?.data || response?.body || response);

        writePublicProfileCache(profile, {
          action: 'read',
          source: 'svc-gateway public profile route',
          route: response?.route || `/identity/passport/profile/${username}`,
          correlationId: response?.correlationId || response?.response?.correlationId || '',
        });

        if (!alive) {
          return;
        }

        setState({
          status: 'success',
          checkedAt: new Date().toISOString(),
          profile,
          response,
          error: null,
          cacheHit: false,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          status: cached?.profile ? 'cached_error' : 'error',
          checkedAt: cached?.meta?.cachedAt || '',
          profile: cached?.profile || null,
          response: null,
          error,
          cacheHit: Boolean(cached?.profile),
        });
      }
    }

    void readProfile();

    return () => {
      alive = false;
    };
  }, [
    username,
    passportSubject,
    walletAccount,
    identityClient,
    route?.refreshTick,
  ]);

  function openProfileWorkspace() {
    app?.navigate?.('crab://profile');
  }

  function retry() {
    app?.refreshRoute?.();
  }

  if (state.status === 'loading' && !state.profile) {
    return (
      <section className="cl-page profile-page">
        <LoadingState
          title={`Reading ${displayHandle || 'public profile'}`}
          copy="CrabLink is asking the gateway for backend-confirmed public profile truth."
        />
      </section>
    );
  }

  if (state.status === 'error' && !state.profile) {
    return (
      <section className="cl-page profile-page">
        <ErrorPanel
          title="Public profile unavailable"
          copy={`CrabLink could not read ${displayHandle || routeHandle || 'this profile'} through the gateway.`}
          error={state.error}
          actions={
            <div className="profile-gateway-actions">
              <Button variant="secondary" onClick={retry}>
                Retry
              </Button>
              <Button variant="secondary" onClick={openProfileWorkspace}>
                Open profile workspace
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  const profile = state.profile || {};
  const backendConfirmed = profile.backendConfirmed === true || profile.usernameStatus === 'confirmed';
  const handle = profile.handle || displayHandle || '@username';
  const profileCrabUrl = profile.profileCrabUrl || `crab://${handle}`;
  const displayName = profile.displayName || handle;
  const bio = profile.bio || 'This profile has no public bio yet.';
  const initials = initialsFor(displayName || handle);
  const rep = valueOrFallback(profile.reputationScore, 'not computed');
  const mod = valueOrFallback(profile.moderatorScore, 'not computed');
  const avatarImage = profile.avatarImage || '';
  const warningCount = Array.isArray(profile.warnings) ? profile.warnings.length : 0;

  return (
    <section className="cl-page profile-page profile-public-page">
      <section className="profile-hero" aria-label="Public profile hero">
        <div className="profile-hero-card profile-public-hero-card">
          <div className="profile-hero-banner" aria-hidden="true">
            <div className="profile-hero-banner-inner">
              <span>{profileCrabUrl}</span>
              <strong>Gateway-confirmed public profile</strong>
            </div>
          </div>

          <div className="profile-hero-content">
            <div className="profile-avatar profile-avatar-hero profile-public-avatar" aria-label="Public profile avatar">
              {avatarImage ? (
                <div>
                  <span>IMG</span>
                  <small>{avatarImage}</small>
                </div>
              ) : (
                <strong>{initials}</strong>
              )}
            </div>

            <div className="profile-hero-identity">
              <div className="profile-hero-title-row">
                <div>
                  <p className="cl-eyebrow">Public RON profile</p>
                  <h1>{displayName}</h1>
                  <p className="profile-handle">{handle}</p>
                </div>

                <div className="profile-editor-buttons">
                  <Button variant="secondary" onClick={retry}>
                    Refresh
                  </Button>
                  <CopyButton text={profileCrabUrl} label="Copy URL" />
                  <Button variant="secondary" onClick={openProfileWorkspace}>
                    Workspace
                  </Button>
                </div>
              </div>

              <p className="profile-bio">{bio}</p>

              <div className="profile-badges" aria-label="Public profile status badges">
                <Badge tone={backendConfirmed ? 'success' : 'warning'}>
                  username {backendConfirmed ? 'confirmed' : 'not confirmed'}
                </Badge>
                <Badge tone={state.cacheHit ? 'warning' : 'success'}>
                  {state.cacheHit ? 'session cache displayed' : 'gateway read'}
                </Badge>
                <Badge tone={profile.publicProfileCid ? 'success' : 'neutral'}>
                  profile CID {profile.publicProfileCid ? 'published' : 'null'}
                </Badge>
                <Badge tone="neutral">REP {rep}</Badge>
                <Badge tone="neutral">MOD {mod}</Badge>
                {warningCount > 0 && <Badge tone="warning">{warningCount} warning(s)</Badge>}
              </div>
            </div>
          </div>

          <div className="profile-hero-stats" aria-label="Public profile truth stats">
            <HeroStat label="Status" value={profile.usernameStatusLabel || profile.usernameStatus || 'unknown'} />
            <HeroStat label="REP" value={rep} />
            <HeroStat label="MOD" value={mod} />
            <HeroStat label="Profile CID" value={profile.publicProfileCid ? 'published' : 'null'} />
            <HeroStat label="Source" value={state.cacheHit ? 'cache + refresh' : 'gateway'} />
          </div>

          <div className="profile-route-strip" aria-label="Public profile route facts">
            <span>{route?.normalizedInput || profileCrabUrl}</span>
            <span>{profile.passportSubject || 'passport subject unavailable'}</span>
            <span>{profile.passportKind || 'passport kind unavailable'}</span>
            <span>{profile.schema || 'profile schema unavailable'}</span>
            <span>{state.checkedAt ? `checked ${state.checkedAt}` : 'not checked'}</span>
          </div>
        </div>
      </section>

      {state.error && state.profile && (
        <Card eyebrow="Warning" title="Showing cached profile while refresh failed" className="profile-gateway-card">
          <p>
            CrabLink has a cached public profile for this handle, but the latest gateway read failed. The cache is a
            display bridge only; backend ownership remains with svc-passport.
          </p>
          <div className="profile-gateway-error" role="alert">
            <Badge tone="warning">{state.error.reason || state.error.code || 'profile_refresh_error'}</Badge>
            <strong>{state.error.message || String(state.error)}</strong>
          </div>
        </Card>
      )}

      <Card
        eyebrow="Gateway facts"
        title="Public profile truth boundary"
        className="profile-gateway-card"
        actions={<Badge tone={backendConfirmed ? 'success' : 'warning'}>{backendConfirmed ? 'confirmed' : 'unconfirmed'}</Badge>}
      >
        <div className="profile-gateway-facts">
          <Fact label="Handle" value={handle} />
          <Fact label="Username" value={profile.username || normalizeProfileUsername(handle)} />
          <Fact label="Profile crab URL" value={profileCrabUrl} />
          <Fact label="Passport subject" value={profile.passportSubject || 'not returned'} />
          <Fact label="Passport kind" value={profile.passportKind || 'not returned'} />
          <Fact label="Public profile CID" value={profile.publicProfileCid || 'not published yet'} />
          <Fact label="Avatar image" value={avatarImage || 'not set'} />
          <Fact label="Reputation" value={rep} />
          <Fact label="Moderation" value={mod} />
          <Fact label="Gateway route" value={`/identity/passport/profile/${profile.username || username}`} />
          <Fact label="Correlation" value={state.response?.correlationId || state.response?.response?.correlationId || 'not returned'} />
          <Fact label="Checked" value={state.checkedAt || 'not checked'} />
        </div>

        <p className="profile-panel-note">
          This page is read-only. It reads public profile data through the configured svc-gateway route and shares
          backend-confirmed public profile metadata with the passport drawer. It does not edit the profile, create
          a passport, publish a profile CID, mutate a wallet, calculate REP/MOD, or expose private alt mappings.
        </p>

        <JsonPreview
          label="Public profile response"
          data={{
            status: state.status,
            checked_at: state.checkedAt,
            profile,
            response: summarizeResponse(state.response),
            error: serializeError(state.error),
            truth_boundary:
              'username_status=confirmed is backend profile truth; profile CID, REP, and MOD remain null/uncomputed unless backend returns them.',
          }}
          initiallyOpen={false}
        />
      </Card>
    </section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value === null || value === undefined || value === '' ? 'n/a' : String(value)}</strong>
    </div>
  );
}

function readMatchingCache(username) {
  const safeUsername = normalizeProfileUsername(username);
  const envelope = readPublicProfileCache();
  const profile = envelope?.profile || null;

  if (!safeUsername || !profile) {
    return null;
  }

  const cachedUsername = normalizeProfileUsername(profile.username || profile.handle);

  return cachedUsername === safeUsername ? envelope : null;
}

function summarizeResponse(response) {
  if (!response) {
    return null;
  }

  return {
    status: response.status || response.response?.status || 0,
    correlation_id: response.correlationId || response.response?.correlationId || '',
    route: response.route || response.response?.route || '',
    data: response.data || response.body || response,
  };
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    reason: error.reason || error.code || '',
    status: Number(error.status || error.response?.status || 0),
    correlationId: error.correlationId || error.response?.correlationId || '',
  };
}

function makePublicProfileError(message, reason) {
  const error = new Error(message);
  error.reason = reason;
  error.code = reason;
  return error;
}

function initialsFor(value) {
  const parts = String(value || '')
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return 'RO';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join('');
}

function valueOrFallback(value, fallback) {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}