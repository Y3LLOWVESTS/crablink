/**
 * RO:WHAT — Gateway resolver for typed CrabLink asset routes.
 * RO:WHY — Turns crab://<hash>.<kind> into protected read-only backend hydration with explicit diagnostics.
 * RO:INTERACTS — assetClient, gatewayClient, AssetHydratedView, LoadingState, Card/Badge/JsonPreview.
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
    startedAt: '',
    finishedAt: '',
  });

  useEffect(() => {
    let alive = true;

    async function run() {
      const startedAt = new Date().toISOString();

      setState({
        status: 'loading',
        result: null,
        error: null,
        startedAt,
        finishedAt: '',
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
          startedAt,
          finishedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setState({
          status: 'error',
          result: null,
          error,
          startedAt,
          finishedAt: new Date().toISOString(),
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
      <section className="asset-resolver-loading">
        <LoadingState
          title="Resolving asset"
          copy="CrabLink is asking the configured gateway for this typed crab asset."
          detail={route?.normalizedInput || ''}
        />
      </section>
    );
  }

  if (state.status === 'error') {
    return <AssetResolveProblem error={state.error} app={app} route={route} state={state} />;
  }

  return (
    <AssetHydratedView
      route={route}
      app={app}
      result={state.result}
      assetClient={assetClient}
      resolverState={state}
    />
  );
}

function AssetResolveProblem({ error, app, route, state }) {
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
          <ProblemFact label="Correlation" value={problem.correlationId || 'n/a'} monospace />
          <ProblemFact label="Kind" value={problem.target?.assetKind || route?.params?.assetKind || 'n/a'} />
          <ProblemFact label="CID" value={problem.target?.cid || route?.params?.cid || 'n/a'} monospace />
          <ProblemFact label="Started" value={state?.startedAt || 'n/a'} />
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

      <Card eyebrow="Developer" title="Problem payload">
        <JsonPreview label="Asset resolve problem" data={problem} initiallyOpen />
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

function toneForProblem(problemCode) {
  const code = String(problemCode || '').toLowerCase();

  if (code.includes('gateway') || code.includes('network') || code.includes('timeout')) {
    return 'warning';
  }

  if (code.includes('not_found') || code.includes('missing')) {
    return 'warning';
  }

  if (code.includes('invalid') || code.includes('unsupported') || code.includes('malformed')) {
    return 'danger';
  }

  return 'danger';
}