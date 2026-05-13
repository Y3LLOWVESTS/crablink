/**
 * RO:WHAT — Consolidated read-only proof panel for gateway-resolved CrabLink sites.
 * RO:WHY — Replaces several small named-site proof/debug cards with one collapsed, useful panel.
 * RO:INTERACTS — SiteRender, siteClient summary DTOs, JsonPreview, sandbox policy helpers.
 * RO:INVARIANTS — display-only; no site creation; no wallet mutation; no fake manifest/root/receipt truth.
 * RO:METRICS — displays gateway correlation ID, root fetch status, and resolve/root diagnostics.
 * RO:CONFIG — app.refreshRoute may be supplied by shell context.
 * RO:SECURITY — text/JSON rendering only; no untrusted HTML execution here.
 * RO:TEST — manual crab://<site_name> resolve smoke and proof drawer smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { describeSandboxPolicy } from '../../shared/embed/sandboxFrame.js';
import {
  labelForRootStatus,
  normalizeRenderError,
  summarizeRootResponse,
  toneForRootStatus,
} from './siteRenderModel.js';

export default function SiteResolvedProof({
  app,
  result,
  rootHtml = '',
  rootStatus = 'idle',
  rootResponse = null,
  rootError = null,
  rootUrl = '',
}) {
  const summary = result?.summary || {};
  const receipts = Array.isArray(summary.receipts) ? summary.receipts : [];
  const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];
  const rootProofJson = safeJson({
    site: summary.crabUrl || null,
    schema: summary.schema || null,
    manifest_cid: summary.manifestCid || null,
    root_document_cid: summary.rootDocumentCid || null,
    root_url: rootUrl || null,
    root_status: rootStatus,
    root_http_status: rootResponse?.status || null,
    correlation_id: result?.response?.correlationId || rootResponse?.correlationId || null,
    receipts_count: receipts.length,
    warnings_count: warnings.length,
    root_error: rootError ? normalizeRenderError(rootError) : null,
  });

  function openRootDocument() {
    if (rootUrl) {
      window.open(rootUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Card
      eyebrow="Resolved site"
      title={summary.title || summary.siteName || 'Resolved site'}
      className="site-resolved-card"
      actions={
        <div className="site-page-actions">
          <Badge tone={toneForRootStatus(rootStatus)}>{labelForRootStatus(rootStatus)}</Badge>
          <CopyButton text={summary.crabUrl || ''} label="Copy site URL" disabled={!summary.crabUrl} />
          <CopyButton text={summary.rootDocumentCid || ''} label="Copy root CID" disabled={!summary.rootDocumentCid} />
          <Button variant="secondary" disabled={!rootUrl} onClick={openRootDocument}>
            Open raw root
          </Button>
          <Button variant="secondary" onClick={app?.refreshRoute}>
            Refresh
          </Button>
        </div>
      }
    >
      <div className="site-resolved-grid">
        <Fact label="Site" value={summary.crabUrl || 'not returned'} />
        <Fact label="Manifest CID" value={summary.manifestCid || 'not returned'} monospace />
        <Fact label="Root CID" value={summary.rootDocumentCid || 'not returned'} monospace />
        <Fact label="Root fetch" value={labelForRootStatus(rootStatus)} />
        <Fact label="Owner" value={summary.ownerPassport || 'not returned'} />
        <Fact label="Wallet" value={summary.ownerWallet || 'not returned'} />
        <Fact label="Receipts" value={receipts.length ? `${receipts.length} returned` : 'none returned'} />
        <Fact label="Correlation" value={result?.response?.correlationId || rootResponse?.correlationId || 'n/a'} monospace />
      </div>

      {summary.description && <p className="site-resolved-description">{summary.description}</p>}

      {(summary.tags?.length > 0 || warnings.length > 0) && (
        <div className="site-preview-badges" aria-label="Site tags and warnings">
          {summary.tags?.map((tag) => (
            <Badge key={tag} tone="neutral" uppercase={false}>
              #{tag}
            </Badge>
          ))}
          {warnings.length > 0 && <Badge tone="warning">{warnings.length} warning(s)</Badge>}
          {receipts.length > 0 && <Badge tone="success">{receipts.length} receipt(s)</Badge>}
        </div>
      )}

      {!summary.rootDocumentCid && (
        <p className="site-panel-note">
          This resolved site response did not include a root document CID. CrabLink will not invent a page root.
        </p>
      )}

      {rootError && (
        <p className="site-panel-note is-warning">
          The site manifest resolved, but the root document bytes could not be fetched through the gateway. The preview
          remains sandboxed and read-only.
        </p>
      )}

      <details className="site-advanced-drawer site-proof-drawer">
        <summary>
          <span>
            <strong>Gateway proof and diagnostics</strong>
            <small>Root fetch proof, normalized summary, raw DTO, and sandbox policy.</small>
          </span>
          <Badge tone="neutral">developer</Badge>
        </summary>

        <section className="site-proof-grid">
          <JsonPreview
            label="Resolved site proof"
            data={{
              source: result?.source || 'unknown',
              resolved_at: result?.resolvedAt || '',
              summary,
              root_response: summarizeRootResponse(rootResponse, rootHtml, rootError),
              root_error: rootError ? normalizeRenderError(rootError) : null,
              attempts: result?.attempts || [],
              sandbox_policy: describeSandboxPolicy(),
            }}
          />

          <JsonPreview label="Resolved site DTO" data={result?.data || null} />
        </section>

        <div className="site-page-actions" style={{ padding: '0 1rem 1rem' }}>
          <CopyButton text={rootProofJson} label="Copy proof JSON" />
        </div>
      </details>
    </Card>
  );
}

function Fact({ label, value, monospace = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}

function safeJson(value) {
  try {
    return JSON.stringify(value || null, null, 2);
  } catch (_error) {
    return String(value ?? '');
  }
}