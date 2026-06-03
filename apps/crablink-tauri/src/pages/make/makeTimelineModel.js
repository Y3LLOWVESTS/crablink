/**
 * RO:WHAT — Local timeline helpers for crab://make clip trim, replacement, effects, and export rendering.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; gives Make a modern editor timeline without creating backend truth.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, browser video/canvas/MediaRecorder APIs, makeExportClient.
 * RO:INVARIANTS — local clip metadata only; no fake CIDs; no fake receipts; no wallet mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — local timeline effect presets and browser-safe render bounds.
 * RO:SECURITY — no private paths, secrets, capabilities, tokens, balances, or receipt truth cross this helper.
 * RO:TEST — npm run build; manual crab://make trim/effect/replace/sequence/export smoke.
 */

const MIN_TIMELINE_CLIP_MS = 350;
const METADATA_TIMEOUT_MS = 7000;
const EXPORT_RENDER_TIMEOUT_PAD_MS = 4000;
const DEFAULT_EXPORT_MIME_TYPE = 'video/webm;codecs=vp8,opus';

export const MAKE_TIMELINE_EFFECTS = Object.freeze([
  {
    value: 'none',
    label: 'Clean',
    shortLabel: 'Clean',
    copy: 'No timeline effect. Export uses the recorded clip look.',
    filter: 'none',
  },
  {
    value: 'pop',
    label: 'Pop',
    shortLabel: 'Pop',
    copy: 'Slight contrast and color lift for a sharper creator clip.',
    filter: 'contrast(1.12) saturate(1.16) brightness(1.03)',
  },
  {
    value: 'warm',
    label: 'Warm',
    shortLabel: 'Warm',
    copy: 'A warmer look for commentary, music, and casual updates.',
    filter: 'sepia(0.16) saturate(1.12) contrast(1.04) brightness(1.02)',
  },
  {
    value: 'cool',
    label: 'Cool',
    shortLabel: 'Cool',
    copy: 'A clean blue-leaning screen/tutorial feel.',
    filter: 'saturate(0.96) contrast(1.08) brightness(1.03) hue-rotate(8deg)',
  },
  {
    value: 'mono',
    label: 'Mono',
    shortLabel: 'Mono',
    copy: 'High-contrast monochrome for dramatic clips.',
    filter: 'grayscale(1) contrast(1.16) brightness(1.04)',
  },
]);

export function normalizeMakeClip(clip = {}) {
  const durationMs = positiveInteger(clip.durationMs, 0);
  const timeline = clip.timeline && typeof clip.timeline === 'object' ? clip.timeline : {};
  const rawStart = firstFiniteNumber(clip.trimStartMs, timeline.trimStartMs, 0);
  const rawEnd = firstFiniteNumber(clip.trimEndMs, timeline.trimEndMs, durationMs);
  const trimStartMs = durationMs > 0 ? clampInteger(rawStart, 0, Math.max(0, durationMs - MIN_TIMELINE_CLIP_MS), 0) : 0;
  const trimEndMs = durationMs > 0
    ? clampInteger(rawEnd, Math.min(durationMs, trimStartMs + MIN_TIMELINE_CLIP_MS), durationMs, durationMs)
    : 0;
  const timelineEffect = findTimelineEffect(clip.timelineEffect || clip.effect || timeline.effect || 'none').value;

  return {
    ...clip,
    durationMs,
    trimStartMs,
    trimEndMs: Math.max(trimStartMs, trimEndMs),
    timelineEffect,
    timeline: {
      schema: 'crablink.make.timeline-clip.v1',
      trimStartMs,
      trimEndMs: Math.max(trimStartMs, trimEndMs),
      effect: timelineEffect,
      localOnly: true,
    },
  };
}

export function normalizeMakeClips(clips = []) {
  return (clips || []).filter(Boolean).map((clip) => normalizeMakeClip(clip));
}

export function updateClipTimeline(clip, patch = {}) {
  return normalizeMakeClip({
    ...clip,
    ...patch,
    timeline: {
      ...(clip?.timeline || {}),
      ...patch.timeline,
      trimStartMs: patch.trimStartMs ?? patch.timeline?.trimStartMs ?? clip?.trimStartMs ?? clip?.timeline?.trimStartMs,
      trimEndMs: patch.trimEndMs ?? patch.timeline?.trimEndMs ?? clip?.trimEndMs ?? clip?.timeline?.trimEndMs,
      effect: patch.timelineEffect ?? patch.effect ?? patch.timeline?.effect ?? clip?.timelineEffect ?? clip?.timeline?.effect,
    },
  });
}

