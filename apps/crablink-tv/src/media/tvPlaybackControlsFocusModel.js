export const TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA =
  'crablink.tv.playback-controls-focus.v1';

export const TV_PLAYBACK_CONTROLS_FOCUS_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_PLAYBACK_CONTROL = Object.freeze({
  BACK: 'back',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK_BACKWARD: 'seek-backward',
  SEEK_FORWARD: 'seek-forward',
  FULLSCREEN: 'fullscreen',
});

const VIDEO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-video-playback.v1';

const AUDIO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-audio-playback.v1';

const CONTROL_ORDER = Object.freeze([
  TV_PLAYBACK_CONTROL.BACK,
  TV_PLAYBACK_CONTROL.PLAY,
  TV_PLAYBACK_CONTROL.PAUSE,
  TV_PLAYBACK_CONTROL.SEEK_BACKWARD,
  TV_PLAYBACK_CONTROL.SEEK_FORWARD,
  TV_PLAYBACK_CONTROL.FULLSCREEN,
]);

const AUDIO_CONTROL_ALLOWLIST =
  new Set([
    TV_PLAYBACK_CONTROL.BACK,
    TV_PLAYBACK_CONTROL.PLAY,
    TV_PLAYBACK_CONTROL.PAUSE,
    TV_PLAYBACK_CONTROL.SEEK_BACKWARD,
    TV_PLAYBACK_CONTROL.SEEK_FORWARD,
  ]);

const VIDEO_CONTROL_ALLOWLIST =
  new Set(CONTROL_ORDER);

