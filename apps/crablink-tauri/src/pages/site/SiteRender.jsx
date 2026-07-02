/**
 * RO:WHAT — Safe site renderer for local drafts and named gateway-resolved sites.
 * RO:WHY — Keeps site rendering focused: resolve metadata first, defer protected root fetch until paid access proof, sandbox render, and proof panel.
 * RO:INTERACTS — siteClient, SiteVisitAccess, SiteSandboxPreview, SiteResolvedProof, shared safe renderer.
 * RO:INVARIANTS — gateway-only named resolution; protected root fetch waits for backend access; no direct storage/index; iframe preview has no scripts; no fake proof or silent spend.
 * RO:METRICS — displays gateway status, root fetch status, correlation IDs, sandbox policy, and embed render summary.
 * RO:CONFIG — gateway client from app context.
 * RO:SECURITY — untrusted HTML goes through shared sanitizer and strict sandbox iframe props.
 * RO:TEST — crab://site local preview; crab://<site_name> gateway preview; paid site_visit unlock; <crab-image> embed preview.
 */

import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../../shared/components/LoadingState.jsx';
import RouteProblemPanel from '../../shared/components/RouteProblemPanel.jsx';
import { createSiteClient } from '../../shared/api/siteClient.js';
import SiteResolvedProof from './SiteResolvedProof.jsx';
import SiteSandboxPreview from './SiteSandboxPreview.jsx';
import SiteVisitAccess, { deriveSiteVisitPolicy, siteVisitCanRender } from './SiteVisitAccess.jsx';

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
        const rootStatus = result.summary.rootDocumentCid ? 'root_locked_until_paid_access' : 'missing';

        if (!alive) {
          return;
        }

        setState({
          status: 'resolved',
          result,
          rootHtml: '',
          rootStatus,
          rootResponse: null,
          rootError: null,
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
  }, [mode, siteName, siteClient]);

  if (mode !== 'named') {
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

  if (state.status === 'loading') {
    return <LoadingState title="Resolving named site" copy={`Fetching crab://${siteName} through the configured gateway…`} />;
  }

  if (state.status === 'error') {
    return (
      <RouteProblemPanel
        title="Unable to resolve named site"
        copy={`CrabLink could not resolve crab://${siteName} through the configured gateway.`}
        error={state.error}
        actions={
          <button className="cl-button cl-button-secondary" type="button" onClick={app?.refreshRoute}>
            Retry
          </button>
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

function ResolvedSiteView({ app, result, rootStatus, siteClient }) {
  const summary = result?.summary || {};
  const rootDocumentCid = summary.rootDocumentCid || '';
  const rootUrl = siteClient.rootDocumentUrl(rootDocumentCid);
  const developer = Boolean(app?.settings?.devMode || app?.state?.developerMode || app?.state?.viewMode === 'developer');
  const [visitAccess, setVisitAccess] = useState(null);
  const [rootState, setRootState] = useState(() => ({
    rootHtml: '',
    rootStatus: rootDocumentCid ? rootStatus || 'root_locked_until_paid_access' : 'missing',
    rootResponse: null,
    rootError: null,
  }));

  const initialPolicy = deriveSiteVisitPolicy(summary, {
    walletAccount: app?.settings?.walletAccount || app?.state?.walletAccount || '',
    passportSubject: app?.settings?.passportSubject || app?.state?.passportSubject || '',
  });

  const pendingPaidAccess = initialPolicy.requiresPayment && !visitAccess;
  const canRenderPreview = !pendingPaidAccess && siteVisitCanRender(visitAccess || { requiresPayment: false, canRender: true }, app);

  useEffect(() => {
    let alive = true;

    async function fetchRootDocumentAfterAccess() {
      if (!rootDocumentCid) {
        setRootState({
          rootHtml: '',
          rootStatus: 'missing',
          rootResponse: null,
          rootError: null,
        });
        return;
      }

      if (!canRenderPreview) {
        setRootState({
          rootHtml: '',
          rootStatus: 'root_locked_until_paid_access',
          rootResponse: null,
          rootError: null,
        });
        return;
      }

      setRootState({
        rootHtml: '',
        rootStatus: 'loading_after_backend_access',
        rootResponse: null,
        rootError: null,
      });

      try {
        const response = await siteClient.fetchRootDocument(rootDocumentCid);
        const html = String(response.data || '');

        if (!alive) {
          return;
        }

        setRootState({
          rootHtml: html,
          rootStatus: html.trim() ? 'ok' : 'empty',
          rootResponse: response,
          rootError: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setRootState({
          rootHtml: '',
          rootStatus: 'error',
          rootResponse: null,
          rootError: error,
        });
      }
    }

    void fetchRootDocumentAfterAccess();

    return () => {
      alive = false;
    };
  }, [canRenderPreview, rootDocumentCid, siteClient]);

  const previewHtml = canRenderPreview ? rootState.rootHtml : '';

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
          rootStatus={rootState.rootStatus}
          rootError={rootState.rootError}
          app={app}
          siteClient={siteClient}
          developer={developer}
        />
      ) : (
        <section className="site-preview-locked" aria-label="Paid site preview locked">
          <p className="cl-eyebrow">Preview locked</p>
          <h2>Pay the site visit quote to render this page</h2>
          <p>
            CrabLink has resolved site metadata, but it has not fetched or rendered the protected site root document yet.
            Backend receipt/access proof is required before protected site bytes are requested.
          </p>
        </section>
      )}

      <SiteResolvedProof
        app={app}
        result={result}
        rootHtml={canRenderPreview ? rootState.rootHtml : ''}
        rootStatus={rootState.rootStatus}
        rootResponse={canRenderPreview ? rootState.rootResponse : null}
        rootError={rootState.rootError}
        rootUrl={rootUrl}
        rootFetchGate={canRenderPreview ? 'backend_access_allowed' : 'locked_until_paid_access'}
      />
    </section>
  );
}
