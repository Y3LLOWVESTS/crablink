/**
 * RO:WHAT — Browser media stream/runtime helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage container focused on state orchestration.
 * RO:INTERACTS — MakePage.jsx, browser MediaStream/MediaRecorder APIs.
 * RO:INVARIANTS — local media streams only; no backend truth; no receipts; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — browser media devices and tracks.
 * RO:SECURITY — no secret material or native file paths; stream facts are display/debug only.
 * RO:TEST — npm run build; manual camera/screen/mic preview smoke.
 */

export function makeStreamFacts(stream) {
  if (!stream) {
    return {
      active: false,
      id: '',
      audioTracks: [],
      videoTracks: [],
    };
  }

  return {
    active: Boolean(stream.active),
    id: stream.id || '',
    audioTracks: stream.getAudioTracks?.().map(makeTrackFacts) || [],
    videoTracks: stream.getVideoTracks?.().map(makeTrackFacts) || [],
  };
}

export function makeTrackFacts(track) {
  if (!track) {
    return {
      kind: '',
      label: '',
      enabled: false,
      muted: false,
      readyState: '',
      settings: {},
    };
  }

  let settings = {};

  try {
    settings = track.getSettings?.() || {};
  } catch (_error) {
    settings = {};
  }

  return {
    kind: track.kind || '',
    label: track.label || '',
    enabled: Boolean(track.enabled),
    muted: Boolean(track.muted),
    readyState: track.readyState || '',
    settings,
  };
}

export function makeMediaErrorDetails(error) {
  const name = error?.name || '';
  const message = error?.message || String(error || 'Unknown error');
  const summary = name ? `${name}: ${message}` : message;

  return {
    name,
    message,
    summary,
  };
}

export function errorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return error.message || error.name || String(error);
}