export function findTimelineEffect(value) {
  return MAKE_TIMELINE_EFFECTS.find((effect) => effect.value === value) || MAKE_TIMELINE_EFFECTS[0];
}

export function timelineEffectCssFilter(value) {
  return findTimelineEffect(value).filter || 'none';
}

export function clipTimelineLabel(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  const parts = [];
  const effect = findTimelineEffect(safeClip.timelineEffect);

  if (hasTrimEdit(safeClip)) {
    parts.push('cut');
  }

  if (effect.value !== 'none') {
    parts.push(effect.shortLabel || effect.label);
  }

  return parts.length ? parts.join(' · ') : 'clean';
}

export function describeTimelineEdits(clips = []) {
  const safeClips = normalizeMakeClips(clips);
  const trimmedCount = safeClips.filter(hasTrimEdit).length;
  const effectedCount = safeClips.filter((clip) => clip.timelineEffect && clip.timelineEffect !== 'none').length;
  const replacementCount = safeClips.filter((clip) => clip.replacedAt).length;

  return {
    schema: 'crablink.make.timeline-summary.v1',
    localOnly: true,
    clipCount: safeClips.length,
    durationMs: safeClips.reduce((sum, clip) => sum + getClipTimelineDurationMs(clip), 0),
    trimmedCount,
    effectedCount,
    replacementCount,
    hasEdits: trimmedCount > 0 || effectedCount > 0 || replacementCount > 0,
    truthBoundary:
      'Timeline edits are local Make instructions. They are rendered into local export blobs before Video creates backend truth.',
  };
}

export function clipTimelineSignature(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  return [
    safeClip.id || '',
    safeClip.sizeBytes || 0,
    safeClip.durationMs || 0,
    safeClip.trimStartMs || 0,
    safeClip.trimEndMs || 0,
    safeClip.timelineEffect || 'none',
    safeClip.replacedAt || '',
  ].join(':');
}

export function getClipTrimStartMs(clip = {}) {
  return normalizeMakeClip(clip).trimStartMs || 0;
}

export function getClipTrimEndMs(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  return safeClip.trimEndMs || safeClip.durationMs || 0;
}

export function getClipTimelineDurationMs(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  return Math.max(0, getClipTrimEndMs(safeClip) - getClipTrimStartMs(safeClip));
}

export function hasTimelineEdits(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  return hasTrimEdit(safeClip) || (safeClip.timelineEffect && safeClip.timelineEffect !== 'none');
}

