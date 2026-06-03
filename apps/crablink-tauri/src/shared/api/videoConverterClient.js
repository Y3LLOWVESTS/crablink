/**
 * RO:WHAT — Frontend adapter for Rust-owned video source registration, picker, probe/planning, and prepare jobs.
 * RO:WHY — Keeps React focused on user intent/display while Tauri Rust owns media planning/job/source logic.
 * RO:INTERACTS — VideoConverterPanel.jsx, platform/tauriPlatform.js, src-tauri commands::media.
 * RO:INVARIANTS — typed allowlisted commands only; no media bytes; no fake CIDs/receipts; no shell authority.
 * RO:METRICS — none.
 * RO:CONFIG — no persistent config; passes small DTOs only.
 * RO:SECURITY — private source paths are never returned from Rust; no secrets, raw native commands, or video bytes are sent.
 * RO:TEST — npm run build; manual crab://video source picker/probe/plan/prepare-job smoke.
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { callTauri } from '../../platform/tauriPlatform.js';

export function createVideoConverterClient() {
  return {
    available: canUseTauriInvoke(),

    async chooseVideoSource(input = {}) {
      if (!canUseTauriInvoke()) {
        return unavailablePicker(input);
      }

      return callTauri('media_choose_video_source', {
        input: normalizeChooseSourceInput(input),
      });
    },

    async registerVideoSource(input = {}) {
      if (!canUseTauriInvoke()) {
        return unavailableSource(input);
      }

      return callTauri('media_register_video_source', {
        input: normalizeRegisterSourceInput(input),
      });
    },

    async getVideoSource(sourceHandle) {
      if (!canUseTauriInvoke()) {
        throw new Error('Tauri Rust video source lookup is unavailable in this runtime.');
      }

      return callTauri('media_get_video_source', {
        sourceHandle: String(sourceHandle || '').trim(),
      });
    },

    async getVideoSourcePreview(sourceHandle) {
      if (!canUseTauriInvoke()) {
        return unavailablePreview(sourceHandle);
      }

      const response = await callTauri('media_get_video_source_preview', {
        input: normalizePreviewInput(sourceHandle),
      });

      const appCachePath = stringValue(response?.appCachePath, response?.app_cache_path);

      return {
        ...response,
        appCachePath,
        previewUrl: appCachePath ? convertFileSrc(appCachePath) : '',
      };
    },

    async clearVideoSource(sourceHandle) {
      if (!canUseTauriInvoke()) {
        return {
          schema: 'crablink.local.video-source-clear.v1',
          sourceHandle: String(sourceHandle || '').trim(),
          cleared: false,
          message: 'Tauri Rust video source clearing is unavailable in this runtime.',
        };
      }

      return callTauri('media_clear_video_source', {
        sourceHandle: String(sourceHandle || '').trim(),
      });
    },

    async probeVideo(input = {}) {
      if (!canUseTauriInvoke()) {
        return unavailableProbe(input);
      }

      return callTauri('media_probe_video', {
        input: normalizeProbeInput(input),
      });
    },

    async planVideoRenditions(input = {}) {
      if (!canUseTauriInvoke()) {
        return unavailablePlan(input);
      }

      return callTauri('media_plan_video_renditions', {
        input: normalizePlanInput(input),
      });
    },

    async prepareVideoBundle(input = {}) {
      if (!canUseTauriInvoke()) {
        return unavailableJob(input);
      }

      return callTauri('media_prepare_video_bundle', {
        input: normalizePrepareInput(input),
      });
    },

    async getVideoJobStatus(jobId) {
      if (!canUseTauriInvoke()) {
        throw new Error('Tauri Rust video job status is unavailable in this runtime.');
      }

      return callTauri('media_get_video_job_status', {
        jobId: String(jobId || '').trim(),
      });
    },

    async cancelVideoJob(jobId) {
      if (!canUseTauriInvoke()) {
        throw new Error('Tauri Rust video job cancel is unavailable in this runtime.');
      }

      return callTauri('media_cancel_video_job', {
        jobId: String(jobId || '').trim(),
      });
    },
  };
}

export function normalizePreviewInput(input = {}) {
  if (typeof input === 'string') {
    return {
      sourceHandle: input.trim(),
    };
  }

  return {
    sourceHandle: stringValue(input.sourceHandle, input.source_handle),
  };
}

export function normalizeChooseSourceInput(input = {}) {
  return stripEmpty({
    contentType: stringValue(input.contentType, input.content_type, input.type),
    durationSeconds: positiveNumber(input.durationSeconds, input.duration_seconds),
    width: positiveInteger(input.width),
    height: positiveInteger(input.height),
    frameRate: stringValue(input.frameRate, input.frame_rate),
  });
}

export function normalizeRegisterSourceInput(input = {}) {
  return stripEmpty({
    path: stringValue(input.path, input.filePath, input.file_path),
    contentType: stringValue(input.contentType, input.content_type, input.type),
    durationSeconds: positiveNumber(input.durationSeconds, input.duration_seconds),
    width: positiveInteger(input.width),
    height: positiveInteger(input.height),
    frameRate: stringValue(input.frameRate, input.frame_rate),
    source: stringValue(input.source, 'native_source_path'),
  });
}

export function normalizeProbeInput(input = {}) {
  return stripEmpty({
    fileName: stringValue(input.fileName, input.file_name, input.name, input.safeDisplayName),
    contentType: stringValue(input.contentType, input.content_type, input.type),
    bytes: positiveInteger(input.bytes, input.size),
    durationSeconds: positiveNumber(input.durationSeconds, input.duration_seconds),
    width: positiveInteger(input.width),
    height: positiveInteger(input.height),
    frameRate: stringValue(input.frameRate, input.frame_rate),
    source: stringValue(input.source, 'local_preview_metadata'),
  });
}

export function normalizePlanInput(input = {}) {
  return stripEmpty({
    probe: input.probe || input.summary || input,
    includePoster: input.includePoster !== false,
    includeThumbnail: input.includeThumbnail !== false,
    includeSourceCleanMaster: input.includeSourceCleanMaster !== false,
    maxEntries: positiveInteger(input.maxEntries),
  });
}

export function normalizePrepareInput(input = {}) {
  return stripEmpty({
    probe: input.probe,
    plan: input.plan,
    sourceLabel: stringValue(input.sourceLabel, input.source_label),
    sourceHandle: stringValue(input.sourceHandle, input.source_handle),
    requestedBy: stringValue(input.requestedBy, input.requested_by),
  });
}

function unavailablePicker(input = {}) {
  const normalized = normalizeChooseSourceInput(input);

  return {
    schema: 'crablink.local.video-source.v1',
    sourceHandle: 'tauri-unavailable',
    status: 'tauri_unavailable',
    safeDisplayName: 'selected-video',
    extension: '',
    contentType: normalized.contentType || 'application/octet-stream',
    bytes: 0,
    durationSeconds: normalized.durationSeconds || null,
    width: normalized.width || null,
    height: normalized.height || null,
    frameRate: normalized.frameRate || null,
    modifiedUnixMs: null,
    registeredAtUnixMs: Date.now(),
    sourceKind: 'react_fallback',
    supportedInput: false,
    nativeFileAuthority: false,
    warnings: ['Tauri Rust native file picker is unavailable in this runtime.'],
    truthBoundary: videoSourceTruthBoundary(),
  };
}

function unavailableSource(input = {}) {
  const normalized = normalizeRegisterSourceInput(input);

  return {
    schema: 'crablink.local.video-source.v1',
    sourceHandle: 'tauri-unavailable',
    status: 'tauri_unavailable',
    safeDisplayName: normalized.path ? fileNameFromPath(normalized.path) : 'selected-video',
    extension: '',
    contentType: normalized.contentType || 'application/octet-stream',
    bytes: 0,
    durationSeconds: normalized.durationSeconds || null,
    width: normalized.width || null,
    height: normalized.height || null,
    frameRate: normalized.frameRate || null,
    modifiedUnixMs: null,
    registeredAtUnixMs: Date.now(),
    sourceKind: 'react_fallback',
    supportedInput: false,
    nativeFileAuthority: false,
    warnings: ['Tauri Rust video source registration is unavailable in this runtime.'],
    truthBoundary: videoSourceTruthBoundary(),
  };
}

function unavailablePreview(sourceHandle = '') {
  return {
    schema: 'crablink.local.video-source-preview.v1',
    sourceHandle: typeof sourceHandle === 'string' ? sourceHandle.trim() : stringValue(sourceHandle?.sourceHandle, sourceHandle?.source_handle),
    status: 'tauri_unavailable',
    safeDisplayName: 'selected-video',
    contentType: 'video/mp4',
    bytes: 0,
    appCachePath: '',
    previewUrl: '',
    copiedToAppCache: false,
    note: 'Tauri Rust local preview is unavailable in this runtime.',
    truthBoundary: {
      returnsPrivateSourcePath: false,
      returnsVideoBytes: false,
      returnsAppCachePath: false,
      mintsB3: false,
      createsReceipt: false,
      mutatesWallet: false,
    },
  };
}

function unavailableProbe(input = {}) {
  const normalized = normalizeProbeInput(input);

  return {
    schema: 'crablink.local.video-probe-summary.v1',
    status: 'tauri_unavailable',
    fileName: normalized.fileName || 'selected-video',
    safeDisplayName: normalized.fileName || 'selected-video',
    contentType: normalized.contentType || 'application/octet-stream',
    bytes: normalized.bytes || 0,
    durationSeconds: normalized.durationSeconds || null,
    width: normalized.width || null,
    height: normalized.height || null,
    resolution: normalized.width && normalized.height ? `${normalized.width}x${normalized.height}` : null,
    aspectRatio: null,
    frameRate: normalized.frameRate || null,
    guessedContainer: 'unknown',
    inputFamily: 'unknown',
    supportedInput: false,
    recommendedContainer: 'mp4',
    recommendedMime: 'video/mp4',
    recommendedVideoCodec: 'h264',
    recommendedAudioCodec: 'aac',
    needsTranscode: true,
    metadataCleanupRecommended: true,
    source: {
      kind: 'react_fallback',
      fromReactPreview: true,
      rustDeepProbeAvailable: false,
      note: 'Tauri invoke is unavailable in this runtime.',
    },
    warnings: ['Tauri Rust video planner is unavailable in this runtime.'],
    truthBoundary: {
      returnsPrivatePath: false,
      returnsVideoBytes: false,
      readsFullVideoBytes: false,
      runsTranscode: false,
      stripsMetadata: false,
      writesOutputFiles: false,
      mintsB3: false,
      createsReceipt: false,
      mutatesWallet: false,
      claimsCodecCertainty: false,
    },
  };
}

function unavailablePlan(input = {}) {
  const probe = input.probe || unavailableProbe(input);

  return {
    schema: 'crablink.local.video-converter-plan.v1',
    status: 'tauri_unavailable',
    targetContainer: 'mp4',
    targetMime: 'video/mp4',
    targetVideoCodec: 'h264',
    targetAudioCodec: 'aac',
    source: {
      fileName: probe.safeDisplayName || probe.fileName || 'selected-video',
      contentType: probe.contentType || 'application/octet-stream',
      bytes: probe.bytes || 0,
      width: probe.width || null,
      height: probe.height || null,
      durationSeconds: probe.durationSeconds || null,
      needsTranscode: true,
    },
    entries: [],
    skipped: [],
    privacyCleanup: {
      defaultPolicy: 'default_video_privacy',
      stripsHiddenContainerMetadata: true,
      preservesIntentionalManifestFields: true,
      note: 'Rust planner unavailable; this is display-only fallback.',
    },
    warnings: ['Tauri Rust video planner is unavailable in this runtime.'],
    truthBoundary: {
      runsTranscode: false,
      writesOutputFiles: false,
      uploadsBytes: false,
      mintsB3: false,
      createsReceipt: false,
      mutatesWallet: false,
      unlocksPaidContent: false,
    },
  };
}

function unavailableJob(input = {}) {
  return {
    schema: 'crablink.local.video-prepare-job.v2',
    jobId: 'tauri-unavailable',
    kind: 'video_prepare_bundle',
    status: 'unavailable',
    progressPercent: 0,
    phase: 'Tauri unavailable',
    sourceLabel: input.sourceLabel || 'local_preview_metadata',
    sourceHandle: input.sourceHandle || null,
    outputs: [],
    warnings: ['Tauri Rust video prepare jobs are unavailable in this runtime.'],
    truthBoundary: {
      descriptorOnly: true,
      runsTranscode: false,
      stripsMetadata: false,
      writesOutputFiles: false,
      uploadsBytes: false,
      mintsB3: false,
      createsReceipt: false,
      mutatesWallet: false,
    },
  };
}

function videoSourceTruthBoundary() {
  return {
    returnsPrivatePath: false,
    returnsVideoBytes: false,
    readsFullVideoBytes: false,
    runsTranscode: false,
    stripsMetadata: false,
    writesOutputFiles: false,
    mintsB3: false,
    createsReceipt: false,
    mutatesWallet: false,
  };
}

function canUseTauriInvoke() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
}

function positiveInteger(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }
  }

  return undefined;
}

function positiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return undefined;
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}

function stripEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      if (Array.isArray(child) && child.length === 0) return false;
      return true;
    }),
  );
}

function fileNameFromPath(value) {
  return String(value || '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() || 'selected-video';
}