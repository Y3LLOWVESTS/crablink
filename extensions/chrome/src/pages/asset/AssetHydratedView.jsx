/**
 * RO:WHAT — Read-only hydrated view for gateway-returned typed asset DTOs.
 * RO:WHY — Gives b3/crab asset pages a useful React UI while preserving backend-truth boundaries.
 * RO:INTERACTS — AssetResolver, gateway asset DTOs, JsonPreview, CopyButton, StatChip.
 * RO:INVARIANTS — display backend-returned fields only; image previews are gateway URLs; no unsafe HTML; no wallet mutation.
 * RO:METRICS — displays gateway correlation/status fields returned by GatewayClient.
 * RO:CONFIG — gateway base URL through assetClient.
 * RO:SECURITY — no script execution; JSON preview is redacted by shared component.
 * RO:TEST — known-good image asset smoke plus malformed/offline gateway smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';

export default function AssetHydratedView({ route, result, assetClient }) {
  const [imagePreviewOk, setImagePreviewOk] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [failedPreviewSources, setFailedPreviewSources] = useState([]);

  const summary = useMemo(() => summarizeAsset(result, route), [result, route]);

  const previewSources = useMemo(() => {
    if (summary.kind !== 'image' || !summary.hash || !assetClient?.previewSources) {
      return [];
    }

    try {
      return assetClient.previewSources(summary.hash, summary.kind);
    } catch (_error) {
      return [];
    }
  }, [assetClient, summary.hash, summary.kind]);

  const previewSource = previewSources[previewIndex] || null;

  useEffect(() => {
    setImagePreviewOk(true);
    setPreviewIndex(0);
    setFailedPreviewSources([]);
  }, [summary.hash, summary.kind, summary.crabUrl]);

  function handlePreviewError() {
    const failed = previewSource
      ? {
          key: previewSource.key,
          label: previewSource.label,
          url: previewSource.url,
          failedAt: new Date().toISOString(),
        }
      : null;

    if (failed) {
      setFailedPreviewSources((items) => [...items, failed]);
    }

    if (previewIndex < previewSources.length - 1) {
      setPreviewIndex((value) => value + 1);
      return;
    }

    setImagePreviewOk(false);
  }

  function openPreviewSource() {
    if (!previewSource?.url) {
      return;
    }

    window.open(previewSource.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="asset-hydrated-view">
      <section className="asset-hydrated-grid">
        <Card
          eyebrow="Resolved asset"
          title={summary.title || `${summary.kindLabel} asset`}
          className="asset-summary-card"
          actions={
            <div className="asset-copy-actions">
              <CopyButton text={summary.crabUrl} label="Copy crab URL" />
              <CopyButton text={summary.cid} label="Copy CID" />
            </div>
          }
        >
          <p className="asset-description">
            {summary.description || 'The gateway returned this typed asset response without a public description field.'}
          </p>

          <div className="asset-fact-grid">
            <Fact label="Kind" value={summary.kind} />
            <Fact label="CID" value={summary.cid} monospace />
            <Fact label="Owner" value={summary.owner || 'Not returned'} />
            <Fact label="Payout" value={summary.payout || 'Not returned'} />
            <Fact label="Source" value={result?.source || 'gateway'} />
            <Fact label="Correlation" value={summary.correlationId || 'n/a'} monospace />
          </div>

          {summary.tags.length > 0 && (
            <div className="asset-tags" aria-label="Asset tags">
              {summary.tags.map((tag) => (
                <Badge key={tag} tone="neutral" uppercase={false}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>

        <aside className="asset-side-panel" aria-label="Asset backend status">
          <StatChip
            label="HTTP"
            value={summary.status || 'n/a'}
            help="Gateway response status"
            tone={summary.status >= 200 && summary.status < 300 ? 'success' : 'neutral'}
          />
          <StatChip label="Kind" value={summary.kind} help="Typed crab suffix" tone="info" />
          <StatChip label="Attempts" value={summary.attempts.length} help="Gateway resolve path count" />
          <StatChip
            label="Receipts"
            value={summary.receiptCount}
            help="Backend-returned receipt-like entries"
            tone={summary.receiptCount > 0 ? 'success' : 'neutral'}
          />
        </aside>
      </section>

      {summary.kind === 'image' && (
        <Card
          eyebrow="Preview"
          title={imagePreviewOk && previewSource ? 'Gateway image preview' : 'Image preview unavailable'}
          className="asset-preview-card"
          actions={
            <div className="asset-copy-actions">
              {previewSource?.url && <CopyButton text={previewSource.url} label="Copy preview URL" />}
              {previewSource?.url && (
                <Button variant="secondary" size="sm" onClick={openPreviewSource}>
                  Open raw
                </Button>
              )}
            </div>
          }
        >
          {imagePreviewOk && previewSource ? (
            <>
              <div className="asset-preview-source-strip" aria-label="Preview source">
                <Badge tone="success">trying</Badge>
                <span>{previewSource.label}</span>
                <code>{previewSource.url}</code>
              </div>

              <div className="asset-image-frame">
                <img
                  src={previewSource.url}
                  alt={summary.title || `${summary.kindLabel} preview`}
                  onError={handlePreviewError}
                />
              </div>

              <p>
                React tries the gateway raw object route first, then falls back to the typed b3 route.
                If both routes return JSON or unavailable bytes, the DTO still remains visible below.
              </p>
            </>
          ) : (
            <div className="asset-preview-unavailable">
              <strong>No renderable image bytes were returned to the browser preview.</strong>
              <p>
                The asset page still resolved through the gateway. This usually means the local stack
                returned JSON for the typed route, the raw object route is unavailable, or the current
                dev database no longer contains the bytes for this CID.
              </p>
            </div>
          )}

          {failedPreviewSources.length > 0 && (
            <div className="asset-preview-fallbacks" aria-label="Failed preview sources">
              <strong>Preview fallback history</strong>
              {failedPreviewSources.map((source) => (
                <div key={`${source.key}-${source.failedAt}`}>
                  <span>{source.label}</span>
                  <code>{source.url}</code>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <TruthBoundary
        tone={summary.receiptCount > 0 ? 'success' : 'info'}
        title="What this page proves"
        copy="This page proves only that the configured gateway returned a response for this typed asset route. Any ownership, payout, provider, or receipt facts shown here must be present in that response."
      />

      <section className="asset-detail-grid" aria-label="Asset detail panels">
        <Card eyebrow="Attempts" title="Gateway path">
          <div className="asset-attempt-list">
            {summary.attempts.map((attempt, index) => (
              <div key={`${attempt.route}-${index}`} className={attempt.ok ? 'is-ok' : 'is-error'}>
                <span>{attempt.ok ? 'ok' : 'fail'}</span>
                <strong>{attempt.route}</strong>
                <small>
                  {attempt.status ? `HTTP ${attempt.status}` : attempt.reason || 'no status'}
                  {attempt.correlationId ? ` · ${attempt.correlationId}` : ''}
                </small>
              </div>
            ))}
          </div>
        </Card>

        <Card eyebrow="Policy surface" title="Returned access / rights">
          <dl className="asset-policy-list">
            <div>
              <dt>Access policy</dt>
              <dd>{summary.accessPolicy || 'Not returned'}</dd>
            </div>
            <div>
              <dt>Rights policy</dt>
              <dd>{summary.rightsPolicy || 'Not returned'}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{summary.provider || 'Not returned'}</dd>
            </div>
          </dl>
        </Card>
      </section>

      <Card eyebrow="Developer" title="Hydrated gateway payload">
        <JsonPreview label="Asset response JSON" data={result?.data ?? null} initiallyOpen />
      </Card>

      <Card eyebrow="Developer" title="Route debug">
        <JsonPreview
          label="Asset route debug"
          data={{
            route_kind: route?.kind || '',
            requested_url: route?.rawInput || '',
            normalized_url: route?.normalizedInput || '',
            parsed_at: route?.parsedAt || '',
            page_owner: 'extensions/chrome/src/pages/asset/AssetPage.jsx',
            target: result?.target || null,
            response: result?.response || null,
            preview_sources: previewSources,
            failed_preview_sources: failedPreviewSources,
            attempts: result?.attempts || [],
          }}
        />
      </Card>
    </section>
  );
}

function Fact({ label, value, monospace = false }) {
  return (
    <div className={monospace ? 'is-monospace' : ''}>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function summarizeAsset(result, route) {
  const data = result?.data;
  const object = data && typeof data === 'object' ? data : {};
  const page = firstObject(object.page, object.asset_page, object.view);
  const asset = firstObject(object.asset, object.object, page.asset);
  const manifest = firstObject(
    object.manifest,
    object.asset_manifest,
    object.assetManifest,
    page.manifest,
    asset.manifest,
  );
  const metadata = firstObject(object.metadata, page.metadata, asset.metadata, manifest.metadata);
  const ownership = firstObject(object.ownership, page.ownership, asset.ownership, manifest.ownership);
  const economics = firstObject(
    object.economics,
    page.economics,
    asset.economics,
    manifest.economics,
    object.payout,
    manifest.payout,
  );
  const provider = firstObject(
    object.provider,
    object.storage,
    page.provider,
    page.storage,
    asset.provider,
    asset.storage,
    manifest.provider,
    manifest.storage,
  );
  const policy = firstObject(
    object.policy,
    page.policy,
    asset.policy,
    manifest.policy,
    object.access_policy,
    manifest.access_policy,
  );
  const receipts = firstArray(
    object.receipts,
    page.receipts,
    asset.receipts,
    manifest.receipts,
    object.wallet_receipts,
    object.proofs,
  );

  const target = result?.target || route?.params || {};
  const kind = stringValue(
    object.kind,
    object.asset_kind,
    object.assetKind,
    page.kind,
    page.asset_kind,
    asset.kind,
    asset.asset_kind,
    manifest.kind,
    manifest.asset_kind,
    target.assetKind,
    'asset',
  ).toLowerCase();

  const hash = normalizeHash(
    stringValue(
      object.hash,
      object.b3,
      object.digest,
      object.asset_cid,
      object.assetCid,
      object.cid,
      object.content_id,
      object.contentId,
      page.hash,
      page.asset_cid,
      page.cid,
      asset.hash,
      asset.cid,
      asset.content_id,
      manifest.hash,
      manifest.cid,
      manifest.content_id,
      target.hash,
      '',
    ),
  );

  const cid = stringValue(
    object.cid,
    object.content_id,
    object.contentId,
    object.asset_cid,
    object.assetCid,
    page.cid,
    page.content_id,
    page.asset_cid,
    asset.cid,
    asset.content_id,
    manifest.cid,
    manifest.content_id,
    target.cid,
    hash ? `b3:${hash}` : '',
  );

  return {
    title: stringValue(object.title, page.title, metadata.title, manifest.title, asset.title, ''),
    description: stringValue(
      object.description,
      page.description,
      metadata.description,
      manifest.description,
      asset.description,
      '',
    ),
    kind,
    kindLabel: labelFromKind(kind),
    hash,
    cid,
    crabUrl: stringValue(
      target.assetUrl,
      object.crab_url,
      object.crabUrl,
      page.crab_url,
      page.crabUrl,
      route?.normalizedInput,
      hash ? `crab://${hash}.${kind}` : '',
    ),
    owner: stringValue(
      ownership.owner,
      ownership.passport,
      ownership.owner_passport_subject,
      ownership.ownerPassportSubject,
      object.owner,
      object.owner_passport_subject,
      object.ownerPassportSubject,
      page.owner,
      asset.owner,
      '',
    ),
    payout: stringValue(
      economics.payout,
      economics.payout_account,
      economics.payoutAccount,
      economics.creator_payout_account,
      economics.creatorPayoutAccount,
      object.payout_account,
      object.payoutAccount,
      '',
    ),
    provider: stringValue(
      provider.provider,
      provider.node,
      provider.storage_provider,
      provider.storageProvider,
      object.provider,
      '',
    ),
    accessPolicy: summarizePolicy(policy.access || policy.access_policy || object.access_policy),
    rightsPolicy: summarizePolicy(policy.rights || policy.rights_policy || object.rights_policy),
    tags: normalizeTags(object.tags || page.tags || asset.tags || metadata.tags || manifest.tags),
    status: Number(result?.response?.status || 0),
    correlationId: stringValue(result?.response?.correlationId, ''),
    attempts: Array.isArray(result?.attempts) ? result.attempts : [],
    receiptCount: receipts.length,
  };
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}

function normalizeHash(value) {
  const raw = String(value || '').trim().toLowerCase();
  const withoutPrefix = raw.replace(/^b3:/i, '');
  const match = withoutPrefix.match(/[0-9a-f]{64}/i);

  return match ? match[0].toLowerCase() : '';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 16);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function summarizePolicy(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return stringValue(value.mode, value.type, value.name, value.policy_id, JSON.stringify(value));
  }

  return String(value);
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}