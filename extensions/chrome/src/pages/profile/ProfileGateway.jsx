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
import { labelFromSnake } from './profileDraftModel.js';

export default function ProfileGateway({ app, route, draftState }) {
  const { draft, stats, completeness } = draftState;
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || app?.gatewayUrl || 'http://127.0.0.1:8090';

  return (
    <Card eyebrow="Identity boundary" title="Gateway / passport hints" className="profile-gateway-card">
      <div className="profile-side-stats">
        <StatChip label="Complete" value={`${completeness}%`} help="Local draft completeness" tone="info" />
        <StatChip label="Avatar" value={stats.hasAvatar ? 'image ref' : 'none'} help="crab://<hash>.image reference" tone={stats.hasAvatar ? 'success' : 'neutral'} />
        <StatChip label="Assets" value={stats.hasAssetCatalog ? 'linked' : 'future'} help="Catalogue placeholder" />
        <StatChip label="Sites" value={stats.hasSiteCatalog ? 'linked' : 'future'} help="Catalogue placeholder" />
      </div>

      <div className="profile-gateway-facts">
        <Fact label="Gateway" value={gatewayUrl} />
        <Fact label="Route" value={route?.normalizedInput || 'crab://profile'} />
        <Fact label="Passport label" value={draft.ownerPassport || settings.passportSubject || 'not available'} />
        <Fact label="Wallet label" value={draft.walletAccount || settings.walletAccount || 'not available'} />
        <Fact label="Discovery" value={labelFromSnake(draft.discoveryMode)} />
      </div>

      <div className="profile-gateway-badges">
        <Badge tone="warning">backend profile false</Badge>
        <Badge tone="neutral">username false</Badge>
        <Badge tone="neutral">rep false</Badge>
        <Badge tone="neutral">mod false</Badge>
      </div>

      <p className="profile-panel-note">
        The shell may display gateway and wallet status elsewhere, but this profile page does not
        create wallet authority or local ledger truth.
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