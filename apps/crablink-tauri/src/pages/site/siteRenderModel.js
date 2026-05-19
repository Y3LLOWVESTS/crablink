/**
 * RO:WHAT — Pure helpers for React named-site rendering status, fallback HTML, and safe diagnostics.
 * RO:WHY — Keeps SiteRender small and deterministic while preserving readable gateway/root fetch state.
 * RO:INTERACTS — SiteRender, SiteRootDocumentPanel, SiteSandboxPreview, SiteDiagnostics, safeHtml.
 * RO:INVARIANTS — helpers do not fetch, mutate, spend, or claim backend truth; fallback HTML is clearly labeled.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — all fallback content is escaped before iframe rendering.
 * RO:TEST — npm run build; manual crab://<site_name> resolve/render smoke.
 */

import { escapeHtml } from '../../shared/embed/safeHtml.js';

export function toneForRootStatus(status) {
  if (status === 'ok') return 'success';
  if (status === 'loading') return 'info';
  if (status === 'error') return 'warning';
  if (status === 'missing') return 'neutral';
  if (status === 'empty') return 'warning';
  return 'neutral';
}

export function labelForRootStatus(status) {
  if (status === 'ok') return 'root fetched';
  if (status === 'loading') return 'fetching root';
  if (status === 'error') return 'root fetch failed';
  if (status === 'missing') return 'no root CID';
  if (status === 'empty') return 'empty root';
  return 'root idle';
}

export function fallbackSiteHtml(summary = {}, rootStatus = 'missing', rootError = null) {
  const title = escapeHtml(summary?.title || summary?.siteName || 'CrabLink Site');
  const description = escapeHtml(
    summary?.description ||
      (rootStatus === 'error'
        ? 'The site manifest resolved, but the root document bytes could not be fetched.'
        : 'No root document bytes were returned for this preview.'),
  );
  const reason = escapeHtml(rootError?.message || labelForRootStatus(rootStatus));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${description}</p>
      <div class="crablink-notice">
        <strong>CrabLink safe preview</strong>
        <p>This is a controlled fallback page. Real site bytes must come from the gateway root document path.</p>
        <small>${reason}</small>
      </div>
    </main>
  </body>
</html>`;
}

export function normalizeRenderError(error) {
  return {
    name: String(error?.name || 'Error'),
    message: String(error?.message || error || ''),
    reason: String(error?.reason || ''),
    status: Number(error?.status || 0),
    retryable: Boolean(error?.retryable),
    correlation_id: String(error?.correlationId || ''),
  };
}

export function summarizeRootResponse(rootResponse, rootHtml, rootError) {
  if (rootResponse) {
    return {
      status: rootResponse.status,
      route: rootResponse.route,
      correlation_id: rootResponse.correlationId,
      bytes: String(rootHtml || '').length,
    };
  }

  if (rootError) {
    return {
      error: normalizeRenderError(rootError),
    };
  }

  return null;
}