/**
 * RO:WHAT — Safe site renderer for local drafts and named gateway-resolved sites.
 * RO:WHY — Keeps site rendering focused: resolve/fetch root, render sandbox, show one consolidated proof panel.
 * RO:INTERACTS — siteClient, SiteVisitAccess, SiteSandboxPreview, SiteResolvedProof, shared safe renderer.
 * RO:INVARIANTS — gateway-only named resolution; no direct storage/index; iframe preview has no scripts; no fake proof or silent spend.
 * RO:METRICS — displays gateway status, root fetch status, correlation IDs, sandbox policy, and embed render summary.
 * RO:CONFIG — gateway client from app context.
 * RO:SECURITY — untrusted HTML goes through shared sanitizer and strict sandbox iframe props.
 * RO:TEST — crab://site local preview; crab://<site_name> gateway preview; <crab-image> embed preview.
 */

import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../../shared/components/LoadingState.jsx';
import RouteProblemPanel from '../../shared/components/RouteProblemPanel.jsx';
import { createSiteClient } from '../../shared/api/siteClient.js';
import SiteResolvedProof from './SiteResolvedProof.jsx';
import SiteSandboxPreview from './SiteSandboxPreview.jsx';
import SiteVisitAccess, { siteVisitCanRender } from './SiteVisitAccess.jsx';

const EMPTY_STATE = Object.freeze({
  status: 'idle',
  result: null,
  rootHtml: '',
  rootStatus: 'idle',
  rootResponse: null,
  rootError: null,
  error: null,
});

export default function SiteRender({
  app,
  route,
  draftState = null,
  siteName = '',
  mode = 'draft',
}) {
  const gateway = app?.clients?.gateway || null;
  const siteClient = useMemo(() => createSiteClient(gateway), [gateway]);
  const [state, setState] = useState(() => ({
    ...EMPTY_STATE,
    status: mode === 'named' ? 'loading' : 'local',
  }));

  useEffect(() => {
    let alive = true;

    async function resolveNamedSite() {
      if (mode !== 'named') {
        setState({ ...EMPTY_STATE, status: 'local' });
        return;
      }

      setState({ ...EMPTY_STATE, status: 'loading' });

      try {
        const result = await siteClient.resolveSite(siteName);
        let rootHtml = '';
        let rootStatus = result.summary.rootDocumentCid ? 'loading' : 'missing';
        let rootResponse = null;
        let rootError = null;

        if (alive) {
          setState({
            ...EMPTY_STATE,
            status: 'resolved',
            result,
            rootStatus,
          });
        }

        if (result.summary.rootDocumentCid) {
          try {
            rootResponse = await siteClient.fetchRootDocument(result.summary.rootDocumentCid);
            rootHtml = String(rootResponse.data || '');
            rootStatus = rootHtml.trim() ? 'ok' : 'empty';
          } catch (error) {
            rootStatus = 'error';
            rootError = error;
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
          rootStatus,
          rootResponse,
          rootError,
          error: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          ...EMPTY_STATE,
          status: 'error',
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
        <RouteProblemPanel
          title="Site could not be resolved"
          copy="The gateway did not return a hydrated site response. React is showing the failure instead of inventing a site."
          error={state.error}
          route={route}
          target={{
            siteName,
            crabUrl: `crab://${siteName}`,
            route_kind: 'named_site',
          }}
          remediation="If this site was just created, refresh after the gateway/index is ready. Otherwise open crab://site and create the named pointer first."
          onRetry={app?.refreshRoute}
          onWorkspace={() => app?.navigate?.('crab://site')}
          workspaceLabel="Open Site Workspace"
          jsonLabel="Named site problem JSON"
          attemptTitle="Named site gateway attempt"
        />
      );
    }

    return (
      <ResolvedSiteView
        app={app}
        result={state.result}
        rootHtml={state.rootHtml}
        rootStatus={state.rootStatus}
        rootResponse={state.rootResponse}
        rootError={state.rootError}
        siteClient={siteClient}
      />
    );
  }

  return (
    <SiteSandboxPreview
      mode="local"
      draftState={draftState}
      app={app}
      siteClient={siteClient}
      developer={draftState?.viewMode === 'developer'}
    />
  );
}

function ResolvedSiteView({ app, result, rootHtml, rootStatus, rootResponse, rootError, siteClient }) {
  const summary = result?.summary || {};
  const rootUrl = siteClient.rootDocumentUrl(summary.rootDocumentCid);
  const previewHtml = rootHtml || '';
  const developer = Boolean(app?.settings?.devMode || app?.state?.developerMode || app?.state?.viewMode === 'developer');
  const [visitAccess, setVisitAccess] = useState(null);
  const canRenderPreview = siteVisitCanRender(visitAccess || { requiresPayment: false, canRender: true }, app);

  return (
    <section className="site-render-stack">
      <SiteVisitAccess
        app={app}
        result={result}
        siteClient={siteClient}
        onAccessChange={setVisitAccess}
      />

      {canRenderPreview ? (
        <SiteSandboxPreview
          mode="gateway"
          summary={summary}
          rootHtml={previewHtml}
          rootStatus={rootStatus}
          rootError={rootError}
          siteClient={siteClient}
          developer={developer}
        />
      ) : (
        <section className="site-preview-locked" aria-label="Paid site preview locked">
          <p className="cl-eyebrow">Preview locked</p>
          <h2>Pay the site visit quote to render this page</h2>
          <p>
            CrabLink has the site bytes, but it will not render paid content until the backend returns a
            payment receipt. This prevents fake creator payouts and silent wallet deductions.
          </p>
        </section>
      )}

      <SiteResolvedProof
        app={app}
        result={result}
        rootHtml={rootHtml}
        rootStatus={rootStatus}
        rootResponse={rootResponse}
        rootError={rootError}
        rootUrl={rootUrl}
      />
    </section>
  );
}