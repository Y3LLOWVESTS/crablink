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
    title: 'Local preview is honest',
    copy:
      'Creators can preview a selected local video file in the WebView, but that preview is not a b3 object, not a backend stream, not a paid unlock, and not persistent truth.',
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
      copy="Draft video asset manifests and mint bounded video-lite uploads through the same explicit prepare → ROC hold → upload flow proven for images. Larger range/segment streaming remains future work."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Explicit paid mint', tone: 'warning' },
        { label: 'Local preview', tone: 'neutral' },
        { label: 'Video-lite', tone: 'neutral' },
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
          'bounded local file playback preview',
          'explicit video prepare request',
          'explicit ROC hold confirmation',
          'bounded paid video byte upload',
        ]}
        blocked={[
          'no silent video upload',
          'no fake b3 CID minted locally',
          'no fake manifest CID minted locally',
          'no backend range/stream playback yet',
          'no local preview path persisted into manifest',
          'no silent ROC hold/capture/release',
          'no direct wallet mutation from React',
          'no DRM or anti-rip claim',
        ]}
      />

      <VideoDraft app={app} draftState={draftState} />
    </CreatorWorkspaceLayout>
  );
}