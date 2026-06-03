/**
 * RO:WHAT — Route owner for the React crab://video simple mint workspace.
 * RO:WHY — Keeps video minting aligned with the image one-card Simple Mint reference flow.
 * RO:INTERACTS — VideoDraft.jsx, videoDraftModel.js, useCreatorDraft, VideoPublishFlow.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no ROC mutation; no backend publication claim.
 * RO:METRICS — none; gateway publish routes expose their own correlation IDs in the publish panel.
 * RO:CONFIG — app settings are display labels only.
 * RO:SECURITY — React owns display/user intent only; backend/wallet truth remains service-owned.
 * RO:TEST — npm run build; manual crab://video source → prepare → hold → staged upload smoke.
 */

import { useCallback } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import VideoDraft from './VideoDraft.jsx';
import {
  DEFAULT_VIDEO_DRAFT,
  buildVideoManifestDraft,
  getVideoCompleteness,
  statsForVideoDraft,
} from './videoDraftModel.js';
import './video.css';

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
    <main className="video-page video-page-simple video-page-one-card">
      <header className="video-simple-hero">
        <div>
          <p className="cl-eyebrow">crab://video</p>
          <h1>Mint a video</h1>
          <p>
            Choose one source video, prepare MP4 versions, confirm the ROC hold, then mint the
            selected video bundle as backend-returned assets.
          </p>
        </div>

        <div className="video-simple-hero-badges">
          <Badge tone="success">MP4 bundle mint</Badge>
          <Badge tone="warning">Explicit ROC hold</Badge>
          <Badge tone="info">Backend CIDs only</Badge>
        </div>
      </header>

      <VideoDraft app={app} route={route} draftState={draftState} initialSourceHandle={sourceHandleFromVideoRoute(route)} />
    </main>
  );
}


function sourceHandleFromVideoRoute(route = {}) {
  const candidates = [
    route?.url,
    route?.rawInput,
    route?.normalizedInput,
    route?.routeContext?.requestedUrl,
    route?.route_context?.requested_url,
  ];

  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (!value) continue;

    const match = value.match(/[?&](?:sourceId|sourceHandle)=([^&#]+)/i);
    if (!match) continue;

    try {
      return decodeURIComponent(match[1] || '').trim();
    } catch (_error) {
      return String(match[1] || '').trim();
    }
  }

  return '';
}
