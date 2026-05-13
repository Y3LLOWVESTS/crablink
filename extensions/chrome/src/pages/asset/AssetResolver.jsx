/**
 * RO:WHAT — Gateway resolver for typed CrabLink asset routes.
 * RO:WHY — Moves crab://<hash>.<kind> from scaffold to protected read-only backend hydration.
 * RO:INTERACTS — assetClient, gatewayClient, AssetHydratedView, LoadingState, RouteProblemPanel.
 * RO:INVARIANTS — gateway-only; read-only; no fake b3/manifest/receipt truth; no wallet mutation.
 * RO:METRICS — records returned gateway correlation IDs in visible route facts.
 * RO:CONFIG — app.clients.gateway settings.
 * RO:SECURITY — no direct internal service calls; no untrusted HTML execution.
 * RO:TEST — manual route smoke with gateway online/offline and known-good image assets.
 */

import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../../shared/components/LoadingState.jsx';
import RouteProblemPanel from '../../shared/components/RouteProblemPanel.jsx';
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

  return (
    <RouteProblemPanel
      title={problem.title}
      copy={problem.copy}
      problem={problem}
      error={error}
      route={route}
      target={{
        ...problem.target,
        assetKind: problem.target?.assetKind || route?.params?.assetKind || '',
        cid: problem.target?.cid || route?.params?.cid || '',
        assetUrl: problem.target?.assetUrl || route?.normalizedInput || '',
      }}
      remediation={problem.remediation}
      onRetry={app?.refreshRoute}
      onHome={app?.goHome}
      jsonLabel="Asset resolve problem JSON"
      attemptTitle="Resolve path diagnostics"
      copyLabel="Copy problem JSON"
      className="asset-problem-stack"
    />
  );
}