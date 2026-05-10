/**
 * RO:WHAT — Route owner for the React crab://video local creator workspace.
 * RO:WHY — CrabLink refactor; migrates video drafting onto shared creator workspace architecture before backend video flows exist.
 * RO:INTERACTS — VideoDraft.jsx, videoDraftModel.js, useCreatorDraft, CreatorWorkspaceLayout, RouteTruthPanel.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; future publish/prepare routes must use gateway client metrics/correlation IDs.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — trusted local UI only; no arbitrary crab code execution; no wallet spend authority.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://video route smoke.
 */

import { useCallback } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import VideoDraft, { VideoSidePanel } from './VideoDraft.jsx';
import {
  DEFAULT_VIDEO_DRAFT,
  buildVideoManifestDraft,
  getVideoCompleteness,
  statsForVideoDraft,
} from './videoDraftModel.js';
import './video.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Rendition graph ready',
    copy:
      'Every real video byte variant should become its own immutable b3-backed object later. This workspace only plans the manifest relationships.',
  },
  {
    title: 'Linked assets stay separate',
    copy:
      'Poster art, thumbnails, captions, dubs, transcripts, and trailers should remain separately addressed assets instead of being hidden inside one video blob.',
  },
  {
    title: 'Playback is not claimed here',
    copy:
      'This route does not upload, range-serve, transcode, DRM-gate, charge ROC, or stream media. It drafts the product contract safely first.',
  },
]);

export default function VideoPage({ app, route }) {
  const buildManifest = useCallback(
    (draft) => buildVideoManifestDraft(draft, { app, route }),
    [app, route],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_VIDEO_DRAFT,
    buildManifest,
    buildStats: statsForVideoDraft,
    getCompleteness: getVideoCompleteness,
  });

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://video"
      title="Video Workspace"
      copy="Draft video asset manifests with poster art, thumbnails, renditions, captions, dubs, transcripts, rights, access, and payout intent. This React route is local-only and does not upload or publish video bytes yet."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'Media primitive', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<VideoSidePanel draftState={draftState} />}
      className="video-page"
    >
      <RouteTruthPanel
        routeKind="video"
        tone="info"
        title="Video route truth boundary"
        allowed={[
          'local metadata drafting',
          'rendition planning',
          'linked asset planning',
          'manifest JSON preview',
        ]}
        blocked={[
          'no video bytes uploaded',
          'no b3 CID minted',
          'no manifest CID minted',
          'no range/stream playback',
          'no ROC hold/capture/release',
          'no wallet mutation',
          'no backend publication claim',
        ]}
      />

      <VideoDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}