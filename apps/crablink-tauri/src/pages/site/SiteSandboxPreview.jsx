/**
 * RO:WHAT — Scriptless sandbox iframe preview for local and gateway-resolved CrabLink sites.
 * RO:WHY — Keeps untrusted site HTML outside the privileged React DOM while rendering b3-backed embeds.
 * RO:INTERACTS — SiteRender, safeHtml, embedRegistry, sandboxFrame, siteClient gateway helpers, JsonPreview.
 * RO:INVARIANTS — no allow-scripts; no extension API access; gateway-only embed hydration; no direct internal-service calls.
 * RO:METRICS — safe renderer policy includes embed and sanitizer summaries for diagnostics.
 * RO:CONFIG — caller supplies mode, summary, local draft, and siteClient.
 * RO:SECURITY — active HTML is sanitized before iframe render and isolated by strict sandbox iframe props.
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
  const [sandboxUrl, setSandboxUrl] = useState('');

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
            source: '',
            attempts: [],
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
                source: '',
                attempts: [],
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
          const result = await fetchTextAssetThroughGateway(siteClient.gateway, ref);

          if (result.status !== 'resolved') {
            return [
              ref.crabUrl,
              {
                ...ref,
                status: 'error',
                source: result.source || '',
                attempts: result.attempts,
                summary: null,
                raw: '',
                parsed: null,
                response: result.response || null,
                error: result.error || `${ref.kind} embed fetch failed`,
              },
            ];
          }

          const parsed = parseTextContentEnvelope(result.raw, ref.kind, result.parsed);
          const textSummary = summarizeTextContent(parsed, result.rawText || '', ref);

          if (!hasUsableTextSummary(textSummary)) {
            return [
              ref.crabUrl,
              {
                ...ref,
                status: 'error',
                source: result.source || '',
                attempts: result.attempts,
                summary: textSummary,
                raw: result.rawText || '',
                parsed,
                response: result.response || null,
                error: `${labelForKind(ref.kind)} DTO did not include readable title/body content.`,
              },
            ];
          }

          return [
            ref.crabUrl,
            {
              ...ref,
              status: 'resolved',
              source: result.source,
              attempts: result.attempts,
              raw: result.rawText,
              parsed,
              response: result.response,
              summary: textSummary,
              error: '',
            },
          ];
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

  useEffect(() => {
    let objectUrl = '';

    try {
      if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        objectUrl = URL.createObjectURL(
          new Blob([String(sandboxed.html || '')], {
            type: 'text/html;charset=utf-8',
          }),
        );
        setSandboxUrl(objectUrl);
      } else {
        setSandboxUrl('');
      }
    } catch (_error) {
      setSandboxUrl('');
    }

    return () => {
      if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [sandboxed.html]);

  const renderPolicy = sandboxed.policy || {};
  const embedSummary = renderPolicy.embed_summary || {};
  const referenceGraph = renderPolicy.reference_graph || {};
  const blocked = Number(embedSummary.blocked || 0);
  const rendered = Number(embedSummary.rendered || 0);
  const hydratedTextCount = Object.values(textAssetCache).filter((item) => item?.status === 'resolved').length;
  const failedTextCount = Object.values(textAssetCache).filter((item) => item?.status === 'error').length;
  const textRefCount = textRefs.length;
  const postCount = textRefs.filter((ref) => ref.kind === 'post').length;
  const commentCount = textRefs.filter((ref) => ref.kind === 'comment').length;
  const articleCount = textRefs.filter((ref) => ref.kind === 'article').length;
  const iframeSandboxProps = useMemo(
    () => ({
      ...getSiteIframeSandboxProps(),
      loading: 'eager',
    }),
    [],
  );
  const iframeKey = [
    effectiveSummary?.rootDocumentCid || effectiveSummary?.manifestCid || effectiveSummary?.crabUrl || 'site',
    rootStatus || 'idle',
    rendered,
    blocked,
    hydratedTextCount,
    failedTextCount,
    byteLength(sandboxed.html),
    sandboxUrl || 'srcdoc',
  ].join(':');

  const iframeSourceProps = sandboxUrl
    ? { src: sandboxUrl }
    : { srcDoc: sandboxed.html };

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

      {textRefCount > 0 && hydratedTextCount === 0 && failedTextCount > 0 && (
        <div className="site-preview-warning" role="note">
          <strong>Text embed hydration failed</strong>
          <span>
            The root document loaded, but CrabLink could not read the referenced post/comment/article object(s) through
            the gateway. This may mean the local dev stack was restarted after those text assets were minted.
          </span>
        </div>
      )}

      {textRefCount > 0 && hydratedTextCount > 0 && failedTextCount > 0 && (
        <div className="site-preview-warning" role="note">
          <strong>Some text embeds were unavailable</strong>
          <span>
            CrabLink rendered the text assets that still exist in gateway/storage and kept unavailable references visible
            as safe blocked cards.
          </span>
        </div>
      )}

      <div
        className="site-preview-frame site-preview-frame-wrap"
        data-root-status={rootStatus}
        data-rendered-embeds={rendered}
        data-blocked-embeds={blocked}
        data-text-refs={textRefCount}
        data-text-hydrated={hydratedTextCount}
        style={SITE_FRAME_WRAP_STYLE}
      >
        <iframe
          key={iframeKey}
          title={isLocal ? 'Local CrabLink site preview' : 'Gateway CrabLink site preview'}
          style={SITE_IFRAME_STYLE}
          {...iframeSandboxProps}
          {...iframeSourceProps}
        />
      </div>

      <div className="site-preview-proof-row">
        <Badge tone={toneForRootStatus(rootStatus)}>{rootStatus || 'idle'}</Badge>
        <Badge tone={blocked > 0 ? 'warning' : 'success'}>{blocked > 0 ? 'some embeds blocked' : 'safe embed pass'}</Badge>
        {sandboxUrl && <Badge tone="success">blob iframe source</Badge>}
        {!sandboxUrl && <Badge tone="warning">srcdoc iframe source</Badge>}
        {postCount > 0 && <Badge tone={hasHydratedKind(textAssetCache, 'post') ? 'success' : 'warning'}>post embed check</Badge>}
        {commentCount > 0 && <Badge tone={hasHydratedKind(textAssetCache, 'comment') ? 'success' : 'warning'}>comment dropdown ready</Badge>}
        {articleCount > 0 && <Badge tone={hasHydratedKind(textAssetCache, 'article') ? 'success' : 'warning'}>article embed check</Badge>}
      </div>

      {developer && (
        <details className="site-advanced-drawer site-proof-drawer">
          <summary>
            <span>
              <strong>Sandbox proof and embed diagnostics</strong>
              <small>Safe HTML policy, text asset cache, iframe source, and reference graph.</small>
            </span>
            <Badge tone="neutral">developer</Badge>
          </summary>

          <div className="site-preview-dev-grid">
            <JsonPreview
              title="Sandbox policy"
              value={{
                sandbox: describeSandboxPolicy(),
                iframe: {
                  source: sandboxUrl ? 'blob' : 'srcDoc',
                  key: iframeKey,
                  safe_html_bytes: byteLength(sandboxed.html),
                },
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

async function fetchTextAssetThroughGateway(gateway, ref) {
  const attempts = [];

  const routes = [
    {
      label: `${labelForKind(ref.kind)} raw content object`,
      source: 'raw_object',
      path: `/o/${ref.cid}`,
      parseAs: 'text',
    },
    {
      label: `${labelForKind(ref.kind)} typed b3 route`,
      source: 'typed_b3_route',
      path: `/b3/${ref.hash}.${ref.kind}`,
      parseAs: 'json',
    },
    {
      label: `${labelForKind(ref.kind)} crab resolver`,
      source: 'crab_resolver',
      path: `/crab/resolve?url=${encodeURIComponent(ref.crabUrl)}`,
      parseAs: 'json',
    },
  ];

  for (const route of routes) {
    try {
      const response = await gateway.request(route.path, {
        label: route.label,
        parseAs: route.parseAs,
        headers: {
          Accept: route.parseAs === 'text' ? 'application/json,text/plain,*/*' : 'application/json,*/*',
        },
      });

      const data = response?.data;
      const normalized = normalizeTextAssetResponse(data, ref);

      attempts.push({
        source: route.source,
        path: route.path,
        status: response?.status || response?.response?.status || 0,
        correlationId: response?.correlationId || response?.response?.correlationId || '',
        ok: normalized.ok,
        reason: normalized.ok ? 'resolved' : normalized.error || 'no_text_content',
      });

      if (normalized.ok) {
        return {
          status: 'resolved',
          source: route.source,
          attempts,
          raw: normalized.raw,
          rawText: normalized.rawText,
          parsed: normalized.parsed,
          response: {
            status: response?.status || response?.response?.status || 0,
            correlationId: response?.correlationId || response?.response?.correlationId || '',
            route: response?.route || route.path,
          },
          error: '',
        };
      }
    } catch (error) {
      attempts.push({
        source: route.source,
        path: route.path,
        status: Number(error?.status || 0),
        correlationId: error?.correlationId || '',
        ok: false,
        reason: error?.reason || error?.message || 'request_failed',
      });
    }
  }

  return {
    status: 'error',
    source: '',
    attempts,
    raw: '',
    rawText: '',
    parsed: null,
    response: null,
    error: attempts.map((attempt) => `${attempt.source}:${attempt.reason}`).join(' | ') || 'text asset fetch failed',
  };
}

function normalizeTextAssetResponse(data, ref) {
  if (typeof data === 'string') {
    const text = data.trim();
    const parsed = parseTextContentEnvelope(text, ref.kind);

    return {
      ok: hasTextContent(parsed, text),
      raw: text,
      rawText: text,
      parsed,
      error: hasTextContent(parsed, text) ? '' : 'empty_text_body',
    };
  }

  const object = objectValue(data);

  if (!Object.keys(object).length) {
    return {
      ok: false,
      raw: '',
      rawText: '',
      parsed: null,
      error: 'empty_response',
    };
  }

  const candidate =
    object.raw_content ||
    object.rawContent ||
    object.content_object ||
    object.contentObject ||
    object.text_content ||
    object.textContent ||
    object.content ||
    object.asset_content ||
    object.assetContent ||
    object.asset ||
    object.data ||
    object;

  if (typeof candidate === 'string') {
    const parsed = parseTextContentEnvelope(candidate, ref.kind);

    return {
      ok: hasTextContent(parsed, candidate),
      raw: candidate,
      rawText: candidate,
      parsed,
      error: hasTextContent(parsed, candidate) ? '' : 'empty_text_body',
    };
  }

  const candidateObject = objectValue(candidate);
  const parsed = parseTextContentEnvelope('', ref.kind, candidateObject);
  const rawText = safeJson(candidateObject);

  return {
    ok: hasTextContent(parsed, rawText),
    raw: candidateObject,
    rawText,
    parsed,
    error: hasTextContent(parsed, rawText) ? '' : 'object_without_text_body',
  };
}

function parseTextContentEnvelope(raw, fallbackKind = 'post', objectOverride = null) {
  const override = objectValue(objectOverride);

  if (Object.keys(override).length) {
    return normalizeTextContentObject(override, fallbackKind);
  }

  const text = String(raw || '').trim();

  if (!text) {
    return normalizeTextContentObject({}, fallbackKind);
  }

  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch (_error) {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return normalizeTextContentObject(
      {
        schema: `ron.${fallbackKind}-content.v1`,
        kind: fallbackKind,
        asset_kind: fallbackKind,
        title: fallbackTitle(fallbackKind),
        body: text,
        language: 'en',
      },
      fallbackKind,
    );
  }

  return normalizeTextContentObject(parsed, fallbackKind);
}

function normalizeTextContentObject(input, fallbackKind = 'post') {
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
  const parentReference = objectValue(parsed.parent_reference || parsed.parentReference || content.parent_reference || content.parentReference);
  const threadReference = objectValue(parsed.thread_reference || parsed.threadReference || content.thread_reference || content.threadReference);
  const siteConnection = objectValue(parsed.site_connection || parsed.siteConnection || content.site_connection || content.siteConnection);

  const kind = stringValue(parsed.asset_kind, parsed.assetKind, parsed.kind, content.asset_kind, content.assetKind, content.kind, fallbackKind)
    .toLowerCase();

  return {
    schema: stringValue(parsed.schema, content.schema, `ron.${kind || fallbackKind}-content.v1`),
    kind: kind || fallbackKind,
    asset_kind: kind || fallbackKind,
    title: stringValue(content.title, parsed.title, metadata.title, fallbackTitle(kind || fallbackKind)),
    summary: stringValue(content.summary, parsed.summary, metadata.summary),
    body: stringValue(
      content.body,
      content.text,
      content.content,
      parsed.body,
      parsed.text,
      parsed.content_text,
      parsed.contentText,
    ),
    language: stringValue(content.language, parsed.language, metadata.language, 'en'),
    tags: arrayStrings(content.tags || parsed.tags || metadata.tags),
    post_kind: stringValue(content.post_kind, content.postKind, parsed.post_kind, parsed.postKind, metadata.post_kind, metadata.postKind),
    comment_kind: stringValue(
      content.comment_kind,
      content.commentKind,
      parsed.comment_kind,
      parsed.commentKind,
      metadata.comment_kind,
      metadata.commentKind,
    ),
    article_kind: stringValue(
      content.article_kind,
      content.articleKind,
      parsed.article_kind,
      parsed.articleKind,
      metadata.article_kind,
      metadata.articleKind,
    ),
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
    metadata,
    relations,
    site_connection: siteConnection,
    parent_reference: parentReference,
    thread_reference: threadReference,
  };
}

function hasTextContent(parsed = {}, raw = '') {
  const object = objectValue(parsed);
  return Boolean(
    stringValue(object.body, object.text, object.content) ||
      (String(raw || '').trim().startsWith('{') === false && String(raw || '').trim().length > 0),
  );
}

function hasUsableTextSummary(summary = {}) {
  return Boolean(stringValue(summary.body, summary.bodyPreview, summary.title));
}

function hasHydratedKind(cache = {}, kind = '') {
  const expected = String(kind || '').toLowerCase();
  return Object.values(cache).some((entry) => entry?.status === 'resolved' && String(entry?.kind || entry?.summary?.kind || '').toLowerCase() === expected);
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

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function arrayStrings(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
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

function safeJson(value) {
  try {
    return JSON.stringify(value || null, null, 2);
  } catch (_error) {
    return String(value ?? '');
  }
}

function byteLength(value) {
  try {
    return new TextEncoder().encode(String(value || '')).length;
  } catch (_error) {
    return String(value || '').length;
  }
}