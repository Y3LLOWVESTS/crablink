export const TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA =
  'crablink.tv.verified-media-playback-surface.v1';

export const TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL = Object.freeze({
  BACK: 'back',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  FULLSCREEN: 'fullscreen',
});

const EXPECTED_PLAYBACK_SCHEMA =
  'crablink.tv.verified-media-playback.v1';

const SOURCE_NOT_ATTACHED_REASON =
  'verified playback source handoff not attached yet';

function cleanText(value) {
  return String(value ?? '').trim();
}

function boundedText(value, fallback = 'unknown') {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  if (text.length > 160) {
    return `${text.slice(0, 157)}...`;
  }

  return text;
}

function boundedLength(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.trunc(number);
}

function playbackKindFor(playbackView) {
  const playbackKind =
    cleanText(playbackView?.playbackKind).toLowerCase();

  if (playbackKind === 'video' || playbackKind === 'audio') {
    return playbackKind;
  }

  const contentType =
    cleanText(playbackView?.contentType).toLowerCase();

  if (contentType.startsWith('video/')) {
    return 'video';
  }

  if (contentType.startsWith('audio/')) {
    return 'audio';
  }

  return 'unknown';
}

function verificationLabelFor(playbackView) {
  if (playbackView?.fullByteVerified === true) {
    return 'Local full-byte verification complete.';
  }

  if (playbackView?.backendServicePathVerified === true) {
    return 'Backend service-path verification confirmed.';
  }

  return 'No completed media verification.';
}

function sourcePlanFor(playbackView) {
  if (playbackView?.fullByteVerified === true) {
    return 'Verified object source pending isolated handoff.';
  }

  if (playbackView?.backendServicePathVerified === true) {
    return 'Gateway stream source pending isolated handoff.';
  }

  return 'Verified source handoff pending.';
}

function controlsFor(state) {
  const backControl = {
    control: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.BACK,
    label: 'Back to Library',
    enabled: true,
    focusable: true,
    reason: null,
  };

  const disabledPlaybackControls = [
    {
      control: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.PLAY,
      label: 'Play',
    },
    {
      control: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.PAUSE,
      label: 'Pause',
    },
    {
      control: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.SEEK,
      label: 'Seek',
    },
    {
      control: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_CONTROL.FULLSCREEN,
      label: 'Fullscreen',
    },
  ].map((control) => ({
    ...control,
    enabled: false,
    focusable: false,
    reason:
      state === TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.READY
        ? SOURCE_NOT_ATTACHED_REASON
        : 'playback readiness not accepted',
  }));

  return [
    backControl,
    ...disabledPlaybackControls,
  ];
}

function factsFor(playbackView, playbackKind) {
  return [
    {
      label: 'Kind',
      value: playbackKind,
    },
    {
      label: 'Type',
      value: boundedText(playbackView?.contentType),
    },
    {
      label: 'Length',
      value: String(boundedLength(playbackView?.contentLength)),
    },
    {
      label: 'Verification',
      value: verificationLabelFor(playbackView),
    },
  ];
}

function rejectedView(problem) {
  return {
    schema: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA,
    state: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.REJECTED,
    title: 'Verified media unavailable',
    playbackKind: 'unknown',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    fullByteVerified: false,
    backendServicePathVerified: false,
    sourceAttached: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    statusLabel: 'Playback shell rejected this media view.',
    verificationLabel: 'No completed media verification.',
    sourcePlan: SOURCE_NOT_ATTACHED_REASON,
    controls: controlsFor(
      TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.REJECTED,
    ),
    facts: [],
    problem,
  };
}

export function projectTvVerifiedMediaPlaybackSurface(playbackView) {
  if (!playbackView || typeof playbackView !== 'object') {
    return {
      schema: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA,
      state: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.IDLE,
      title: 'No verified media selected',
      playbackKind: 'unknown',
      canonicalCrabUrl: '',
      cid: '',
      contentType: '',
      contentLength: 0,
      fullByteVerified: false,
      backendServicePathVerified: false,
      sourceAttached: false,
      playerElementAttached: false,
      autoplayAllowed: false,
      statusLabel: 'Select a verified video or audio asset.',
      verificationLabel: 'No completed media verification.',
      sourcePlan: SOURCE_NOT_ATTACHED_REASON,
      controls: controlsFor(
        TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.IDLE,
      ),
      facts: [],
      problem: null,
    };
  }

  if (playbackView.schema !== EXPECTED_PLAYBACK_SCHEMA) {
    return rejectedView({
      code: 'UNSUPPORTED_PLAYBACK_SCHEMA',
      message: 'Playback surface requires Phase 10A readiness.',
    });
  }

  if (playbackView.state !== 'ready') {
    return rejectedView({
      code: 'PLAYBACK_NOT_READY',
      message: 'Playback shell only accepts ready media.',
    });
  }

  const playbackKind = playbackKindFor(playbackView);

  if (playbackKind !== 'video' && playbackKind !== 'audio') {
    return rejectedView({
      code: 'UNSUPPORTED_PLAYBACK_KIND',
      message: 'Playback shell accepts only video or audio.',
    });
  }

  const verificationLabel = verificationLabelFor(playbackView);
  const sourcePlan = sourcePlanFor(playbackView);

  return {
    schema: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_SCHEMA,
    state: TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.READY,
    title:
      playbackKind === 'video'
        ? 'Verified video ready'
        : 'Verified audio ready',
    playbackKind,
    canonicalCrabUrl: boundedText(playbackView.canonicalCrabUrl, ''),
    cid: boundedText(playbackView.cid, ''),
    contentType: boundedText(playbackView.contentType, ''),
    contentLength: boundedLength(playbackView.contentLength),
    fullByteVerified: playbackView.fullByteVerified === true,
    backendServicePathVerified:
      playbackView.backendServicePathVerified === true,
    sourceAttached: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    statusLabel:
      'Playback surface shell is ready; media source handoff is pending.',
    verificationLabel,
    sourcePlan,
    controls: controlsFor(
      TV_VERIFIED_MEDIA_PLAYBACK_SURFACE_STATE.READY,
    ),
    facts: factsFor(playbackView, playbackKind),
    problem: null,
  };
}
