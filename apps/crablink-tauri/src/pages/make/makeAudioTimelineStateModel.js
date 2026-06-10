/**
 * RO:WHAT — Audio timeline history/collision helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; isolates draft timeline math from the MakePage container.
 * RO:INTERACTS — MakePage.jsx, future MakeAudioTimeline.jsx, makeAudioTimelineModel.js.
 * RO:INVARIANTS — local draft metadata only; no final mix; no b3; no receipts; no wallet or ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — audio offset/trim values from Make UI state.
 * RO:SECURITY — no native paths, no spend authority, no backend proof.
 * RO:TEST — npm run build; manual audio add/move/trim undo/redo smoke.
 */

function clampMs(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(Math.max(number, min), max);
}

export function snapshotAudioTracks(audioTracks = []) {
  return (audioTracks || []).map((track) => ({ ...track }));
}

export function makeAudioTrackArraySignature(audioTracks = []) {
  return (audioTracks || [])
    .map((track) => [
      track?.id || '',
      Math.round(Number(track?.offsetMs || 0)),
      Math.round(Number(track?.trimStartMs || 0)),
      Math.round(Number(track?.trimEndMs || 0)),
      Math.round(Number(track?.volumePct || 0)),
      track?.muted ? 'muted' : 'live',
    ].join(':'))
    .join('|');
}

export function snapshotMakeTimelineState({
  clips = [],
  audioTracks = [],
  selectedClipId = '',
  timelineItemOrder = [],
} = {}) {
  return {
    clips: (clips || []).map((clip) => ({
      ...clip,
      timeline: {
        ...(clip?.timeline || {}),
      },
    })),
    audioTracks: snapshotAudioTracks(audioTracks),
    selectedClipId: selectedClipId || '',
    timelineItemOrder: [...(timelineItemOrder || [])],
  };
}

export function normalizeMakeTimelineHistorySnapshot(snapshot, fallbackAudioTracks = []) {
  if (Array.isArray(snapshot)) {
    return snapshotMakeTimelineState({
      clips: snapshot,
      audioTracks: fallbackAudioTracks,
    });
  }

  if (!snapshot || typeof snapshot !== 'object') {
    return snapshotMakeTimelineState({
      clips: [],
      audioTracks: fallbackAudioTracks,
    });
  }

  return snapshotMakeTimelineState({
    clips: snapshot.clips || [],
    audioTracks: snapshot.audioTracks || fallbackAudioTracks,
    selectedClipId: snapshot.selectedClipId || '',
    timelineItemOrder: snapshot.timelineItemOrder || [],
  });
}

export function getAudioTrackLayoutDurationMs(track = {}) {
  const durationMs = Math.max(0, Number(track.durationMs || 0));
  const trimStartMs = clampMs(track.trimStartMs || 0, 0, durationMs || Number.MAX_SAFE_INTEGER, 0);
  const trimEndMs = clampMs(
    track.trimEndMs || durationMs,
    trimStartMs,
    durationMs || Number.MAX_SAFE_INTEGER,
    durationMs,
  );

  return Math.max(500, trimEndMs - trimStartMs || durationMs || 1000);
}

export function getAudioTrackInterval(track = {}, overrideOffsetMs = null) {
  const startMs = Math.max(
    0,
    Number(overrideOffsetMs === null || overrideOffsetMs === undefined ? track.offsetMs || 0 : overrideOffsetMs),
  );
  const durationMs = getAudioTrackLayoutDurationMs(track);

  return {
    id: track.id || '',
    startMs,
    endMs: startMs + durationMs,
    durationMs,
  };
}

export function audioIntervalsOverlap(a, b) {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

export function resolveAudioTrackOverlapBySlotSwap(nextTracks = [], movedTrackId = '', beforeTracks = []) {
  const movedTrack = nextTracks.find((track) => track?.id === movedTrackId);

  if (!movedTrack) {
    return nextTracks;
  }

  const beforeIntervals = (beforeTracks || [])
    .map((track) => getAudioTrackInterval(track))
    .sort((a, b) => a.startMs - b.startMs);

  const nextIntervals = (nextTracks || [])
    .map((track) => getAudioTrackInterval(track))
    .sort((a, b) => a.startMs - b.startMs);

  const movedInterval = getAudioTrackInterval(movedTrack);
  const colliding = nextIntervals.find((interval) => (
    interval.id !== movedTrackId && audioIntervalsOverlap(movedInterval, interval)
  ));

  if (!colliding) {
    return nextTracks;
  }

  const movedBefore = beforeIntervals.find((interval) => interval.id === movedTrackId);
  const targetBefore = beforeIntervals.find((interval) => interval.id === colliding.id);

  if (!movedBefore || !targetBefore) {
    return nextTracks.map((track) => {
      if (track.id !== movedTrackId) {
        return track;
      }

      return {
        ...track,
        offsetMs: Math.max(0, colliding.endMs),
      };
    });
  }

  return nextTracks.map((track) => {
    if (track.id === movedTrackId) {
      return {
        ...track,
        offsetMs: targetBefore.startMs,
      };
    }

    if (track.id === colliding.id) {
      return {
        ...track,
        offsetMs: movedBefore.startMs,
      };
    }

    return track;
  });
}
