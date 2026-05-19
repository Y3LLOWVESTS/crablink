/**
 * RO:WHAT — React owner page for crab://lyrics.
 * RO:WHY — CrabLink refactor; proves shared creator workspace components on a low-risk local route.
 * RO:INTERACTS — LyricsDraft.jsx, lyricsDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — local draft only; no fake backend truth; no fake CID; no silent ROC spend; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — trusted UI only; untrusted/executable content is not rendered here.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://lyrics route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import LyricsDraft, { LyricsSidePanel } from './LyricsDraft.jsx';
import {
  DEFAULT_LYRICS_DRAFT,
  buildLyricsManifestDraft,
  getLyricsCompleteness,
  statsForLyricsDraft,
} from './lyricsDraftModel.js';
import './lyrics.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Separate asset',
    copy:
      'Lyrics should be their own typed asset, referenced by music or song manifests instead of being embedded directly inside those manifests.',
  },
  {
    title: 'Rights boundary',
    copy:
      'Lyrics can have separate licensing, access policy, review status, history, takedown handling, and future paywall rules.',
  },
  {
    title: 'Immutable future',
    copy:
      'Future published lyrics bytes and manifests should be content-addressed, versioned, and linked through uniform manifest sections.',
  },
]);

export default function LyricsPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildLyricsManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_LYRICS_DRAFT,
    buildManifest,
    buildStats: statsForLyricsDraft,
    getCompleteness: getLyricsCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://lyrics"
      title="Lyrics Workspace"
      copy="Draft standalone lyrics assets that can later be linked from music, song, video, or film manifests. Lyrics stay separate so rights, access, takedowns, and versions can be handled independently."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'No backend publish', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<LyricsSidePanel draftState={draftState} />}
      className="lyrics-page"
    >
      <RouteTruthPanel
        routeKind="lyrics"
        tone="info"
        title="Lyrics route truth boundary"
        allowed={['local writing', 'manifest preview', 'copy JSON', 'builder/developer view']}
      />

      <LyricsDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}