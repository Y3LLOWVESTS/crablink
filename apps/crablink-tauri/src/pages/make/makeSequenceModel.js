/**
 * RO:WHAT — Local sequence review, playback, and timeline math helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage focused on route orchestration.
 * RO:INTERACTS — MakePage.jsx, MakePreviewStudioChrome, MakeTimelineCard, makeTimelineModel.js.
 * RO:INVARIANTS — local preview/timeline math only; no backend truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local preview cursor frame snap and sequence review state shape.
 * RO:SECURITY — no private paths, keys, capabilities, balances, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make sequence play/pause/review/timeline smoke.
 */

import {
  getClipTimelineDurationMs,
  getClipTrimEndMs,
  getClipTrimStartMs,
} from './makeTimelineModel.js';
import { errorMessage } from './makeRuntimeMediaModel.js';

export function calculateSequenceTimelineProgress(clips = [], currentIndex = 0, clip = null, video = null) {
  const safeIndex = clamp(Number(currentIndex), 0, Math.max(0, clips.length - 1), 0);
  const safeClip = clip || clips[safeIndex] || null;
  const totalDurationMs = clips.reduce((sum, item) => sum + getClipTimelineDurationMs(item), 0);
  const previousElapsedMs = clips
    .slice(0, safeIndex)
    .reduce((sum, item) => sum + getClipTimelineDurationMs(item), 0);

  if (!safeClip || totalDurationMs <= 0) {
    return {
      currentClipProgressPct: 0,
      totalProgressPct: 0,
      totalProgressAtClipEndPct: 100,
      currentClipElapsedMs: 0,
      currentClipDurationMs: 0,
      totalElapsedMs: previousElapsedMs,
      totalElapsedAtClipEndMs: totalDurationMs,
    };
  }

  const startMs = getClipTrimStartMs(safeClip);
  const endMs = getClipTrimEndMs(safeClip);
  const currentClipDurationMs = Math.max(0, endMs - startMs);
  const videoTimeMs = Number.isFinite(video?.currentTime) ? Math.round(video.currentTime * 1000) : startMs;
  const currentClipElapsedMs = clamp(videoTimeMs - startMs, 0, currentClipDurationMs, 0);
  const totalElapsedMs = clamp(previousElapsedMs + currentClipElapsedMs, 0, totalDurationMs, previousElapsedMs);
  const totalElapsedAtClipEndMs = clamp(previousElapsedMs + currentClipDurationMs, 0, totalDurationMs, totalDurationMs);

  return {
    currentClipProgressPct: currentClipDurationMs > 0 ? clamp((currentClipElapsedMs / currentClipDurationMs) * 100, 0, 100, 0) : 100,
    totalProgressPct: clamp((totalElapsedMs / totalDurationMs) * 100, 0, 100, 0),
    totalProgressAtClipEndPct: clamp((totalElapsedAtClipEndMs / totalDurationMs) * 100, 0, 100, 100),
    currentClipElapsedMs,
    currentClipDurationMs,
    totalElapsedMs,
    totalElapsedAtClipEndMs,
  };
}

export const MAKE_TIMELINE_CURSOR_FRAME_MS = 1000 / 60;

export function snapTimelineFrameMs(ms, frameMs = MAKE_TIMELINE_CURSOR_FRAME_MS) {
  const value = Number(ms || 0);
  const step = Number(frameMs || 0);

  if (!Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }

  return Math.round(value / step) * step;
}

export function formatTimelinePreciseTimeMs(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.round(safeMs - (totalSeconds * 1000));

  const normalizedSeconds = milliseconds >= 1000 ? seconds + 1 : seconds;
  const normalizedMs = milliseconds >= 1000 ? 0 : milliseconds;

  if (minutes <= 0) {
    return `${normalizedSeconds}.${String(normalizedMs).padStart(3, '0')}s`;
  }

  return `${minutes}:${String(normalizedSeconds).padStart(2, '0')}.${String(normalizedMs).padStart(3, '0')}`;
}

export function getTimelineClipVisibleDurationMs(clip) {
  if (!clip) {
    return 0;
  }

  return Math.max(0, getClipTrimEndMs(clip) - getClipTrimStartMs(clip));
}

export function sourceMsToVisiblePct(clip, sourceMs) {
  const trimStartMs = getClipTrimStartMs(clip);
  const visibleDurationMs = Math.max(1, getTimelineClipVisibleDurationMs(clip));
  const safeSourceMs = Number(sourceMs ?? trimStartMs);

  return clamp(((safeSourceMs - trimStartMs) / visibleDurationMs) * 100, 0, 100, 0);
}

export function visiblePctToSourceMs(clip, pct) {
  const trimStartMs = getClipTrimStartMs(clip);
  const visibleDurationMs = Math.max(1, getTimelineClipVisibleDurationMs(clip));
  const safePct = clamp(Number(pct || 0), 0, 100, 0);

  return trimStartMs + ((safePct / 100) * visibleDurationMs);
}

export function sourceRangeToVisiblePlate(clip, startMs, endMs) {
  const startPct = sourceMsToVisiblePct(clip, startMs);
  const endPct = sourceMsToVisiblePct(clip, endMs);

  return {
    leftPct: Math.min(startPct, endPct),
    rightPct: Math.max(startPct, endPct),
    widthPct: Math.max(0, Math.max(startPct, endPct) - Math.min(startPct, endPct)),
  };
}

