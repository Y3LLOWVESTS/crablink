/**
 * RO:WHAT — Scriptless sandbox iframe preview for local and gateway-resolved CrabLink sites.
 * RO:WHY — Keeps untrusted site HTML outside the privileged React DOM while still rendering useful previews.
 * RO:INTERACTS — SiteRender, safeHtml, sandboxFrame, siteClient asset URL helpers, JsonPreview.
 * RO:INVARIANTS — no allow-scripts; no extension API access; no direct internal-service calls; no fake root bytes.
 * RO:METRICS — safe renderer policy includes embed and sanitizer summaries for diagnostics.
 * RO:CONFIG — caller supplies mode, summary, local draft, and siteClient.
 * RO:SECURITY — active HTML is sanitized before srcDoc and then isolated by iframe sandbox.
 * RO:TEST — local crab://site preview; named-site root preview; crab-image embed smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { buildSandboxedSiteHtml } from '../../shared/embed/safeHtml.js';
import { describeSandboxPolicy, getSiteIframeSandboxProps } from '../../shared/embed/sandboxFrame.js';
import { fallbackSiteHtml, labelForRootStatus, toneForRootStatus } from './siteRenderModel.js';

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
  const effectiveSummary = isLocal ? localSummary : summary;
  const previewHtml = isLocal
    ? draft.rootHtml || fallbackSiteHtml(localSummary, 'missing')
    : rootHtml || fallbackSiteHtml(summary, rootStatus, rootError);
  const sandboxed = buildSandboxedSiteHtml(previewHtml, {
    summary: effectiveSummary,
    source: isLocal ? 'local' : 'gateway',
    siteClient,
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
          <Badge tone={embedSummary.blocked ? 'warning' : 'success'}>
            {Number(embedSummary.rendered || 0)} embed(s) rendered
          </Badge>
          {Number(embedSummary.blocked || 0) > 0 && <Badge tone="warning">{embedSummary.blocked} blocked</Badge>}
          {!isLocal && <Badge tone={toneForRootStatus(rootStatus)}>{labelForRootStatus(rootStatus)}</Badge>}
        </div>
      }
    >
      <iframe
        title={`${effectiveSummary.siteName || 'site'} preview`}
        className="site-preview-frame"
        {...getSiteIframeSandboxProps()}
        srcDoc={sandboxed.html}
      />

      <ReferenceGraphPreview referenceGraph={referenceGraph} embedSummary={embedSummary} />

      {isLocal && (
        <div className="site-preview-meta">
          <Fact label="Name" value={draft.siteName || 'not set'} />
          <Fact label="Title" value={draft.title || 'not set'} />
          <Fact label="Owner" value={draft.ownerPassport || app?.settings?.passportSubject || 'not set'} />
          <Fact label="Policy" value={draft.renderPolicy || 'not set'} />
        </div>
      )}

      {developer && (
        <JsonPreview
          label={isLocal ? 'Local preview render policy' : 'Gateway preview render policy'}
          data={{
            manifest: isLocal ? manifest : null,
            safe_renderer: renderPolicy,
            sandbox_policy: describeSandboxPolicy(),
          }}
        />
      )}
    </Card>
  );
}

function ReferenceGraphPreview({ referenceGraph = {}, embedSummary = {} }) {
  const references = Array.isArray(referenceGraph.references) ? referenceGraph.references : [];
  const hasReferences = references.length > 0;
  const encountered = Number(embedSummary.encountered || 0);

  if (!hasReferences && encountered <= 0) {
    return (
      <section className="site-reference-graph" aria-label="Reference graph summary">
        <div>
          <span>Reference graph</span>
          <strong>No crab asset references detected in this root document.</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="site-reference-graph" aria-label="Reference graph summary">
      <div className="site-reference-graph-head">
        <div>
          <span>Reference graph</span>
          <strong>
            {referenceGraph.total || references.length || encountered} crab reference(s) detected; {embedSummary.rendered || 0} rendered,{' '}
            {embedSummary.blocked || 0} blocked.
          </strong>
        </div>
        <Badge tone={Number(embedSummary.blocked || 0) > 0 ? 'warning' : 'success'}>
          {Number(embedSummary.blocked || 0) > 0 ? 'fail-closed' : 'clean'}
        </Badge>
      </div>

      {hasReferences && (
        <div className="site-reference-graph-list">
          {references.slice(0, 8).map((reference, index) => (
            <div key={`${reference.crabUrl || reference.tag || 'reference'}-${index}`}>
              <span>{reference.tag || 'crab-reference'}</span>
              <strong>{reference.crabUrl || reference.detail || 'unresolved reference'}</strong>
              <small>{reference.status || 'unknown'} · {reference.kind || 'unknown kind'}</small>
            </div>
          ))}
        </div>
      )}

      {references.length > 8 && <p className="site-panel-note">Showing first 8 references. Developer diagnostics contain the full summary.</p>}
    </section>
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