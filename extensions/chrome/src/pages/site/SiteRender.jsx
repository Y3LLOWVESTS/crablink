/**
 * RO:WHAT — Safe site renderer for local drafts and named gateway-resolved sites.
 * RO:WHY — Gives React site route first-class rendering while keeping resolution, root fetch, and preview isolated.
 * RO:INTERACTS — siteClient, safeHtml/sandbox components, SiteManifestDrawer, SiteCreatorProof, site render subcomponents.
 * RO:INVARIANTS — gateway-only named resolution; no direct storage/index; iframe preview has no scripts; no fake manifest/root proof.
 * RO:METRICS — displays gateway status, root fetch status, correlation IDs, sandbox policy, and embed render summary.
 * RO:CONFIG — gateway client from app context.
 * RO:SECURITY — untrusted HTML goes through shared sanitizer and strict sandbox iframe props.
 * RO:TEST — crab://site local preview; crab://<site_name> gateway preview; <crab-image> embed preview.
 */

import { useEffect, useMemo, useState } from 'react';
import Button from '../../shared/components/Button.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import { createSiteClient } from '../../shared/api/siteClient.js';
import SiteCreatorProof from './SiteCreatorProof.jsx';
import SiteDiagnostics from './SiteDiagnostics.jsx';
import SiteManifestDrawer from './SiteManifestDrawer.jsx';
import SiteResolvedSummary from './SiteResolvedSummary.jsx';
import SiteRootDocumentPanel from './SiteRootDocumentPanel.jsx';
import SiteSandboxPreview from './SiteSandboxPreview.jsx';

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

  return (
    <section className="site-render-stack">
      <SiteResolvedSummary app={app} result={result} />

      <SiteRootDocumentPanel
        summary={summary}
        rootStatus={rootStatus}
        rootResponse={rootResponse}
        rootError={rootError}
        rootUrl={rootUrl}
      />

      <SiteCreatorProof resolvedSite={result} />

      <SiteSandboxPreview
        mode="gateway"
        summary={summary}
        rootHtml={previewHtml}
        rootStatus={rootStatus}
        rootError={rootError}
        siteClient={siteClient}
      />

      <SiteManifestDrawer resolvedSite={result} />

      <SiteDiagnostics
        result={result}
        summary={summary}
        rootStatus={rootStatus}
        rootResponse={rootResponse}
        rootHtml={rootHtml}
        rootError={rootError}
      />
    </section>
  );
}