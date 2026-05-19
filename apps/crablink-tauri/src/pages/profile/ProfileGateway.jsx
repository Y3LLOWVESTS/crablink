/**
 * RO:WHAT — Gateway/passport truth panel for crab://profile.
 * RO:WHY — Lets CrabLink claim/read backend-confirmed public @username profiles through svc-gateway only.
 * RO:INTERACTS — ProfilePage, identityClient, app settings, shell gateway/passport/wallet state, publicProfileCache.
 * RO:INVARIANTS — gateway-only truth; no fake balance; no fake profile publication; no fake username claim; no fake rep/mod scores.
 * RO:METRICS — identity calls inherit gateway x-correlation-id behavior.
 * RO:CONFIG — gateway URL, passport subject, wallet account labels from app settings.
 * RO:SECURITY — no keys, no seed phrases, no direct wallet/ledger/storage/index/omnigate/svc-passport calls.
 * RO:TEST — manual crab://profile route smoke; gateway profile claim/read smoke; passport drawer profile-cache smoke.
 */

import { useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { writePublicProfileCache } from '../../shared/profile/publicProfileCache.js';
import {
  createIdentityClient,
  normalizeHandle,
  normalizeProfileUsername,
  normalizePublicProfileResponse,
} from '../../shared/api/identityClient.js';
import {
  getRocTruth,
  getUsernameTruth,
  labelFromSnake,
} from './profileDraftModel.js';

const EMPTY_PROFILE_STATE = Object.freeze({
  status: 'idle',
  checkedAt: '',
  action: '',
  profile: null,
  response: null,
  error: null,
});

export default function ProfileGateway({ app, route, draftState }) {
  const { draft, stats, completeness } = draftState;
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || app?.gatewayUrl || 'http://127.0.0.1:8090';
  const usernameTruth = getUsernameTruth(draft, app);
  const rocTruth = getRocTruth(app);

  const initialHandle = normalizeHandle(
    usernameTruth.display ||
      settings.handle ||
      settings.username ||
      settings.requestedHandle ||
      settings.requestedUsername ||
      draft.handle ||
      draft.username ||
      '',
  );

  const [profileState, setProfileState] = useState(EMPTY_PROFILE_STATE);
  const [requestedHandle, setRequestedHandle] = useState(initialHandle);
  const [displayName, setDisplayName] = useState(
    stringValue(draft.displayName, draft.display_name, settings.displayName, ''),
  );
  const [bio, setBio] = useState(stringValue(draft.bio, settings.bio, ''));
  const [avatarImage, setAvatarImage] = useState(
    stringValue(draft.avatarImage, draft.avatar_image, draft.avatarUrl, settings.avatarImage, ''),
  );

  const identityClient = useMemo(() => {
    if (app?.identityClient?.ready || app?.identityClient?.gateway) {
      return app.identityClient;
    }

    if (app?.clients?.identity?.ready || app?.clients?.identity?.gateway) {
      return app.clients.identity;
    }

    if (app?.gateway) {
      return createIdentityClient(app.gateway);
    }

    if (app?.clients?.gateway) {
      return createIdentityClient(app.clients.gateway);
    }

    return null;
  }, [app]);

  const backendProfile = profileState.profile;
  const hasBackendProfile = Boolean(backendProfile);
  const backendConfirmed = backendProfile?.backendConfirmed === true;
  const lookupUsername = normalizeProfileUsername(requestedHandle);
  const passportSubject = stringValue(
    draft.ownerPassport,
    settings.passportSubject,
    app?.gateway?.passportSubject,
    app?.clients?.gateway?.passportSubject,
    'passport:main:dev',
  );
  const walletAccount = stringValue(
    draft.walletAccount,
    settings.walletAccount,
    app?.gateway?.walletAccount,
    app?.clients?.gateway?.walletAccount,
    'acct_dev',
  );

  const usernameDisplay = backendProfile?.handle || normalizeHandle(requestedHandle) || usernameTruth.display || 'not available';
  const usernameStatus = backendProfile?.usernameStatus || usernameTruth.status || 'backend_unknown';
  const usernameSource = backendProfile
    ? 'svc-gateway public profile route'
    : usernameTruth.source || 'local draft/display hint';
  const busy = profileState.status === 'loading';

  async function readProfile() {
    if (busy) {
      return;
    }

    if (!identityClient?.getPassportProfile) {
      setProfileState(errorState('read', 'Gateway identity client is unavailable.', 'missing_identity_client'));
      return;
    }

    if (!lookupUsername) {
      setProfileState(errorState('read', 'Enter an @username before reading backend profile truth.', 'missing_username'));
      return;
    }

    setProfileState({
      ...EMPTY_PROFILE_STATE,
      status: 'loading',
      action: 'read',
    });

    try {
      const response = await identityClient.getPassportProfile(lookupUsername, {
        passportSubject,
        walletAccount,
      });
      const profile = normalizePublicProfileResponse(response?.data || response?.body || response);

      writePublicProfileCache(profile, {
        action: 'read',
        source: 'svc-gateway public profile route',
        route: response?.route || `/identity/passport/profile/${lookupUsername}`,
        correlationId: response?.correlationId || response?.response?.correlationId || '',
      });

      setProfileState({
        status: 'success',
        checkedAt: new Date().toISOString(),
        action: 'read',
        profile,
        response,
        error: null,
      });
    } catch (error) {
      setProfileState(errorState('read', profileErrorMessage(error), reasonFromError(error), error));
    }
  }

  async function claimProfile() {
    if (busy) {
      return;
    }

    if (!identityClient?.claimPassportProfile) {
      setProfileState(errorState('claim', 'Gateway identity client is unavailable.', 'missing_identity_client'));
      return;
    }

    if (!lookupUsername) {
      setProfileState(errorState('claim', 'Enter an @username before claiming backend profile truth.', 'missing_username'));
      return;
    }

    setProfileState({
      ...EMPTY_PROFILE_STATE,
      status: 'loading',
      action: 'claim',
    });

    try {
      const response = await identityClient.claimPassportProfile(
        {
          passport_subject: passportSubject,
          wallet_account: walletAccount,
          requested_username: normalizeHandle(lookupUsername),
          display_name: displayName,
          bio,
          avatar_image: avatarImage,
        },
        {
          confirmed: true,
        },
      );
      const profile = normalizePublicProfileResponse(response?.data || response?.body || response);

      writePublicProfileCache(profile, {
        action: 'claim',
        source: 'svc-gateway public profile route',
        route: response?.route || '/identity/passport/profile/claim',
        correlationId: response?.correlationId || response?.response?.correlationId || '',
      });

      setProfileState({
        status: 'success',
        checkedAt: new Date().toISOString(),
        action: 'claim',
        profile,
        response,
        error: null,
      });
    } catch (error) {
      setProfileState(errorState('claim', profileErrorMessage(error), reasonFromError(error), error));
    }
  }

  function clearProfileState() {
    setProfileState(EMPTY_PROFILE_STATE);
  }

  return (
    <Card
      eyebrow="Identity boundary"
      title="Gateway public profile"
      className="profile-gateway-card"
      actions={
        <div className="profile-gateway-badges">
          <Badge tone={backendConfirmed ? 'success' : 'warning'}>
            profile backend {backendConfirmed ? 'confirmed' : 'not confirmed'}
          </Badge>
          <Badge tone={rocTruth.ledgerBacked ? 'success' : 'neutral'}>
            ROC {rocTruth.ledgerBacked ? 'ledger-backed' : 'display hint'}
          </Badge>
        </div>
      }
    >
      <div className="profile-side-stats">
        <StatChip label="Complete" value={`${completeness}%`} help="Local draft completeness" tone="info" />
        <StatChip
          label="Username"
          value={backendConfirmed ? 'confirmed' : usernameStatus}
          help={usernameSource}
          tone={backendConfirmed ? 'success' : usernameTruth.tone || 'neutral'}
        />
        <StatChip
          label="ROC"
          value={rocTruth.ledgerBacked ? rocTruth.display : 'display only'}
          help={rocTruth.source}
          tone={rocTruth.ledgerBacked ? 'success' : 'neutral'}
        />
        <StatChip
          label="Avatar"
          value={stats.hasAvatar || avatarImage ? 'image ref' : 'none'}
          help="crab://<hash>.image reference"
          tone={stats.hasAvatar || avatarImage ? 'success' : 'neutral'}
        />
      </div>

      <div className="profile-gateway-profile-box">
        <div>
          <span>Current backend profile</span>
          <strong>{usernameDisplay}</strong>
          <small>
            {backendConfirmed
              ? `Backend returned username_status=confirmed. Profile route: ${backendProfile.profileCrabUrl || `crab://${usernameDisplay}`}.`
              : 'Only backend response with username_status=confirmed is treated as ownership proof.'}
          </small>
        </div>
      </div>

      <div className="profile-gateway-form" aria-label="Public profile claim and read form">
        <label>
          <span>@username</span>
          <TextInput
            value={requestedHandle}
            onChange={(event) => setRequestedHandle(normalizeHandle(event.target.value))}
            placeholder="@skinnycrabby"
            maxLength={33}
          />
        </label>

        <label>
          <span>Display name</span>
          <TextInput
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Skinny Crabby"
            maxLength={96}
          />
        </label>

        <label>
          <span>Avatar image</span>
          <TextInput
            value={avatarImage}
            onChange={(event) => setAvatarImage(event.target.value)}
            placeholder="crab://<64hex>.image"
          />
        </label>

        <label className="profile-gateway-form-wide">
          <span>Bio</span>
          <TextArea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Short public profile bio"
            rows={3}
            maxLength={1024}
          />
        </label>
      </div>

      <div className="profile-gateway-actions">
        <Button variant="secondary" onClick={readProfile} disabled={busy || !lookupUsername}>
          {busy && profileState.action === 'read' ? 'Reading…' : 'Read Existing @username'}
        </Button>
        <Button variant="primary" onClick={claimProfile} disabled={busy || !lookupUsername}>
          {busy && profileState.action === 'claim' ? 'Claiming…' : 'Claim / Confirm @username'}
        </Button>
        {profileState.status !== 'idle' && (
          <Button variant="secondary" onClick={clearProfileState} disabled={busy}>
            Clear
          </Button>
        )}
      </div>

      {profileState.status === 'success' && backendProfile && (
        <div className="profile-gateway-success" role="status">
          <Badge tone={backendConfirmed ? 'success' : 'warning'}>
            {backendProfile.usernameStatusLabel}
          </Badge>
          <strong>{backendProfile.handle || 'profile returned'}</strong>
          <span>
            {backendConfirmed
              ? 'Backend-confirmed public profile truth returned through svc-gateway and shared with the passport drawer.'
              : 'Profile returned, but ownership is not confirmed unless username_status is confirmed.'}
          </span>
        </div>
      )}

      {profileState.error && (
        <div className="profile-gateway-error" role="alert">
          <Badge tone="warning">{profileState.error.reason || 'profile_error'}</Badge>
          <strong>{profileState.error.message}</strong>
          <span>{errorHint(profileState.error.reason)}</span>
        </div>
      )}

      <div className="profile-gateway-facts">
        <Fact label="Gateway" value={gatewayUrl} />
        <Fact label="Route" value={route?.normalizedInput || 'crab://profile'} />
        <Fact label="HTTP claim route" value="POST /identity/passport/profile/claim" />
        <Fact label="HTTP read route" value={lookupUsername ? `GET /identity/passport/profile/${lookupUsername}` : 'GET /identity/passport/profile/:username'} />
        <Fact label="Passport label" value={passportSubject} />
        <Fact label="Wallet label" value={walletAccount} />
        <Fact label="Username syntax" value={usernameTruth.validation?.message || (lookupUsername ? 'normalized' : 'not checked')} />
        <Fact label="Profile crab URL" value={backendProfile?.profileCrabUrl || (lookupUsername ? `crab://@${lookupUsername}` : 'not available')} />
        <Fact label="Public profile CID" value={backendProfile?.publicProfileCid || 'not published yet'} />
        <Fact label="Reputation" value={backendProfile?.reputationScore === null ? 'not computed' : backendProfile?.reputationScore} />
        <Fact label="Moderation" value={backendProfile?.moderatorScore === null ? 'not computed' : backendProfile?.moderatorScore} />
        <Fact label="ROC source" value={rocTruth.source} />
        <Fact label="Discovery" value={labelFromSnake(draft.discoveryMode)} />
      </div>

      <div className="profile-gateway-badges">
        <Badge tone={backendConfirmed ? 'success' : 'warning'}>
          username backend {backendConfirmed ? 'true' : 'false'}
        </Badge>
        <Badge tone={backendProfile?.publicProfileCid ? 'success' : 'neutral'}>
          profile CID {backendProfile?.publicProfileCid ? 'published' : 'null'}
        </Badge>
        <Badge tone="neutral">
          rep {backendProfile?.reputationScore === null || backendProfile?.reputationScore === undefined ? 'not computed' : backendProfile.reputationScore}
        </Badge>
        <Badge tone="neutral">
          mod {backendProfile?.moderatorScore === null || backendProfile?.moderatorScore === undefined ? 'not computed' : backendProfile.moderatorScore}
        </Badge>
      </div>

      <p className="profile-panel-note">
        This panel calls only the configured svc-gateway profile routes. It does not call svc-passport,
        omnigate, svc-wallet, ron-ledger, svc-storage, or svc-index directly. Cached or local profile
        fields are display hints only; backend confirmation requires username_status="confirmed".
      </p>

      {profileState.status !== 'idle' && (
        <JsonPreview
          label="Public profile gateway response"
          data={{
            status: profileState.status,
            checked_at: profileState.checkedAt,
            action: profileState.action,
            profile: profileState.profile,
            error: profileState.error,
            response: summarizeResponse(profileState.response),
          }}
          initiallyOpen={profileState.status === 'success'}
        />
      )}
    </Card>
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

function errorState(action, message, reason, source = null) {
  return {
    status: 'error',
    checkedAt: new Date().toISOString(),
    action,
    profile: null,
    response: null,
    error: {
      message,
      reason,
      status: Number(source?.status || source?.response?.status || 0),
      code: source?.code || source?.reason || reason,
      retryable: Boolean(source?.retryable),
      raw: source?.data || source?.body || null,
    },
  };
}

function profileErrorMessage(error) {
  const reason = reasonFromError(error);
  const status = Number(error?.status || error?.response?.status || 0);

  if (reason === 'reserved_username') {
    return 'That username is reserved by RustyOnions. Try another one.';
  }

  if (reason === 'username_unavailable') {
    return 'That username is already taken. Try another one.';
  }

  if (reason === 'profile_not_found') {
    return 'No public profile found for this username yet.';
  }

  if (reason === 'upstream_unavailable' || reason === 'passport_upstream' || status === 502) {
    return 'Profile service is temporarily unavailable. Check that the RustyOnions dev stack is running.';
  }

  return error?.message || 'Public profile request failed.';
}

function errorHint(reason) {
  switch (reason) {
    case 'reserved_username':
      return 'Reserved handles include protocol names like site, wallet, image, profile, post, comment, and b3.';
    case 'username_unavailable':
      return 'The backend rejected the claim because another passport already owns that username.';
    case 'profile_not_found':
      return 'You can claim this username if it belongs to the current main passport.';
    case 'upstream_unavailable':
    case 'passport_upstream':
      return 'Start svc-passport, omnigate, and svc-gateway, then retry through the gateway route.';
    default:
      return 'CrabLink did not mark this profile as confirmed.';
  }
}

function reasonFromError(error) {
  return String(
    error?.reason ||
      error?.code ||
      error?.data?.reason ||
      error?.data?.code ||
      error?.body?.reason ||
      error?.body?.code ||
      '',
  ).trim();
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

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}