/**
 * RO:WHAT — Route owner for crab://site and named crab://<site_name> views.
 * RO:WHY — Migrates site UI into React while preserving paid launch safety and gateway-only boundaries.
 * RO:INTERACTS — SiteCreate, SiteLaunchFlow, SiteRender, SiteManifestDrawer, SiteCreatorProof, SiteRootUpload.
 * RO:INVARIANTS — no silent ROC spend; launch stores root HTML through gateway; unsafe site HTML stays sandboxed.
 * RO:METRICS — gateway resolve/fetch/mutation calls carry correlation IDs through GatewayClient.
 * RO:CONFIG — app settings can supply display-only passport/wallet hints.
 * RO:SECURITY — no direct storage/index/wallet/ledger calls; no scripts in preview iframe.
 * RO:TEST — crab://site builder + root store launch smoke; crab://<site_name> resolve smoke.
 */

import { useCallback } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import SiteCreate from './SiteCreate.jsx';
import SiteCreatorProof from './SiteCreatorProof.jsx';
import SiteLaunchFlow from './SiteLaunchFlow.jsx';
import SiteManifestDrawer from './SiteManifestDrawer.jsx';
import SiteRender from './SiteRender.jsx';
import SiteRootUpload from './SiteRootUpload.jsx';
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
          copy="Resolve a named CrabLink site through the gateway, show the hydrated manifest proof, fetch the root document bytes, and render the page inside a scriptless sandbox."
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
          copy="This React route is a read-only named-site renderer. It can resolve the site DTO, display backend-returned proof fields, fetch the root document through the gateway, and render static content in a sandbox."
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

  return (
    <section className="cl-page site-page">
      <PageHeader
        eyebrow="crab://site"
        title="Site Workspace"
        copy="Draft a CrabLink site manifest, root document, route map, asset references, creator proof, safe preview, and explicit gateway launch flow."
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
            <Button variant="primary" onClick={() => document.getElementById('site-launch-flow')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}>
              Launch flow
            </Button>
          </div>
        }
      />

      <RouteTruthPanel
        routeKind="site"
        tone="info"
        title="Site route truth boundary"
        copy="React can now prepare a site launch, request an explicit wallet hold, store the root HTML through gateway /paid/o, auto-fill the returned b3 root CID, and submit /sites with backend hold proof."
        allowed={[
          'local root HTML preview',
          'manifest draft',
          'route map planning',
          'asset map planning',
          'creator proof preview',
          'static crab-image preview',
          '/sites/prepare through gateway',
          'explicit /wallet/hold through gateway',
          '/paid/o root HTML storage through gateway',
          '/sites create through gateway with proof',
        ]}
        blocked={[
          'no direct storage call',
          'no direct index call',
          'no direct ledger call',
          'no fake root document CID',
          'no fake receipt',
          'no silent ROC spend',
          'no backend publication claim before /sites succeeds',
        ]}
      />

      <section className="site-workspace-grid">
        <main className="site-workspace-main">
          <SiteCreate app={app} draftState={draftState} />
          <SiteRootUpload draftState={draftState} />
          <SiteRender app={app} route={route} draftState={draftState} mode="draft" />
          <div id="site-launch-flow">
            <SiteLaunchFlow app={app} route={route} draftState={draftState} />
          </div>
          <SiteManifestDrawer draftState={draftState} />
        </main>

        <aside className="site-workspace-side" aria-label="Site workspace side panels">
          <SiteCreatorProof app={app} draftState={draftState} />

          <Card eyebrow="Status" title="Site draft health">
            <div className="site-side-stats">
              <StatChip label="Complete" value={`${draftState.completeness}%`} help="Local draft completeness" tone="info" />
              <StatChip label="Routes" value={draftState.stats.routeCount} help="Parsed route map entries" />
              <StatChip label="Assets" value={draftState.stats.assetCount} help="Parsed asset map entries" />
              <StatChip
                label="Root"
                value={draftState.stats.hasRootCidHint ? 'stored' : 'local only'}
                help={draftState.stats.rootGuard?.reason || ''}
                tone={draftState.stats.hasRootCidHint ? 'success' : 'warning'}
              />
            </div>

            <div className="site-completeness">
              <span style={{ width: `${draftState.completeness}%` }} />
            </div>

            <div className="site-side-badges">
              <Badge tone="info">prepare wired</Badge>
              <Badge tone="info">hold wired</Badge>
              <Badge tone="success">root store wired</Badge>
              <Badge tone="info">create wired</Badge>
            </div>
          </Card>

          {draftState.viewMode === 'developer' && (
            <Card eyebrow="Developer" title="Route debug">
              <JsonPreview
                label="Site route debug"
                data={{
                  route_kind: route?.kind || 'site',
                  requested_url: route?.rawInput || '',
                  normalized_url: route?.normalizedInput || '',
                  parsed_at: route?.parsedAt || '',
                  page_owner: 'extensions/chrome/src/pages/site/SitePage.jsx',
                  mode: 'local_site_workspace',
                  named_site_renderer_ready: true,
                  launch_flow_ready: true,
                  root_html_auto_store_ready: true,
                }}
              />
            </Card>
          )}
        </aside>
      </section>
    </section>
  );
}