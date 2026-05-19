/**
 * RO:WHAT — Route-owned structured problem page for CrabLink gateway/router failures.
 * RO:WHY — CrabLink refactor; policy-denied, unavailable, malformed, and unsupported failures need a consistent view.
 * RO:INTERACTS — router.js, gatewayClient, asset/site/profile routes, shared problem fixtures.
 * RO:INVARIANTS — display-only diagnostics; no fake success; no wallet mutation; no internal-service calls.
 * RO:METRICS — displays correlation IDs when present; does not emit backend metrics itself.
 * RO:CONFIG — gateway/settings context for diagnostic labels only.
 * RO:SECURITY — redacts token-like fields; no untrusted HTML; no spend confirmation from this page.
 * RO:TEST — npm run build; manual problem route smoke and offline gateway smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import './problem.css';

export default function ProblemPage({ route, app }) {
  const problem = normalizeProblem(route, app);
  const tone = toneForProblem(problem);
  const problemJson = JSON.stringify(problem, null, 2);

  function open(routeUrl) {
    app?.navigate?.(routeUrl);
  }

  return (
    <section className="cl-page problem-page">
      <PageHeader
        eyebrow="Problem"
        title={problem.title}
        copy={problem.copy}
        meta={
          <>
            <Badge tone={tone}>{problem.code}</Badge>
            <Badge tone="neutral">source · {problem.source}</Badge>
            <Badge tone={problem.retryable ? 'warning' : 'neutral'}>
              {problem.retryable ? 'retryable' : 'not retryable'}
            </Badge>
          </>
        }
        actions={
          <div className="problem-actions">
            <Button variant="secondary" onClick={app?.refreshRoute}>
              Retry route
            </Button>
            <Button variant="ghost" onClick={() => open('crab://home')}>
              Home
            </Button>
            <CopyButton text={problemJson} label="Copy problem JSON" />
          </div>
        }
      />

      <TruthBoundary
        tone={tone === 'danger' ? 'warning' : 'info'}
        title="Problem truth boundary"
        copy="This page explains a failure or unsupported route. It does not convert failures into success, invent receipts, create manifests, charge ROC, or mutate wallet state."
      />

      <section className="problem-overview-grid" aria-label="Problem overview">
        <Card eyebrow="Summary" title="What happened" className={`problem-summary-card is-${tone}`}>
          <p className="problem-copy">{problem.message || problem.copy}</p>

          <div className="problem-badge-row">
            <Badge tone={tone}>{problem.kind}</Badge>
            <Badge tone="neutral">HTTP · {problem.httpStatus || 'n/a'}</Badge>
            <Badge tone="neutral" uppercase={false}>
              route · {problem.route.normalized_input || problem.route.raw_input || 'n/a'}
            </Badge>
          </div>

          <div className="problem-fact-grid">
            <ProblemFact label="Code" value={problem.code} />
            <ProblemFact label="Reason" value={problem.reason || 'n/a'} />
            <ProblemFact label="Correlation" value={problem.correlation_id || 'n/a'} monospace />
            <ProblemFact label="Gateway" value={problem.gateway_url || 'n/a'} />
            <ProblemFact label="Route kind" value={problem.route.kind || 'n/a'} />
            <ProblemFact label="Parsed at" value={problem.route.parsed_at || 'n/a'} />
          </div>
        </Card>

        <Card eyebrow="Fix" title="Suggested next step">
          <div className="problem-remediation">
            <strong>{problem.remediation.title}</strong>
            <span>{problem.remediation.copy}</span>
          </div>

          <div className="problem-remediation-actions">
            {problem.remediation.routes.map((item) => (
              <Button key={item.route} variant={item.primary ? 'primary' : 'secondary'} onClick={() => open(item.route)}>
                {item.label}
              </Button>
            ))}
          </div>
        </Card>
      </section>

      <section className="problem-detail-grid" aria-label="Problem details">
        <Card eyebrow="Route context" title="Current route">
          <dl className="problem-dl">
            <ProblemRow label="Raw input" value={problem.route.raw_input || 'empty'} />
            <ProblemRow label="Normalized input" value={problem.route.normalized_input || 'n/a'} />
            <ProblemRow label="Kind" value={problem.route.kind || 'problem'} />
            <ProblemRow label="Route error" value={problem.route.error || 'none'} />
            <ProblemRow label="Gateway status" value={problem.gateway_state || 'unknown'} />
            <ProblemRow label="Storage mode" value={problem.storage_backend || 'unknown'} />
          </dl>
        </Card>

        <Card eyebrow="Safety" title="What CrabLink did not do">
          <ul className="problem-safety-list">
            <li>No ROC spend was attempted from this page.</li>
            <li>No wallet hold/capture/release was created.</li>
            <li>No b3 CID, manifest CID, or receipt was fabricated.</li>
            <li>No direct call to storage, index, wallet, ledger, or omnigate was made.</li>
            <li>No untrusted HTML or code was executed in the shell.</li>
          </ul>
        </Card>
      </section>

      <Card eyebrow="Developer" title="Problem JSON">
        <JsonPreview label="Structured problem" data={problem} initiallyOpen />
      </Card>
    </section>
  );
}

function ProblemFact({ label, value, monospace = false }) {
  return (
    <div className={monospace ? 'is-mono' : ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProblemRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function normalizeProblem(route, app) {
  const params = route?.params || {};
  const gatewayStatus = app?.gatewayStatus || {};
  const settings = app?.settings || {};
  const storage = app?.storage || {};
  const routeError = route?.error || params.error || params.message || '';
  const gatewayError = gatewayStatus?.error || null;
  const problemCode = cleanCode(
    params.code ||
      params.problem ||
      params.reason ||
      gatewayError?.reason ||
      routeError ||
      (gatewayStatus?.state === 'offline' ? 'gateway_offline' : 'route_problem'),
  );

  const httpStatus = Number(
    params.status ||
      gatewayError?.status ||
      gatewayStatus?.ready?.status ||
      gatewayStatus?.health?.status ||
      0,
  );

  const source =
    params.source ||
    gatewayError?.source ||
    (gatewayStatus?.state === 'offline' ? 'gateway-status' : 'router');

  const message =
    params.message ||
    gatewayError?.message ||
    routeError ||
    defaultMessageFor(problemCode, httpStatus, gatewayStatus);

  return {
    schema: 'crablink.problem.page.v1',
    title: titleForProblem(problemCode, httpStatus),
    copy: copyForProblem(problemCode, httpStatus),
    kind: kindForProblem(problemCode, httpStatus),
    code: problemCode,
    reason: String(params.reason || gatewayError?.reason || '').trim(),
    message,
    source,
    retryable: retryableFor(problemCode, httpStatus),
    httpStatus,
    correlation_id: String(params.correlation_id || params.correlationId || gatewayError?.correlationId || '').trim(),
    gateway_url: settings.gatewayUrl || 'http://127.0.0.1:8090',
    gateway_state: gatewayStatus?.state || 'unknown',
    storage_backend: storage.backend || 'unknown',
    route: {
      kind: route?.kind || 'problem',
      raw_input: route?.rawInput || '',
      normalized_input: route?.normalizedInput || '',
      error: route?.error || null,
      parsed_at: route?.parsedAt || null,
    },
    remediation: remediationFor(problemCode, httpStatus, gatewayStatus),
    truth_boundary: {
      gateway_called: Boolean(gatewayError || gatewayStatus?.state === 'offline' || gatewayStatus?.state === 'degraded'),
      backend_truth_created: false,
      wallet_mutated: false,
      roc_charged: false,
      fake_receipt_created: false,
      fake_manifest_created: false,
    },
  };
}

function cleanCode(value) {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return clean || 'route_problem';
}

function titleForProblem(code, status) {
  if (status === 403 || code.includes('policy')) return 'Policy denied this action';
  if (status === 404 || code.includes('not_found')) return 'The requested object was not found';
  if (status === 413 || code.includes('too_large')) return 'Request body is too large';
  if (status === 429 || code.includes('quota')) return 'Gateway quota was exceeded';
  if (status === 503 || code.includes('ready') || code.includes('unavailable')) return 'Gateway is not ready';
  if (code.includes('offline') || code.includes('network')) return 'Gateway is offline or unreachable';
  if (code.includes('malformed') || code.includes('invalid')) return 'Route or request is malformed';
  return 'CrabLink hit a structured problem';
}

function copyForProblem(code, status) {
  if (status === 403 || code.includes('policy')) {
    return 'The gateway or policy layer refused the request. This is a real failure and CrabLink will not bypass it.';
  }

  if (status === 404 || code.includes('not_found')) {
    return 'The route shape was valid, but the gateway did not find a matching object, manifest, or site pointer.';
  }

  if (status === 503 || code.includes('ready') || code.includes('unavailable')) {
    return 'The configured gateway is responding but not ready for this operation.';
  }

  if (code.includes('offline') || code.includes('network')) {
    return 'CrabLink could not reach the configured local gateway.';
  }

  return 'Use the diagnostics below to decide whether this is a router issue, gateway issue, policy denial, or missing backend route.';
}

function defaultMessageFor(code, status, gatewayStatus) {
  if (gatewayStatus?.error?.message) return gatewayStatus.error.message;
  if (status) return `Gateway returned HTTP ${status}.`;
  if (code.includes('offline')) return 'The gateway could not be reached.';
  return 'No additional problem message was provided.';
}

function kindForProblem(code, status) {
  if (status === 403 || code.includes('policy')) return 'policy';
  if (status === 404 || code.includes('not_found')) return 'not_found';
  if (status === 429 || code.includes('quota')) return 'quota';
  if (status >= 500 || code.includes('gateway') || code.includes('offline') || code.includes('network')) {
    return 'gateway';
  }
  if (code.includes('invalid') || code.includes('malformed')) return 'validation';
  return 'problem';
}

function retryableFor(code, status) {
  if ([408, 425, 429, 500, 502, 503, 504].includes(Number(status))) return true;
  if (code.includes('timeout') || code.includes('offline') || code.includes('network') || code.includes('ready')) {
    return true;
  }
  return false;
}

function remediationFor(code, status, gatewayStatus) {
  if (status === 404 || code.includes('not_found')) {
    return {
      title: 'Check whether the object exists in the current local stack.',
      copy: 'Local dev stacks can be reset. Use a known fresh asset/site proof or create a new image/site in this stack.',
      routes: [
        { label: 'Open Image', route: 'crab://image', primary: true },
        { label: 'Open Site', route: 'crab://site' },
        { label: 'Open Home', route: 'crab://home' },
      ],
    };
  }

  if (status === 403 || code.includes('policy')) {
    return {
      title: 'Do not bypass policy denial.',
      copy: 'Check the backend policy/capability path. CrabLink should fail closed when policy or capability checks deny access.',
      routes: [
        { label: 'Open Home', route: 'crab://home', primary: true },
        { label: 'Open Profile', route: 'crab://profile' },
      ],
    };
  }

  if (gatewayStatus?.state === 'offline' || code.includes('offline') || code.includes('network')) {
    return {
      title: 'Start or verify the local RustyOnions dev stack.',
      copy: 'Then refresh the gateway status from the top bar or retry the route.',
      routes: [
        { label: 'Open Home', route: 'crab://home', primary: true },
        { label: 'Open Profile', route: 'crab://profile' },
      ],
    };
  }

  return {
    title: 'Retry from a known route.',
    copy: 'Open Home, then use the route cards or address bar to reproduce the issue from a clean route owner.',
    routes: [
      { label: 'Open Home', route: 'crab://home', primary: true },
      { label: 'Open Site', route: 'crab://site' },
      { label: 'Open Image', route: 'crab://image' },
    ],
  };
}

function toneForProblem(problem) {
  if (problem.kind === 'policy' || problem.kind === 'validation') return 'danger';
  if (problem.kind === 'gateway' || problem.kind === 'quota' || problem.kind === 'not_found') return 'warning';
  return 'info';
}