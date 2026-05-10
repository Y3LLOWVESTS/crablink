/**
 * RO:WHAT — Gateway resolver for typed CrabLink asset routes.
 * RO:WHY — Moves crab://<hash>.<kind> from scaffold to protected read-only backend hydration.
 * RO:INTERACTS — assetClient, gatewayClient, AssetHydratedView, LoadingState, ErrorPanel.
 * RO:INVARIANTS — gateway-only; read-only; no fake b3/manifest/receipt truth; no wallet mutation.
 * RO:METRICS — records returned gateway correlation IDs in visible route facts.
 * RO:CONFIG — app.clients.gateway settings.
 * RO:SECURITY — no direct internal service calls; no untrusted HTML execution.
 * RO:TEST — manual route smoke with gateway online/offline and known-good image assets.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import LoadingState from '../../shared/components/LoadingState.jsx';
import {
  createAssetClient,
  normalizeAssetResolveProblem,
} from '../../shared/api/assetClient.js';
import AssetHydratedView from './AssetHydratedView.jsx';

export default function AssetResolver({ route, app }) {
  const gateway = app?.clients?.gateway || app?.gateway || null;
  const assetClient = useMemo(() => createAssetClient(gateway), [gateway]);
  const [state, setState] = useState({
    status: 'idle',
    result: null,
    error: null,
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      setState({
        status: 'loading',
        result: null,
        error: null,
      });

      try {
        const result = await assetClient.resolveRoute(route);

        if (!alive) {
          return;
        }

        setState({
          status: 'resolved',
          result,
          error: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          status: 'error',
          result: null,
          error,
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [assetClient, route?.normalizedInput, route?.refreshTick]);

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <LoadingState
        title="Resolving asset"
        copy="CrabLink is asking the configured gateway for this typed crab asset."
        detail={route?.normalizedInput || ''}
      />
    );
  }

  if (state.status === 'error') {
    return <AssetResolveProblem error={state.error} app={app} route={route} />;
  }

  return <AssetHydratedView route={route} app={app} result={state.result} assetClient={assetClient} />;
}

function AssetResolveProblem({ error, app, route }) {
  const problem = normalizeAssetResolveProblem(error);
  const problemJson = JSON.stringify(problem, null, 2);
  const tone = toneForProblem(problem.problemCode);

  return (
    <section className="asset-problem-stack" aria-label="Asset resolve problem">
      <Card
        eyebrow="Problem"
        title={problem.title}
        className={`asset-problem-card asset-problem-${tone}`}
        actions={
          <div className="asset-error-actions">
            <Button variant="secondary" onClick={app?.refreshRoute}>
              Retry
            </Button>
            <Button variant="ghost" onClick={app?.goHome}>
              Go Home
            </Button>
            <CopyButton text={problemJson} label="Copy problem JSON" />
          </div>
        }
      >
        <div className="asset-problem-summary">
          <Badge tone={tone}>{problem.problemCode}</Badge>
          <Badge tone={problem.retryable ? 'warning' : 'neutral'}>
            {problem.retryable ? 'retryable' : 'not retryable'}
          </Badge>
          <Badge tone="neutral" uppercase={false}>
            route · {route?.normalizedInput || problem.target?.assetUrl || 'unknown'}
          </Badge>
        </div>

        <p className="asset-problem-copy">{problem.copy}</p>

        {problem.message && <p className="asset-problem-message">{problem.message}</p>}

        <section className="asset-problem-facts" aria-label="Asset problem facts">
          <ProblemFact label="Reason" value={problem.reason || problem.problemCode} />
          <ProblemFact label="HTTP" value={problem.status ? String(problem.status) : 'n/a'} />
          <ProblemFact label="Correlation" value={problem.correlationId || 'n/a'} />
          <ProblemFact label="Kind" value={problem.target?.assetKind || route?.params?.assetKind || 'n/a'} />
          <ProblemFact label="CID" value={problem.target?.cid || route?.params?.cid || 'n/a'} monospace />
          <ProblemFact label="Gateway path count" value={String(problem.attempts.length || 0)} />
        </section>

        <div className="asset-problem-help">
          <strong>Suggested next step</strong>
          <span>{problem.remediation}</span>
        </div>
      </Card>

      {problem.attempts.length > 0 && (
        <Card eyebrow="Gateway attempts" title="Resolve path diagnostics">
          <div className="asset-attempt-list asset-problem-attempts">
            {problem.attempts.map((attempt, index) => (
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

      <Card eyebrow="Developer" title="Structured asset problem">
        <JsonPreview label="Asset resolve problem JSON" data={problem} initiallyOpen />
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

function toneForProblem(problemCode) {
  if (problemCode === 'asset_not_found' || problemCode === 'unsupported_kind') {
    return 'warning';
  }

  if (problemCode === 'policy_denied') {
    return 'danger';
  }

  if (problemCode === 'gateway_unreachable' || problemCode === 'gateway_upstream_unavailable') {
    return 'warning';
  }

  if (problemCode === 'malformed_response' || problemCode === 'invalid_asset_hash') {
    return 'danger';
  }

  return 'neutral';
}