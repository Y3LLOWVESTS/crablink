/**
 * RO:WHAT — Root document fetch proof panel for gateway-resolved CrabLink sites.
 * RO:WHY — Makes the b3 root-document step visible and copyable while keeping site viewing read-only.
 * RO:INTERACTS — SiteRender, siteClient.rootDocumentUrl, shared Card/Badge/Button/CopyButton.
 * RO:INVARIANTS — no root CID invention; no direct storage/index calls; raw root opens through gateway only.
 * RO:METRICS — displays returned HTTP status and correlation ID when available.
 * RO:CONFIG — gateway URL is supplied by siteClient upstream.
 * RO:SECURITY — does not execute root bytes; preview execution remains isolated in SiteSandboxPreview.
 * RO:TEST — manual named-site root document fetch smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import { labelForRootStatus, normalizeRenderError, toneForRootStatus } from './siteRenderModel.js';

export default function SiteRootDocumentPanel({ summary, rootStatus, rootResponse, rootError, rootUrl }) {
  const hasRoot = Boolean(summary?.rootDocumentCid);
  const rootJson = JSON.stringify(
    {
      root_document_cid: summary?.rootDocumentCid || null,
      root_url: rootUrl || null,
      status: rootStatus,
      http_status: rootResponse?.status || null,
      correlation_id: rootResponse?.correlationId || null,
      error: rootError ? normalizeRenderError(rootError) : null,
    },
    null,
    2,
  );

  function openRootDocument() {
    if (rootUrl) {
      window.open(rootUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Card
      eyebrow="Root document"
      title="Gateway root document fetch"
      className="site-root-fetch-card"
      actions={
        <div className="site-page-actions">
          <Badge tone={toneForRootStatus(rootStatus)}>{labelForRootStatus(rootStatus)}</Badge>
          <CopyButton text={summary?.rootDocumentCid || ''} label="Copy root CID" />
          <CopyButton text={rootJson} label="Copy proof" />
          <Button variant="secondary" disabled={!rootUrl} onClick={openRootDocument}>
            Open raw root
          </Button>
        </div>
      }
    >
      <div className="site-resolved-grid">
        <Fact label="Root CID" value={summary?.rootDocumentCid || 'not returned'} monospace />
        <Fact label="Gateway URL" value={rootUrl || 'not available'} monospace />
        <Fact label="Fetch status" value={labelForRootStatus(rootStatus)} />
        <Fact label="Root HTTP" value={rootResponse?.status ? String(rootResponse.status) : 'n/a'} />
      </div>

      {!hasRoot && (
        <p className="site-panel-note">
          This site response did not include a root document CID. CrabLink can display the manifest, but it will not invent
          a root page.
        </p>
      )}

      {rootError && (
        <p className="site-panel-note is-warning">
          The site manifest resolved, but the root document bytes could not be fetched through the gateway. A safe fallback
          preview is shown instead.
        </p>
      )}
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