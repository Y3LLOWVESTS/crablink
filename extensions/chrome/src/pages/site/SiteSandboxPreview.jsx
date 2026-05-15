/**
 * RO:WHAT — Scriptless sandbox iframe preview for local and gateway-resolved CrabLink sites.
 * RO:WHY — Keeps untrusted site HTML outside the privileged React DOM while rendering b3-backed embeds.
 * RO:INTERACTS — SiteRender, safeHtml, embedRegistry, sandboxFrame, siteClient gateway helpers, JsonPreview.
 * RO:INVARIANTS — no allow-scripts; no extension API access; gateway-only embed hydration; no direct internal-service calls.
 * RO:METRICS — safe renderer policy includes embed and sanitizer summaries for diagnostics.
 * RO:CONFIG — caller supplies mode, summary, local draft, and siteClient.
 * RO:SECURITY — active HTML is sanitized before srcDoc and isolated by strict sandbox iframe props.
 * RO:TEST — local crab://site preview; named-site root preview; crab-image/post/comment/article embed smoke.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { collectCrabTypedUrls, summarizeTextContent } from '../../shared/embed/embedRegistry.js';
import { buildSandboxedSiteHtml } from '../../shared/embed/safeHtml.js';
import { describeSandboxPolicy, getSiteIframeSandboxProps } from '../../shared/embed/sandboxFrame.js';
import { fallbackSiteHtml, labelForRootStatus, toneForRootStatus } from './siteRenderModel.js';

const TEXT_EMBED_KINDS = Object.freeze(['post', 'comment', 'article']);

const SITE_FRAME_WRAP_STYLE = Object.freeze({
  width: '100%',
  minHeight: '720px',
  height: 'clamp(640px, 72vh, 980px)',
  border: '1px solid var(--site-border-soft, rgba(0,0,0,0.14))',
  borderRadius: '28px',
  background: '#ffffff',
  overflow: 'hidden',
  boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.02)',
});

const SITE_IFRAME_STYLE = Object.freeze({
  display: 'block',
  width: '100%',
  height: '100%',
  minHeight: '720px',
  border: '0',
  background: '#ffffff',
});

export default function SiteSandboxPreview({
  mode = 'gateway',
  summary = {},
  rootHtml = '',
  rootStatus = 'idle',
  rootError = null,
  draftState = null,
  app = null,
  siteClient = null,
  developer = false,
}) {
  const isLocal = mode === 'local';
  const draft = draftState?.draft || {};
  const manifest = draftState?.manifest || {};
  const localSummary = {
    title: draft.title,
    description: draft.description,
    siteName: draft.siteName,
    crabUrl: draft.siteName ? `crab://${draft.siteName}` : 'crab://site',
  };
  const effectiveSummary = isLocal ? localSummary : summary || {};
  const previewHtml = isLocal
    ? draft.rootHtml || fallbackSiteHtml(localSummary, 'missing')
    : rootHtml || fallbackSiteHtml(summary, rootStatus, rootError);

  const textRefs = useMemo(
    () => collectCrabTypedUrls(previewHtml, { kinds: TEXT_EMBED_KINDS }),
    [previewHtml],
  );

  const textRefKey = useMemo(
    () => textRefs.map((ref) => ref.crabUrl).sort().join('|'),
    [textRefs],
  );

  const [textAssetCache, setTextAssetCache] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function hydrateTextEmbeds() {
      if (!textRefs.length) {
        setTextAssetCache({});
        return;
      }

      const loading = Object.fromEntries(
        textRefs.map((ref) => [
          ref.crabUrl,
          {
            ...ref,
            status: 'loading',
            summary: null,
            raw: '',
            parsed: null,
            response: null,
            error: '',
          },
        ]),
      );

      setTextAssetCache(loading);

      if (!siteClient?.gateway?.request) {
        setTextAssetCache(
          Object.fromEntries(
            textRefs.map((ref) => [
              ref.crabUrl,
              {
                ...ref,
                status: 'error',
                summary: null,
                raw: '',
                parsed: null,
                response: null,
                error: 'Gateway client unavailable for safe text embed hydration.',
              },
            ]),
          ),
        );
        return;
      }

      const entries = await Promise.all(
        textRefs.map(async (ref) => {
          try {
            const response = await siteClient.gateway.request(`/o/${ref.cid}`, {
              label: `${labelForKind(ref.kind)} embed content`,
              parseAs: 'text',
              headers: {
                Accept: 'application/json,text/plain,*/*',
              },
            });

            const raw = String(response?.data || '');
            const parsed = parseTextContentEnvelope(raw, ref.kind);

            return [
              ref.crabUrl,
              {
                ...ref,
                status: 'resolved',
                raw,
                parsed,
                response: {
                  status: response?.status || response?.response?.status || 0,
                  correlationId: response?.correlationId || response?.response?.correlationId || '',
                },
                summary: summarizeTextContent(parsed, raw, ref),
                error: '',
              },
            ];
          } catch (error) {
            return [
              ref.crabUrl,
              {
                ...ref,
                status: 'error',
                summary: null,
                raw: '',
                parsed: null,
                response: null,
                error: String(error?.message || error || `${ref.kind} embed fetch failed`),
              },
            ];
          }
        }),
      );

      if (!cancelled) {
        setTextAssetCache(Object.fromEntries(entries));
      }
    }

    void hydrateTextEmbeds();

    return () => {
      cancelled = true;
    };
  }, [textRefKey, siteClient]);

  const sandboxed = buildSandboxedSiteHtml(previewHtml, {
    summary: effectiveSummary,
    source: isLocal ? 'local' : 'gateway',
    siteClient,
    textAssetCache,
    resolveAssetUrl: (crabUrl, kind) => {
      if (kind === 'image' && typeof siteClient?.objectUrlFromCrabImage === 'function') {
        return siteClient.objectUrlFromCrabImage(crabUrl);
      }

      return '';
    },
  });

  const renderPolicy = sandboxed.policy || {};
  const embedSummary = renderPolicy.embed_summary || {};
  const referenceGraph = renderPolicy.reference_graph || {};
  const blocked = Number(embedSummary.blocked || 0);
  const rendered = Number(embedSummary.rendered || 0);
  const hydratedTextCount = Object.values(textAssetCache).filter((item) => item?.status === 'resolved').length;
  const textRefCount = textRefs.length;
  const postCount = textRefs.filter((ref) => ref.kind === 'post').length;
  const commentCount = textRefs.filter((ref) => ref.kind === 'comment').length;
  const articleCount = textRefs.filter((ref) => ref.kind === 'article').length;

  return (
    <Card
      eyebrow="Sandbox"
      title={isLocal ? 'Local site sandbox preview' : 'Site preview'}
      className="site-preview-card site-render-primary"
      actions={
        <div className="site-preview-badges">
          <Badge tone={isLocal ? 'warning' : 'info'}>{isLocal ? 'local only' : 'read-only'}</Badge>
          <Badge tone="neutral">scripts stripped</Badge>
          <Badge tone="neutral">strict sandbox</Badge>
          <Badge tone={blocked > 0 ? 'warning' : 'success'}>{rendered} embed(s) rendered</Badge>
          {textRefCount > 0 && (
            <Badge tone={hydratedTextCount === textRefCount ? 'success' : 'warning'}>
              {hydratedTextCount}/{textRefCount} text embeds hydrated
            </Badge>
          )}
        </div>
      }
    >
      <div className="site-preview-status-grid">
        <div>
          <span>Root</span>
          <strong>{labelForRootStatus(rootStatus)}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{isLocal ? 'local draft' : 'gateway'}</strong>
        </div>
        <div>
          <span>Embeds</span>
          <strong>{rendered} rendered / {blocked} blocked</strong>
        </div>
        <div>
          <span>Text refs</span>
          <strong>{postCount} post · {commentCount} comment · {articleCount} article</strong>
        </div>
      </div>

      {rootError && (
        <div className="site-preview-warning" role="note">
          <strong>{rootError?.reason || 'root_document_error'}</strong>
          <span>{rootError?.message || String(rootError)}</span>
        </div>
      )}

      <div
        className="site-preview-frame site-preview-frame-wrap"
        data-root-status={rootStatus}
        style={SITE_FRAME_WRAP_STYLE}
      >
        <iframe
          title={isLocal ? 'Local CrabLink site preview' : 'Gateway CrabLink site preview'}
          srcDoc={sandboxed.html}
          style={SITE_IFRAME_STYLE}
          {...getSiteIframeSandboxProps()}
        />
      </div>

      <div className="site-preview-proof-row">
        <Badge tone={toneForRootStatus(rootStatus)}>{rootStatus || 'idle'}</Badge>
        <Badge tone={blocked > 0 ? 'warning' : 'success'}>{blocked > 0 ? 'some embeds blocked' : 'safe embed pass'}</Badge>
        {commentCount > 0 && <Badge tone="success">comment dropdown ready</Badge>}
        {articleCount > 0 && <Badge tone="success">article embed ready</Badge>}
      </div>

      {developer && (
        <details className="site-advanced-drawer site-proof-drawer">
          <summary>
            <span>
              <strong>Sandbox proof and embed diagnostics</strong>
              <small>Safe HTML policy, text asset cache, and reference graph.</small>
            </span>
            <Badge tone="neutral">developer</Badge>
          </summary>

          <div className="site-preview-dev-grid">
            <JsonPreview
              title="Sandbox policy"
              value={{
                sandbox: describeSandboxPolicy(),
                safe_html: renderPolicy,
                manifest,
                mode,
              }}
            />
            <JsonPreview
              title="Text asset cache"
              value={{
                refs: textRefs,
                cache: textAssetCache,
              }}
            />
            <JsonPreview
              title="Reference graph"
              value={referenceGraph}
            />
          </div>
        </details>
      )}
    </Card>
  );
}

function parseTextContentEnvelope(raw, fallbackKind = 'post') {
  const source = String(raw || '').trim();

  if (!source) {
    return {
      schema: `ron.${fallbackKind}-content.v1`,
      kind: fallbackKind,
      asset_kind: fallbackKind,
      body: '',
    };
  }

  try {
    const parsed = JSON.parse(source);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    // Plain text fallback is intentionally visible and still gateway-backed.
  }

  return {
    schema: `ron.${fallbackKind}-content.v1`,
    kind: fallbackKind,
    asset_kind: fallbackKind,
    body: source,
  };
}

function labelForKind(kind) {
  const safe = String(kind || '').trim().toLowerCase();

  switch (safe) {
    case 'post':
      return 'Post';
    case 'comment':
      return 'Comment';
    case 'article':
      return 'Article';
    default:
      return 'Text asset';
  }
}