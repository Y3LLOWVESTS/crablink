/**
 * RO:WHAT — Constants and tiny timeline-key helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage container smaller and less patch-fragile.
 * RO:INTERACTS — MakePage.jsx, MakePreviewStudioChrome, makeTimelineModel.js, makeLinkedMediaModel.js.
 * RO:INVARIANTS — local UI state only; no b3 minting; no receipts; no wallet or ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — static UI constants only.
 * RO:SECURITY — no secrets, capabilities, balances, or receipt truth.
 * RO:TEST — npm run build; manual crab://make route smoke.
 */

export const EMPTY_INPUT_STATE = Object.freeze({
  status: 'idle',
  cameraStream: null,
  screenStream: null,
  micStream: null,
  error: null,
  warning: null,
  startedAt: null,
});

export const EMPTY_RECORDER_STATE = Object.freeze({
  status: 'idle',
  error: null,
  mimeType: '',
  startedAtMs: 0,
  activeName: '',
});

export const MODE_ICONS = Object.freeze({
  camera: '●',
  screen: '▣',
  screen_pip: '◰',
  camera_background: '✂',
  audio_only: '≋',
});

export const PREVIEW_TIMELINE_EFFECTS = Object.freeze([
  {
    value: 'none',
    label: 'Clean',
    copy: 'No extra timeline look.',
  },
  {
    value: 'pop',
    label: 'Pop',
    copy: 'Sharper contrast and color lift.',
  },
  {
    value: 'warm',
    label: 'Warm',
    copy: 'Warmer commentary look.',
  },
  {
    value: 'cool',
    label: 'Cool',
    copy: 'Clean tutorial tone.',
  },
  {
    value: 'mono',
    label: 'Mono',
    copy: 'High-contrast monochrome.',
  },
]);

export const MAKE_TIMELINE_ITEM_PREFIX = Object.freeze({
  LOCAL: 'local:',
  LINKED_VIDEO: 'linked-video:',
});

export function makeLocalTimelineItemKey(id) {
  return `${MAKE_TIMELINE_ITEM_PREFIX.LOCAL}${String(id || '').trim()}`;
}

export function makeLinkedVideoTimelineItemKey(id) {
  return `${MAKE_TIMELINE_ITEM_PREFIX.LINKED_VIDEO}${String(id || '').trim()}`;
}

export function isLocalTimelineItemKey(key) {
  return String(key || '').startsWith(MAKE_TIMELINE_ITEM_PREFIX.LOCAL);
}

export function isLinkedVideoTimelineItemKey(key) {
  return String(key || '').startsWith(MAKE_TIMELINE_ITEM_PREFIX.LINKED_VIDEO);
}

export function idFromTimelineItemKey(key) {
  const raw = String(key || '');

  if (isLocalTimelineItemKey(raw)) {
    return raw.slice(MAKE_TIMELINE_ITEM_PREFIX.LOCAL.length);
  }

  if (isLinkedVideoTimelineItemKey(raw)) {
    return raw.slice(MAKE_TIMELINE_ITEM_PREFIX.LINKED_VIDEO.length);
  }

  return raw;
}

export function createTimelineItemKeys(clips = [], linkedVideoDrafts = []) {
  return [
    ...(clips || []).map((clip) => makeLocalTimelineItemKey(clip?.id)).filter((key) => key !== MAKE_TIMELINE_ITEM_PREFIX.LOCAL),
    ...(linkedVideoDrafts || [])
      .map((draft) => makeLinkedVideoTimelineItemKey(draft?.id))
      .filter((key) => key !== MAKE_TIMELINE_ITEM_PREFIX.LINKED_VIDEO),
  ];
}

export function normalizeTimelineItemOrderKeys(order = [], validKeys = []) {
  const validSet = new Set(validKeys);
  const seen = new Set();
  const normalized = [];

  for (const key of order || []) {
    const clean = String(key || '').trim();

    if (!clean || !validSet.has(clean) || seen.has(clean)) {
      continue;
    }

    normalized.push(clean);
    seen.add(clean);
  }

  for (const key of validKeys || []) {
    const clean = String(key || '').trim();

    if (!clean || seen.has(clean)) {
      continue;
    }

    normalized.push(clean);
    seen.add(clean);
  }

  return normalized;
}

export function timelineOrderSignature(order = []) {
  return (order || []).join('|');
}