export function getTimelineAbsolutePositionMs(clips = [], clipId = '', focusMs = 0) {
  let elapsedMs = 0;

  for (const clip of clips || []) {
    if (!clip) {
      continue;
    }

    const trimStartMs = getClipTrimStartMs(clip);
    const trimEndMs = getClipTrimEndMs(clip);

    if (clip.id === clipId) {
      const selectedMs = clamp(
        Math.round(Number(focusMs || trimStartMs)),
        trimStartMs,
        trimEndMs,
        trimStartMs,
      );

      return elapsedMs + Math.max(0, selectedMs - trimStartMs);
    }

    elapsedMs += getTimelineClipVisibleDurationMs(clip);
  }

  return Math.max(0, elapsedMs);
}

export function createSequenceReviewState(status, patch = {}) {
  return {
    status,
    currentIndex: 0,
    currentClipId: '',
    currentClipProgressPct: 0,
    totalProgressPct: 0,
    currentClipElapsedMs: 0,
    totalElapsedMs: 0,
    reviewedAt: '',
    approvedAt: '',
    approvedClipIds: [],
    error: null,
    ...patch,
  };
}

export function requestSequenceVideoPlay(video, setSequenceState, clip = null) {
  if (!video) {
    return;
  }

  const expectedClipId = String(clip?.id || '');

  window.requestAnimationFrame(async () => {
    try {
      if (!video.isConnected) {
        return;
      }

      await waitForSequenceVideoReady(video);

      const mountedClipId = String(video.dataset?.sequenceClipId || '');
      if (expectedClipId && mountedClipId && mountedClipId !== expectedClipId) {
        return;
      }

      await prepareSequenceVideoForClipStart(video, clip);

      const playResult = video.play?.();

      if (playResult && typeof playResult.then === 'function') {
        await playResult;
      }

      setSequenceState((current) => {
        if (current.status !== 'playing') {
          return current;
        }

        if (expectedClipId && current.currentClipId && current.currentClipId !== expectedClipId) {
          return current;
        }

        return {
          ...current,
          currentClipId: expectedClipId || current.currentClipId,
          error: null,
        };
      });
    } catch (error) {
      setSequenceState((current) => {
        if (expectedClipId && current.currentClipId && current.currentClipId !== expectedClipId) {
          return current;
        }

        return {
          ...current,
          status: current.status === 'approved' ? 'approved' : 'paused',
          error: `Sequence preview paused: ${errorMessage(error)}`,
        };
      });
    }
  });
}

export function waitForSequenceVideoReady(video) {
  return new Promise((resolve, reject) => {
    if (!video) {
      resolve();
      return;
    }

    if (video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, 2600);

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('error', onError);
    };

    const onReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Could not prepare local clip for preview playback.'));
    };

    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('canplaythrough', onReady, { once: true });
    video.addEventListener('error', onError, { once: true });

    try {
      video.load?.();
    } catch (_error) {
      // Some browsers do not allow explicit load here; media events still settle the promise.
    }
  });
}

export async function prepareSequenceVideoForClipStart(video, clip = null) {
  if (!video) {
    return;
  }

  const trimStartMs = clip ? getClipTrimStartMs(clip) : 0;
  const trimEndMs = clip ? getClipTrimEndMs(clip) : 0;
  const targetSeconds = Number.isFinite(trimStartMs) ? Math.max(0, trimStartMs / 1000) : 0;
  const endSeconds = Number.isFinite(trimEndMs) && trimEndMs > 0 ? trimEndMs / 1000 : Number.POSITIVE_INFINITY;
  const currentSeconds = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  const atOrPastEnd = Number.isFinite(endSeconds) && currentSeconds >= Math.max(targetSeconds, endSeconds - 0.04);
  const beforeStart = currentSeconds + 0.04 < targetSeconds;
  const awayFromStart = Math.abs(currentSeconds - targetSeconds) > 0.06;

  if (atOrPastEnd || beforeStart || awayFromStart) {
    await settleSequenceVideoSeek(video, targetSeconds);
  }
}

export function settleSequenceVideoSeek(video, seconds) {
  return new Promise((resolve) => {
    if (!video || !Number.isFinite(seconds)) {
      resolve();
      return;
    }

    const target = Math.max(0, seconds);
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    if (Math.abs(current - target) <= 0.025) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', finish);
      video.removeEventListener('timeupdate', finish);
      video.removeEventListener('canplay', finish);
      video.removeEventListener('error', finish);
    };

    const timer = window.setTimeout(finish, 700);

    video.addEventListener('seeked', finish, { once: true });
    video.addEventListener('timeupdate', finish, { once: true });
    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('error', finish, { once: true });

    try {
      video.currentTime = target;
    } catch (_error) {
      finish();
    }
  });
}

export function sequenceStatusLabel(status) {
  if (status === 'approved') return 'Approved';
  if (status === 'reviewed') return 'Review complete';
  if (status === 'playing') return 'Playing';
  if (status === 'paused') return 'Paused';
  if (status === 'draft') return 'Needs review';
  return 'No sequence';
}

export function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
