/**
 * RO:WHAT — CrabLink React home command center for route smoke, proof links, and migration status.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps the React lane honest now that site/image/profile proofs are real.
 * RO:INTERACTS — HomeQuickActions, shared PageHeader/Card/Badge/CopyButton/TruthBoundary components, app navigation.
 * RO:INVARIANTS — navigation/copy/status only; no fake backend truth; no paid action; no wallet mutation; no CID creation.
 * RO:METRICS — none.
 * RO:CONFIG — route context from App and local extension settings display hints.
 * RO:SECURITY — no backend calls and no untrusted rendering from this page.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual route smoke from home quick actions.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import HomeQuickActions from './HomeQuickActions.jsx';
import './home.css';

const CURRENT_PROOFS = Object.freeze([
  {
    label: 'Newest named site proof',
    value: 'crab://ron6',
    note: 'React site launch/create/open loop proved live in the previous session.',
    tone: 'success',
  },
  {
    label: 'Known paid image proof',
    value: 'crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image',
    note: 'Stable paid image proof route for typed asset regression checks.',
    tone: 'success',
  },
  {
    label: 'React image proof',
    value: 'crab://6e343cbcbcd233a72ce45b197d1c45caea862480221ef0f7e4e4360f17e1fce0.image',
    note: 'Newest React-uploaded image URL to try when the local stack still has it.',
    tone: 'info',
  },
  {
    label: 'Local profile',
    value: 'crab://profile',
    note: 'Profile is polished, but still local draft unless backend confirms profile truth.',
    tone: 'warning',
  },
]);

export default function HomePage({ app }) {
  const settings = app?.settings || {};
  const gatewayUrl = settings.gatewayUrl || 'http://127.0.0.1:8090';
  const passport = settings.passportSubject || 'passport:main:dev';
  const wallet = settings.walletAccount || 'acct_dev';

  return (
    <section className="cl-page home-page">
      <PageHeader
        eyebrow="CrabLink React lane"
        title="CrabLink Command Center"
        copy="Use this page to smoke-test built-in crab:// routes, jump into proven creator flows, copy known proof URLs, and keep the React migration honest."
        meta={
          <>
            <Badge tone="success">site proven</Badge>
            <Badge tone="success">image proven</Badge>
            <Badge tone="success">profile polished</Badge>
            <Badge tone="neutral" uppercase={false}>
              gateway · {gatewayUrl}
            </Badge>
          </>
        }
      />

      <section className="cl-home-hero-grid" aria-label="React lane status">
        <StatusCard
          eyebrow="Product proofs"
          title="Live loops"
          value="3"
          copy="Paid image, named site creation/render, and local profile UX are now real React-lane milestones."
          tone="success"
        />

        <StatusCard
          eyebrow="Creator routes"
          title="Local drafts"
          value="12"
          copy="Post, comment, article, lyrics, media, ad, algo, code, and game routes remain honest local workspaces until backend contracts exist."
          tone="info"
        />

        <StatusCard
          eyebrow="Safety target"
          title="Fake truth"
          value="0"
          copy="The home route only navigates and copies. It does not mint CIDs, publish manifests, spend ROC, or mutate wallets."
          tone="warning"
        />
      </section>

      <section className="cl-home-proof-grid" aria-label="Known CrabLink proof routes">
        {CURRENT_PROOFS.map((proof) => (
          <article key={proof.value} className={`cl-home-proof-card is-${proof.tone}`}>
            <div className="cl-home-proof-head">
              <div>
                <span>{proof.label}</span>
                <strong>{proof.value}</strong>
              </div>

              <div className="cl-home-proof-actions">
                <CopyButton text={proof.value} label="Copy" />
                <button
                  type="button"
                  className="cl-home-inline-link"
                  onClick={() => app?.navigate?.(proof.value)}
                >
                  Open
                </button>
              </div>
            </div>

            <p>{proof.note}</p>
          </article>
        ))}
      </section>

      <TruthBoundary
        tone="info"
        title="React lane truth boundary"
        copy="CrabLink can now exercise real site/image/profile UX, but this home page is still a dashboard. It does not create backend truth. Route pages must keep paid operations explicit, gateway-only, and receipt-backed."
      />

      <section className="cl-home-context-grid" aria-label="Current local context">
        <Card eyebrow="Local context" title="Passport / wallet display">
          <div className="cl-home-context-list">
            <ContextRow label="Gateway" value={gatewayUrl} />
            <ContextRow label="Passport" value={passport} />
            <ContextRow label="Wallet" value={wallet} />
            <ContextRow label="Profile handle" value={settings.username || settings.handle || '@skinnycrabby'} />
          </div>
          <p className="cl-home-muted">
            These values are display/context hints from CrabLink settings. Wallet balance, username confirmation,
            profile publication, reputation, and moderation truth must still come from gateway-backed services.
          </p>
        </Card>

        <Card eyebrow="Testing path" title="Default React test flow">
          <ol className="cl-home-smoke-list">
            <li>Run the build/check/package/codebundle gate.</li>
            <li>Reload the unpacked extension.</li>
            <li>Click the React button in the extension.</li>
            <li>Use the dashboard cards or address bar to test routes.</li>
          </ol>
        </Card>
      </section>

      <HomeQuickActions app={app} />

      <section className="cl-home-bottom-grid" aria-label="Testing and next work">
        <Card eyebrow="Manual smoke sequence" title="Route switching regression check">
          <p>
            After every route batch, use this sequence to confirm the previous page disappears before
            the next one appears and no old DOM patch leaks into the new route owner.
          </p>

          <ol className="cl-home-smoke-list">
            <li>crab://ron6 → crab://site → crab://profile → crab://home</li>
            <li>crab://image → known .image asset URL → crab://home</li>
            <li>crab://article → crab://post → crab://comment → crab://lyrics</li>
            <li>crab://video → crab://stream → crab://podcast → crab://music</li>
            <li>crab://ad → crab://algo → crab://code → crab://game</li>
          </ol>
        </Card>

        <Card eyebrow="Next phase" title="Recommended next work">
          <p>
            With site, image, and profile now proven enough to use in React, the next safest work is
            tightening generic asset pages, route diagnostics, and shared manifest panels before deleting legacy files.
          </p>

          <div className="cl-home-next-list">
            <span>Generic asset polish</span>
            <span>Route diagnostics</span>
            <span>Manifest drawer reuse</span>
            <span>Known proof smoke</span>
            <span>Username route planning</span>
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