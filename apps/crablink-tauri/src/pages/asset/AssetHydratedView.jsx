/**
 * RO:WHAT — Read-only hydrated view for gateway-returned typed asset DTOs.
 * RO:WHY — Gives b3/crab asset pages a useful React UI while preserving backend-truth boundaries.
 * RO:INTERACTS — AssetResolver, gateway asset DTOs, ContentViewAccess, JsonPreview, CopyButton, StatChip.
 * RO:INVARIANTS — display backend-returned fields only; article/post/comment raw content and image/video/stream preview bytes are gated by paid content_view proof; no unsafe HTML; no direct wallet mutation.
 * RO:METRICS — displays gateway correlation/status fields returned by GatewayClient.
 * RO:CONFIG — gateway base URL through assetClient.
 * RO:SECURITY — no script execution; JSON preview is redacted by shared component.
 * RO:TEST — known-good paid image/video/stream view smoke, .post/.comment/.article raw content smoke, malformed/offline gateway smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import AssetContentViewAccess from './AssetContentViewAccess.jsx';
import StreamPaidSegmentViewer from './StreamPaidSegmentViewer.jsx';

const TEXT_ASSET_KINDS = new Set(['post', 'comment', 'article']);
const MEDIA_PREVIEW_KINDS = new Set(['image', 'video']);
const PAID_CONTENT_VIEW_KINDS = new Set(['article', 'post', 'comment', 'image', 'video', 'stream']);
const MAX_VIDEO_BLOB_PREVIEW_BYTES = 12 * 1024 * 1024;

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
  const [videoObjectUrl, setVideoObjectUrl] = useState('');
  const videoObjectUrlRef = useRef('');
  const [videoFetchState, setVideoFetchState] = useState({
    status: 'idle',
    source: null,
    attempts: [],
    error: null,
  });
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
  const contentFetchCid = summary.contentCid || summary.cid;
  const canReadTextContent = summary.isTextRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewImage = summary.isImageRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewVideo = summary.isVideoRoute && (!requiresPaidContentView || contentViewAccess.canView);
  const canPreviewMedia = summary.isMediaPreviewRoute && (!requiresPaidContentView || contentViewAccess.canView);

  const previewSources = useMemo(() => {
    if (!summary.isMediaPreviewRoute || !summary.hash || !assetClient?.previewSources) {
      return [];
    }

    try {
      return normalizePreviewSources(
        [
          summary.rawUrl,
          ...assetClient.previewSources(summary.hash, summary.kind),
        ],
        assetClient?.gateway,
      );
    } catch (_error) {
      return [];
    }
  }, [assetClient, summary.hash, summary.isMediaPreviewRoute, summary.kind, summary.rawUrl]);

  const previewSource = previewSources[previewIndex] || null;
  const previewUrl = previewSource?.url ? withCacheBuster(previewSource.url, previewRevision) : '';
  const videoPlaybackUrl = videoObjectUrl || previewUrl;

  useEffect(() => {
    setImagePreviewOk(true);
    setPreviewIndex(0);
    setPreviewRevision((value) => value + 1);
    setFailedPreviewSources([]);
    setVideoFetchState({
      status: 'idle',
      source: null,
      attempts: [],
      error: null,
    });
    setOwnedVideoObjectUrl('');
  }, [summary.hash, summary.kind, summary.crabUrl]);

  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
        videoObjectUrlRef.current = '';
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!canPreviewVideo || !summary.hash || !assetClient?.gateway?.request) {
        setVideoFetchState({
          status: 'idle',
          source: null,
          attempts: [],
          error: null,
        });
        setOwnedVideoObjectUrl('');
        return;
      }

      const routes = videoBlobRoutes(summary);

      if (routes.length === 0) {
        setVideoFetchState({
          status: 'error',
          source: null,
          attempts: [],
          error: new Error('No gateway video byte route was available.'),
        });
        setOwnedVideoObjectUrl('');
        return;
      }

      setVideoFetchState({
        status: 'loading',
        source: null,
        attempts: [],
        error: null,
      });

      const attempts = [];

      for (const routeCandidate of routes) {
        try {
          const response = await assetClient.gateway.request(routeCandidate.route, {
            label: 'Video playback bytes',
            parseAs: 'blob',
            headers: {
              Accept: videoAcceptHeader(summary.contentType),
            },
          });

          const blob = await normalizeVideoBlobResponse(response?.data, summary.contentType);

          if (blob.size > MAX_VIDEO_BLOB_PREVIEW_BYTES) {
            throw new Error(
              `Video-lite playback blob exceeded ${formatBytes(MAX_VIDEO_BLOB_PREVIEW_BYTES)}. Future range/segment playback is required.`,
            );
          }

          const objectUrl = URL.createObjectURL(blob);

          attempts.push({
            route: routeCandidate.route,
            label: routeCandidate.label,
            status: response?.status || 0,
            ok: true,
            bytes: blob.size,
            contentType: blob.type || summary.contentType || '',
          });

          if (!alive) {
            URL.revokeObjectURL(objectUrl);
            return;
          }

          setOwnedVideoObjectUrl(objectUrl);
          setVideoFetchState({
            status: 'ready',
            source: {
              route: routeCandidate.route,
              label: routeCandidate.label,
              status: response?.status || 0,
              bytes: blob.size,
              contentType: blob.type || summary.contentType || '',
              correlationId: response?.correlationId || '',
            },
            attempts,
            error: null,
          });
          return;
        } catch (error) {
          attempts.push({
            route: routeCandidate.route,
            label: routeCandidate.label,
            ok: false,
            error: serializeError(error),
          });
        }
      }

      if (!alive) {
        return;
      }

      setOwnedVideoObjectUrl('');
      setVideoFetchState({
        status: 'error',
        source: null,
        attempts,
        error: attempts[attempts.length - 1]?.error || new Error('Video byte fetch failed.'),
      });
    }

    void run();

    return () => {
      alive = false;
    };
  }, [
    assetClient,
    canPreviewVideo,
    summary.cid,
    summary.contentType,
    summary.hash,
    summary.kind,
    summary.rawUrl,
  ]);

  function setOwnedVideoObjectUrl(nextUrl) {
    const previous = videoObjectUrlRef.current;

    if (previous && previous !== nextUrl) {
      URL.revokeObjectURL(previous);
    }

    videoObjectUrlRef.current = nextUrl || '';
    setVideoObjectUrl(nextUrl || '');
  }

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
      if (!canReadTextContent || !contentFetchCid || !assetClient?.gateway?.request) {
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
        const response = await assetClient.gateway.request(`/o/${encodeURIComponent(contentFetchCid)}`, {
          label: `${copy.singular} content`,
          parseAs: 'text',
          headers: {
            Accept: 'application/json,text/plain,*/*',
          },
        });

        if (!alive) {
          return;
        }

        const normalized = normalizeTextAssetResponse(response?.data, summary.kind);
        const contentSummary = summarizeTextAssetContent(normalized.parsed, normalized.rawText, summary);

        setTextContent({
          status: 'resolved',
          response,
          raw: normalized.rawText,
          parsed: normalized.parsed,
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
  }, [assetClient, canReadTextContent, contentFetchCid, copy.singular, summary.kind]);

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
    if (!canPreviewMedia || !previewSource?.url) {
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
            <Fact label="Content object CID" value={contentFetchCid || 'Not returned'} monospace />
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

      {summary.kind === 'stream' && (
        <StreamPaidSegmentViewer
          app={app}
          assetClient={assetClient}
          summary={summary}
          contentViewAccess={contentViewAccess}
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
                The asset page resolved, but <code>/o/{contentFetchCid}</code> did not return readable text content.
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

      {summary.isVideoRoute && (
        <Card
          eyebrow="Playback"
          title="Video playback"
          className="asset-preview-card"
          actions={
            <div className="asset-copy-actions">
              <Button variant="secondary" onClick={reloadPreview} disabled={!canPreviewVideo || previewSources.length === 0}>
                Reload video
              </Button>
              <Button variant="secondary" onClick={openPreviewSource} disabled={!canPreviewVideo || !previewSource?.url}>
                Open source
              </Button>
            </div>
          }
        >
          {canPreviewVideo && videoPlaybackUrl && imagePreviewOk ? (
            <div className="asset-video-preview-shell">
              <video
                src={videoPlaybackUrl}
                controls
                preload="metadata"
                playsInline
                onError={handlePreviewError}
              >
                Your browser/WebView cannot play this gateway video asset.
              </video>
            </div>
          ) : (
            <div className="asset-preview-empty">
              <strong>{canPreviewVideo ? 'Video bytes were not previewable from the gateway.' : 'Video playback is locked until paid.'}</strong>
              <span>
                {canPreviewVideo
                  ? 'The asset hydrated successfully, but the video byte route did not load inside the player. Try Open source, check gateway /o support, or confirm the local dev storage still contains this object.'
                  : 'The video asset metadata is visible, but CrabLink will not fetch or play video bytes until the backend returns a paid content_view receipt.'}
              </span>
            </div>
          )}

          <div className="asset-preview-source-strip" aria-label="Video preview source">
            <div>
              <span>Current source</span>
              <strong>{canPreviewVideo ? videoFetchState.source?.label || previewSource?.label || 'No source' : 'Locked'}</strong>
            </div>
            <div>
              <span>Source URL</span>
              <strong>{canPreviewVideo ? videoFetchState.source?.route || previewSource?.url || 'n/a' : 'Hidden until paid'}</strong>
            </div>
            <div>
              <span>Preview mode</span>
              <strong>{canPreviewVideo ? videoModeLabel(videoFetchState.status) : 'paid view gate'}</strong>
            </div>
          </div>

          {canPreviewVideo && videoFetchState.status !== 'idle' && (
            <details className="asset-preview-fallbacks">
              <summary>Video byte fetch diagnostics</summary>
              <div>
                <span>Status</span>
                <strong>{videoFetchState.status}</strong>
              </div>
              {videoFetchState.source && (
                <div>
                  <span>Blob source</span>
                  <strong>
                    {videoFetchState.source.route} · {formatBytes(videoFetchState.source.bytes)} ·{' '}
                    {videoFetchState.source.contentType || 'unknown type'}
                  </strong>
                </div>
              )}
              {videoFetchState.attempts.map((attempt, index) => (
                <div key={`${attempt.route}:${index}`}>
                  <span>{attempt.label || `Attempt ${index + 1}`}</span>
                  <strong>
                    {attempt.ok
                      ? `${attempt.route} · ${formatBytes(attempt.bytes)} · ${attempt.contentType || 'unknown type'}`
                      : `${attempt.route} · ${attempt.error?.message || 'failed'}`}
                  </strong>
                </div>
              ))}
            </details>
          )}

          {canPreviewVideo && failedPreviewSources.length > 0 && (
            <details className="asset-preview-fallbacks">
              <summary>Failed direct player attempts</summary>
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
            <Fact label="Raw URL" value={summary.isMediaPreviewRoute && !canPreviewMedia ? 'Hidden until paid content_view receipt' : summary.rawUrl || 'Not returned'} monospace />
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
            content_fetch_cid: contentFetchCid,
            text_content: {
              status: textContent.status,
              response_status: textContent.response?.status || null,
              parsed: textContent.parsed,
              summary: textContent.summary,
              error: serializeError(textContent.error),
            },
            preview: {
              preview_sources: canPreviewMedia ? previewSources : [],
              current_preview_source: canPreviewMedia ? previewSource : null,
              failed_preview_sources: canPreviewMedia ? failedPreviewSources : [],
              image_preview_locked: summary.isImageRoute && !canPreviewImage,
              video_preview_locked: summary.isVideoRoute && !canPreviewVideo,
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
  const metadata = objectValue(data.metadata || manifest.metadata);
  const storage = objectValue(
    data.storage ||
      data.storage_availability ||
      data.storageAvailability ||
      manifest.storage ||
      metadata.storage,
  );
  const links = objectValue(data.links || manifest.links || storage.links);
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
      manifest.asset_cid ||
      manifest.assetCid ||
      storage.asset_cid ||
      storage.assetCid ||
      data.cid ||
      data.content_id ||
      target.hash ||
      target.cid,
  );

  const cid = cleanCid(
    data.asset_cid ||
      data.assetCid ||
      manifest.asset_cid ||
      manifest.assetCid ||
      storage.asset_cid ||
      storage.assetCid ||
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

  const contentObject = objectValue(data.content || data.asset_content || data.assetContent || data.text_content || data.textContent);
  const contentCid = cleanCid(
    data.content_cid ||
      data.contentCid ||
      data.text_cid ||
      data.textCid ||
      data.body_cid ||
      data.bodyCid ||
      data.object_cid ||
      data.objectCid ||
      data.raw_object_cid ||
      data.rawObjectCid ||
      data.raw_content_cid ||
      data.rawContentCid ||
      data.content_object_cid ||
      data.contentObjectCid ||
      contentObject.cid ||
      contentObject.content_id ||
      contentObject.contentId ||
      contentObject.asset_cid ||
      contentObject.assetCid ||
      manifest.content_cid ||
      manifest.contentCid ||
      manifest.object_cid ||
      manifest.objectCid ||
      manifest.raw_object_cid ||
      manifest.rawObjectCid ||
      storage.content_cid ||
      storage.contentCid ||
      storage.object_cid ||
      storage.objectCid,
  );

  const title = stringValue(data.title, manifest.title, metadata.title, data.name, manifest.name);
  const description = stringValue(
    data.description,
    manifest.description,
    metadata.description,
    data.summary,
    manifest.summary,
  );

  return {
    kind,
    kindLabel: labelFromKind(kind || 'asset'),
    isImageRoute: kind === 'image',
    isVideoRoute: kind === 'video',
    isMediaPreviewRoute: MEDIA_PREVIEW_KINDS.has(kind),
    isTextRoute: TEXT_ASSET_KINDS.has(kind),
    hash,
    cid,
    contentCid,
    crabUrl,
    manifestCid,
    title,
    description,
    status: stringValue(data.status, result?.status, result?.response?.status, 'OK'),
    correlationId: stringValue(data.correlation_id, data.correlationId, result?.correlationId, result?.response?.correlationId),
    owner: summarizeParty(owner),
    payout: summarizeParty(payout),
    tags: normalizeTags(data.tags || manifest.tags || metadata.tags),
    receipts,
    receiptCount: Number(receipts.length || data.receipt_count || data.receiptCount || 0),
    attempts,
    storageAvailable: boolOrText(storage.available ?? data.storage_available ?? data.storageAvailable),
    sizeBytes: stringValue(storage.size_bytes, storage.sizeBytes, data.size_bytes, data.sizeBytes),
    contentType: stringValue(
      storage.content_type,
      storage.contentType,
      metadata.content_type,
      metadata.contentType,
      data.content_type,
      data.contentType,
    ),
    providerRef: stringValue(storage.provider_ref, storage.providerRef, data.provider_ref, data.providerRef),
    rawUrl: stringValue(storage.raw_url, storage.rawUrl, links.raw, links.source, data.raw_url, data.rawUrl),
    raw: data,
  };
}

function normalizeTextAssetResponse(data, fallbackKind = 'asset') {
  if (typeof data === 'string') {
    const rawText = data.trim();
    const parsed = parseTextAssetEnvelope(rawText, fallbackKind);

    return {
      raw: rawText,
      rawText,
      parsed,
    };
  }

  const object = objectValue(data);

  if (!Object.keys(object).length) {
    return {
      raw: '',
      rawText: '',
      parsed: parseTextAssetEnvelope('', fallbackKind),
    };
  }

  const candidate =
    object.raw_content ||
    object.rawContent ||
    object.content_object ||
    object.contentObject ||
    object.text_content ||
    object.textContent ||
    object.asset_content ||
    object.assetContent ||
    object.content ||
    object.asset ||
    object.body_content ||
    object.bodyContent ||
    object.data ||
    object;

  if (typeof candidate === 'string') {
    const rawText = candidate.trim();
    const parsed = parseTextAssetEnvelope(rawText, fallbackKind);

    return {
      raw: rawText,
      rawText,
      parsed,
    };
  }

  const candidateObject = objectValue(candidate);
  const parsed = parseTextAssetEnvelope('', fallbackKind, candidateObject);
  const rawText = safeJson(candidateObject);

  return {
    raw: candidateObject,
    rawText,
    parsed,
  };
}

function parseTextAssetEnvelope(raw, fallbackKind = 'asset', objectOverride = null) {
  const override = objectValue(objectOverride);

  if (Object.keys(override).length) {
    return normalizeTextContentObject(override, fallbackKind);
  }

  const text = String(raw || '').trim();

  if (!text) {
    return normalizeTextContentObject({}, fallbackKind);
  }

  try {
    const parsed = JSON.parse(text);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeTextContentObject(parsed, fallbackKind);
    }
  } catch (_error) {
    // Plain text is a valid b3-backed text payload in dev smokes.
  }

  return normalizeTextContentObject(
    {
      schema: 'text/plain',
      kind: fallbackKind,
      asset_kind: fallbackKind,
      title: fallbackTitle(fallbackKind),
      body: text,
      language: 'en',
    },
    fallbackKind,
  );
}

function normalizeTextContentObject(input, fallbackKind = 'asset') {
  const parsed = objectValue(input);
  const content = objectValue(
    parsed.content ||
      parsed.body_content ||
      parsed.bodyContent ||
      parsed.text_content ||
      parsed.textContent ||
      parsed.asset_content ||
      parsed.assetContent ||
      parsed.asset,
  );
  const metadata = objectValue(parsed.metadata || parsed.meta || content.metadata || content.meta);
  const relations = objectValue(parsed.relations || content.relations);
  const siteConnection = objectValue(parsed.site_connection || parsed.siteConnection || content.site_connection || content.siteConnection);
  const parentReference = objectValue(parsed.parent_reference || parsed.parentReference || content.parent_reference || content.parentReference);
  const threadReference = objectValue(parsed.thread_reference || parsed.threadReference || content.thread_reference || content.threadReference);

  const contentString = typeof parsed.content === 'string' ? parsed.content : '';
  const assetContentString = typeof parsed.asset_content === 'string' ? parsed.asset_content : '';
  const textContentString = typeof parsed.text_content === 'string' ? parsed.text_content : '';
  const bodyContentString = typeof parsed.body_content === 'string' ? parsed.body_content : '';
  const kind = cleanKind(
    parsed.asset_kind ||
      parsed.assetKind ||
      parsed.kind ||
      content.asset_kind ||
      content.assetKind ||
      content.kind ||
      fallbackKind,
  );

  return {
    schema: stringValue(parsed.schema, content.schema, `ron.${kind || fallbackKind}-content.v1`),
    kind: kind || fallbackKind,
    asset_kind: kind || fallbackKind,
    title: stringValue(content.title, parsed.title, metadata.title, fallbackTitle(kind || fallbackKind)),
    summary: stringValue(content.summary, parsed.summary, metadata.summary, parsed.excerpt, content.excerpt),
    body: stringValue(
      content.body,
      content.text,
      content.markdown,
      content.content,
      parsed.body,
      parsed.text,
      parsed.markdown,
      parsed.content_text,
      parsed.contentText,
      contentString,
      assetContentString,
      textContentString,
      bodyContentString,
    ),
    language: stringValue(content.language, parsed.language, parsed.lang, metadata.language, 'en'),
    tags: normalizeTags(content.tags || parsed.tags || metadata.tags),
    article_kind: stringValue(content.article_kind, content.articleKind, parsed.article_kind, parsed.articleKind, metadata.article_kind, metadata.articleKind),
    post_kind: stringValue(content.post_kind, content.postKind, parsed.post_kind, parsed.postKind, metadata.post_kind, metadata.postKind),
    comment_kind: stringValue(content.comment_kind, content.commentKind, parsed.comment_kind, parsed.commentKind, metadata.comment_kind, metadata.commentKind),
    site_context_crab_url: stringValue(
      content.site_context_crab_url,
      content.siteContextCrabUrl,
      parsed.site_context_crab_url,
      parsed.siteContextCrabUrl,
      parsed.site,
      siteConnection.crab_url,
      siteConnection.crabUrl,
      relations.site,
    ),
    parent_crab_url: stringValue(
      content.parent_crab_url,
      content.parentCrabUrl,
      parsed.parent_crab_url,
      parsed.parentCrabUrl,
      parsed.parent,
      parentReference.crab_url,
      parentReference.crabUrl,
      relations.parent,
      relations.target,
    ),
    thread_context_crab_url: stringValue(
      content.thread_context_crab_url,
      content.threadContextCrabUrl,
      parsed.thread_context_crab_url,
      parsed.threadContextCrabUrl,
      threadReference.crab_url,
      threadReference.crabUrl,
      relations.thread,
    ),
    hero_image_crab_url: stringValue(
      content.hero_image_crab_url,
      content.heroImageCrabUrl,
      parsed.hero_image_crab_url,
      parsed.heroImageCrabUrl,
      parsed.linked_assets?.hero_image,
      parsed.linkedAssets?.heroImage,
      parsed.cover_image,
      parsed.coverImage,
    ),
    metadata,
    relations,
    site_connection: siteConnection,
    parent_reference: parentReference,
    thread_reference: threadReference,
  };
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
    typeof data.content === 'string' ? data.content : '',
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

function normalizePreviewSources(sources, gateway = null) {
  const seen = new Set();

  return safeArray(sources)
    .map((item, index) => {
      const rawUrl = typeof item === 'string' ? item : item?.url;
      const url = normalizePreviewUrl(rawUrl, gateway);

      if (!url || seen.has(url)) {
        return null;
      }

      seen.add(url);

      return {
        key: `${index}:${url}`,
        label: item?.label || (index === 0 ? 'Gateway raw object' : index === 1 ? 'Typed b3 route' : `Preview source ${index + 1}`),
        url,
      };
    })
    .filter(Boolean);
}

function normalizePreviewUrl(value, gateway = null) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith('/')) {
    if (typeof gateway?.url === 'function') {
      return gateway.url(raw);
    }

    const baseUrl = String(gateway?.baseUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '');
    return `${baseUrl}${raw}`;
  }

  return raw;
}

function videoBlobRoutes(summary = {}) {
  const candidates = [
    { route: summary.rawUrl, label: 'Resolved raw video URL' },
    { route: summary.cid ? `/o/${summary.cid}` : '', label: 'Content ID object' },
    { route: summary.hash ? `/o/b3:${summary.hash}` : '', label: 'Hash object' },
    { route: summary.hash && summary.kind ? `/b3/${summary.hash}.${summary.kind}` : '', label: 'Typed b3 route' },
  ];

  const seen = new Set();
  const out = [];

  for (const candidate of candidates) {
    const route = normalizeGatewayRoute(candidate.route);

    if (!route || seen.has(route)) {
      continue;
    }

    seen.add(route);
    out.push({
      route,
      label: candidate.label,
    });
  }

  return out;
}

function normalizeGatewayRoute(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      return `${url.pathname}${url.search || ''}`;
    } catch (_error) {
      return '';
    }
  }

  if (raw.startsWith('/')) {
    return raw;
  }

  if (/^b3:[0-9a-f]{64}$/i.test(raw)) {
    return `/o/${raw}`;
  }

  return '';
}

function videoAcceptHeader(contentType) {
  const clean = String(contentType || '').trim();

  if (clean.toLowerCase().startsWith('video/')) {
    return `${clean},video/*,*/*`;
  }

  return 'video/mp4,video/webm,video/ogg,video/*,*/*';
}

async function normalizeVideoBlobResponse(blob, contentType) {
  if (!(blob instanceof Blob)) {
    throw new Error('Gateway did not return a video blob.');
  }

  if (blob.size <= 0) {
    throw new Error('Gateway returned an empty video blob.');
  }

  const returnedType = String(blob.type || '').toLowerCase();

  if (returnedType.includes('json') || returnedType.startsWith('text/')) {
    const text = await blob.text();
    throw new Error(`Gateway returned non-video data: ${text.slice(0, 180)}`);
  }

  if (returnedType.startsWith('video/')) {
    return blob;
  }

  return new Blob([blob], {
    type: inferVideoContentType(contentType),
  });
}

function inferVideoContentType(contentType) {
  const clean = String(contentType || '').trim().toLowerCase();

  if (clean.startsWith('video/')) {
    return clean;
  }

  return 'video/mp4';
}

function videoModeLabel(status) {
  switch (status) {
    case 'loading':
      return 'paid blob fetch loading';
    case 'ready':
      return 'paid blob playback';
    case 'error':
      return 'direct source fallback';
    default:
      return 'gateway raw bytes';
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
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

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function fallbackTitle(kind) {
  switch (String(kind || '').toLowerCase()) {
    case 'comment':
      return 'Comment';
    case 'article':
      return 'Article';
    case 'post':
      return 'Post';
    default:
      return 'Text asset';
  }
}

function safeJson(value) {
  try {
    return JSON.stringify(value || null, null, 2);
  } catch (_error) {
    return String(value ?? '');
  }
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