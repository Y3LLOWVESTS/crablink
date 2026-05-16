/**
 * RO:WHAT — Route-owned React page for typed crab://<hash>.<kind> asset views.
 * RO:WHY — CrabLink refactor; keeps generic b3 asset reading polished while preserving gateway-only truth.
 * RO:INTERACTS — AssetResolver, AssetHydratedView, assetClient, gatewayClient, localCatalog.
 * RO:INVARIANTS — b3 hash is canonical; gateway-only reads; no fake manifests; no fake receipts; no silent ROC spend.
 * RO:METRICS — backend calls carry gateway correlation IDs through GatewayClient.
 * RO:CONFIG — uses configured gateway URL and request timeout.
 * RO:SECURITY — trusted shell UI only; untrusted asset/site content must stay in sandboxed/render-safe surfaces.
 * RO:TEST — npm run build; React extension smoke for crab://<hash>.image and b3:<hash>; drawer asset catalog.
 */

import { useEffect } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import AssetResolver from './AssetResolver.jsx';
import './asset.css';

export default function AssetPage({ route, app }) {
  const target = route?.params || {};
  const assetKind = cleanKind(target.assetKind || 'asset');
  const hash = cleanHash(target.hash);
  const cid = cleanCid(target.cid || (hash ? `b3:${hash}` : ''));
  const crabUrl = route?.normalizedInput || target.assetUrl || (hash ? `crab://${hash}.${assetKind}` : '');

  useEffect(() => {
    writeSeenAssetCatalogEntry({
      assetKind,
      hash,
      cid,
      crabUrl,
    });
  }, [assetKind, cid, crabUrl, hash]);

  return (
    <section className="cl-page asset-page">
      <PageHeader
        eyebrow="Typed asset"
        title={`${labelFromKind(assetKind)} Asset`}
        copy="Resolve a canonical b3-backed crab asset through the configured svc-gateway. This page displays gateway-returned truth only."
        meta={
          <>
            <Badge tone="success">gateway read</Badge>
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
        title="Generic asset truth boundary"
        copy="This route can display a CID, manifest, owner, provider, receipt, rendition, or preview only when those fields come back from the gateway. It does not create assets, upload bytes, charge ROC, or mutate wallets."
      />

      <section className="asset-route-hero" aria-label="Parsed asset route">
        <div className="asset-route-main">
          <span>Canonical crab URL</span>
          <strong>{crabUrl || 'n/a'}</strong>
        </div>

        <div className="asset-route-mini-grid">
          <AssetRouteFact label="Content ID" value={cid || 'n/a'} monospace />
          <AssetRouteFact label="Hash" value={hash || 'n/a'} monospace />
          <AssetRouteFact label="Kind" value={assetKind} />
        </div>

        <div className="asset-route-actions">
          <CopyButton text={crabUrl} label="Copy crab URL" />
          <CopyButton text={cid} label="Copy CID" />
        </div>
      </section>

      <AssetResolver route={route} app={app} />
    </section>
  );
}

function AssetRouteFact({ label, value, monospace = false }) {
  return (
    <div className={monospace ? 'is-mono' : ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function writeSeenAssetCatalogEntry({ assetKind, hash, cid, crabUrl }) {
  if (!crabUrl || !cid || !hash) {
    return;
  }

  try {
    writeLocalCatalogEntry({
      schema: 'crablink.local-catalog-entry.v1',
      kind: assetKind,
      crabUrl,
      title: `${labelFromKind(assetKind)} asset`,
      status: 'gateway asset route seen',
      detail: cid,
      source: 'asset_page_route',
      cid,
      hash,
      createdAt: new Date().toISOString(),
      raw: {
        asset_kind: assetKind,
        crab_url: crabUrl,
        cid,
        hash,
        truth_boundary:
          'This is a local seen-asset catalog entry. Backend ownership/public catalog truth must come from gateway-backed routes.',
      },
    });
  } catch (_error) {
    // Local catalog is optional display memory. Asset resolution remains gateway truth.
  }
}

function cleanHash(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? clean : '';
}

function cleanCid(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(clean)) {
    return clean;
  }

  if (/^[0-9a-f]{64}$/.test(clean)) {
    return `b3:${clean}`;
  }

  return '';
}

function cleanKind(value) {
  const clean = String(value || 'asset').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{0,31}$/.test(clean) ? clean : 'asset';
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}