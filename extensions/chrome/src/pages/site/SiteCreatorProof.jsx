/**
 * RO:WHAT — Creator/owner proof panel for local and resolved site views.
 * RO:WHY — Keeps site creator identity, payout, reputation, and moderation claims separated from backend truth.
 * RO:INTERACTS — SitePage, SiteRender, SiteManifestDrawer, resolved gateway site DTOs.
 * RO:INVARIANTS — no fake creator proof; no fake REP/MOD score; no fake payout or wallet receipt.
 * RO:METRICS — none.
 * RO:CONFIG — app settings or resolved site DTO fields.
 * RO:SECURITY — display only; no wallet authority; no identity mutation.
 * RO:TEST — manual crab://site and named site smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import { labelFromSnake } from './siteDraftModel.js';

export default function SiteCreatorProof({ app, draftState = null, resolvedSite = null }) {
  const draft = draftState?.draft || {};
  const summary = resolvedSite?.summary || {};
  const source = resolvedSite ? 'gateway' : 'local draft';

  const ownerPassport =
    summary.ownerPassport ||
    draft.ownerPassport ||
    app?.settings?.passportSubject ||
    'not returned';

  const ownerWallet =
    summary.ownerWallet ||
    draft.ownerWallet ||
    app?.settings?.walletAccount ||
    'not returned';

  const payoutRecipient = summary.payoutRecipient || ownerWallet;
  const siteName = summary.siteName || draft.siteName || 'site draft';
  const receipts = Array.isArray(summary.receipts) ? summary.receipts : [];
  const isGateway = Boolean(resolvedSite);

  return (
    <Card eyebrow="Creator proof" title="Site creator boundary" className="site-creator-card">
      <div className="site-creator-head">
        <div>
          <span>Site</span>
          <strong>{summary.crabUrl || `crab://${siteName}`}</strong>
        </div>

        <Badge tone={isGateway ? 'info' : 'warning'}>{source}</Badge>
      </div>

      <div className="site-creator-stats">
        <StatChip
          label="Owner"
          value={ownerPassport === 'not returned' ? 'unknown' : isGateway ? 'verified field' : 'local hint'}
          help={ownerPassport}
          tone={isGateway && ownerPassport !== 'not returned' ? 'success' : 'neutral'}
        />
        <StatChip
          label="Wallet"
          value={ownerWallet === 'not returned' ? 'unknown' : isGateway ? 'verified field' : 'local hint'}
          help={ownerWallet}
          tone={isGateway && ownerWallet !== 'not returned' ? 'success' : 'neutral'}
        />
        <StatChip label="REP" value="not confirmed" help="Future backend reputation summary" />
        <StatChip label="MOD" value="not confirmed" help="Future moderation summary" />
      </div>

      <div className="site-creator-facts">
        <Fact label="Owner passport" value={ownerPassport} />
        <Fact label="Owner wallet" value={ownerWallet} />
        <Fact label="Payout action" value={labelFromSnake(summary.payoutMode || draft.payoutMode || 'not returned')} />
        <Fact label="Payout recipient" value={payoutRecipient || 'not returned'} />
        <Fact label="Receipts" value={receipts.length ? `${receipts.length} returned` : 'none returned'} />
        <Fact label="Source" value={isGateway ? resolvedSite?.source || 'gateway' : 'local draft'} />
      </div>

      <p className="site-panel-note">
        Creator, payout, reputation, moderation, and receipt fields are only trusted when returned by the gateway.
        Local hints are not backend proof, and this panel never has wallet authority.
      </p>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}