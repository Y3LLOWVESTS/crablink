/**
 * RO:WHAT — Shared explicit error panel for route-owned React pages.
 * RO:WHY — CrabLink refactor; prevents protected route failures from becoming blank screens or fake success states.
 * RO:INTERACTS — AssetResolver, ProblemPage, future gateway-backed pages.
 * RO:INVARIANTS — failure is visible; no fake backend truth; no secret rendering.
 * RO:METRICS — none.
 * RO:CONFIG — title/copy/error/actions props.
 * RO:SECURITY — redacts token-like JSON through JsonPreview; no untrusted HTML.
 * RO:TEST — manual offline gateway smoke and not-found route smoke.
 */

import Button from './Button.jsx';
import Card from './Card.jsx';
import JsonPreview from './JsonPreview.jsx';

export default function ErrorPanel({
  title = 'Something went wrong',
  copy = 'CrabLink could not complete this route.',
  error = null,
  actions = null,
  className = '',
}) {
  const problem = normalizeError(error);

  return (
    <Card eyebrow="Problem" title={title} className={['cl-error-panel', className].filter(Boolean).join(' ')}>
      {copy && <p>{copy}</p>}

      {problem.message && <p className="cl-error-message">{problem.message}</p>}

      <div className="cl-error-facts" aria-label="Error facts">
        <Fact label="Reason" value={problem.reason || 'unknown'} />
        <Fact label="HTTP" value={problem.status ? String(problem.status) : 'n/a'} />
        <Fact label="Retryable" value={problem.retryable ? 'yes' : 'no'} />
        <Fact label="Correlation" value={problem.correlationId || 'n/a'} />
      </div>

      {actions || null}

      <JsonPreview label="Error details" data={problem} />

      {!actions && (
        <div className="cl-error-default-actions">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      )}
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeError(error) {
  if (!error) {
    return {
      message: '',
      reason: '',
      status: 0,
      retryable: false,
      correlationId: '',
    };
  }

  return {
    name: String(error.name || 'Error'),
    message: String(error.message || error),
    reason: String(error.reason || error.target?.assetKind || ''),
    status: Number(error.status || error.fallbackError?.status || error.primaryError?.status || 0),
    retryable: Boolean(error.retryable || error.fallbackError?.retryable || error.primaryError?.retryable),
    correlationId: String(
      error.correlationId ||
        error.fallbackError?.correlationId ||
        error.primaryError?.correlationId ||
        '',
    ),
    target: error.target || null,
    attempts: Array.isArray(error.attempts) ? error.attempts : [],
    data: error.data || error.fallbackError?.data || error.primaryError?.data || null,
  };
}