/**
 * RO:WHAT — Shared structured problem panel for gateway-backed React routes.
 * RO:WHY — CrabLink refactor; keeps site/asset/profile route failures honest, readable, and reusable.
 * RO:INTERACTS — SiteRender, AssetResolver, GatewayClientError, JsonPreview, shared route pages.
 * RO:INVARIANTS — no fake backend truth; failures remain visible; diagnostics are display-only.
 * RO:METRICS — displays gateway correlation IDs when available.
 * RO:CONFIG — accepts route/problem/error props from route owners.
 * RO:SECURITY — redacts JSON through JsonPreview; no untrusted HTML; no tokens or spend authority.
 * RO:TEST — manual gateway-offline, site 404, asset 404, and policy-denied route smoke.
 */

import Badge from './Badge.jsx';
import Button from './Button.jsx';
import Card from './Card.jsx';
import CopyButton from './CopyButton.jsx';
import JsonPreview from './JsonPreview.jsx';

export default function RouteProblemPanel({
  title = 'Route problem',
  copy = 'CrabLink could not complete this route.',
  error = null,
  problem = null,
  route = null,
  target = null,
  remediation = '',
  onRetry = null,
  onHome = null,
  onWorkspace = null,
  homeLabel = 'Go Home',
  retryLabel = 'Retry',
  workspaceLabel = 'Open Workspace',
  copyLabel = 'Copy problem JSON',
  jsonLabel = 'Route problem JSON',
  attemptTitle = 'Gateway attempts',
  className = '',
  actions = null,
}) {
  const normalized = normalizeRouteProblem({
    title,
    copy,
    error,
    problem,
    route,
    target,
    remediation,
  });

  const tone = toneForProblem(normalized);
  const problemJson = JSON.stringify(normalized, null, 2);
  const hasDefaultActions = onRetry || onHome || onWorkspace;

  return (
    <section
      className={['cl-route-problem-stack', className].filter(Boolean).join(' ')}
      aria-label="Route problem"
    >
      <Card
        eyebrow="Problem"
        title={normalized.title}
        className={`cl-route-problem-card is-${tone}`}
        actions={
          <div className="cl-route-problem-actions">
            <CopyButton text={problemJson} label={copyLabel} />
          </div>
        }
      >
        <div className="cl-route-problem-summary">
          <Badge tone={tone}>{normalized.problemCode}</Badge>
          <Badge tone={normalized.retryable ? 'warning' : 'neutral'}>
            {normalized.retryable ? 'retryable' : 'not retryable'}
          </Badge>
          <Badge tone="neutral" uppercase={false}>
            route · {normalized.routeLabel}
          </Badge>
        </div>

        {normalized.copy && <p className="cl-route-problem-copy">{normalized.copy}</p>}
        {normalized.message && <p className="cl-route-problem-message">{normalized.message}</p>}

        <section className="cl-route-problem-facts" aria-label="Problem facts">
          <ProblemFact label="Reason" value={normalized.reason || normalized.problemCode} />
          <ProblemFact label="HTTP" value={normalized.status ? String(normalized.status) : 'n/a'} />
          <ProblemFact label="Retryable" value={normalized.retryable ? 'yes' : 'no'} />
          <ProblemFact label="Correlation" value={normalized.correlationId || 'n/a'} monospace />
          <ProblemFact label="Gateway route" value={normalized.gatewayRoute || 'n/a'} monospace />
          <ProblemFact label="Crab route" value={normalized.routeLabel || 'n/a'} monospace />
          {normalized.target?.cid && <ProblemFact label="CID" value={normalized.target.cid} monospace />}
          {normalized.target?.assetKind && <ProblemFact label="Kind" value={normalized.target.assetKind} />}
          {normalized.target?.siteName && <ProblemFact label="Site name" value={normalized.target.siteName} />}
        </section>

        {(normalized.remediation || hasDefaultActions || actions) && (
          <div className="cl-route-problem-help">
            {normalized.remediation && (
              <div>
                <strong>Suggested next step</strong>
                <span>{normalized.remediation}</span>
              </div>
            )}

            {(hasDefaultActions || actions) && (
              <div className="cl-route-problem-action-row">
                {onRetry && (
                  <Button variant="secondary" onClick={onRetry}>
                    {retryLabel}
                  </Button>
                )}
                {onWorkspace && (
                  <Button variant="ghost" onClick={onWorkspace}>
                    {workspaceLabel}
                  </Button>
                )}
                {onHome && (
                  <Button variant="ghost" onClick={onHome}>
                    {homeLabel}
                  </Button>
                )}
                {actions}
              </div>
            )}
          </div>
        )}
      </Card>

      {normalized.attempts.length > 0 && (
        <Card eyebrow="Diagnostics" title={attemptTitle} className="cl-route-problem-attempt-card">
          <div className="cl-route-attempt-list">
            {normalized.attempts.map((attempt, index) => (
              <div key={`${attempt.route || 'attempt'}-${index}`} className={attempt.ok ? 'is-ok' : 'is-error'}>
                <span>{attempt.ok ? 'ok' : 'fail'}</span>
                <strong>{attempt.route || 'unknown route'}</strong>
                <small>
                  {attempt.status ? `HTTP ${attempt.status}` : attempt.reason || 'no status'}
                  {attempt.correlationId ? ` · ${attempt.correlationId}` : ''}
                </small>
                {attempt.message && <small>{attempt.message}</small>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card eyebrow="Developer" title="Structured route problem">
        <JsonPreview label={jsonLabel} data={normalized} initiallyOpen />
      </Card>
    </section>
  );
}

function ProblemFact({ label, value, monospace = false }) {
  return (
    <div className={monospace ? 'is-monospace' : ''}>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function normalizeRouteProblem({ title, copy, error, problem, route, target, remediation }) {
  const source = problem || normalizeErrorObject(error);
  const sourceTarget = source?.target || target || {};
  const data = source?.data && typeof source.data === 'object' ? source.data : null;
  const status = normalizeStatus(source?.status || error?.status || data?.status);
  const reason = stringValue(
    source?.reason,
    source?.problemCode,
    source?.code,
    data?.reason,
    data?.code,
    data?.error,
    statusToReason(status),
  );
  const problemCode = stringValue(source?.problemCode, reason, statusToReason(status), 'route_problem');
  const attempts = normalizeAttempts(source?.attempts, error);
  const routeLabel = stringValue(
    route?.normalizedInput,
    route?.rawInput,
    sourceTarget?.crabUrl,
    sourceTarget?.assetUrl,
    sourceTarget?.siteName ? `crab://${sourceTarget.siteName}` : '',
    error?.route,
    source?.route,
    'unknown',
  );

  return {
    title: stringValue(source?.title, title, 'Route problem'),
    copy: stringValue(source?.copy, copy),
    message: stringValue(source?.message, error?.message),
    problemCode,
    reason,
    status,
    retryable: Boolean(source?.retryable || error?.retryable || isRetryableStatus(status)),
    correlationId: stringValue(source?.correlationId, error?.correlationId),
    gatewayRoute: stringValue(source?.gatewayRoute, source?.route, error?.route, attempts[0]?.route),
    routeLabel,
    remediation: stringValue(
      source?.remediation,
      remediation,
      defaultRemediation(problemCode, status, sourceTarget),
    ),
    target: compactObject({
      ...sourceTarget,
      route_kind: route?.kind || sourceTarget?.route_kind || '',
    }),
    attempts,
    data: source?.data || error?.data || null,
  };
}

function normalizeErrorObject(error) {
  if (!error) {
    return {};
  }

  if (typeof error === 'string') {
    return {
      message: error,
      reason: 'route_error',
    };
  }

  return {
    name: stringValue(error.name, 'Error'),
    message: stringValue(error.message, String(error)),
    reason: stringValue(error.reason),
    status: normalizeStatus(error.status),
    retryable: Boolean(error.retryable),
    correlationId: stringValue(error.correlationId),
    route: stringValue(error.route),
    data: error.data || null,
    target: error.target || null,
    attempts: Array.isArray(error.attempts) ? error.attempts : [],
  };
}

function normalizeAttempts(attempts, error) {
  const explicit = Array.isArray(attempts) ? attempts : [];

  if (explicit.length > 0) {
    return explicit.map((attempt) => ({
      ok: Boolean(attempt?.ok),
      route: stringValue(attempt?.route, attempt?.path, attempt?.url),
      status: normalizeStatus(attempt?.status),
      reason: stringValue(attempt?.reason, attempt?.code),
      message: stringValue(attempt?.message),
      correlationId: stringValue(attempt?.correlationId),
    }));
  }

  if (error?.route || error?.status || error?.reason || error?.correlationId) {
    return [
      {
        ok: false,
        route: stringValue(error.route, 'gateway request'),
        status: normalizeStatus(error.status),
        reason: stringValue(error.reason),
        message: stringValue(error.message),
        correlationId: stringValue(error.correlationId),
      },
    ];
  }

  return [];
}

function toneForProblem(problem) {
  const code = String(problem?.problemCode || '').toLowerCase();
  const status = normalizeStatus(problem?.status);

  if (
    code.includes('denied') ||
    code.includes('invalid') ||
    code.includes('malformed') ||
    code.includes('forbidden') ||
    status === 400 ||
    status === 401 ||
    status === 403
  ) {
    return 'danger';
  }

  if (
    code.includes('not_found') ||
    code.includes('missing') ||
    code.includes('timeout') ||
    code.includes('network') ||
    code.includes('unreachable') ||
    status === 404 ||
    status === 408 ||
    status === 429 ||
    status >= 500
  ) {
    return 'warning';
  }

  return 'info';
}

function defaultRemediation(code, status, target) {
  const normalized = String(code || '').toLowerCase();

  if (normalized.includes('site_not_found') || (status === 404 && target?.siteName)) {
    return 'This named site pointer does not exist in the current gateway/index state. Check the site name, create it from crab://site, or refresh after the backend stack is ready.';
  }

  if (normalized.includes('asset_not_found') || status === 404) {
    return 'The gateway was reachable, but this object was not found. Re-upload/regenerate the asset if the local dev database was reset.';
  }

  if (normalized.includes('network') || normalized.includes('unreachable') || status === 0) {
    return 'Check that the local gateway is running, the extension origin has permission, and the configured gateway URL is correct.';
  }

  if (normalized.includes('denied') || status === 401 || status === 403) {
    return 'The gateway or policy layer denied this request. Confirm passport/capability settings and retry only after permissions are corrected.';
  }

  if (status >= 500) {
    return 'The gateway or an upstream service failed. Check service logs and retry after readiness returns.';
  }

  return 'Review the structured problem JSON and gateway correlation ID before changing route code.';
}

function statusToReason(status) {
  if (!status) return '';
  if (status === 400) return 'bad_request';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'policy_denied';
  if (status === 404) return 'not_found';
  if (status === 408) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 413) return 'body_too_large';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'gateway_upstream_unavailable';
  return `http_${status}`;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function normalizeStatus(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      return true;
    }),
  );
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}