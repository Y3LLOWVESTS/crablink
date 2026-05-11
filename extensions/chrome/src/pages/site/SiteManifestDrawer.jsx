/**
 * RO:WHAT — Manifest/details drawer replacement for React site views.
 * RO:WHY — Replaces old appended manifest behavior with a clean in-page expandable proof panel.
 * RO:INTERACTS — SitePage local manifest, SiteRender resolved DTOs, JsonPreview, CopyButton.
 * RO:INVARIANTS — displays provided manifest/DTO only; no fake manifest CID; no fake receipt.
 * RO:METRICS — none.
 * RO:CONFIG — draftState or resolvedSite props.
 * RO:SECURITY — JSON preview only; no untrusted HTML execution.
 * RO:TEST — manual Site Manifest panel smoke.
 */

import { useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';

export default function SiteManifestDrawer({ draftState = null, resolvedSite = null }) {
  const [open, setOpen] = useState(false);
  const isResolved = Boolean(resolvedSite);
  const manifest = isResolved ? resolvedSite?.data : draftState?.manifest;
  const summary = isResolved ? resolvedSite?.summary : draftState?.manifest?.site;
  const manifestJson = safeJson(manifest);
  const receipts = isResolved ? resolvedSite?.summary?.receipts || [] : [];
  const warnings = isResolved ? resolvedSite?.summary?.warnings || [] : [];

  return (
    <Card
      eyebrow="Site Manifest"
      title={isResolved ? 'Gateway site proof' : 'Local site manifest draft'}
      className="site-manifest-card"
      actions={
        <div className="site-page-actions">
          <Badge tone={isResolved ? 'info' : 'warning'}>
            {isResolved ? 'gateway returned' : 'local draft'}
          </Badge>
          <CopyButton text={manifestJson} label="Copy JSON" />
          <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'}
          </Button>
        </div>
      }
    >
      <div className="site-manifest-summary">
        <Fact label="Name" value={summary?.name || summary?.siteName || resolvedSite?.summary?.siteName || 'not returned'} />
        <Fact label="Title" value={summary?.title || resolvedSite?.summary?.title || 'not returned'} />
        <Fact label="Manifest CID" value={resolvedSite?.summary?.manifestCid || 'not returned'} monospace />
        <Fact
          label="Root CID"
          value={resolvedSite?.summary?.rootDocumentCid || draftState?.manifest?.root_document?.cid_hint || 'not returned'}
          monospace
        />
        {isResolved && <Fact label="Receipts" value={String(receipts.length)} />}
        {isResolved && <Fact label="Warnings" value={String(warnings.length)} />}
      </div>

      {isResolved && (receipts.length > 0 || warnings.length > 0) && (
        <div className="site-preview-badges" aria-label="Site proof badges">
          {receipts.length > 0 && <Badge tone="success">{receipts.length} receipt(s)</Badge>}
          {warnings.length > 0 && <Badge tone="warning">{warnings.length} warning(s)</Badge>}
        </div>
      )}

      {open && (
        <JsonPreview
          label={isResolved ? 'Resolved site DTO' : 'Local site manifest'}
          data={manifest || null}
          initiallyOpen
        />
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

function safeJson(value) {
  try {
    return JSON.stringify(value || null, null, 2);
  } catch (_error) {
    return String(value ?? '');
  }
}