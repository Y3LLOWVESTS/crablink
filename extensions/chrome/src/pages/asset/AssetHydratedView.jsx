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

export default function AssetHydratedView({ route, result, assetClient, resolverState }) {
  const [imagePreviewOk, setImagePreviewOk] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [failedPreviewSources, setFailedPreviewSources] = useState([]);
  const [developerOpen, setDeveloperOpen] = useState(false);

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
      <section className="asset-overview-grid">
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
            {summary.description ||
              'The gateway returned this typed asset response without a public description field.'}
          </p>

          <div className="asset-status-row">
            <Badge tone="success">resolved</Badge>
            <Badge tone="neutral">source · {result?.source || 'gateway'}</Badge>
            <Badge tone="neutral">HTTP · {summary.status || 'n/a'}</Badge>
            <Badge tone={summary.receiptCount > 0 ? 'success' : 'neutral'}>
              receipts · {summary.receiptCount}
            </Badge>
          </div>

          <div className="asset-fact-grid">
            <Fact label="Kind" value={summary.kind} />
            <Fact label="CID" value={summary.cid} monospace />
            <Fact label="Owner" value={summary.owner || 'Not returned'} />
            <Fact label="Payout" value={summary.payout || 'Not returned'} />
            <Fact label="Manifest" value={summary.manifestCid || 'Not returned'} monospace />
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

        <aside className="asset-side-panel" aria-label="Asset summary stats">
          <StatChip label="Kind" value={summary.kind} tone="info" />
          <StatChip label="Status" value={summary.status || 'OK'} tone="success" />
          <StatChip label="Receipts" value={summary.receiptCount} tone={summary.receiptCount > 0 ? 'success' : 'neutral'} />
          <StatChip label="Attempts" value={summary.attempts.length} tone="neutral" />
        </aside>
      </section>

      {summary.kind === 'image' && (
        <Card eyebrow="Preview" title="Image preview" className="asset-preview-card">
          {previewSource && imagePreviewOk ? (
            <div className="asset-image-preview-shell">
              <img
                src={previewSource.url}
                alt={summary.title || summary.crabUrl || 'CrabLink image asset'}
                onError={handlePreviewError}
              />
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>Image bytes were not previewable from the gateway.</strong>
              <span>
                The asset may not exist in the current local stack, or the typed route may return JSON instead of raw image bytes.
              </span>
            </div>
          )}

          <div className="asset-preview-source-strip" aria-label="Image preview source">
            <div>
              <span>Current source</span>
              <strong>{previewSource?.label || 'No source'}</strong>
            </div>
            <div>
              <span>Source URL</span>
              <strong>{previewSource?.url || 'n/a'}</strong>
            </div>
            <Button variant="secondary" onClick={openPreviewSource} disabled={!previewSource?.url}>
              Open source
            </Button>
          </div>

          {failedPreviewSources.length > 0 && (
            <div className="asset-preview-fallbacks">
              <strong>Fallbacks attempted</strong>
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

      <section className="asset-detail-grid" aria-label="Asset details">
        <Card eyebrow="Manifest" title="Manifest / DTO summary">
          <div className="asset-policy-list">
            <div>
              <dt>Access policy</dt>
              <dd>{summary.accessPolicy || 'Not returned'}</dd>
            </div>
            <div>
              <dt>Rights policy</dt>
              <dd>{summary.rightsPolicy || 'Not returned'}</dd>
            </div>
            <div>
              <dt>Storage provider</dt>
              <dd>{summary.provider || 'Not returned'}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{summary.version || 'Not returned'}</dd>
            </div>
          </div>

          <TruthBoundary
            tone="info"
            title="Hydration truth"
            copy="Every field in this panel is derived from the gateway response or the parsed route. Missing fields stay missing instead of being fabricated by CrabLink."
          />
        </Card>

        <Card
          eyebrow="Diagnostics"
          title="Gateway attempts"
          actions={
            <Button variant="ghost" onClick={() => setDeveloperOpen((value) => !value)}>
              {developerOpen ? 'Hide JSON' : 'Show JSON'}
            </Button>
          }
        >
          <div className="asset-attempt-list">
            {summary.attempts.length > 0 ? (
              summary.attempts.map((attempt, index) => (
                <div key={`${attempt.route || 'attempt'}-${index}`} className={attempt.ok ? 'is-ok' : 'is-error'}>
                  <span>{attempt.ok ? 'ok' : 'fail'}</span>
                  <strong>{attempt.route || 'unknown route'}</strong>
                  <small>
                    {attempt.status ? `HTTP ${attempt.status}` : attempt.reason || 'no status'}
                    {attempt.correlationId ? ` · ${attempt.correlationId}` : ''}
                  </small>
                </div>
              ))
            ) : (
              <p className="asset-muted">No attempt list was returned by the asset client.</p>
            )}
          </div>

          <div className="asset-resolved-timing">
            <Fact label="Started" value={resolverState?.startedAt || 'n/a'} />
            <Fact label="Finished" value={resolverState?.finishedAt || result?.resolvedAt || 'n/a'} />
          </div>

          {developerOpen && (
            <JsonPreview
              label="Gateway asset response"
              data={{
                route,
                summary,
                result,
              }}
              initiallyOpen
            />
          )}
        </Card>
      </section>
    </section>
  );
}

function Fact({ label, value, monospace = false }) {
  return (
    <div className={monospace ? 'is-mono' : ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function summarizeAsset(result, route) {
  const data = firstObject(result?.data);
  const page = firstObject(data.page, data.asset_page, data.assetPage);
  const object = firstObject(data.object, data.asset, data.content, page.object, page.asset);
  const asset = firstObject(data.asset, page.asset, object.asset);
  const manifest = firstObject(data.manifest, page.manifest, object.manifest, asset.manifest);
  const metadata = firstObject(data.metadata, page.metadata, asset.metadata, manifest.metadata);
  const ownership = firstObject(
    data.ownership,
    page.ownership,
    asset.ownership,
    manifest.ownership,
    object.ownership,
  );
  const payout = firstObject(
    data.payout,
    data.payouts,
    page.payout,
    asset.payout,
    manifest.payout,
    ownership.payout,
  );
  const storage = firstObject(data.storage, page.storage, asset.storage, manifest.storage, object.storage);
  const policy = firstObject(data.policy, page.policy, asset.policy, manifest.policy);
  const receipts = firstArray(data.receipts, page.receipts, asset.receipts, manifest.receipts, object.receipts);

  const target = firstObject(result?.target, route?.params);
  const kind = stringValue(target.assetKind, object.kind, asset.kind, page.kind, data.kind, 'asset').toLowerCase();
  const hash = normalizeHash(target.hash || object.hash || asset.hash || data.hash || manifest.hash);
  const cid = stringValue(
    target.cid,
    object.cid,
    object.content_id,
    object.contentId,
    object.b3,
    asset.cid,
    asset.content_id,
    asset.contentId,
    data.cid,
    data.content_id,
    manifest.content_id,
    manifest.cid,
    hash ? `b3:${hash}` : '',
  );

  return {
    kind,
    kindLabel: labelFromKind(kind),
    hash: hash || normalizeHash(cid),
    cid,
    crabUrl: stringValue(
      target.assetUrl,
      route?.normalizedInput,
      data.crab_url,
      data.crabUrl,
      page.crab_url,
      page.crabUrl,
      asset.crab_url,
      asset.crabUrl,
      hash ? `crab://${hash}.${kind}` : '',
    ),
    title: stringValue(
      metadata.title,
      manifest.title,
      asset.title,
      page.title,
      data.title,
      object.title,
    ),
    description: stringValue(
      metadata.description,
      manifest.description,
      asset.description,
      page.description,
      data.description,
      object.description,
    ),
    owner: stringValue(
      ownership.owner_username,
      ownership.ownerUsername,
      ownership.owner_passport_subject,
      ownership.ownerPassportSubject,
      ownership.owner,
      data.owner,
      asset.owner,
    ),
    payout: stringValue(
      payout.account,
      payout.payout_account,
      payout.payoutAccount,
      ownership.payout_account,
      ownership.payoutAccount,
    ),
    manifestCid: stringValue(
      manifest.cid,
      manifest.manifest_cid,
      manifest.manifestCid,
      data.manifest_cid,
      data.manifestCid,
      page.manifest_cid,
      page.manifestCid,
    ),
    provider: stringValue(
      storage.provider,
      storage.provider_id,
      storage.providerId,
      storage.node,
      storage.storage_provider,
      object.provider,
    ),
    version: stringValue(
      manifest.version,
      manifest.manifest_version,
      manifest.manifestVersion,
      data.version,
      page.version,
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
    .map((item) => item.trim().replace(/^#/, ''))
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