export async function createClipFromLocalFile(file, { id, fallbackName = 'replacement-clip' } = {}) {
  if (!(file instanceof Blob)) {
    throw new Error('Choose a local video file to replace this clip.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const metadata = await readVideoMetadata(objectUrl);
    const name = cleanString(file.name) || `${fallbackName}.${file.type?.includes('mp4') ? 'mp4' : 'webm'}`;

    return normalizeMakeClip({
      id,
      name,
      blob: file,
      mimeType: file.type || 'video/webm',
      type: file.type || 'video/webm',
      sizeBytes: file.size || 0,
      durationMs: metadata.durationMs,
      width: metadata.width,
      height: metadata.height,
      createdAt: new Date().toISOString(),
      replacedAt: new Date().toISOString(),
      objectUrl,
      localOnly: true,
      sourceMode: 'replace_import',
    });
  } catch (error) {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch (_cleanupError) {
      // Ignore optional object URL cleanup failure.
    }

    throw error;
  }
}

export async function renderTimelineClipsForExport({
  clips = [],
  width = 1280,
  height = 720,
  fps = 30,
  mimeType = '',
  onProgress,
} = {}) {
  const safeClips = normalizeMakeClips(clips);

  if (!safeClips.length) {
    return [];
  }

  if (!safeClips.some(hasTimelineEdits)) {
    notifyProgress(onProgress, {
      phase: 'timeline_passthrough',
      progressPercent: 1,
      detail: 'Timeline has no cuts or effects; using original local clip blobs.',
    });
    return safeClips;
  }

  ensureTimelineRenderSupport();

  const rendered = [];

  for (let index = 0; index < safeClips.length; index += 1) {
    const clip = safeClips[index];
    notifyProgress(onProgress, {
      phase: 'timeline_render',
      clipIndex: index,
      clipCount: safeClips.length,
      progressPercent: Math.max(1, Math.round((index / safeClips.length) * 18)),
      detail: `Rendering timeline edit ${index + 1} of ${safeClips.length}.`,
    });

    rendered.push(await renderTimelineClipForExport({
      clip,
      width,
      height,
      fps,
      mimeType,
    }));
  }

  notifyProgress(onProgress, {
    phase: 'timeline_rendered',
    progressPercent: 20,
    detail: 'Timeline cuts and effects rendered into local export blobs.',
  });

  return rendered;
}

export async function seekVideoToTimelineStart(video, clip = {}) {
  if (!video) {
    return;
  }

  const startSeconds = getClipTrimStartMs(clip) / 1000;

  if (!Number.isFinite(startSeconds) || startSeconds <= 0) {
    return;
  }

  await seekVideo(video, startSeconds);
}

export function timelinePreviewTimeReachedEnd(video, clip = {}) {
  if (!video || !clip) {
    return false;
  }

  const endSeconds = getClipTrimEndMs(clip) / 1000;
  if (!Number.isFinite(endSeconds) || endSeconds <= 0) {
    return false;
  }

  return video.currentTime >= Math.max(0, endSeconds - 0.04);
}

function hasTrimEdit(clip = {}) {
  const safeClip = normalizeMakeClip(clip);
  const start = safeClip.trimStartMs || 0;
  const end = safeClip.trimEndMs || safeClip.durationMs || 0;
  const duration = safeClip.durationMs || 0;

  return duration > 0 && (start > 80 || Math.abs(duration - end) > 120);
}

async function renderTimelineClipForExport({ clip, width, height, fps, mimeType }) {
  const safeClip = normalizeMakeClip(clip);
  const sourceUrl = safeClip.objectUrl;

  if (!sourceUrl) {
    throw new Error(`Clip ${safeClip.name || safeClip.id || ''} is missing its local object URL.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = positiveInteger(width, 1280);
  canvas.height = positiveInteger(height, 720);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Timeline export could not create a canvas renderer.');
  }

  const video = document.createElement('video');
  video.src = sourceUrl;
  video.playsInline = true;
  video.preload = 'auto';

  const metadata = await waitForVideoMetadata(video);
  const startSeconds = getClipTrimStartMs(safeClip) / 1000;
  const endSeconds = Math.min(
    getClipTrimEndMs(safeClip) / 1000,
    Number.isFinite(metadata.durationSeconds) && metadata.durationSeconds > 0 ? metadata.durationSeconds : Number.POSITIVE_INFINITY,
  );
  const durationMs = Math.max(MIN_TIMELINE_CLIP_MS, Math.round((endSeconds - startSeconds) * 1000));

  if (!Number.isFinite(endSeconds) || endSeconds <= startSeconds) {
    throw new Error(`Clip ${safeClip.name || safeClip.id || ''} has an invalid trim range.`);
  }

  await seekVideo(video, startSeconds);

  const stream = canvas.captureStream(clampInteger(fps, 12, 60, 30));
  const sourceCapture = captureVideoStream(video);
  const audioTracks = sourceCapture?.getAudioTracks?.() || [];

  for (const track of audioTracks) {
    stream.addTrack(track);
  }

  const safeMimeType = chooseTimelineExportMimeType(mimeType);
  const chunks = [];
  const recorder = safeMimeType ? new MediaRecorder(stream, { mimeType: safeMimeType }) : new MediaRecorder(stream);
  const effect = findTimelineEffect(safeClip.timelineEffect);

  recorder.ondataavailable = (event) => {
    if (event.data?.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopPromise = new Promise((resolve, reject) => {
    recorder.onstop = resolve;
    recorder.onerror = (event) => reject(event?.error || event);
  });

  let rafId = 0;
  let stopped = false;
  const startedAt = Date.now();
  const maxRuntimeMs = durationMs + EXPORT_RENDER_TIMEOUT_PAD_MS;

  const draw = () => {
    drawTimelineFrame({
      canvas,
      context,
      video,
      effect,
    });

    if (stopped) {
      return;
    }

    if (video.currentTime >= endSeconds || Date.now() - startedAt > maxRuntimeMs) {
      stopped = true;
      try {
        video.pause();
      } catch (_error) {
        // Ignore pause failures during local render cleanup.
      }
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      return;
    }

    rafId = window.requestAnimationFrame(draw);
  };

  recorder.start(250);
  draw();

  try {
    await video.play();
  } catch (error) {
    stopped = true;
    window.cancelAnimationFrame(rafId);
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
    stopTracks(stream);
    stopTracks(sourceCapture);
    throw new Error(`Timeline render could not play ${safeClip.name || 'clip'}: ${errorMessage(error)}`);
  }

  await stopPromise;
  window.cancelAnimationFrame(rafId);
  stopTracks(stream);
  stopTracks(sourceCapture);

  const blob = new Blob(chunks, { type: recorder.mimeType || safeMimeType || 'video/webm' });

  return normalizeMakeClip({
    ...safeClip,
    id: `${safeClip.id || 'clip'}-timeline-export`,
    sourceClipId: safeClip.id,
    name: buildRenderedClipName(safeClip.name),
    blob,
    objectUrl: '',
    mimeType: blob.type || 'video/webm',
    type: blob.type || 'video/webm',
    sizeBytes: blob.size,
    durationMs,
    trimStartMs: 0,
    trimEndMs: durationMs,
    timelineEffect: 'none',
    renderedTimeline: {
      schema: 'crablink.make.rendered-timeline-clip.v1',
      sourceClipId: safeClip.id,
      sourceName: safeClip.name,
      sourceTrimStartMs: safeClip.trimStartMs,
      sourceTrimEndMs: safeClip.trimEndMs,
      sourceEffect: safeClip.timelineEffect,
      localOnly: true,
    },
  });
}

function drawTimelineFrame({ canvas, context, video, effect }) {
  context.save();
  context.fillStyle = '#020617';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const fit = containRect(
    Number(video.videoWidth || canvas.width),
    Number(video.videoHeight || canvas.height),
    canvas.width,
    canvas.height,
  );

  context.filter = effect.filter || 'none';
  try {
    context.drawImage(video, fit.x, fit.y, fit.width, fit.height);
  } catch (_error) {
    // Draw can fail during seeks; keep the export alive and retry next animation frame.
  }
  context.restore();
}

function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const safeSourceWidth = Math.max(1, sourceWidth || targetWidth || 1);
  const safeSourceHeight = Math.max(1, sourceHeight || targetHeight || 1);
  const safeTargetWidth = Math.max(1, targetWidth || 1);
  const safeTargetHeight = Math.max(1, targetHeight || 1);
  const scale = Math.min(safeTargetWidth / safeSourceWidth, safeTargetHeight / safeSourceHeight);
  const width = safeSourceWidth * scale;
  const height = safeSourceHeight * scale;

  return {
    x: (safeTargetWidth - width) / 2,
    y: (safeTargetHeight - height) / 2,
    width,
    height,
  };
}

function ensureTimelineRenderSupport() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('Timeline rendering requires the browser/Tauri WebView runtime.');
  }

  const canvas = document.createElement('canvas');
  if (typeof canvas.captureStream !== 'function') {
    throw new Error('Timeline rendering requires canvas.captureStream support.');
  }

  if (typeof MediaRecorder !== 'function') {
    throw new Error('Timeline rendering requires MediaRecorder support.');
  }
}

function chooseTimelineExportMimeType(preferred = '') {
  const candidates = [
    preferred,
    DEFAULT_EXPORT_MIME_TYPE,
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ].filter(Boolean);

  if (typeof MediaRecorder !== 'function' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function captureVideoStream(video) {
  if (!video) {
    return null;
  }

  if (typeof video.captureStream === 'function') {
    return video.captureStream();
  }

  if (typeof video.mozCaptureStream === 'function') {
    return video.mozCaptureStream();
  }

  return null;
}

async function readVideoMetadata(objectUrl) {
  const video = document.createElement('video');
  video.src = objectUrl;
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  return waitForVideoMetadata(video);
}

function waitForVideoMetadata(video) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Video metadata did not load. Try a different local video file.'));
    }, METADATA_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };

    const onLoadedMetadata = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        durationSeconds: Number.isFinite(video.duration) ? video.duration : 0,
        durationMs: Number.isFinite(video.duration) ? Math.max(0, Math.round(video.duration * 1000)) : 0,
        width: Number(video.videoWidth || 0),
        height: Number(video.videoHeight || 0),
      });
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Video metadata could not be read. Try a different local video file.'));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.load?.();
  });
}

function seekVideo(video, seconds) {
  return new Promise((resolve, reject) => {
    if (!video || !Number.isFinite(seconds)) {
      resolve();
      return;
    }

    const target = Math.max(0, seconds);
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, METADATA_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onSeeked = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Could not seek local clip for timeline preview.'));
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });

    try {
      video.currentTime = target;
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
}

function stopTracks(stream) {
  for (const track of stream?.getTracks?.() || []) {
    try {
      track.stop();
    } catch (_error) {
      // Ignore optional media cleanup failure.
    }
  }
}

function buildRenderedClipName(name = '') {
  const raw = cleanString(name) || 'make-clip.webm';
  const dotIndex = raw.lastIndexOf('.');
  const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
  return `${base}-timeline.webm`;
}

function notifyProgress(callback, event) {
  if (typeof callback === 'function') {
    callback(event);
  }
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function errorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || String(error);
}
