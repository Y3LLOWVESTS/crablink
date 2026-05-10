/**
 * RO:WHAT — CrabLink React home dashboard for route smoke testing and migration status.
 * RO:WHY — App Integration; Concerns: DX/SEC; gives the React lane a safe control room after local route migration.
 * RO:INTERACTS — HomeQuickActions, shared PageHeader/Card/TruthBoundary components, app navigation.
 * RO:INVARIANTS — navigation only; no fake backend truth; no paid action; no wallet mutation; no CID creation.
 * RO:METRICS — none.
 * RO:CONFIG — route context from App and local HTTP preview instructions.
 * RO:SECURITY — no backend calls and no untrusted rendering from this page.
 * RO:TEST — manual route smoke from home quick actions in light/dark mode.
 */

import Card from '../../shared/components/Card.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

export default function HomePage({ app }) {
  return (
    <section className="cl-page home-page">
      <PageHeader
        eyebrow="CrabLink React lane"
        title="Route Smoke Dashboard"
        copy="Use this page as the control room for testing every built-in crab:// route, confirming route ownership, and keeping local draft pages separate from protected backend-parity flows."
      />

      <section className="cl-home-hero-grid" aria-label="React lane status">
        <StatusCard
          eyebrow="Current sweep"
          title="Local creator routes"
          value="12"
          copy="lyrics, post, comment, article, music, podcast, stream, video, ad, algo, code, and game are local-only draft workspaces."
        />

        <StatusCard
          eyebrow="Protected routes"
          title="Move later"
          value="4"
          copy="site, image, profile, and generic asset views still need careful parity work before the old proven lane can be replaced."
        />

        <StatusCard
          eyebrow="Truth boundary"
          title="No fake backend"
          value="0"
          copy="Home quick actions only navigate. They do not create CIDs, publish manifests, spend ROC, or mutate wallet state."
        />
      </section>

      <TruthBoundary
        tone="info"
        title="Protected hybrid mode"
        copy="The old page.html/page.js lane remains preserved for proven site/image/profile/passport/paid flows. The React lane is the safe migration runway and is tested through local HTTP preview."
      />

      <HomeQuickActions app={app} />

      <section className="cl-home-bottom-grid" aria-label="Testing and next work">
        <Card eyebrow="Manual smoke sequence" title="Route switching regression check">
          <p>
            After every route batch, use the dashboard buttons or address bar to confirm the previous
            workspace disappears before the next one appears.
          </p>

          <ol className="cl-home-smoke-list">
            <li>crab://article → crab://video → crab://stream → crab://podcast</li>
            <li>crab://ad → crab://algo → crab://code → crab://game</li>
            <li>crab://lyrics → crab://post → crab://comment → crab://music</li>
            <li>crab://site → crab://image → crab://profile → crab://home</li>
          </ol>
        </Card>

        <Card eyebrow="Next phase" title="Recommended next work">
          <p>
            With the local creator pages in place, the next careful phase should be shared component
            extraction and route contract hardening before touching protected backend-parity routes.
          </p>

          <div className="cl-home-next-list">
            <span>CreatorWorkspaceLayout</span>
            <span>DraftStatsPanel</span>
            <span>TruthBoundaryBox</span>
            <span>RouteDebugPanel</span>
            <span>LinkedAssetsEditor</span>
            <span>Manifest helpers</span>
          </div>
        </Card>
      </section>
    </section>
  );
}

function StatusCard({ eyebrow, title, value, copy }) {
  return (
    <article className="cl-home-status-card">
      <p className="cl-eyebrow">{eyebrow}</p>
      <div>
        <strong>{value}</strong>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </article>
  );
}