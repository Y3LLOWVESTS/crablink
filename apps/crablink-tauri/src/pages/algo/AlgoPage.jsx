/**
 * RO:WHAT — Route owner for the React crab://algo local algorithm transparency workspace.
 * RO:WHY — CrabLink refactor; models transparent ranking/curation algorithm manifests before backend algo/facet execution exists.
 * RO:INTERACTS — AlgoDraft.jsx, AlgoTransparency.jsx, algoDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout.
 * RO:INVARIANTS — local draft only; no code execution; no ranking execution; no fake b3 CID; no ROC mutation.
 * RO:METRICS — none; future rank/impression/accounting events must be backend-accounted and policy-gated.
 * RO:CONFIG — route props only; future policy/economics/facet configs come from backend route contracts.
 * RO:SECURITY — never executes crab:// code; future executable logic must go through facet.toml, svc-sandbox, and policy.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://algo route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import AlgoDraft, { AlgoSidePanel } from './AlgoDraft.jsx';
import {
  DEFAULT_ALGO_DRAFT,
  buildAlgoManifestDraft,
  getAlgoCompleteness,
  statsForAlgoDraft,
} from './algoDraftModel.js';
import './algo.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Transparency before runtime',
    copy:
      'crab://algo documents ranking, curation, and moderation behavior before any execution route exists.',
  },
  {
    title: 'Signals must be visible',
    copy:
      'Input signals, excluded signals, goals, fairness notes, and audit references should be visible to users and site owners.',
  },
  {
    title: 'Execution belongs in a sandbox',
    copy:
      'Executable algorithm code must require a facet contract, resource limits, capability checks, and sandbox execution.',
  },
]);

export default function AlgoPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildAlgoManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_ALGO_DRAFT,
    buildManifest,
    buildStats: statsForAlgoDraft,
    getCompleteness: getAlgoCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://algo"
      title="Algorithm Transparency Studio"
      copy="Draft transparent algorithm manifests for feed ranking, search, recommendations, curation, moderation assist, and trust scoring. This React route is local-only and does not execute code or rank content."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Sandbox-first', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<AlgoSidePanel draftState={draftState} />}
      className="algo-page"
    >
      <RouteTruthPanel
        routeKind="algo"
        tone="info"
        title="Algorithm route truth boundary"
        allowed={[
          'local transparency drafting',
          'signal policy planning',
          'facet/sandbox planning',
          'manifest JSON preview',
        ]}
        blocked={[
          'no code execution',
          'no algorithm execution',
          'no content ranking',
          'no feed mutation',
          'no b3 CID minted',
          'no manifest CID minted',
          'no ROC hold/capture/release',
          'no backend approval claim',
        ]}
      />

      <AlgoDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}