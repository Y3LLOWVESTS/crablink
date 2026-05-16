/**
 * RO:WHAT — Consolidated read-only proof panel for gateway-resolved CrabLink sites.
 * RO:WHY — Replaces several small named-site proof/debug cards with one useful panel plus creator proof.
 * RO:INTERACTS — SiteRender, SiteCreatorProfileProof, siteClient summary DTOs, JsonPreview, sandbox policy helpers, localCatalog.
 * RO:INVARIANTS — display-only; no site creation; no wallet mutation; no fake manifest/root/receipt/creator/catalog truth.
 * RO:METRICS — displays gateway correlation ID, root fetch status, creator source, and resolve/root diagnostics.
 * RO:CONFIG — app.refreshRoute/app.navigate may be supplied by shell context.
 * RO:SECURITY — text/JSON rendering only; no untrusted HTML execution here.
 * RO:TEST — manual crab://<site_name> resolve smoke, paid site_visit smoke, local catalog site memory smoke.
 */

import { useEffect } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { describeSandboxPolicy } from '../../shared/embed/sandboxFrame.js';
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import {
  labelForRootStatus,
  normalizeRenderError,
  summarizeRootResponse,
  toneForRootStatus,
} from './siteRenderModel.js';
import SiteCreatorProfileProof, { resolveSiteCreatorIdentity } from './SiteCreatorProfileProof.jsx';
import { readPublicProfileCache } from '../../shared/profile/publicProfileCache.js';

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
  const creatorIdentity = resolveSiteCreatorIdentity({
    app,
    result,
    summary,
    cachedProfileEnvelope: readPublicProfileCache(),
  });

  const siteCrabUrl = summary.crabUrl || (summary.siteName ? `crab://${summary.siteName}` : '');
  const siteTitle = summary.title || summary.siteName || siteCrabUrl || 'Resolved site';

  useEffect(() => {
    if (!siteCrabUrl) {
      return;
    }

    writeLocalCatalogEntry({
      kind: 'site',
      crabUrl: siteCrabUrl,
      title: siteTitle,
      status: rootStatus === 'fetched' ? 'gateway-resolved site with root fetched' : 'gateway-resolved site',
      detail: summary.ownerPassport || summary.ownerWallet || summary.payoutRecipient || 'owner not returned',
      source: 'site_resolved_proof',
      createdAt: new Date().toISOString(),
      cid: summary.manifestCid || summary.rootDocumentCid || '',
      raw: {
        schema: 'crablink.local-site-memory.v1',
        summary,
        root_status: rootStatus,
        root_http_status: rootResponse?.status || null,
        correlation_id: result?.response?.correlationId || rootResponse?.correlationId || '',
        truth_boundary:
          'This is local browser memory that a named site resolved through the gateway. It is not a backend catalogue or ownership index.',
      },
    });
  }, [
    siteCrabUrl,
    siteTitle,
    rootStatus,
    rootResponse?.status,
    rootResponse?.correlationId,
    result?.response?.correlationId,
    summary.manifestCid,
    summary.rootDocumentCid,
    summary.ownerPassport,
    summary.ownerWallet,
    summary.payoutRecipient,
  ]);

  const rootProofJson = safeJson({
    site: siteCrabUrl || null,
    schema: summary.schema || null,
    manifest_cid: summary.manifestCid || null,
    root_document_cid: summary.rootDocumentCid || null,
    root_url: rootUrl || null,
    root_status: rootStatus,
    root_http_status: rootResponse?.status || null,
    correlation_id: result?.response?.correlationId || rootResponse?.correlationId || null,
    receipts_count: receipts.length,
    warnings_count: warnings.length,
    creator_identity: {
      truth_level: creatorIdentity.truthLevel,
      handle: creatorIdentity.handle || null,
      profile_route: creatorIdentity.profileRoute || null,
      passport_subject: creatorIdentity.passportSubject || null,
      wallet_account: creatorIdentity.walletAccount || null,
      source: creatorIdentity.sourceLabel || null,
    },
    local_catalog: {
      written: Boolean(siteCrabUrl),
      kind: 'site',
      crab_url: siteCrabUrl || null,
      source: 'site_resolved_proof',
      truth_boundary:
        'Local catalog entry is display-only browser memory and does not claim backend catalogue/ownership truth.',
    },
    root_error: rootError ? normalizeRenderError(rootError) : null,
  });

  function openRootDocument() {
    if (rootUrl) {
      window.open(rootUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <section className="site-resolved-stack" aria-label="Resolved site proof">
      <SiteCreatorProfileProof
        app={app}
        result={result}
        summary={summary}
      />

      <Card
        eyebrow="Resolved site"
        title={siteTitle}
        className="site-resolved-card"
        actions={
          <div className="site-page-actions">
            <Badge tone={toneForRootStatus(rootStatus)}>{labelForRootStatus(rootStatus)}</Badge>
            <CopyButton text={siteCrabUrl || ''} label="Copy site URL" disabled={!siteCrabUrl} />
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
          <Fact label="Site" value={siteCrabUrl || 'not returned'} />
          <Fact label="Manifest CID" value={summary.manifestCid || 'not returned'} monospace />
          <Fact label="Root CID" value={summary.rootDocumentCid || 'not returned'} monospace />
          <Fact label="Root fetch" value={labelForRootStatus(rootStatus)} />
          <Fact label="Owner" value={summary.ownerPassport || summary.owner || 'not returned'} />
          <Fact label="Wallet" value={summary.ownerWallet || summary.payoutRecipient || 'not returned'} />
          <Fact label="Receipts" value={receipts.length ? `${receipts.length} returned` : 'none returned'} />
          <Fact
            label="Correlation"
            value={result?.response?.correlationId || rootResponse?.correlationId || 'n/a'}
            monospace
          />
          <Fact label="Creator" value={creatorIdentity.handle || creatorIdentity.badge || 'not confirmed'} />
          <Fact label="Creator route" value={creatorIdentity.profileRoute || 'not published yet'} />
          <Fact label="Local catalog" value={siteCrabUrl ? 'site remembered locally' : 'not remembered'} />
        </div>

        {summary.description && <p className="site-resolved-description">{summary.description}</p>}

        <div className="site-preview-badges" aria-label="Site tags, warnings, and creator truth">
          {Array.isArray(summary.tags) &&
            summary.tags.map((tag) => (
              <Badge key={tag} tone="neutral" uppercase={false}>
                #{tag}
              </Badge>
            ))}
          {warnings.length > 0 && <Badge tone="warning">{warnings.length} warning(s)</Badge>}
          {receipts.length > 0 && <Badge tone="success">{receipts.length} receipt(s)</Badge>}
          <Badge tone={creatorIdentity.truthLevel === 'backend_confirmed_profile' ? 'success' : 'warning'}>
            creator {creatorIdentity.truthLevel.replaceAll('_', ' ')}
          </Badge>
          <Badge tone={siteCrabUrl ? 'success' : 'warning'}>
            local catalog {siteCrabUrl ? 'updated' : 'not updated'}
          </Badge>
        </div>

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
              <small>Root fetch proof, creator proof, normalized summary, raw DTO, local catalog memory, and sandbox policy.</small>
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
                creator_identity: creatorIdentity,
                local_catalog_entry: {
                  kind: 'site',
                  crab_url: siteCrabUrl,
                  title: siteTitle,
                  source: 'site_resolved_proof',
                  cid: summary.manifestCid || summary.rootDocumentCid || '',
                  truth_boundary:
                    'Display-only browser memory. Backend catalogue/index/ownership truth must come from future gateway routes.',
                },
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
    </section>
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