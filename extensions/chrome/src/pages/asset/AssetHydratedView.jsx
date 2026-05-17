/**
 * RO:WHAT — Read-only hydrated view for gateway-returned typed asset DTOs.
 * RO:WHY — Gives b3/crab asset pages a useful React UI while preserving backend-truth boundaries.
 * RO:INTERACTS — AssetResolver, gateway asset DTOs, ContentViewAccess, JsonPreview, CopyButton, StatChip.
 * RO:INVARIANTS — display backend-returned fields only; article/post/comment raw content and image preview bytes are gated by paid content_view proof; no unsafe HTML; no direct wallet mutation.
 * RO:METRICS — displays gateway correlation/status fields returned by GatewayClient.
 * RO:CONFIG — gateway base URL through assetClient.
 * RO:SECURITY — no script execution; JSON preview is redacted by shared component.
 * RO:TEST — known-good paid image view smoke, .post/.comment/.article raw content smoke, malformed/offline gateway smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import AssetContentViewAccess from './AssetContentViewAccess.jsx';

const TEXT_ASSET_KINDS = new Set(['post', 'comment', 'article']);
const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image']);

const TEXT_CONTENT_IDLE = Object.freeze({
  status: 'idle',
  response: null,
  raw: '',
  parsed: null,
  summary: null,
  error: null,
});

const KIND_COPY = Object.freeze({
  post: {
    singular: 'Post',
    titleFallback: 'Untitled post',
    loadingTitle: 'Loading post content…',
    errorTitle: 'Post content object was not readable from the gateway.',
    truthTitle: 'Post content truth',
    truthCopy:
      'The title and body above came from the b3-backed raw post content object fetched through svc-gateway after the paid content_view proof unlocked it. CrabLink is not fabricating the post body from local draft state.',
    tagLabel: 'Post content tags',
  },
  comment: {
    singular: 'Comment',
    titleFallback: 'Comment',
    loadingTitle: 'Loading comment content…',
    errorTitle: 'Comment content object was not readable from the gateway.',
    truthTitle: 'Comment content truth',
    truthCopy:
      'The title and body above came from the b3-backed raw comment content object fetched through svc-gateway after the paid content_view proof unlocked it. CrabLink is not fabricating the comment body from local draft state.',
    tagLabel: 'Comment content tags',
  },
  article: {
    singular: 'Article',
    titleFallback: 'Untitled article',
    loadingTitle: 'Loading article content…',
    errorTitle: 'Article content object was not readable from the gateway.',
    truthTitle: 'Article content truth',
    truthCopy:
      'The title and body above came from the b3-backed raw article content object fetched through svc-gateway after the paid content_view proof unlocked it. CrabLink is not fabricating the article body from local draft state.',
    tagLabel: 'Article content tags',
  },
  asset: {
    singular: 'Text asset',
    titleFallback: 'Text asset',
    loadingTitle: 'Loading text asset content…',
    errorTitle: 'Text asset content object was not readable from the gateway.',
    truthTitle: 'Text asset content truth',
    truthCopy:
      'The title and body above came from the b3-backed raw content object fetched through svc-gateway. CrabLink is not fabricating the content from local draft state.',
    tagLabel: 'Text asset tags',
  },
});

export default function AssetHydratedView({ route, app, result, assetClient, resolverState }) {
  const [imagePreviewOk, setImagePreviewOk] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [failedPreviewSources, setFailedPreviewSources] = useState([]);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [textContent, setTextContent] = useState(TEXT_CONTENT_IDLE);
  const [contentViewAccess, setContentViewAccess] = useState({
    requiresPayment: false,
    canView: true,
    status: 'free',
    quote: null,
    payment: null,
    receipt: null,
    error: null,
  });

  const summary = useMemo(() => summarizeAsset(result, route), [result, route]);
  const copy = copyForKind(summary.kind);
  const requiresPaidContentView = PAID_CONTENT_VIEW_KINDS.has(summary.kind);
  const canReadTextContent = summary.isTextRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewImage = summary.isImageRoute && (!requiresPaidContentView || contentViewAccess.canView);

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
    setContentViewAccess({
      requiresPayment: requiresPaidContentView,
      canView: !requiresPaidContentView,
      status: requiresPaidContentView ? 'idle' : 'free',
      quote: null,
      payment: null,
      receipt: null,
      error: null,
    });
  }, [requiresPaidContentView, summary.crabUrl, summary.hash, summary.kind]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!canReadTextContent || !summary.cid || !assetClient?.gateway?.request) {
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
          label: `${copy.singular} content`,
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
  }, [assetClient, canReadTextContent, copy.singular, summary.cid, summary.kind]);

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
    if (!canPreviewImage || !previewSource?.url) {
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

          <div className="asset-fact-grid">
            <Fact label="Canonical crab URL" value={summary.crabUrl || 'Not returned'} monospace />
            <Fact label="Content ID" value={summary.cid || 'Not returned'} monospace />
            <Fact label="Hash" value={summary.hash || 'Not returned'} monospace />
            <Fact label="Asset kind" value={summary.kind || 'Not returned'} />
            <Fact label="Manifest CID" value={summary.manifestCid || 'Not returned'} monospace />
            <Fact label="Owner" value={summary.owner || 'Not returned'} />
            <Fact label="Payout" value={summary.payout || 'Not returned'} />
            <Fact label="Correlation" value={summary.correlationId || 'Not returned'} monospace />
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
          <StatChip
            label="Receipts"
            value={summary.receiptCount}
            tone={summary.receiptCount > 0 ? 'success' : 'neutral'}
          />
          <StatChip label="Attempts" value={summary.attempts.length} tone="neutral" />
        </aside>
      </section>

      {requiresPaidContentView && (
        <AssetContentViewAccess
          app={app}
          summary={summary}
          onAccessChange={setContentViewAccess}
        />
      )}

      {canReadTextContent && (
        <Card
          eyebrow={`${summary.kindLabel} content`}
          title={textContent.summary?.title || copy.titleFallback}
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
              <strong>{copy.loadingTitle}</strong>
              <span>CrabLink is reading the b3-backed content object through the configured gateway.</span>
            </div>
          )}

          {textContent.status === 'error' && (
            <div className="asset-preview-empty">
              <strong>{copy.errorTitle}</strong>
              <span>
                The asset page resolved, but <code>/o/{summary.cid}</code> did not return readable text content.
                The manifest/index pointer may exist while the local dev storage no longer has the raw content bytes.
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
                <Fact label="Thread" value={textContent.summary?.thread || 'Not returned'} monospace />
                <Fact label="HTTP" value={textContent.response?.status || 'n/a'} />
              </div>

              {textContent.summary?.summary && (
                <div className="asset-text-body">
                  <span>Summary</span>
                  <p>{textContent.summary.summary}</p>
                </div>
              )}

              <div className="asset-text-body">
                <span>Title</span>
                <strong>{textContent.summary?.title || copy.titleFallback}</strong>
                <span>Body</span>
                <p>{textContent.summary?.body || 'No body returned in the content object.'}</p>
              </div>

              {textContent.summary?.heroImage && (
                <div className="asset-text-body">
                  <span>Hero image</span>
                  <p>{textContent.summary.heroImage}</p>
                </div>
              )}

              {textContent.summary?.tags?.length > 0 && (
                <div className="asset-tags" aria-label={copy.tagLabel}>
                  {textContent.summary.tags.map((tag) => (
                    <Badge key={tag} tone="neutral" uppercase={false}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <TruthBoundary tone="success" title={copy.truthTitle} copy={copy.truthCopy} />
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
              <Button variant="secondary" onClick={reloadPreview} disabled={!canPreviewImage || previewSources.length === 0}>
                Reload preview
              </Button>
              <Button variant="secondary" onClick={openPreviewSource} disabled={!canPreviewImage || !previewSource?.url}>
                Open source
              </Button>
            </div>
          }
        >
          {canPreviewImage && previewSource && imagePreviewOk ? (
            <div className="asset-image-preview-shell">
              <img
                src={previewUrl}
                alt={summary.title || summary.crabUrl || 'CrabLink image asset'}
                onError={handlePreviewError}
              />
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>{canPreviewImage ? 'Image bytes were not previewable from the gateway.' : 'Image preview is locked until paid.'}</strong>
              <span>
                {canPreviewImage
                  ? 'The asset hydrated successfully, but the image byte route did not load inside the preview. Try Open source, check gateway /o support, or confirm the local dev storage still contains this object.'
                  : 'The image asset metadata is visible, but CrabLink will not fetch or render image bytes until the backend returns a paid content_view receipt.'}
              </span>
            </div>
          )}

          <div className="asset-preview-source-strip" aria-label="Image preview source">
            <div>
              <span>Current source</span>
              <strong>{canPreviewImage ? previewSource?.label || 'No source' : 'Locked'}</strong>
            </div>
            <div>
              <span>Source URL</span>
              <strong>{canPreviewImage ? previewSource?.url || 'n/a' : 'Hidden until paid'}</strong>
            </div>
            <div>
              <span>Preview mode</span>
              <strong>{canPreviewImage ? 'gateway raw bytes first' : 'paid view gate'}</strong>
            </div>
          </div>

          {canPreviewImage && failedPreviewSources.length > 0 && (
            <details className="asset-preview-fallbacks">
              <summary>Failed preview attempts</summary>
              {failedPreviewSources.map((source, index) => (
                <div key={`${source.key}:${index}`}>
                  <span>{source.label}</span>
                  <strong>{source.url}</strong>
                </div>
              ))}
            </details>
          )}
        </Card>
      )}

      <section className="asset-detail-grid" aria-label="Asset details">
        <Card eyebrow="Storage" title="Storage availability">
          <div className="asset-fact-grid">
            <Fact label="Available" value={summary.storageAvailable || 'Not returned'} />
            <Fact label="Size" value={summary.sizeBytes || 'Not returned'} />
            <Fact label="Content type" value={summary.contentType || 'Not returned'} />
            <Fact label="Provider" value={summary.providerRef || 'Not returned'} />
            <Fact label="Raw URL" value={summary.isImageRoute && !canPreviewImage ? 'Hidden until paid image_view receipt' : summary.rawUrl || 'Not returned'} monospace />
          </div>
        </Card>

        <Card eyebrow="Receipts" title="Receipt references">
          {summary.receipts.length > 0 ? (
            <div className="asset-attempt-list">
              {summary.receipts.map((receipt, index) => (
                <div key={`${receipt.kind || 'receipt'}:${receipt.txid || receipt.receipt_hash || index}`}>
                  <span>{labelFromKind(receipt.kind || receipt.receipt_kind || 'receipt')}</span>
                  <strong>{receipt.receipt_hash || receipt.receiptHash || receipt.txid || 'receipt returned'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="asset-description">No receipt references were returned for this asset page.</p>
          )}
        </Card>

        <Card eyebrow="Resolve diagnostics" title="Gateway attempts">
          {summary.attempts.length > 0 ? (
            <div className="asset-attempt-list">
              {summary.attempts.map((attempt, index) => (
                <div key={`${attempt.route || attempt.path || 'attempt'}:${index}`}>
                  <span>{attempt.ok ? 'ok' : 'failed'}</span>
                  <strong>{attempt.route || attempt.path || attempt.url || 'unknown route'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="asset-description">No attempt diagnostics were returned.</p>
          )}
        </Card>
      </section>

      <details className="asset-dev-json" open={developerOpen} onToggle={(event) => setDeveloperOpen(event.currentTarget.open)}>
        <summary>Developer asset JSON</summary>
        <JsonPreview
          label="Asset hydration result"
          data={{
            route,
            resolver_state: resolverState || null,
            summary,
            result,
            content_view_access: contentViewAccess,
            text_content: {
              status: textContent.status,
              response_status: textContent.response?.status || null,
              parsed: textContent.parsed,
              summary: textContent.summary,
              error: serializeError(textContent.error),
            },
            preview: {
              preview_sources: canPreviewImage ? previewSources : [],
              current_preview_source: canPreviewImage ? previewSource : null,
              failed_preview_sources: canPreviewImage ? failedPreviewSources : [],
              image_preview_locked: summary.isImageRoute && !canPreviewImage,
            },
            truth_boundary:
              'This page is read-only. Gateway, storage, index, wallet, and ledger remain backend-owned truth.',
          }}
          initiallyOpen
        />
      </details>
    </section>
  );
}

function Fact({ label, value, monospace = false }) {
  const clean = value === null || value === undefined || value === '' ? 'n/a' : String(value);

  return (
    <div className="asset-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean}
      </strong>
    </div>
  );
}

function summarizeAsset(result, route) {
  const data = result?.data || result?.body || result?.response?.data || result || {};
  const target = result?.target || route?.params || {};
  const manifest = data.manifest || data.asset_manifest || data.assetManifest || {};
  const storage = data.storage || data.storage_availability || data.storageAvailability || {};
  const owner = data.owner || data.asset_owner || manifest.owner || {};
  const payout = data.payout || data.payout_target || manifest.payout || {};
  const receipts = safeArray(data.receipts || data.receipt_refs || data.receiptRefs || data.wallet_receipts);
  const attempts = safeArray(result?.attempts || data.attempts || result?.resolveAttempts);

  const kind = cleanKind(
    data.asset_kind ||
      data.assetKind ||
      data.kind ||
      manifest.asset_kind ||
      manifest.assetKind ||
      target.assetKind ||
      target.kind,
  );

  const hash = normalizeHash(
    data.raw_hash_hex ||
      data.hash ||
      data.asset_hash ||
      data.assetHash ||
      data.asset_cid ||
      data.assetCid ||
      data.cid ||
      data.content_id ||
      target.hash ||
      target.cid,
  );

  const cid = cleanCid(
    data.asset_cid ||
      data.assetCid ||
      data.cid ||
      data.content_id ||
      data.contentId ||
      target.cid ||
      (hash ? `b3:${hash}` : ''),
  );

  const crabUrl = stringValue(
    data.canonical_crab,
    data.canonicalCrab,
    data.crab_url,
    data.crabUrl,
    data.asset_url,
    data.assetUrl,
    target.assetUrl,
    route?.normalizedInput,
    hash && kind ? `crab://${hash}.${kind}` : '',
  );

  const manifestCid = cleanCid(
    data.manifest_cid ||
      data.manifestCid ||
      manifest.cid ||
      manifest.content_id ||
      manifest.contentId ||
      data.asset_manifest_cid ||
      data.assetManifestCid,
  );

  const title = stringValue(data.title, manifest.title, data.name, manifest.name);
  const description = stringValue(data.description, manifest.description, data.summary, manifest.summary);

  return {
    kind,
    kindLabel: labelFromKind(kind || 'asset'),
    isImageRoute: kind === 'image',
    isTextRoute: TEXT_ASSET_KINDS.has(kind),
    hash,
    cid,
    crabUrl,
    manifestCid,
    title,
    description,
    status: stringValue(data.status, result?.status, result?.response?.status, 'OK'),
    correlationId: stringValue(data.correlation_id, data.correlationId, result?.correlationId, result?.response?.correlationId),
    owner: summarizeParty(owner),
    payout: summarizeParty(payout),
    tags: normalizeTags(data.tags || manifest.tags || data.metadata?.tags),
    receipts,
    receiptCount: Number(receipts.length || data.receipt_count || data.receiptCount || 0),
    attempts,
    storageAvailable: boolOrText(storage.available ?? data.storage_available ?? data.storageAvailable),
    sizeBytes: stringValue(storage.size_bytes, storage.sizeBytes, data.size_bytes, data.sizeBytes),
    contentType: stringValue(storage.content_type, storage.contentType, data.content_type, data.contentType),
    providerRef: stringValue(storage.provider_ref, storage.providerRef, data.provider_ref, data.providerRef),
    rawUrl: stringValue(storage.raw_url, storage.rawUrl, data.raw_url, data.rawUrl),
    raw: data,
  };
}

function parseTextAssetEnvelope(raw) {
  const text = String(raw || '').trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_error) {
    return {
      schema: 'text/plain',
      body: text,
    };
  }
}

function summarizeTextAssetContent(parsed, raw, routeSummary) {
  const data = parsed && typeof parsed === 'object' ? parsed : {};
  const kind = cleanKind(data.kind || data.asset_kind || data.assetKind || routeSummary.kind || 'asset');
  const copy = copyForKind(kind);

  const title = stringValue(
    data.title,
    data.metadata?.title,
    data.content?.title,
    kind === 'comment' ? copy.titleFallback : '',
  );

  const body = stringValue(
    data.body,
    data.markdown,
    data.text,
    data.content?.body,
    data.content?.markdown,
    data.content?.text,
    typeof parsed === 'string' ? parsed : '',
  );

  const summary = stringValue(data.summary, data.excerpt, data.content?.summary, data.content?.excerpt);
  const language = stringValue(data.language, data.lang, data.metadata?.language);
  const site = stringValue(
    data.site_context_crab_url,
    data.siteContextCrabUrl,
    data.site,
    data.relations?.site,
    data.site_connection?.crab_url,
    data.siteConnection?.crabUrl,
  );
  const parent = stringValue(
    data.parent_crab_url,
    data.parentCrabUrl,
    data.thread_context_crab_url,
    data.threadContextCrabUrl,
    data.parent,
    data.relations?.parent,
    data.parent_reference?.crab_url,
    data.parentReference?.crabUrl,
  );
  const thread = stringValue(
    data.thread_context_crab_url,
    data.threadContextCrabUrl,
    data.thread,
    data.relations?.thread,
  );
  const heroImage = stringValue(
    data.hero_image_crab_url,
    data.heroImageCrabUrl,
    data.linked_assets?.hero_image,
    data.linkedAssets?.heroImage,
    data.cover_image,
    data.coverImage,
  );

  return {
    schema: stringValue(data.schema, data.type, 'Not returned'),
    kind,
    title: title || copy.titleFallback,
    body,
    bodyPreview: body ? truncate(body, 180) : truncate(String(raw || ''), 180),
    summary,
    language,
    site,
    parent,
    thread,
    heroImage,
    tags: normalizeTags(data.tags || data.metadata?.tags),
  };
}

function normalizePreviewSources(sources) {
  return safeArray(sources)
    .map((item, index) => {
      const url = typeof item === 'string' ? item : item?.url;

      if (!url) {
        return null;
      }

      return {
        key: `${index}:${url}`,
        label: index === 0 ? 'Gateway raw object' : index === 1 ? 'Typed b3 route' : `Preview source ${index + 1}`,
        url,
      };
    })
    .filter(Boolean);
}

function withCacheBuster(url, revision) {
  if (!url) {
    return '';
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}crablink_preview_rev=${encodeURIComponent(String(revision || 0))}`;
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    status: Number(error.status || error.response?.status || 0),
    reason: error.reason || error.code || '',
    correlationId: error.correlationId || error.response?.correlationId || '',
    route: error.route || error.response?.route || '',
    data: error.data || null,
  };
}

function summarizeParty(value) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return stringValue(
      value.display,
      value.display_name,
      value.displayName,
      value.username,
      value.passport_subject,
      value.passportSubject,
      value.wallet_account,
      value.walletAccount,
      value.account,
      value.address,
      value.target,
      value.kind,
    );
  }

  return String(value);
}

function copyForKind(kind) {
  return KIND_COPY[cleanKind(kind)] || KIND_COPY.asset;
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

function boolOrText(value) {
  if (value === true) {
    return 'yes';
  }

  if (value === false) {
    return 'no';
  }

  return stringValue(value);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function truncate(value, maxLength) {
  const clean = String(value || '').trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 1)}…`;
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}