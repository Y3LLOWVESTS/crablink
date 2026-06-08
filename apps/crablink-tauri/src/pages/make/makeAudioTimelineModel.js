/**
 * RO:WHAT — Local audio timeline helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps audio timing UI separate from backend truth.
 * RO:INTERACTS — MakePage.jsx, makeTimelineModel.js, makeLinkedMediaModel.js, Rust Make export session.
 * RO:INVARIANTS — local object URLs only; no b3 minting; no receipts; no wallet mutation; no browser-side final audio mix.
 * RO:METRICS — none.
 * RO:CONFIG — safe timeline duration/trim/volume inputs from Make UI.
 * RO:SECURITY — local audio bytes are preview/UI data; final export mixing belongs to Rust/FFmpeg bounded chunk path.
 * RO:TEST — npm run build; manual Make local audio preview/export smoke.
 */

import {
  getClipTimelineDurationMs,
} from './makeTimelineModel.js';

export function clampAudioTimelineMs(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return fallback;
  }

  return Math.min(Math.max(n, min), max);
}

export function makeAudioTimelineTotalMs(clips = []) {
  return (clips || []).reduce((sum, clip) => sum + Math.max(0, getClipTimelineDurationMs(clip)), 0);
}

export function normalizeMakeAudioTrack(track, totalTimelineMs = 0) {
  const durationMs = Math.max(0, Number(track?.durationMs || 0));
  const trimStartMs = clampAudioTimelineMs(track?.trimStartMs, 0, durationMs, 0);
  const trimEndMs = clampAudioTimelineMs(
    track?.trimEndMs || durationMs,
    trimStartMs,
    durationMs || Number.MAX_SAFE_INTEGER,
    durationMs,
  );
  const offsetMs = clampAudioTimelineMs(track?.offsetMs, 0, Math.max(0, totalTimelineMs), 0);
  const volumePct = clampAudioTimelineMs(track?.volumePct ?? 100, 0, 150, 100);

  return {
    ...track,
    trimStartMs,
    trimEndMs,
    offsetMs,
    volumePct,
    muted: Boolean(track?.muted),
    effectiveDurationMs: Math.max(0, trimEndMs - trimStartMs),
  };
}

export function prepareAudioTracksForTimeline(audioTracks = [], totalTimelineMs = 0) {
  return (audioTracks || [])
    .filter(Boolean)
    .map((track) => normalizeMakeAudioTrack(track, totalTimelineMs));
}

export function formatTimelineClockMs(ms = 0) {
  const totalMs = Math.max(0, Number(ms || 0));
  const totalSeconds = Math.floor(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function parseMinutesSecondsToMs(minutesValue, secondsValue) {
  const minutes = clampAudioTimelineMs(minutesValue, 0, 24 * 60, 0);
  const seconds = clampAudioTimelineMs(secondsValue, 0, 59, 0);

  return Math.round((Math.floor(minutes) * 60 + Math.floor(seconds)) * 1000);
}

export function getAudioTrackTimelinePlate(track, totalTimelineMs = 0) {
  const prepared = normalizeMakeAudioTrack(track, totalTimelineMs);
  const total = Math.max(1, Number(totalTimelineMs || 0));
  const leftPct = clampAudioTimelineMs((prepared.offsetMs / total) * 100, 0, 100, 0);
  const widthPct = clampAudioTimelineMs((prepared.effectiveDurationMs / total) * 100, 2, 100 - leftPct, 2);

  return {
    ...prepared,
    leftPct,
    widthPct,
    endMs: prepared.offsetMs + prepared.effectiveDurationMs,
  };
}

export function activeAudioTimeForTimelineMs(track, timelineMs) {
  const prepared = normalizeMakeAudioTrack(track);
  const safeTimelineMs = Math.max(0, Number(timelineMs || 0));
  const relativeMs = safeTimelineMs - prepared.offsetMs;

  if (relativeMs < 0 || relativeMs > prepared.effectiveDurationMs) {
    return null;
  }

  return {
    trackTimeSeconds: (prepared.trimStartMs + relativeMs) / 1000,
    volume: prepared.muted ? 0 : clampAudioTimelineMs(prepared.volumePct, 0, 150, 100) / 100,
  };
}
