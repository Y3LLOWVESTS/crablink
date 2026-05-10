/**
 * RO:WHAT — Safe site renderer for local drafts and named gateway-resolved sites.
 * RO:WHY — Gives React site route first-class rendering while preventing stale iframes and script execution.
 * RO:INTERACTS — siteClient, SiteManifestDrawer, ErrorPanel, LoadingState, JsonPreview.
 * RO:INVARIANTS — gateway-only named resolution; no direct storage/index; iframe preview has no scripts; no fake manifest/root proof.
 * RO:METRICS — displays gateway status/correlation IDs where returned.
 * RO:CONFIG — gateway client from app context.
 * RO:SECURITY — srcDoc sandbox only; script tags stripped before preview; no extension-privileged untrusted content.
 * RO:TEST — crab://site local preview; crab://<site_name> gateway read-only preview.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import { createSiteClient } from '../../shared/api/siteClient.js';
import SiteCreatorProof from './SiteCreatorProof.jsx';
import SiteManifestDrawer from './SiteManifestDrawer.jsx';

export default function SiteRender({
  app,
  route,
  draftState = null,
  siteName = '',
  mode = 'draft',
}) {
  const gateway = app?.clients?.gateway || null;
  const siteClient = useMemo(() => createSiteClient(gateway), [gateway]);
  const [state, setState] = useState({
    status: mode === 'named' ? 'loading' : 'local',
    result: null,
    rootHtml: '',
    error: null,
  });

  useEffect(() => {
    let alive = true;

    async function resolveNamedSite() {
      if (mode !== 'named') {
        setState({
          status: 'local',
          result: null,
          rootHtml: '',
          error: null,
        });
        return;
      }

      setState({
        status: 'loading',
        result: null,
        rootHtml: '',
        error: null,
      });

      try {
        const result = await siteClient.resolveSite(siteName);
        let rootHtml = '';

        if (result.summary.rootDocumentCid) {
          try {
            const rootResponse = await siteClient.fetchRootDocument(result.summary.rootDocumentCid);
            rootHtml = String(rootResponse.data || '');
          } catch (_error) {
            rootHtml = '';
          }
        }

        if (!alive) {
          return;
        }

        setState({
          status: 'resolved',
          result,
          rootHtml,
          error: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          status: 'error',
          result: null,
          rootHtml: '',
          error,
        });
      }
    }

    void resolveNamedSite();

    return () => {
      alive = false;
    };
  }, [mode, siteName, route?.refreshTick, siteClient]);

  if (mode === 'named') {
    if (state.status === 'loading') {
      return (
        <LoadingState
          title="Resolving named site"
          copy="CrabLink is asking the configured gateway for this site manifest and root document."
          detail={`crab://${siteName}`}
        />
      );
    }

    if (state.status === 'error') {
      return (
        <ErrorPanel
          title="Site could not be resolved"
          copy="The gateway did not return a hydrated site response. React is showing the failure instead of inventing a site."
          error={state.error}
          actions={
            <div className="site-page-actions">
              <Button variant="secondary" onClick={app?.refreshRoute}>
                Retry
              </Button>
              <Button variant="ghost" onClick={() => app?.navigate?.('crab://site')}>
                Open Site Workspace
              </Button>
            </div>
          }
        />
      );
    }

    return (
      <ResolvedSiteView
        app={app}
        result={state.result}
        rootHtml={state.rootHtml}
      />
    );
  }

  return (
    <LocalSitePreview
      draftState={draftState}
      app={app}
    />
  );
}

function ResolvedSiteView({ app, result, rootHtml }) {
  const summary = result?.summary || {};
  const previewHtml = rootHtml || fallbackSiteHtml(summary);
  const safeHtml = buildSafePreviewHtml(previewHtml);

  return (
    <section className="site-render-stack">
      <Card
        eyebrow="Resolved site"
        title={summary.title || summary.siteName || 'Resolved site'}
        className="site-resolved-card"
        actions={
          <div className="site-page-actions">
            <Button variant="secondary" onClick={app?.refreshRoute}>
              Refresh
            </Button>
          </div>
        }
      >
        <div className="site-resolved-grid">
          <Fact label="Site" value={summary.crabUrl || 'n/a'} />
          <Fact label="Schema" value={summary.schema || 'not returned'} />
          <Fact label="Manifest CID" value={summary.manifestCid || 'not returned'} />
          <Fact label="Root document" value={summary.rootDocumentCid || 'not returned'} />
          <Fact label="Hydration" value={summary.hydrationStatus || summary.status || 'not returned'} />
          <Fact label="Correlation" value={result?.response?.correlationId || 'n/a'} />
        </div>

        {summary.description && <p className="site-resolved-description">{summary.description}</p>}
      </Card>

      <SiteCreatorProof resolvedSite={result} />

      <Card
        eyebrow="Sandbox"
        title="Site preview"
        className="site-preview-card"
        actions={
          <div className="site-preview-badges">
            <Badge tone="info">read-only</Badge>
            <Badge tone="neutral">scripts stripped</Badge>
            <Badge tone="neutral">sandboxed</Badge>
          </div>
        }
      >
        <iframe
          title={`crab://${summary.siteName || 'site'} preview`}
          className="site-preview-frame"
          sandbox=""
          srcDoc={safeHtml}
        />
      </Card>

      <SiteManifestDrawer resolvedSite={result} />

      <Card eyebrow="Developer" title="Hydrated site payload">
        <JsonPreview label="Site response JSON" data={result?.data || null} />
      </Card>
    </section>
  );
}

function LocalSitePreview({ draftState, app }) {
  const draft = draftState?.draft || {};
  const manifest = draftState?.manifest || {};
  const safeHtml = buildSafePreviewHtml(draft.rootHtml || fallbackSiteHtml({
    title: draft.title,
    description: draft.description,
    siteName: draft.siteName,
  }));

  return (
    <Card
      eyebrow="Preview"
      title="Local site sandbox preview"
      className="site-preview-card"
      actions={
        <div className="site-preview-badges">
          <Badge tone="warning">local only</Badge>
          <Badge tone="neutral">no scripts</Badge>
          <Badge tone="neutral">no backend launch</Badge>
        </div>
      }
    >
      <iframe
        title={`${draft.siteName || 'local site'} preview`}
        className="site-preview-frame"
        sandbox=""
        srcDoc={safeHtml}
      />

      <div className="site-preview-meta">
        <Fact label="Name" value={draft.siteName || 'not set'} />
        <Fact label="Title" value={draft.title || 'not set'} />
        <Fact label="Owner" value={draft.ownerPassport || app?.settings?.passportSubject || 'not set'} />
        <Fact label="Policy" value={draft.renderPolicy || 'not set'} />
      </div>

      {draftState?.viewMode === 'developer' && (
        <JsonPreview label="Local preview manifest" data={manifest} />
      )}
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

function fallbackSiteHtml(summary) {
  const title = escapeHtml(summary?.title || summary?.siteName || 'CrabLink Site');
  const description = escapeHtml(summary?.description || 'No root document bytes were returned for this preview.');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #111;
        background: #faf9f6;
      }
      main {
        max-width: 860px;
        margin: 0 auto;
        padding: 48px 28px;
      }
      h1 {
        font-size: clamp(40px, 7vw, 80px);
        letter-spacing: -0.09em;
        line-height: 0.95;
        margin: 0 0 18px;
      }
      p {
        color: #555;
        font-size: 18px;
        line-height: 1.6;
      }
      .notice {
        border: 1px solid #ddd8cf;
        border-radius: 24px;
        background: white;
        padding: 18px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${description}</p>
      <div class="notice">
        <strong>CrabLink preview</strong>
        <p>This is a safe fallback preview. Real site bytes must come from the gateway/root document path.</p>
      </div>
    </main>
  </body>
</html>`;
}

function buildSafePreviewHtml(input) {
  const stripped = String(input || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  if (/<!doctype|<html|<body|<main|<section|<article|<div|<h1|<p/i.test(stripped)) {
    return stripped;
  }

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body><pre>${escapeHtml(stripped)}</pre></body>
</html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}