function cleanText(value) {
  return String(value ?? '').trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function isKnownControl(control) {
  return CONTROL_ORDER.includes(control);
}

function mediaKindFor(playerView) {
  if (playerView?.schema === VIDEO_PLAYBACK_SCHEMA) {
    return 'video';
  }

  if (playerView?.schema === AUDIO_PLAYBACK_SCHEMA) {
    return 'audio';
  }

  return 'unknown';
}

function controlAllowlistFor(mediaKind) {
  if (mediaKind === 'video') {
    return VIDEO_CONTROL_ALLOWLIST;
  }

  if (mediaKind === 'audio') {
    return AUDIO_CONTROL_ALLOWLIST;
  }

  return new Set([TV_PLAYBACK_CONTROL.BACK]);
}

function defaultControlsFor(mediaKind, state) {
  const allowlist = controlAllowlistFor(mediaKind);

  return CONTROL_ORDER
    .filter((control) => allowlist.has(control))
    .map((control) => ({
      control,
      label: labelFor(control),
      enabled:
        control === TV_PLAYBACK_CONTROL.BACK ||
        state === TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY,
      focusable:
        control === TV_PLAYBACK_CONTROL.BACK ||
        state === TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY,
      reason:
        control === TV_PLAYBACK_CONTROL.BACK ||
        state === TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY
          ? null
          : 'playback controls are not ready',
    }));
}

function labelFor(control) {
  switch (control) {
    case TV_PLAYBACK_CONTROL.BACK:
      return 'Back';
    case TV_PLAYBACK_CONTROL.PLAY:
      return 'Play';
    case TV_PLAYBACK_CONTROL.PAUSE:
      return 'Pause';
    case TV_PLAYBACK_CONTROL.SEEK_BACKWARD:
      return 'Back 30s';
    case TV_PLAYBACK_CONTROL.SEEK_FORWARD:
      return 'Forward 30s';
    case TV_PLAYBACK_CONTROL.FULLSCREEN:
      return 'Fullscreen';
    default:
      return 'Control';
  }
}

function normalizeControls(playerView, mediaKind) {
  const allowlist = controlAllowlistFor(mediaKind);
  const sourceControls =
    Array.isArray(playerView?.controls)
      ? playerView.controls
      : defaultControlsFor(mediaKind, 'ready');

  const byControl = new Map();

  for (const sourceControl of sourceControls) {
    const control = lowerText(sourceControl?.control);

    if (!isKnownControl(control) || !allowlist.has(control)) {
      continue;
    }

    byControl.set(control, {
      control,
      label: cleanText(sourceControl?.label) || labelFor(control),
      enabled: sourceControl?.enabled === true,
      focusable:
        sourceControl?.focusable === true &&
        sourceControl?.enabled === true,
      reason:
        sourceControl?.enabled === true
          ? null
          : cleanText(sourceControl?.reason) || 'control is disabled',
    });
  }

  if (!byControl.has(TV_PLAYBACK_CONTROL.BACK)) {
    byControl.set(TV_PLAYBACK_CONTROL.BACK, {
      control: TV_PLAYBACK_CONTROL.BACK,
      label: 'Back',
      enabled: true,
      focusable: true,
      reason: null,
    });
  }

  return CONTROL_ORDER
    .filter((control) => allowlist.has(control))
    .map((control) =>
      byControl.get(control) ?? {
        control,
        label: labelFor(control),
        enabled: false,
        focusable: false,
        reason: 'control is unavailable',
      },
    );
}

function applyFocus(controls, requestedControl, focusMove) {
  const focusableControls =
    controls.filter((control) => control.focusable === true);

  const fallback =
    focusableControls[0]?.control ?? TV_PLAYBACK_CONTROL.BACK;

  const requested =
    isKnownControl(requestedControl) ? requestedControl : fallback;

  const requestedIndex =
    focusableControls.findIndex(
      (control) => control.control === requested,
    );

  let nextIndex = requestedIndex >= 0 ? requestedIndex : 0;

  if (focusMove === 'next' && focusableControls.length > 0) {
    nextIndex = (nextIndex + 1) % focusableControls.length;
  }

  if (focusMove === 'previous' && focusableControls.length > 0) {
    nextIndex =
      (nextIndex - 1 + focusableControls.length) %
      focusableControls.length;
  }

  const focusedControl =
    focusableControls[nextIndex]?.control ?? fallback;

  return {
    focusedControl,
    controls: controls.map((control) => ({
      ...control,
      selected: control.control === focusedControl,
      activationAllowed:
        control.control === focusedControl &&
        control.enabled === true,
    })),
  };
}

function idleProjection() {
  const focus =
    applyFocus(
      defaultControlsFor('unknown', TV_PLAYBACK_CONTROLS_FOCUS_STATE.IDLE),
      TV_PLAYBACK_CONTROL.BACK,
      '',
    );

  return {
    schema: TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA,
    state: TV_PLAYBACK_CONTROLS_FOCUS_STATE.IDLE,
    mediaKind: 'unknown',
    focusedControl: focus.focusedControl,
    remoteFocusEnabled: true,
    remoteActivationEnabled: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    statusLabel: 'No playback controls are active.',
    controls: focus.controls,
    problem: null,
  };
}

function rejectedProjection(code, message, mediaKind = 'unknown') {
  const focus =
    applyFocus(
      defaultControlsFor(mediaKind, TV_PLAYBACK_CONTROLS_FOCUS_STATE.REJECTED),
      TV_PLAYBACK_CONTROL.BACK,
      '',
    );

  return {
    schema: TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA,
    state: TV_PLAYBACK_CONTROLS_FOCUS_STATE.REJECTED,
    mediaKind,
    focusedControl: focus.focusedControl,
    remoteFocusEnabled: true,
    remoteActivationEnabled: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    statusLabel: 'Playback controls rejected this player view.',
    controls: focus.controls,
    problem: {
      code,
      message,
    },
  };
}

export function projectTvPlaybackControlsFocus(input) {
  if (!input || typeof input !== 'object') {
    return idleProjection();
  }

  const playerView = input.playerView;
  const focusRequest = input.focusRequest ?? {};

  if (!playerView || typeof playerView !== 'object') {
    return idleProjection();
  }

  const mediaKind = mediaKindFor(playerView);

  if (mediaKind === 'unknown') {
    return rejectedProjection(
      'UNSUPPORTED_PLAYER_SCHEMA',
      'Playback controls require a verified video or audio player view.',
    );
  }

  if (playerView.state !== 'ready') {
    return rejectedProjection(
      'PLAYER_VIEW_NOT_READY',
      'Playback controls only accept ready player views.',
      mediaKind,
    );
  }

  if (playerView.playerElementAttached !== true) {
    return rejectedProjection(
      'PLAYER_ELEMENT_NOT_ATTACHED',
      'Playback controls require an attached player element.',
      mediaKind,
    );
  }

  if (playerView.autoplayAllowed === true) {
    return rejectedProjection(
      'AUTOPLAY_NOT_ALLOWED',
      'Playback controls require user-driven playback.',
      mediaKind,
    );
  }

  if (
    mediaKind === 'video' &&
    playerView.videoElementAttached !== true
  ) {
    return rejectedProjection(
      'VIDEO_ELEMENT_NOT_ATTACHED',
      'Video controls require an attached video element.',
      mediaKind,
    );
  }

  if (
    mediaKind === 'audio' &&
    playerView.audioElementAttached !== true
  ) {
    return rejectedProjection(
      'AUDIO_ELEMENT_NOT_ATTACHED',
      'Audio controls require an attached audio element.',
      mediaKind,
    );
  }

  const requestedControl =
    lowerText(focusRequest.control);
  const focusMove =
    lowerText(focusRequest.move);

  const normalizedControls =
    normalizeControls(playerView, mediaKind);

  const focus =
    applyFocus(
      normalizedControls,
      requestedControl,
      focusMove,
    );

  return {
    schema: TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA,
    state: TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY,
    mediaKind,
    focusedControl: focus.focusedControl,
    remoteFocusEnabled: true,
    remoteActivationEnabled: true,
    playerElementAttached: true,
    autoplayAllowed: false,
    statusLabel:
      mediaKind === 'video'
        ? 'Verified video controls are ready for remote focus.'
        : 'Verified audio controls are ready for remote focus.',
    controls: focus.controls,
    problem: null,
  };
}
