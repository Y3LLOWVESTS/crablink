/**
 * RO:WHAT — Pure local clip snapshot/signature/split helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; reduces MakePage.jsx without changing editor behavior.
 * RO:INTERACTS — MakePage.jsx, makeTimelineModel.js.
 * RO:INVARIANTS — local draft metadata only; no b3 minting; no receipts; no wallet or ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — local clip timeline trim/effect metadata.
 * RO:SECURITY — no secrets, capabilities, balances, receipt truth, or native path authority.
 * RO:TEST — npm run build; manual crab://make clip split/undo/redo smoke.
 */

import {
  clipTimelineSignature,
  normalizeMakeClip,
  updateClipTimeline,
} from './makeTimelineModel.js';

export function snapshotTimelineClips(clips = []) {
  return (clips || []).filter(Boolean).map((clip) => normalizeMakeClip({
    ...clip,
    timeline: {
      ...(clip.timeline || {}),
    },
  }));
}

export function makeTimelineClipArraySignature(clips = []) {
  return snapshotTimelineClips(clips)
    .map((clip) => [clip.id, clipTimelineSignature(clip), clip.objectUrl || '', clip.sourceClipId || ''].join('/'))
    .join('|');
}

export function makeTimelineSegmentId(baseId = 'clip', label = 'segment') {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `${baseId || 'clip'}-${label}-${suffix}`;
}

export function cloneTimelineSegmentClip(clip, {
  id = makeTimelineSegmentId(clip?.id || 'clip', 'segment'),
  trimStartMs = 0,
  trimEndMs = 0,
  segmentLabel = 'segment',
} = {}) {
  let objectUrl = clip?.objectUrl || '';

  if (typeof URL !== 'undefined' && typeof Blob !== 'undefined' && clip?.blob instanceof Blob) {
    objectUrl = URL.createObjectURL(clip.blob);
  }

  const baseName = clip?.name || 'clip';

  return updateClipTimeline({
    ...clip,
    id,
    objectUrl,
    sourceClipId: clip?.sourceClipId || clip?.id || '',
    splitFromClipId: clip?.id || '',
    name: `${baseName} · ${segmentLabel}`,
    localOnly: true,
  }, {
    trimStartMs,
    trimEndMs,
  });
}
