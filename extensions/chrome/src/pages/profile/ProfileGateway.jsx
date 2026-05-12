/**
 * RO:WHAT — Gateway/passport truth panel for crab://profile.
 * RO:WHY — Keeps identity display honest while profile backend routes are incomplete.
 * RO:INTERACTS — ProfilePage, app settings, shell gateway/passport state.
 * RO:INVARIANTS — gateway-only truth; no fake balance; no fake profile publication; no fake username claim.
 * RO:METRICS — none.
 * RO:CONFIG — gateway URL, passport subject, wallet account labels from app settings.
 * RO:SECURITY — no keys, no seed phrases, no direct wallet/ledger/storage/index calls.
 * RO:TEST — manual crab://profile route smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import { getRocDisplay, getUsernameTruth, labelFromSnake } from './profileDraftModel.js';

export default function ProfileGateway({ app, route, draftState }) {
  const { draft, stats, completeness } = draftState;
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || app?.gatewayUrl || 'http://127.0.0.1:8090';
  const usernameTruth = getUsernameTruth(draft, app);
  const rocTruth = getRocDisplay(app);

  return (
    <Card eyebrow="Identity boundary" title="Gateway / passport hints" className="profile-gateway-card">
      <div className="profile-side-stats">
        <StatChip label="Complete" value={`${completeness}%`} help="Local draft completeness" tone="info" size="sm" />
        <StatChip
          label="Username"
          value={usernameTruth.backendConfirmed ? 'confirmed' : 'local'}
          help={usernameTruth.display}
          tone={usernameTruth.backendConfirmed ? 'success' : 'neutral'}
          size="sm"
        />
        <StatChip
          label="ROC"
          value={rocTruth.ledgerBacked ? 'ledger' : 'display'}
          help={rocTruth.display}
          tone={rocTruth.ledgerBacked ? 'success' : 'neutral'}
          size="sm"
        />
        <StatChip
          label="Avatar"
          value={stats.hasAvatar ? 'image ref' : 'none'}
          help="crab://<hash>.image"
          tone={stats.hasAvatar ? 'success' : 'neutral'}
          size="sm"
        />
      </div>

      <div className="profile-gateway-facts">
        <Fact label="Gateway" value={gatewayUrl} />
        <Fact label="Route" value={route?.normalizedInput || 'crab://profile'} />
        <Fact label="Username source" value={usernameTruth.source} />
        <Fact label="Passport label" value={draft.ownerPassport || settings.passportSubject || 'not available'} />
        <Fact label="Wallet label" value={draft.walletAccount || settings.walletAccount || 'not available'} />
        <Fact label="Discovery" value={labelFromSnake(draft.discoveryMode)} />
      </div>

      <div className="profile-gateway-badges">
        <Badge tone="warning">backend profile false</Badge>
        <Badge tone={usernameTruth.backendConfirmed ? 'success' : 'neutral'}>
          username {usernameTruth.backendConfirmed ? 'true' : 'false'}
        </Badge>
        <Badge tone="neutral">REP false</Badge>
        <Badge tone="neutral">MOD false</Badge>
      </div>

      <p className="profile-panel-note">
        The shell may display gateway, passport, and wallet status elsewhere. This profile page
        only mirrors those hints and does not create wallet authority or local ledger truth.
      </p>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}