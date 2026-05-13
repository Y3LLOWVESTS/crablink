/**
 * RO:WHAT — Developer diagnostics panel for named-site resolve/root/sandbox state.
 * RO:WHY — Keeps proof/debug JSON visible without cluttering the main named-site builder view.
 * RO:INTERACTS — SiteRender, JsonPreview, sandbox policy helpers, siteClient normalized result.
 * RO:INVARIANTS — display-only; no fake backend truth; no secrets; no direct service calls.
 * RO:METRICS — displays route attempts, root fetch status, bytes, and correlation IDs returned by gateway.
 * RO:CONFIG — none.
 * RO:SECURITY — JsonPreview redacts token-like fields; no untrusted HTML rendering here.
 * RO:TEST — manual developer panel smoke on crab://<site_name>.
 */

import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { describeSandboxPolicy } from '../../shared/embed/sandboxFrame.js';
import { normalizeRenderError, summarizeRootResponse } from './siteRenderModel.js';

export default function SiteDiagnostics({ result, summary, rootStatus, rootResponse, rootHtml, rootError, sandboxPolicy }) {
  return (
    <Card eyebrow="Developer" title="Hydrated site diagnostics">
      <JsonPreview
        label="Site resolve diagnostics"
        data={{
          source: result?.source || 'unknown',
          resolved_at: result?.resolvedAt || '',
          root_status: rootStatus,
          root_response: summarizeRootResponse(rootResponse, rootHtml, rootError),
          root_error: rootError ? normalizeRenderError(rootError) : null,
          attempts: result?.attempts || [],
          summary,
          safe_renderer: sandboxPolicy || null,
          sandbox_policy: describeSandboxPolicy(),
        }}
      />
      <JsonPreview label="Site response JSON" data={result?.data || null} />
    </Card>
  );
}