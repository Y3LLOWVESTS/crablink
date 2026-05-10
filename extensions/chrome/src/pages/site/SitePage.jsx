/**
 * RO:WHAT — Route owner for crab://site and named crab://<site_name> views.
 * RO:WHY — Migrates site UI into React while preserving old-lane paid site launch behavior.
 * RO:INTERACTS — SiteCreate, SiteRender, SiteManifestDrawer, SiteCreatorProof, SiteRootUpload, siteClient.
 * RO:INVARIANTS — no silent ROC spend; no fake site creation; named sites resolve through gateway only; unsafe site HTML stays sandboxed.
 * RO:METRICS — gateway resolve/fetch calls carry correlation IDs through GatewayClient.
 * RO:CONFIG — app settings can supply display-only passport/wallet hints.
 * RO:SECURITY — no direct storage/index/wallet/ledger calls; no scripts in preview iframe.
 * RO:TEST — crab://site local builder smoke; crab://<site_name> read-only resolve smoke.
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

  const buildStats = useCallback(
    (draft) => statsForSiteDraft(draft, app),
    [app],
  );

  const getCompleteness = useCallback(
    (draft) => getSiteCompleteness(draft, app),
    [app],
  );

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
          copy="Resolve and preview a named CrabLink site through the configured gateway. This page is read-only in the React lane."
          meta={
            <>
              <Badge tone="info">gateway read</Badge>
              <Badge tone="neutral">sandbox preview</Badge>
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
          copy="Named sites in this React route are read-only gateway views. Site creation, wallet hold, receipt capture, and index writes remain in the protected legacy/proven flow until parity is intentionally wired."
          allowed={[
            'gateway resolve',
            'manifest display',
            'root document fetch',
            'sandbox preview',
            'copy fields',
          ]}
          blocked={[
            'no site creation',
            'no /sites mutation',
            'no wallet mutation',
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
        copy="Draft a CrabLink site manifest, root document, route map, asset references, creator proof, and safe preview without claiming backend launch."
        meta={
          <>
            <Badge tone="warning">local draft</Badge>
            <Badge tone="neutral">no paid launch yet</Badge>
            <Badge tone="neutral">safe preview</Badge>
          </>
        }
        actions={
          <div className="site-page-actions">
            <Button variant="secondary" onClick={draftState.clearDraft}>
              Clear draft
            </Button>
            <Button variant="primary" disabled title="Paid site launch remains protected until React parity is ready.">
              Launch site later
            </Button>
          </div>
        }
      />

      <RouteTruthPanel
        routeKind="site"
        tone="warning"
        title="Site route truth boundary"
        allowed={[
          'local root HTML preview',
          'manifest draft',
          'route map planning',
          'asset map planning',
          'creator proof preview',
        ]}
        blocked={[
          'no /sites/prepare mutation',
          'no /sites create mutation',
          'no wallet hold',
          'no receipt',
          'no index pointer',
          'no backend publication claim',
        ]}
      />

      <section className="site-workspace-grid">
        <main className="site-workspace-main">
          <SiteCreate app={app} draftState={draftState} />
          <SiteRootUpload draftState={draftState} />
          <SiteRender app={app} route={route} draftState={draftState} mode="draft" />
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
                value={draftState.stats.rootGuard?.ok ? 'ready' : 'needs work'}
                help={draftState.stats.rootGuard?.reason || ''}
                tone={draftState.stats.rootGuard?.ok ? 'success' : 'warning'}
              />
            </div>

            <div className="site-completeness">
              <span style={{ width: `${draftState.completeness}%` }} />
            </div>

            <div className="site-side-badges">
              <Badge tone="warning">backend false</Badge>
              <Badge tone="neutral">wallet false</Badge>
              <Badge tone="neutral">receipt false</Badge>
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
                }}
              />
            </Card>
          )}
        </aside>
      </section>
    </section>
  );
}