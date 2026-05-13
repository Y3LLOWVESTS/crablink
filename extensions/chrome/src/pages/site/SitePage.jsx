/**
 * RO:WHAT — Route owner for crab://site and named crab://<site_name> views.
 * RO:WHY — Keeps site creation product-clean: guided launch first, preview second, diagnostics collapsed.
 * RO:INTERACTS — SiteLaunchFlow, SiteRender, SiteManifestDrawer, current passport/wallet app context.
 * RO:INVARIANTS — no silent ROC spend; current passport creates own sites; unsafe site HTML stays sandboxed.
 * RO:METRICS — gateway resolve/fetch/mutation calls carry correlation IDs through GatewayClient.
 * RO:CONFIG — app settings supply current passport/wallet hints only; no make-on-behalf fields.
 * RO:SECURITY — no direct storage/index/wallet/ledger calls; no scripts in preview iframe.
 * RO:TEST — crab://site guided launch + preview smoke; crab://<site_name> resolve smoke.
 */

import { useCallback } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import SiteLaunchFlow from './SiteLaunchFlow.jsx';
import SiteManifestDrawer from './SiteManifestDrawer.jsx';
import SiteRender from './SiteRender.jsx';
import {
  DEFAULT_SITE_DRAFT,
  buildSiteManifestDraft,
  getSiteCompleteness,
  normalizeSiteName,
  statsForSiteDraft,
} from './siteDraftModel.js';
import './site.css';

export default function SitePage({ app, route }) {
  const siteName = normalizeSiteName(route?.params?.siteName || '');
  const namedSiteMode = Boolean(siteName && siteName !== 'site');

  const buildManifest = useCallback(
    (draft) => buildSiteManifestDraft(draft, { app, route }),
    [app, route],
  );

  const buildStats = useCallback((draft) => statsForSiteDraft(draft, app), [app]);

  const getCompleteness = useCallback((draft) => getSiteCompleteness(draft, app), [app]);

  const draftState = useCreatorDraft({
    initialDraft: {
      ...DEFAULT_SITE_DRAFT,
      ownerPassport: app?.settings?.passportSubject || DEFAULT_SITE_DRAFT.ownerPassport,
      ownerWallet: app?.settings?.walletAccount || DEFAULT_SITE_DRAFT.ownerWallet,
      creatorDisplay:
        app?.settings?.handle ||
        app?.settings?.requestedHandle ||
        app?.settings?.passportSubject ||
        DEFAULT_SITE_DRAFT.creatorDisplay,
    },
    buildManifest,
    buildStats,
    getCompleteness,
  });

  if (namedSiteMode) {
    return (
      <section className="cl-page site-page">
        <PageHeader
          eyebrow="Named site"
          title={`crab://${siteName}`}
          copy="Resolve a named CrabLink site through the gateway, fetch its root document bytes, and render the page inside a scriptless sandbox."
          meta={
            <>
              <Badge tone="info">gateway read</Badge>
              <Badge tone="success">root preview</Badge>
              <Badge tone="neutral">no mutation</Badge>
            </>
          }
          actions={
            <div className="site-page-actions">
              <Button variant="secondary" onClick={app?.refreshRoute}>
                Refresh
              </Button>
              <Button variant="ghost" onClick={() => app?.navigate?.('crab://site')}>
                Create Site
              </Button>
            </div>
          }
        />

        <RouteTruthPanel
          routeKind="site"
          tone="info"
          title="Named site truth boundary"
          copy="This React route is read-only. It can resolve the site DTO, fetch the root document through the gateway, and render static content in a sandbox."
          allowed={[
            'gateway resolve',
            'manifest display',
            'root document fetch',
            'sandbox preview',
            'crab-image static preview',
            'copy proof fields',
          ]}
          blocked={[
            'no site creation from named view',
            'no wallet mutation from named view',
            'no fake receipt',
            'no direct storage/index call',
            'no script execution in preview',
          ]}
        />

        <SiteRender app={app} route={route} siteName={siteName} mode="named" />
      </section>
    );
  }

  const developerMode = draftState.viewMode === 'developer' || app?.settings?.devMode === true;

  return (
    <section className="cl-page site-page site-page-clean">
      <PageHeader
        eyebrow="crab://site"
        title="Site Workspace"
        copy="Create a passport-owned CrabLink site: choose a name, add HTML, preview it safely, then launch through prepare → hold → store root → create."
        meta={
          <>
            <Badge tone="warning">local draft</Badge>
            <Badge tone="info">paid launch v1</Badge>
            <Badge tone="success">root auto-fill</Badge>
            <Badge tone="neutral">safe preview</Badge>
          </>
        }
        actions={
          <div className="site-page-actions">
            <Button variant="secondary" onClick={draftState.clearDraft}>
              Clear draft
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                document
                  .getElementById('site-launch-flow')
                  ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
              }
            >
              Launch flow
            </Button>
          </div>
        }
      />

      {developerMode && (
        <RouteTruthPanel
          routeKind="site"
          tone="info"
          title="Site route truth boundary"
          copy="CrabLink can prepare a site launch, request an explicit wallet hold, store root HTML through gateway /paid/o, auto-fill the b3 root CID, and submit /sites with backend hold proof."
          allowed={[
            'current passport-owned site setup',
            'local root HTML preview',
            'static crab-image preview',
            '/sites/prepare through gateway',
            'explicit /wallet/hold through gateway',
            '/paid/o root HTML storage through gateway',
            '/sites create through gateway with proof',
          ]}
          blocked={[
            'no make-on-behalf creator fields',
            'no direct storage call',
            'no direct index call',
            'no direct ledger call',
            'no fake root document CID',
            'no fake receipt',
            'no silent ROC spend',
          ]}
        />
      )}

      <main className="site-clean-main">
        <div id="site-launch-flow" className="site-anchor-target">
          <SiteLaunchFlow app={app} route={route} draftState={draftState} />
        </div>

        <div id="site-preview" className="site-anchor-target">
          <SiteRender app={app} route={route} draftState={draftState} mode="draft" />
        </div>
      </main>

      <details className="site-advanced-drawer site-proof-drawer" open={developerMode}>
        <summary>
          <span>
            <strong>Advanced proof and diagnostics</strong>
            <small>Manifest JSON, route debug, and truth-boundary details. Not required for normal site creation.</small>
          </span>
          <Badge tone="neutral">developer</Badge>
        </summary>

        <section className="site-proof-grid">
          <SiteManifestDrawer draftState={draftState} />

          <Card eyebrow="Developer" title="Route debug">
            <JsonPreview
              label="Site route debug"
              data={{
                route_kind: route?.kind || 'site',
                requested_url: route?.rawInput || '',
                normalized_url: route?.normalizedInput || '',
                parsed_at: route?.parsedAt || '',
                page_owner: 'extensions/chrome/src/pages/site/SitePage.jsx',
                mode: 'passport_owned_guided_site_launch',
                builder_view: 'guided_setup_launch_preview',
                creator_scope: 'current_passport_only',
                named_site_renderer_ready: true,
                launch_flow_ready: true,
                root_html_auto_store_ready: true,
              }}
            />
          </Card>
        </section>
      </details>
    </section>
  );
}