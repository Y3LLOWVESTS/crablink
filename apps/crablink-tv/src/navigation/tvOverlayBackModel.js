/** Pure local overlay state and deterministic TV Back priority. */

export const TV_OVERLAY_KIND = Object.freeze({
  NONE: 'none',
  DETAIL: 'detail',
  PROBLEM: 'problem',
});

export const TV_BACK_ACTION = Object.freeze({
  CLOSE_OVERLAY: 'close-overlay',
  HIDE_PLAYER_CHROME: 'hide-player-chrome',
  LEAVE_DETAIL: 'leave-detail',
  RETURN_TO_RAIL: 'return-to-rail',
  RETURN_TO_ROOT: 'return-to-root',
  SYSTEM_BACK: 'system-back',
});

export const TV_OVERLAY_STATE_KIND =
  'crablink-tv-overlay-v1';

const PROBLEM_CODE_PATTERN =
  /^[A-Z][A-Z0-9_]{0,63}$/;

function boundedText(
  value,
  limit,
) {
  return String(value || '')
    .trim()
    .slice(0, limit);
}

function freeze(value) {
  return Object.freeze(value);
}

export function createTvOverlayState() {
  return freeze({
    kind: TV_OVERLAY_STATE_KIND,
    overlayKind:
      TV_OVERLAY_KIND.NONE,
    title: '',
    body: '',
    code: null,
    returnFocusKey: null,
  });
}

export function normalizeTvOverlayState(
  value,
) {
  if (
    !value ||
    value.kind !==
      TV_OVERLAY_STATE_KIND ||
    ![
      TV_OVERLAY_KIND.DETAIL,
      TV_OVERLAY_KIND.PROBLEM,
    ].includes(value.overlayKind)
  ) {
    return createTvOverlayState();
  }

  const problem =
    value.overlayKind ===
    TV_OVERLAY_KIND.PROBLEM;

  const rawCode =
    String(value.code || '');

  return freeze({
    kind: TV_OVERLAY_STATE_KIND,
    overlayKind: value.overlayKind,
    title:
      boundedText(
        value.title,
        96,
      ) ||
      'CrabLink TV',
    body:
      boundedText(
        value.body,
        560,
      ) ||
      'No additional detail is available.',
    code:
      problem
        ? (
            PROBLEM_CODE_PATTERN.test(
              rawCode,
            )
              ? rawCode
              : 'TV_ROUTE_PROBLEM'
          )
        : null,
    returnFocusKey:
      boundedText(
        value.returnFocusKey,
        128,
      ) ||
      null,
  });
}

export function openTvDetailOverlay(
  input = {},
) {
  return normalizeTvOverlayState({
    kind: TV_OVERLAY_STATE_KIND,
    overlayKind:
      TV_OVERLAY_KIND.DETAIL,
    ...input,
  });
}

export function openTvProblemOverlay(
  input = {},
) {
  return normalizeTvOverlayState({
    kind: TV_OVERLAY_STATE_KIND,
    overlayKind:
      TV_OVERLAY_KIND.PROBLEM,
    ...input,
  });
}

export function closeTvOverlay(value) {
  const current =
    normalizeTvOverlayState(value);

  const closed =
    current.overlayKind !==
    TV_OVERLAY_KIND.NONE;

  return freeze({
    closed,
    state:
      closed
        ? createTvOverlayState()
        : current,
    restoreFocusKey:
      closed
        ? current.returnFocusKey
        : null,
  });
}

export function chooseTvBackAction({
  overlayState,
  playerChromeVisible = false,
  detailOpen = false,
  railDepth = 0,
  routeDepth = 0,
} = {}) {
  if (
    normalizeTvOverlayState(
      overlayState,
    ).overlayKind !==
    TV_OVERLAY_KIND.NONE
  ) {
    return TV_BACK_ACTION
      .CLOSE_OVERLAY;
  }

  if (
    playerChromeVisible === true
  ) {
    return TV_BACK_ACTION
      .HIDE_PLAYER_CHROME;
  }

  if (detailOpen === true) {
    return TV_BACK_ACTION
      .LEAVE_DETAIL;
  }

  if (
    Number.isSafeInteger(
      railDepth,
    ) &&
    railDepth > 0
  ) {
    return TV_BACK_ACTION
      .RETURN_TO_RAIL;
  }

  if (
    Number.isSafeInteger(
      routeDepth,
    ) &&
    routeDepth > 0
  ) {
    return TV_BACK_ACTION
      .RETURN_TO_ROOT;
  }

  return TV_BACK_ACTION
    .SYSTEM_BACK;
}
