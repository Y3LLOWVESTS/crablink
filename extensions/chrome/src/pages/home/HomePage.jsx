/**
 * RO:WHAT — CrabLink React home dashboard for route smoke testing and migration status.
 * RO:WHY — App Integration; Concerns: DX/SEC; gives the React lane a safe control room after protected-route proofs.
 * RO:INTERACTS — HomeQuickActions, shared PageHeader/Card/TruthBoundary components, app navigation.
 * RO:INVARIANTS — navigation only; no fake backend truth; no paid action; no wallet mutation; no CID creation.
 * RO:METRICS — none.
 * RO:CONFIG — route context from App and extension settings.
 * RO:SECURITY — no backend calls and no untrusted rendering from this page.
 * RO:TEST — manual route smoke from home quick actions in light/dark mode.
 */

import Card from '../../shared/components/Card.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

const PROOF_SITE = 'crab://ron6';
const PROOF_REACT_IMAGE = 'crab://6e343cbcbcd233a72ce45b197d1c45caea862480221ef0f7e4e4360f17e1fce0.image';
const PROOF_PROFILE = 'crab://profile';

export default function HomePage({ app }) {
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || settings.baseUrl || 'http://127.0.0.1:8090';
  const passport = settings.passportSubject || 'not configured';
  const wallet = settings.walletAccount || 'not configured';

  return (
    <section className="cl-page home-page">
      <PageHeader
        eyebrow="CrabLink React lane"
        title="Route Smoke Dashboard"
        copy="Use this page as the control room for testing every built-in crab:// route, confirming route ownership, and keeping backend truth separate from local draft workspaces."
      />

      <section className="cl-home-hero-grid" aria-label="React lane status">
        <StatusCard
          eyebrow="Proof route"
          title="Named site"
          value="ron6"
          tone="success"
          copy={`${PROOF_SITE} is the newest named-site proof from the React site launch path. Keep testing it as a real gateway/index resolve path, not a local mock.`}
        />

        <StatusCard
          eyebrow="Proof route"
          title="React image"
          value=".image"
          tone="success"
          copy="The newest React-uploaded image proof should resolve as a gateway-backed typed asset when the same dev stack data is still present."
        />

        <StatusCard
          eyebrow="Truth boundary"
          title="Fake truth"
          value="0"
          tone="info"
          copy="Home quick actions only navigate and copy test URLs. They do not create CIDs, publish manifests, spend ROC, or mutate wallet state."
        />
      </section>

      <TruthBoundary
        tone="info"
        title="Protected hybrid mode"
        copy="The old page.html/page.js lane remains preserved until React proves extension-origin parity across site, image, profile, passport, balance, and asset reads. React is now the main refactor lane, but legacy deletion is still a later cleanup phase."
      />

      <section className="cl-home-context-grid" aria-label="Current local context">
        <Card eyebrow="Local context" title="Passport / wallet display">
          <div className="cl-home-context-list">
            <ContextRow label="Gateway" value={gatewayUrl} />
            <ContextRow label="Passport" value={passport} />
            <ContextRow label="Wallet" value={wallet} />
            <ContextRow label="Profile" value={PROOF_PROFILE} />
          </div>
          <p className="cl-home-muted">
            These values are local CrabLink context hints unless the gateway returns confirmed identity,
            wallet, profile, reputation, moderation, or publication truth.
          </p>
        </Card>

        <Card eyebrow="Testing path" title="Default React test flow">
          <ol className="cl-home-smoke-list">
            <li>Run the build/check/package/codebundle gate.</li>
            <li>Reload the unpacked extension staging folder.</li>
            <li>Open the old protected lane and click the React button.</li>
            <li>Use this dashboard or the address bar to test routes from extension origin.</li>
          </ol>
        </Card>
      </section>

      <HomeQuickActions app={app} proofSite={PROOF_SITE} proofImage={PROOF_REACT_IMAGE} />

      <section className="cl-home-bottom-grid" aria-label="Testing and next work">
        <Card eyebrow="Manual smoke sequence" title="Route switching regression check">
          <p>
            After every route batch, use this sequence to confirm the previous page disappears before
            the next one appears and no old DOM patch leaks into the new route owner.
          </p>

          <ol className="cl-home-smoke-list">
            <li>{PROOF_SITE} → crab://site → crab://profile → crab://home</li>
            <li>crab://image → newest .image proof → crab://home</li>
            <li>crab://article → crab://post → crab://comment → crab://lyrics</li>
            <li>crab://video → crab://stream → crab://podcast → crab://music</li>
            <li>crab://ad → crab://algo → crab://code → crab://game</li>
          </ol>
        </Card>

        <Card eyebrow="Next phase" title="Recommended next work">
          <p>
            With site, image, and profile now far enough along to test in React, the safest next phase
            is route diagnostics, generic asset polish, and reusable manifest panels before any legacy deletion.
          </p>

          <div className="cl-home-next-list">
            <span>RouteProblemPanel</span>
            <span>Generic asset polish</span>
            <span>Named-site diagnostics</span>
            <span>Known proof smoke</span>
            <span>Manifest drawer reuse</span>
            <span>Legacy cleanup later</span>
          </div>
        </Card>
      </section>
    </section>
  );
}

function StatusCard({ eyebrow, title, value, copy, tone = 'neutral' }) {
  return (
    <article className={`cl-home-status-card is-${tone}`}>
      <p className="cl-eyebrow">{eyebrow}</p>
      <div>
        <strong>{value}</strong>
        <h2>{title}</h2>
      </div>
      <p>{copy}</p>
    </article>
  );
}

function ContextRow({ label, value }) {
  return (
    <div className="cl-home-context-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}