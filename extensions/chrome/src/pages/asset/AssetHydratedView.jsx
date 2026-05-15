/**
 * RO:WHAT — Read-only hydrated view for gateway-returned typed asset DTOs.
 * RO:WHY — Gives b3/crab asset pages a useful React UI while preserving backend-truth boundaries.
 * RO:INTERACTS — AssetResolver, gateway asset DTOs, JsonPreview, CopyButton, StatChip.
 * RO:INVARIANTS — display backend-returned fields only; image/text previews are gateway reads; no unsafe HTML; no wallet mutation.
 * RO:METRICS — displays gateway correlation/status fields returned by GatewayClient.
 * RO:CONFIG — gateway base URL through assetClient.
 * RO:SECURITY — no script execution; JSON preview is redacted by shared component.
 * RO:TEST — known-good image asset smoke, .post raw content smoke, malformed/offline gateway smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';

const TEXT_ASSET_KINDS = new Set(['post', 'comment', 'article']);

const TEXT_CONTENT_IDLE = Object.freeze({
  status: 'idle',
  response: null,
  raw: '',
  parsed: null,
  summary: null,
  error: null,
});

export default function AssetHydratedView({ route, result, assetClient, resolverState }) {
  const [imagePreviewOk, setImagePreviewOk] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [failedPreviewSources, setFailedPreviewSources] = useState([]);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [textContent, setTextContent] = useState(TEXT_CONTENT_IDLE);

  const summary = useMemo(() => summarizeAsset(result, route), [result, route]);

  const previewSources = useMemo(() => {
    if (!summary.isImageRoute || !summary.hash || !assetClient?.previewSources) {
      return [];
    }

    try {
      return normalizePreviewSources(assetClient.previewSources(summary.hash, 'image'));
    } catch (_error) {
      return [];
    }
  }, [assetClient, summary.hash, summary.isImageRoute]);

  const previewSource = previewSources[previewIndex] || null;
  const previewUrl = previewSource?.url ? withCacheBuster(previewSource.url, previewRevision) : '';

  useEffect(() => {
    setImagePreviewOk(true);
    setPreviewIndex(0);
    setPreviewRevision((value) => value + 1);
    setFailedPreviewSources([]);
  }, [summary.hash, summary.kind, summary.crabUrl]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!summary.isTextRoute || !summary.cid || !assetClient?.gateway?.request) {
        setTextContent(TEXT_CONTENT_IDLE);
        return;
      }

      setTextContent({
        status: 'loading',
        response: null,
        raw: '',
        parsed: null,
        summary: null,
        error: null,
      });

      try {
        const response = await assetClient.gateway.request(`/o/${encodeURIComponent(summary.cid)}`, {
          label: `${summary.kindLabel || 'Text asset'} content`,
          parseAs: 'text',
          headers: {
            Accept: 'application/json,text/plain,*/*',
          },
        });

        if (!alive) {
          return;
        }

        const raw = String(response?.data || '');
        const parsed = parseTextAssetEnvelope(raw);
        const contentSummary = summarizeTextAssetContent(parsed, raw, summary);

        setTextContent({
          status: 'resolved',
          response,
          raw,
          parsed,
          summary: contentSummary,
          error: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setTextContent({
          status: 'error',
          response: null,
          raw: '',
          parsed: null,
          summary: null,
          error,
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [assetClient, summary.cid, summary.isTextRoute, summary.kindLabel]);

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
      setPreviewRevision((value) => value + 1);
      return;
    }

    setImagePreviewOk(false);
  }

  function reloadPreview() {
    setImagePreviewOk(true);
    setPreviewIndex(0);
    setFailedPreviewSources([]);
    setPreviewRevision((value) => value + 1);
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
          title={summary.title || textContent.summary?.title || `${summary.kindLabel} asset`}
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
              textContent.summary?.bodyPreview ||
              'The gateway returned this typed asset response without a public description field.'}
          </p>

          <div className="asset-status-row">
            <Badge tone="success">resolved</Badge>
            <Badge tone="neutral">source · {result?.source || 'gateway'}</Badge>
            <Badge tone="neutral">HTTP · {summary.status || 'n/a'}</Badge>
            <Badge tone={summary.receiptCount > 0 ? 'success' : 'neutral'}>
              receipts · {summary.receiptCount}
            </Badge>
            {summary.kindWasRouteCorrected && (
              <Badge tone="warning">route kind · {summary.routeKind}</Badge>
            )}
          </div>

          <div className="asset-fact-grid">
            <Fact label="Kind" value={summary.kind} />
            <Fact label="Route kind" value={summary.routeKind || 'n/a'} />
            <Fact label="CID" value={summary.cid} monospace />
            <Fact label="Owner" value={summary.owner || 'Not returned'} />
            <Fact label="Payout" value={summary.payout || 'Not returned'} />
            <Fact label="Manifest" value={summary.manifestCid || 'Not returned'} monospace />
            <Fact label="Correlation" value={summary.correlationId || 'n/a'} monospace />
          </div>

          {summary.kindWasRouteCorrected && (
            <div className="asset-preview-note">
              <strong>Preview kind corrected from route suffix.</strong>
              <span>
                The gateway DTO reported a generic kind, but the canonical URL suffix is .image.
                CrabLink is using the route suffix for preview selection while keeping the DTO fields visible.
              </span>
            </div>
          )}

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
          <StatChip
            label="Receipts"
            value={summary.receiptCount}
            tone={summary.receiptCount > 0 ? 'success' : 'neutral'}
          />
          <StatChip label="Attempts" value={summary.attempts.length} tone="neutral" />
        </aside>
      </section>

      {summary.isTextRoute && (
        <Card
          eyebrow={`${summary.kindLabel} content`}
          title={textContent.summary?.title || 'Text asset content'}
          className="asset-text-content-card"
          actions={
            <div className="asset-copy-actions">
              <CopyButton text={textContent.raw || ''} label="Copy raw content" />
              <CopyButton text={textContent.summary?.body || ''} label="Copy body" />
            </div>
          }
        >
          {textContent.status === 'loading' && (
            <div className="asset-preview-empty">
              <strong>Loading post content…</strong>
              <span>CrabLink is reading the b3-backed content object through the configured gateway.</span>
            </div>
          )}

          {textContent.status === 'error' && (
            <div className="asset-preview-empty">
              <strong>Post content object was not readable from the gateway.</strong>
              <span>
                The asset page resolved, but `/o/{summary.cid}` did not return readable text content.
                The manifest/index pointer exists, but the local dev storage may not have the raw content bytes.
              </span>
              <code>{String(textContent.error?.message || textContent.error || 'unknown error')}</code>
            </div>
          )}

          {textContent.status === 'resolved' && (
            <>
              <div className="asset-fact-grid">
                <Fact label="Content schema" value={textContent.summary?.schema || 'Not returned'} />
                <Fact label="Content kind" value={textContent.summary?.kind || summary.kind} />
                <Fact label="Language" value={textContent.summary?.language || 'Not returned'} />
                <Fact label="Site" value={textContent.summary?.site || 'Not returned'} monospace />
                <Fact label="Parent" value={textContent.summary?.parent || 'Not returned'} monospace />
                <Fact label="HTTP" value={textContent.response?.status || 'n/a'} />
              </div>

              <div className="asset-text-body">
                <span>Title</span>
                <strong>{textContent.summary?.title || 'Untitled'}</strong>
                <span>Body</span>
                <p>{textContent.summary?.body || 'No body returned in the content object.'}</p>
              </div>

              {textContent.summary?.tags?.length > 0 && (
                <div className="asset-tags" aria-label="Post content tags">
                  {textContent.summary.tags.map((tag) => (
                    <Badge key={tag} tone="neutral" uppercase={false}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <TruthBoundary
                tone="success"
                title="Post content truth"
                copy="The title and body above came from the b3-backed raw content object fetched through svc-gateway. CrabLink is not fabricating the post body from local draft state."
              />
            </>
          )}
        </Card>
      )}

      {summary.isImageRoute && (
        <Card
          eyebrow="Preview"
          title="Image preview"
          className="asset-preview-card"
          actions={
            <div className="asset-copy-actions">
              <Button variant="secondary" onClick={reloadPreview} disabled={previewSources.length === 0}>
                Reload preview
              </Button>
              <Button variant="secondary" onClick={openPreviewSource} disabled={!previewSource?.url}>
                Open source
              </Button>
            </div>
          }
        >
          {previewSource && imagePreviewOk ? (
            <div className="asset-image-preview-shell">
              <img
                src={previewUrl}
                alt={summary.title || summary.crabUrl || 'CrabLink image asset'}
                onError={handlePreviewError}
              />
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>Image bytes were not previewable from the gateway.</strong>
              <span>
                The asset hydrated successfully, but the image byte route did not load inside the preview.
                Try Open source, check gateway /o support, or confirm the local dev storage still contains this object.
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
            <div>
              <span>Preview mode</span>
              <strong>gateway raw bytes first</strong>
            </div>
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
            copy="Every field in this panel is derived from the gateway response, the parsed route, or a gateway-read b3 object. Missing fields stay missing instead of being fabricated by CrabLink."
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
                text_content: textContent,
                preview_sources: previewSources,
                failed_preview_sources: failedPreviewSources,
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

  const resultTarget = firstObject(result?.target);
  const routeTarget = firstObject(route?.params);

  const routeKind = cleanKind(
    stringValue(
      routeTarget.assetKind,
      routeTarget.kind,
      kindFromCrabUrl(route?.normalizedInput),
      kindFromCrabUrl(resultTarget.assetUrl),
    ),
  );

  const dtoKind = cleanKind(
    stringValue(
      resultTarget.assetKind,
      resultTarget.kind,
      object.kind,
      asset.kind,
      page.kind,
      data.kind,
      'asset',
    ),
  );

  const kind = chooseDisplayKind({ routeKind, dtoKind });
  const kindWasRouteCorrected = routeKind === 'image' && dtoKind !== 'image';

  const hash = normalizeHash(
    routeTarget.hash ||
      resultTarget.hash ||
      object.hash ||
      asset.hash ||
      data.hash ||
      manifest.hash ||
      routeTarget.cid ||
      resultTarget.cid,
  );

  const cid = stringValue(
    routeTarget.cid,
    resultTarget.cid,
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

  const resolvedHash = hash || normalizeHash(cid);

  return {
    kind,
    dtoKind,
    routeKind,
    kindWasRouteCorrected,
    isImageRoute: kind === 'image' || routeKind === 'image',
    isTextRoute: TEXT_ASSET_KINDS.has(kind) || TEXT_ASSET_KINDS.has(routeKind),
    kindLabel: labelFromKind(kind),
    hash: resolvedHash,
    cid,
    crabUrl: stringValue(
      resultTarget.assetUrl,
      routeTarget.assetUrl,
      route?.normalizedInput,
      data.crab_url,
      data.crabUrl,
      page.crab_url,
      page.crabUrl,
      asset.crab_url,
      asset.crabUrl,
      resolvedHash ? `crab://${resolvedHash}.${kind}` : '',
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
    status: Number(result?.response?.status || result?.status || 0),
    correlationId: stringValue(result?.response?.correlationId, result?.correlationId, ''),
    attempts: Array.isArray(result?.attempts) ? result.attempts : [],
    receiptCount: receipts.length,
  };
}

function summarizeTextAssetContent(parsed, raw, summary) {
  const content = firstObject(parsed);
  const metadata = firstObject(content.metadata);
  const siteConnection = firstObject(content.site_connection, content.siteConnection);
  const parentReference = firstObject(content.parent_reference, content.parentReference);

  const body = stringValue(content.body, content.text, content.content, raw);
  const title = stringValue(content.title, metadata.title, summary.title, 'Untitled post');
  const tags = normalizeTags(metadata.tags || content.tags);
  const site = stringValue(siteConnection.crab_url, siteConnection.crabUrl, content.site_context_crab_url);
  const parent = stringValue(parentReference.crab_url, parentReference.crabUrl, content.parent_crab_url);

  return {
    schema: stringValue(content.schema),
    kind: stringValue(content.asset_kind, content.kind, summary.kind),
    title,
    body,
    bodyPreview: body.length > 220 ? `${body.slice(0, 220)}…` : body,
    language: stringValue(metadata.language, content.language),
    postKind: stringValue(metadata.post_kind, metadata.postKind, content.post_kind),
    site,
    parent,
    tags,
  };
}

function parseTextAssetEnvelope(raw) {
  const text = String(raw || '').trim();

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_error) {
    return {
      schema: 'text/plain',
      kind: 'text',
      title: 'Text asset',
      body: text,
    };
  }
}

function chooseDisplayKind({ routeKind, dtoKind }) {
  if (routeKind && routeKind !== 'asset') {
    return routeKind;
  }

  if (dtoKind && dtoKind !== 'asset') {
    return dtoKind;
  }

  return dtoKind || routeKind || 'asset';
}

function normalizePreviewSources(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source, index) => {
      if (typeof source === 'string') {
        return {
          key: index === 0 ? 'raw-object' : `source-${index + 1}`,
          label: index === 0 ? 'Raw object bytes' : `Gateway preview source ${index + 1}`,
          description: '',
          url: source,
        };
      }

      if (source && typeof source === 'object') {
        return {
          key: stringValue(source.key, `source-${index + 1}`),
          label: stringValue(source.label, `Gateway preview source ${index + 1}`),
          description: stringValue(source.description),
          url: stringValue(source.url, source.href),
        };
      }

      return null;
    })
    .filter((source) => source?.url);
}

function kindFromCrabUrl(value) {
  const match = String(value || '').trim().match(/^crab:\/\/[0-9a-f]{64}\.([a-z][a-z0-9_-]{0,31})$/i);
  return match ? match[1].toLowerCase() : '';
}

function withCacheBuster(url, revision) {
  const safeUrl = String(url || '').trim();

  if (!safeUrl) {
    return '';
  }

  const separator = safeUrl.includes('?') ? '&' : '?';
  return `${safeUrl}${separator}crablink_preview=${encodeURIComponent(String(revision || Date.now()))}`;
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

function cleanKind(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{0,31}$/.test(clean) ? clean : '';
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