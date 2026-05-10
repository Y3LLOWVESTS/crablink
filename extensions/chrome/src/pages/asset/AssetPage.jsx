/**
 * RO:WHAT — Route-owned React page for typed crab://<hash>.<kind> asset views.
 * RO:WHY — CrabLink refactor; begins protected generic asset parity without touching legacy paid image/site/profile flows.
 * RO:INTERACTS — AssetResolver, AssetHydratedView, assetClient, gatewayClient, shared route components.
 * RO:INVARIANTS — b3 hash is canonical; gateway-only reads; no fake manifests; no fake receipts; no silent ROC spend.
 * RO:METRICS — backend calls carry gateway correlation IDs through GatewayClient.
 * RO:CONFIG — uses configured gateway URL and request timeout.
 * RO:SECURITY — trusted shell UI only; untrusted asset/site content must stay in sandboxed/render-safe surfaces.
 * RO:TEST — npm run build; React HTTP preview for crab://<hash>.image and b3:<hash>.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import AssetResolver from './AssetResolver.jsx';
import './asset.css';

export default function AssetPage({ route, app }) {
  const target = route?.params || {};
  const assetKind = target.assetKind || 'asset';
  const cid = target.cid || (target.hash ? `b3:${target.hash}` : '');

  return (
    <section className="cl-page asset-page">
      <PageHeader
        eyebrow="Typed asset"
        title={`${labelFromKind(assetKind)} Asset`}
        copy="Resolve a canonical b3-backed crab asset through the configured svc-gateway. This page displays backend-returned truth only."
        meta={
          <>
            <Badge tone="info">gateway read</Badge>
            <Badge tone="neutral">kind · {assetKind}</Badge>
            <Badge tone="neutral" uppercase={false}>
              route owner · asset
            </Badge>
          </>
        }
        actions={
          <div className="asset-page-actions">
            <Button variant="secondary" onClick={app?.refreshRoute}>
              Refresh
            </Button>
            <Button variant="ghost" onClick={app?.goHome}>
              Home
            </Button>
          </div>
        }
      />

      <TruthBoundary
        tone="info"
        title="Backend truth boundary"
        copy="A typed asset page can show a CID, manifest, owner, provider, or receipt only when those fields come back from the gateway. It does not create assets, upload bytes, charge ROC, or mutate wallets."
      />

      <section className="asset-route-card" aria-label="Parsed asset route">
        <div>
          <span>Crab URL</span>
          <strong>{route?.normalizedInput || target.assetUrl || 'n/a'}</strong>
        </div>
        <div>
          <span>Content ID</span>
          <strong>{cid || 'n/a'}</strong>
        </div>
        <div>
          <span>Kind</span>
          <strong>{assetKind}</strong>
        </div>
      </section>

      <AssetResolver route={route} app={app} />
    </section>
  );
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}