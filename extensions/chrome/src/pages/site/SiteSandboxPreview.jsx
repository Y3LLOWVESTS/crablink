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

  return (
    <Card
      eyebrow="Sandbox"
      title={isLocal ? 'Local site sandbox preview' : 'Site preview'}
      className="site-preview-card"
      actions={
        <div className="site-preview-badges">
          <Badge tone={isLocal ? 'warning' : 'info'}>{isLocal ? 'local only' : 'read-only'}</Badge>
          <Badge tone="neutral">scripts stripped</Badge>
          <Badge tone="neutral">strict sandbox</Badge>
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
            safe_renderer: sandboxed.policy,
            sandbox_policy: describeSandboxPolicy(),
          }}
        />
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