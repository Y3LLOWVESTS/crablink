/**
 * RO:WHAT — Route-owned React not-found page for unsupported or malformed CrabLink navigation.
 * RO:WHY — CrabLink refactor; unknown routes should fail clearly without falling into legacy DOM rescue behavior.
 * RO:INTERACTS — app/router.js, routeRegistry.js, Shell address bar, HomeQuickActions, ProblemPage.
 * RO:INVARIANTS — navigation help only; no backend mutation; no fake route support; no fake b3/manifest/receipt truth.
 * RO:METRICS — none.
 * RO:CONFIG — known built-in route list below.
 * RO:SECURITY — no privileged Chrome APIs, no internal service calls, no untrusted HTML execution.
 * RO:TEST — npm run build; manual smoke with malformed URLs and unknown crab:// routes.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import './notFound.css';

const QUICK_ROUTES = Object.freeze([
  {
    label: 'Home',
    route: 'crab://home',
    tone: 'neutral',
    copy: 'Return to the React command center.',
  },
  {
    label: 'Site',
    route: 'crab://site',
    tone: 'success',
    copy: 'Create, prepare, store root HTML, and open named sites.',
  },
  {
    label: 'Image',
    route: 'crab://image',
    tone: 'success',
    copy: 'Paid image upload and typed image asset workflow.',
  },
  {
    label: 'Profile',
    route: 'crab://profile',
    tone: 'success',
    copy: 'Local RON Passport profile and identity truth boundary.',
  },
  {
    label: 'Music',
    route: 'crab://music',
    tone: 'neutral',
    copy: 'Local music/song manifest workspace.',
  },
  {
    label: 'Lyrics',
    route: 'crab://lyrics',
    tone: 'neutral',
    copy: 'Local standalone lyrics asset workspace.',
  },
  {
    label: 'Article',
    route: 'crab://article',
    tone: 'neutral',
    copy: 'Local long-form article draft workspace.',
  },
  {
    label: 'Post',
    route: 'crab://post',
    tone: 'neutral',
    copy: 'Local social post primitive workspace.',
  },
  {
    label: 'Comment',
    route: 'crab://comment',
    tone: 'neutral',
    copy: 'Local comment primitive workspace.',
  },
  {
    label: 'Video',
    route: 'crab://video',
    tone: 'neutral',
    copy: 'Local video manifest and rendition planning.',
  },
  {
    label: 'Stream',
    route: 'crab://stream',
    tone: 'neutral',
    copy: 'Local live stream setup and stream + podcast planning.',
  },
  {
    label: 'Podcast',
    route: 'crab://podcast',
    tone: 'neutral',
    copy: 'Local podcast episode/show workspace.',
  },
  {
    label: 'Ad',
    route: 'crab://ad',
    tone: 'warning',
    copy: 'Local protocol-native ad campaign draft.',
  },
  {
    label: 'Algo',
    route: 'crab://algo',
    tone: 'warning',
    copy: 'Local transparent algorithm draft.',
  },
  {
    label: 'Code',
    route: 'crab://code',
    tone: 'warning',
    copy: 'Local code primitive/facet contract draft. No execution.',
  },
  {
    label: 'Game',
    route: 'crab://game',
    tone: 'warning',
    copy: 'Local game manifest and asset bundle draft.',
  },
]);

const EXAMPLES = Object.freeze([
  'crab://site',
  'crab://image',
  'crab://profile',
  'crab://ron6',
  'crab://984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4.image',
  'b3:984128e643b594b1ff15ed2c40cf1d589616b9ddb7b212d00e91670997c1b8e4',
]);

export default function NotFoundPage({ route, app }) {
  const routeLabel = route?.rawInput || route?.normalizedInput || 'unknown route';
  const normalized = route?.normalizedInput || '';
  const problem = buildNotFoundProblem(route, app);

  function openRoute(nextRoute) {
    app?.navigate?.(nextRoute);
  }

  return (
    <section className="cl-page not-found-page">
      <PageHeader
        eyebrow="Route not found"
        title="CrabLink could not route that address"
        copy="The address did not match a built-in CrabLink route, typed b3 asset, @username/profile pattern, or named site route shape that this React lane can handle."
        meta={
          <>
            <Badge tone="warning">not found</Badge>
            <Badge tone="neutral">route owner · notFound</Badge>
            <Badge tone="neutral" uppercase={false}>
              input · {routeLabel}
            </Badge>
          </>
        }
        actions={
          <div className="not-found-actions">
            <Button variant="primary" onClick={() => openRoute('crab://home')}>
              Open Home
            </Button>
            <Button variant="secondary" onClick={app?.goBack}>
              Back
            </Button>
            <CopyButton text={routeLabel} label="Copy input" />
          </div>
        }
      />

      <TruthBoundary
        tone="warning"
        title="No backend truth was requested"
        copy="This page is a local router boundary. It does not call storage, index, wallet, ledger, omnigate, or any internal service. Use a supported route or a full typed crab asset URL to ask the gateway for backend truth."
      />

      <section className="not-found-hero-grid" aria-label="Route problem summary">
        <Card eyebrow="Input" title="Unmatched route">
          <div className="not-found-input-box">
            <span>Raw input</span>
            <strong>{route?.rawInput || 'empty'}</strong>
          </div>

          <div className="not-found-input-box">
            <span>Normalized</span>
            <strong>{normalized || 'not available'}</strong>
          </div>

          {route?.error && <p className="not-found-error">{route.error}</p>}
        </Card>

        <Card eyebrow="Expected shape" title="Try one of these forms">
          <ul className="not-found-shapes">
            <li>
              <code>crab://site</code>
              <span>Built-in creator workspace.</span>
            </li>
            <li>
              <code>crab://&lt;site_name&gt;</code>
              <span>Named site pointer.</span>
            </li>
            <li>
              <code>crab://&lt;64hex&gt;.&lt;kind&gt;</code>
              <span>Typed asset route.</span>
            </li>
            <li>
              <code>b3:&lt;64hex&gt;</code>
              <span>Internal content ID, routed as image preview by default.</span>
            </li>
            <li>
              <code>crab://@username</code>
              <span>Future profile lookup route.</span>
            </li>
          </ul>
        </Card>
      </section>

      <Card eyebrow="Quick routes" title="Open a supported route">
        <div className="not-found-route-grid">
          {QUICK_ROUTES.map((item) => (
            <article key={item.route} className={`not-found-route-card is-${item.tone}`}>
              <div>
                <span>{item.route}</span>
                <strong>{item.label}</strong>
              </div>
              <p>{item.copy}</p>
              <div className="not-found-route-actions">
                <Button variant="secondary" onClick={() => openRoute(item.route)}>
                  Open
                </Button>
                <CopyButton text={item.route} label="Copy" />
              </div>
            </article>
          ))}
        </div>
      </Card>

      <section className="not-found-bottom-grid" aria-label="Examples and diagnostics">
        <Card eyebrow="Examples" title="Known useful inputs">
          <div className="not-found-example-list">
            {EXAMPLES.map((example) => (
              <div key={example}>
                <code>{example}</code>
                <div>
                  <Button variant="ghost" onClick={() => openRoute(example)}>
                    Open
                  </Button>
                  <CopyButton text={example} label="Copy" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card eyebrow="Developer" title="Router diagnostic payload">
          <JsonPreview label="Not-found route diagnostic" data={problem} initiallyOpen />
        </Card>
      </section>
    </section>
  );
}

function buildNotFoundProblem(route, app) {
  return {
    schema: 'crablink.problem.not-found.v1',
    problem: 'route_not_found',
    route: {
      kind: route?.kind || 'notFound',
      raw_input: route?.rawInput || '',
      normalized_input: route?.normalizedInput || '',
      error: route?.error || null,
      parsed_at: route?.parsedAt || null,
    },
    app_context: {
      gateway_url: app?.settings?.gatewayUrl || 'http://127.0.0.1:8090',
      passport_subject: app?.settings?.passportSubject || null,
      wallet_account: app?.settings?.walletAccount || null,
    },
    supported_routes: QUICK_ROUTES.map((item) => item.route),
    examples: EXAMPLES,
    truth_boundary: {
      gateway_called: false,
      backend_truth_created: false,
      wallet_mutated: false,
      roc_charged: false,
      fake_cid_created: false,
    },
  };
}