/**
 * RO:WHAT — Compatibility error panel composed from canonical ErrorState and collapsed developer disclosure.
 * RO:WHY — FINAL_BETA Phase 2B2; keeps normal failure language readable while preserving redacted advanced diagnostics.
 * RO:INTERACTS — AssetResolver, ProblemPage, ErrorState, DeveloperDisclosure, JsonPreview, and route-owned actions.
 * RO:INVARIANTS — failure remains visible; caller actions remain intact; diagnostics stay collapsed; no fake success.
 * RO:METRICS — correlation identifiers remain visible when supplied.
 * RO:CONFIG — title, copy, error, actions, and className.
 * RO:SECURITY — no untrusted HTML; advanced data continues through the existing redacting JsonPreview boundary.
 * RO:TEST — phase2bSharedStates.test.mjs and focused frontend build.
 * FINAL_BETA_PHASE2B2_SHARED_STATES_V1
 */

import DeveloperDisclosure from './DeveloperDisclosure.jsx';
import ErrorState from './ErrorState.jsx';
import JsonPreview from './JsonPreview.jsx';

export default function ErrorPanel({
  title = 'Something went wrong',
  copy =
    'CrabLink could not complete this route.',
  error = null,
  actions = null,
  className = '',
}) {
  const problem = normalizeError(error);

  const publicCopy = [
    copy,
    problem.message,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={[
        'cl-error-panel-shell',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <ErrorState
        title={title}
        copy={publicCopy}
        reason={
          problem.reason ||
          (
            problem.status
              ? `HTTP ${problem.status}`
              : ''
          )
        }
        correlationId={
          problem.correlationId
        }
        retryLabel="Reload page"
        onRetry={
          actions
            ? null
            : () => window.location.reload()
        }
        secondaryAction={actions}
      />

      <DeveloperDisclosure
        title="Technical details"
        summary={
          problem.retryable
            ? 'Retry may succeed'
            : 'Advanced diagnostic record'
        }
      >
        <div
          className="cl-error-facts"
          aria-label="Error facts"
        >
          <Fact
            label="Reason"
            value={
              problem.reason || 'unknown'
            }
          />

          <Fact
            label="HTTP"
            value={
              problem.status
                ? String(problem.status)
                : 'n/a'
            }
          />

          <Fact
            label="Retryable"
            value={
              problem.retryable
                ? 'yes'
                : 'no'
            }
          />

          <Fact
            label="Reference"
            value={
              problem.correlationId ||
              'n/a'
            }
          />
        </div>

        <JsonPreview
          label="Redacted error record"
          data={problem}
          initiallyOpen={false}
        />
      </DeveloperDisclosure>
    </div>
  );
}

function Fact({
  label,
  value,
}) {
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
    name: String(
      error.name || 'Error',
    ),

    message: String(
      error.message || error,
    ),

    reason: String(
      error.reason ||
      error.target?.assetKind ||
      '',
    ),

    status: Number(
      error.status ||
      error.fallbackError?.status ||
      error.primaryError?.status ||
      0,
    ),

    retryable: Boolean(
      error.retryable ||
      error.fallbackError?.retryable ||
      error.primaryError?.retryable,
    ),

    correlationId: String(
      error.correlationId ||
      error.fallbackError?.correlationId ||
      error.primaryError?.correlationId ||
      '',
    ),

    target:
      error.target || null,

    attempts:
      Array.isArray(error.attempts)
        ? error.attempts
        : [],

    data:
      error.data ||
      error.fallbackError?.data ||
      error.primaryError?.data ||
      null,
  };
}
