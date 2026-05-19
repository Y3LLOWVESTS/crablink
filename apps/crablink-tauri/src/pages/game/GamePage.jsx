/**
 * RO:WHAT — Route owner for the React crab://game local game manifest workspace.
 * RO:WHY — CrabLink refactor; models game manifests, assets, save-data policy, runtime/facet rules, and economics without execution.
 * RO:INTERACTS — GameDraft, GameAssets, useCreatorDraft, CreatorWorkspaceLayout, future game manifest/facet/sandbox routes.
 * RO:INVARIANTS — local draft only; no game execution; no sandbox launch; no fake b3 CID; no ROC mutation; no backend publication.
 * RO:METRICS — none; future game sessions/views/saves/spend must be backend-accounted and policy-gated.
 * RO:CONFIG — route props only; future game runtime/economics/policy configs come from backend route contracts.
 * RO:SECURITY — CrabLink renders this page only; runnable games require facet.toml, policy, capabilities, limits, and sandbox.
 * RO:TEST — npm run build; check-react-lane; manual crab://game route smoke in light and dark mode.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import GameDraft, { GameSidePanel } from './GameDraft.jsx';
import {
  DEFAULT_GAME_DRAFT,
  buildGameManifestDraft,
  getGameCompleteness,
  statsForGameDraft,
} from './gameDraftModel.js';
import './game.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Playable means sandboxed',
    copy:
      'Games are runtime assets. Playable games must require facet contracts, policy gates, capabilities, resource limits, and sandboxing.',
  },
  {
    title: 'Assets remain content-addressed',
    copy:
      'Cover art, thumbnails, trailers, bundles, maps, audio, save schemas, and runtime bytes should remain independent b3-backed assets.',
  },
  {
    title: 'No hidden economy',
    copy:
      'Game access, saves, sessions, purchases, rewards, and payouts must never mutate wallets silently. This route only drafts policy.',
  },
]);

export default function GamePage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildGameManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_GAME_DRAFT,
    buildManifest,
    buildStats: statsForGameDraft,
    getCompleteness: getGameCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://game"
      title="Game Manifest Studio"
      copy="Draft game manifests with asset bundles, runtime/facet policy, save-data rules, multiplayer/session rules, access, moderation, and economics. This React route is local-only and does not execute or publish games."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Runtime-gated', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<GameSidePanel draftState={draftState} />}
      className="game-page"
    >
      <RouteTruthPanel
        routeKind="game"
        tone="info"
        title="Game route truth boundary"
        allowed={[
          'local game manifest drafting',
          'asset bundle planning',
          'runtime/facet planning',
          'save/session/economy policy planning',
          'manifest JSON preview',
        ]}
        blocked={[
          'no runtime bytes fetched',
          'no game execution',
          'no WASM instantiation',
          'no sandbox launch',
          'no save data writes',
          'no session creation',
          'no ROC hold/capture/release',
          'no backend publication claim',
        ]}
      />

      <GameDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}