/**
 * RO:WHAT — Local Creator Studio scene preset model for crab://stream.
 * RO:WHY — Gives streamers saved local source/look/framing presets without creating backend, wallet, receipt, or entitlement truth.
 * RO:INTERACTS — StreamPage, StreamLocalPreview, StreamLookPanel, StreamDraft, stream.css, browser localStorage.
 * RO:INVARIANTS — local preference only; no wallet secrets, stream keys, receipts, entitlements, ledger state, or backend session state.
 * RO:METRICS — none; this is local display/persistence only.
 * RO:CONFIG — stores bounded local scene/look/framing preferences in localStorage.
 * RO:SECURITY — fail-closed on malformed storage; never stores raw capabilities, tokens, private keys, local paths, or spend authority.
 * RO:TEST — npm run build; manual save/apply/delete scene preset smoke in CrabLink Tauri.
 */

const STORAGE_KEY = 'crablink.stream.creatorStudio.presets.v1';
const MAX_SAVED_PRESETS = 8;
const MAX_BACKGROUND_DATA_URL_CHARS = 640_000;
const BACKGROUND_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;

const CAMERA_ZOOM_MIN = 33;
const CAMERA_ZOOM_MAX = 220;
const CAMERA_BRIGHTNESS_MIN = 40;
const CAMERA_BRIGHTNESS_MAX = 180;
const CAMERA_CONTRAST_MIN = 40;
const CAMERA_CONTRAST_MAX = 200;
const CAMERA_SATURATION_MIN = 0;
const CAMERA_SATURATION_MAX = 220;

const DEFAULT_LOOK_PATCH = Object.freeze({
  backgroundMode: 'none',
  backgroundSolidColor: '#111111',
  backgroundImageDataUrl: '',
  backgroundImageName: '',
  backgroundImageFit: 'cover',
  backgroundRemovalMode: 'none',
  personSegmentationEnabled: false,
  personMaskPolarity: 'auto',
  personMaskFlip: false,
  personMaskInvert: false,
  personMaskFeather: 2,
  personMaskOpacity: 1,
  personSegmentationIntervalMs: 105,
  greenScreenEnabled: false,
  greenScreenKeyColor: '#00ff00',
  greenScreenTolerance: 34,
  greenScreenFeather: 8,
  greenScreenSpillReduction: 10,
  cameraMirror: true,
  cameraZoom: 100,
  cameraOffsetX: 0,
  cameraOffsetY: 0,
  cameraBrightness: 100,
  cameraContrast: 100,
  cameraSaturation: 100,
  studioOutputWidth: 1280,
  studioOutputHeight: 720,
});

export const BUILTIN_STUDIO_SCENES = Object.freeze([
  makeBuiltinScene({
    id: 'camera',
    name: 'Camera',
    title: 'Camera only',
    short: 'Face-first creator stream.',
    sourceMode: 'local_camera_preview',
    ingestMode: 'not_wired_local_preview',
    tag: 'camera',
  }),
  makeBuiltinScene({
    id: 'person_cutout',
    name: 'Cutout',
    title: 'Person cutout',
    short: 'Remove the room and use a clean local background.',
    sourceMode: 'local_camera_preview',
    ingestMode: 'stream_lite_compositor_future',
    tag: 'person-cutout',
    effects: {
      personSegmentationEnabled: true,
      backgroundRemovalMode: 'person',
      personMaskPolarity: 'auto',
      personMaskFeather: 2,
    },
    background: {
      mode: 'solid',
      imageId: '',
      imageUrl: '',
      solidColor: '#071f14',
      fit: 'cover',
    },
    draftPatch: {
      ...DEFAULT_LOOK_PATCH,
      sourceMode: 'local_camera_preview',
      ingestMode: 'stream_lite_compositor_future',
      captureAudio: 'off',
      tags: 'person-cutout',
      backgroundMode: 'solid',
      backgroundSolidColor: '#071f14',
      backgroundRemovalMode: 'person',
      personSegmentationEnabled: true,
      personMaskPolarity: 'auto',
      personMaskFlip: false,
      personMaskInvert: false,
      personMaskFeather: 2,
      greenScreenEnabled: false,
    },
  }),
  makeBuiltinScene({
    id: 'screen',
    name: 'Screen',
    title: 'Screen only',
    short: 'Show a window, app, browser, or deck.',
    sourceMode: 'local_screen_preview',
    ingestMode: 'not_wired_local_preview',
    tag: 'screen',
    screen: {
      enabled: true,
      includeSystemAudio: false,
      displaySurfaceHint: '',
    },
    output: {
      preset: 'proof',
      width: 960,
      height: 540,
      quality: 0.72,
      frameIntervalMs: 2000,
    },
  }),
  makeBuiltinScene({
    id: 'screen_cam',
    name: 'Screen + cam',
    title: 'Screen with webcam',
    short: 'Webcam thumbnail over screen share.',
    sourceMode: 'screen_with_webcam_thumbnail_future',
    ingestMode: 'stream_lite_compositor_future',
    tag: 'webcam-overlay',
    screen: {
      enabled: true,
      includeSystemAudio: false,
      displaySurfaceHint: '',
    },
    overlay: {
      cameraEnabled: true,
      position: 'bottom_right',
      size: 'medium',
      shape: 'rounded_rect',
    },
    output: {
      preset: 'proof',
      width: 960,
      height: 540,
      quality: 0.72,
      frameIntervalMs: 2000,
    },
  }),
  makeBuiltinScene({
    id: 'green_screen',
    name: 'Green screen',
    title: 'Camera + chroma key',
    short: 'Use a physical green screen with local backgrounds.',
    sourceMode: 'camera_green_screen_background_future',
    ingestMode: 'stream_lite_compositor_future',
    tag: 'green-screen',
    effects: {
      greenScreenEnabled: true,
      backgroundRemovalMode: 'chroma',
      keyColor: '#00ff00',
      tolerance: 34,
      feather: 8,
      spillReduction: 10,
    },
    background: {
      mode: 'solid',
      imageId: '',
      imageUrl: '',
      solidColor: '#052e16',
      fit: 'cover',
    },
    draftPatch: {
      ...DEFAULT_LOOK_PATCH,
      sourceMode: 'camera_green_screen_background_future',
      ingestMode: 'stream_lite_compositor_future',
      captureAudio: 'off',
      tags: 'green-screen',
      backgroundMode: 'solid',
      backgroundSolidColor: '#052e16',
      backgroundRemovalMode: 'chroma',
      personSegmentationEnabled: false,
      personMaskPolarity: 'auto',
      personMaskFlip: false,
      personMaskInvert: false,
      greenScreenEnabled: true,
      greenScreenKeyColor: '#00ff00',
      greenScreenTolerance: 34,
      greenScreenFeather: 8,
      greenScreenSpillReduction: 10,
    },
  }),
]);

export function readSavedStudioPresets() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const presets = Array.isArray(parsed?.presets) ? parsed.presets : Array.isArray(parsed) ? parsed : [];

    return presets
      .map((preset) => normalizeStudioPreset(preset))
      .filter(Boolean)
      .filter((preset) => preset.origin === 'local')
      .slice(0, MAX_SAVED_PRESETS);
  } catch (_error) {
    return [];
  }
}

export function upsertSavedStudioPreset(inputPreset) {
  const preset = normalizeStudioPreset({
    ...inputPreset,
    origin: 'local',
    updatedAt: new Date().toISOString(),
  });

  if (!preset) {
    return readSavedStudioPresets();
  }

  const current = readSavedStudioPresets();
  let next = [preset, ...current.filter((item) => item.id !== preset.id)].slice(0, MAX_SAVED_PRESETS);

  while (next.length > 0) {
    if (writeSavedStudioPresets(next)) {
      return next;
    }

    next = next.slice(0, -1);
  }

  writeSavedStudioPresets([]);
  return [];
}

export function deleteSavedStudioPreset(presetId) {
  const id = cleanString(presetId);
  const next = readSavedStudioPresets().filter((preset) => preset.id !== id);

  writeSavedStudioPresets(next);
  return next;
}

export function createStudioPresetFromDraft({ name, draft, basePreset }) {
  const safeName = cleanString(name).slice(0, 48) || 'Saved scene';
  const base = normalizeStudioPreset(basePreset) || BUILTIN_STUDIO_SCENES[0];
  const safeDraft = objectValue(draft);
  const draftPatchWithWarning = buildDraftPatchFromDraft(safeDraft, base);
  const storageWarning = cleanString(draftPatchWithWarning.storageWarning);

  delete draftPatchWithWarning.storageWarning;

  return normalizeStudioPreset({
    ...base,
    id: makeLocalPresetId(),
    origin: 'local',
    name: safeName,
    title: safeName,
    short: `Saved local scene · ${base.name || 'Custom'}`,
    sourceMode: cleanString(safeDraft.sourceMode) || base.sourceMode,
    ingestMode: cleanString(safeDraft.ingestMode) || base.ingestMode || 'not_wired_local_preview',
    captureAudio: normalizeCaptureAudio(safeDraft.captureAudio || base.captureAudio),
    tag: 'saved-scene',
    draftPatch: draftPatchWithWarning,
    storageWarning,
    updatedAt: new Date().toISOString(),
    truthBoundary: 'Local creator UX preset only. Not stream, wallet, receipt, or entitlement truth.',
  });
}

export function applyStudioPresetToDraft(draft, preset) {
  const safeDraft = objectValue(draft);
  const safePreset = normalizeStudioPreset(preset) || BUILTIN_STUDIO_SCENES[0];
  const patch = objectValue(safePreset.draftPatch);

  return {
    ...safeDraft,
    sourceMode:
      cleanString(patch.sourceMode) ||
      cleanString(safePreset.sourceMode) ||
      cleanString(safeDraft.sourceMode) ||
      'local_camera_preview',
    ingestMode:
      cleanString(patch.ingestMode) ||
      cleanString(safePreset.ingestMode) ||
      cleanString(safeDraft.ingestMode) ||
      'not_wired_local_preview',
    captureAudio: normalizeCaptureAudio(
      cleanString(patch.captureAudio) || cleanString(safePreset.captureAudio) || cleanString(safeDraft.captureAudio),
    ),
    tags: mergeTags(safeDraft.tags, patch.tags || safePreset.tag || safePreset.tags),
    backgroundMode: normalizeBackgroundMode(patch.backgroundMode || safeDraft.backgroundMode),
    backgroundSolidColor: cleanHexColor(patch.backgroundSolidColor || safeDraft.backgroundSolidColor || '#111111'),
    backgroundImageDataUrl: cleanString(patch.backgroundImageDataUrl),
    backgroundImageName: cleanString(patch.backgroundImageName).slice(0, 90),
    backgroundImageFit: normalizeImageFit(patch.backgroundImageFit || safeDraft.backgroundImageFit),
    backgroundRemovalMode: normalizeRemovalMode(patch.backgroundRemovalMode || safeDraft.backgroundRemovalMode),
    personSegmentationEnabled: normalizeBoolean(
      patch.personSegmentationEnabled ?? safeDraft.personSegmentationEnabled,
    ),
    personMaskPolarity: normalizeMaskPolarity(patch.personMaskPolarity || safeDraft.personMaskPolarity),
    personMaskFlip: normalizeBoolean(patch.personMaskFlip ?? safeDraft.personMaskFlip),
    personMaskInvert: false,
    personMaskFeather: clampInteger(patch.personMaskFeather, safeDraft.personMaskFeather || 2, 0, 12),
    personMaskOpacity: clampFloat(patch.personMaskOpacity, safeDraft.personMaskOpacity || 1, 0.2, 1),
    personSegmentationIntervalMs: clampInteger(
      patch.personSegmentationIntervalMs,
      safeDraft.personSegmentationIntervalMs || 105,
      70,
      500,
    ),
    greenScreenEnabled: normalizeBoolean(patch.greenScreenEnabled ?? safeDraft.greenScreenEnabled),
    greenScreenKeyColor: cleanHexColor(patch.greenScreenKeyColor || safeDraft.greenScreenKeyColor || '#00ff00'),
    greenScreenTolerance: clampInteger(patch.greenScreenTolerance, safeDraft.greenScreenTolerance || 34, 0, 100),
    greenScreenFeather: clampInteger(patch.greenScreenFeather, safeDraft.greenScreenFeather || 8, 0, 100),
    greenScreenSpillReduction: clampInteger(
      patch.greenScreenSpillReduction,
      safeDraft.greenScreenSpillReduction || 10,
      0,
      100,
    ),
    cameraMirror: normalizeBooleanWithDefault(patch.cameraMirror ?? safeDraft.cameraMirror, true),
    cameraZoom: clampInteger(patch.cameraZoom, safeDraft.cameraZoom || 100, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX),
    cameraOffsetX: clampInteger(patch.cameraOffsetX, safeDraft.cameraOffsetX || 0, -50, 50),
    cameraOffsetY: clampInteger(patch.cameraOffsetY, safeDraft.cameraOffsetY || 0, -50, 50),
    cameraBrightness: clampInteger(
      patch.cameraBrightness,
      safeDraft.cameraBrightness || 100,
      CAMERA_BRIGHTNESS_MIN,
      CAMERA_BRIGHTNESS_MAX,
    ),
    cameraContrast: clampInteger(
      patch.cameraContrast,
      safeDraft.cameraContrast || 100,
      CAMERA_CONTRAST_MIN,
      CAMERA_CONTRAST_MAX,
    ),
    cameraSaturation: clampInteger(
      patch.cameraSaturation,
      safeDraft.cameraSaturation || 100,
      CAMERA_SATURATION_MIN,
      CAMERA_SATURATION_MAX,
    ),
    studioOutputWidth: clampInteger(patch.studioOutputWidth, safeDraft.studioOutputWidth || 1280, 320, 1920),
    studioOutputHeight: clampInteger(patch.studioOutputHeight, safeDraft.studioOutputHeight || 720, 180, 1080),
  };
}

export function isLocalStudioPreset(preset) {
  return normalizeStudioPreset(preset)?.origin === 'local';
}

export function normalizeStudioPreset(value) {
  const source = objectValue(value);
  const id = cleanString(source.id).slice(0, 80);

  if (!id) {
    return null;
  }

  const origin = source.origin === 'local' ? 'local' : 'builtin';
  const name = cleanString(source.name || source.label || source.title).slice(0, 48) || 'Scene';
  const title = cleanString(source.title || name).slice(0, 72) || name;
  const short = cleanString(source.short || source.description).slice(0, 140) || 'Local creator scene preset.';

  return {
    schema: 'crablink.creator-scene-preset.v1',
    id,
    origin,
    name,
    title,
    short,
    sourceMode: cleanString(source.sourceMode) || 'local_camera_preview',
    ingestMode: cleanString(source.ingestMode) || 'not_wired_local_preview',
    captureAudio: normalizeCaptureAudio(source.captureAudio),
    tag: cleanString(source.tag || source.tags),
    draftPatch: sanitizeDraftPatch(source.draftPatch),
    camera: sanitizeObject(source.camera),
    screen: sanitizeObject(source.screen),
    overlay: sanitizeObject(source.overlay),
    effects: sanitizeObject(source.effects),
    background: sanitizeObject(source.background),
    output: sanitizeOutput(source.output),
    storageWarning: cleanString(source.storageWarning).slice(0, 220),
    updatedAt: cleanString(source.updatedAt),
    truthBoundary: 'Local creator UX preset only. Not stream, wallet, receipt, or entitlement truth.',
  };
}

function makeBuiltinScene(input) {
  const baseDraftPatch = {
    ...DEFAULT_LOOK_PATCH,
    sourceMode: input.sourceMode,
    ingestMode: input.ingestMode || 'not_wired_local_preview',
    captureAudio: 'off',
    tags: input.tag,
  };

  return {
    schema: 'crablink.creator-scene-preset.v1',
    id: input.id,
    origin: 'builtin',
    name: input.name,
    title: input.title,
    short: input.short,
    sourceMode: input.sourceMode,
    ingestMode: input.ingestMode || 'not_wired_local_preview',
    captureAudio: 'off',
    tag: input.tag,
    draftPatch: {
      ...baseDraftPatch,
      ...objectValue(input.draftPatch),
    },
    camera: input.camera || {
      deviceId: '',
      labelHint: '',
      width: 1280,
      height: 720,
      facingMode: 'user',
    },
    screen: input.screen || {
      enabled: false,
      includeSystemAudio: false,
      displaySurfaceHint: '',
    },
    overlay: input.overlay || {
      cameraEnabled: false,
      position: 'bottom_right',
      size: 'medium',
      shape: 'rounded_rect',
    },
    effects: input.effects || {
      greenScreenEnabled: false,
      backgroundRemovalMode: 'none',
      keyColor: '#00ff00',
      tolerance: 34,
      feather: 8,
      spillReduction: 10,
    },
    background: input.background || {
      mode: 'none',
      imageId: '',
      imageUrl: '',
      solidColor: '#111111',
      fit: 'cover',
    },
    output: input.output || {
      preset: 'proof',
      width: 640,
      height: 360,
      quality: 0.72,
      frameIntervalMs: 2000,
    },
    storageWarning: '',
    truthBoundary: 'Local creator UX preset only. Not stream, wallet, receipt, or entitlement truth.',
  };
}

function buildDraftPatchFromDraft(draft, base) {
  const backgroundMode = normalizeBackgroundMode(draft.backgroundMode);
  const backgroundImageDataUrl = sanitizeBackgroundDataUrl(draft.backgroundImageDataUrl);
  const backgroundImageName = cleanString(draft.backgroundImageName).slice(0, 90);
  const backgroundImageWanted = backgroundMode === 'image' && cleanString(draft.backgroundImageDataUrl);
  const backgroundImageStored = backgroundMode === 'image' && Boolean(backgroundImageDataUrl);
  const storageWarning =
    backgroundImageWanted && !backgroundImageStored
      ? 'Large background image kept for the current preview, but it was not saved into this local scene preset. Use a smaller compressed image to preserve it in saved scenes.'
      : '';

  return {
    sourceMode: cleanString(draft.sourceMode) || base.sourceMode,
    ingestMode: cleanString(draft.ingestMode) || base.ingestMode || 'not_wired_local_preview',
    captureAudio: normalizeCaptureAudio(draft.captureAudio || base.captureAudio),
    tags: cleanString(draft.tags),
    backgroundMode: backgroundImageStored ? 'image' : backgroundMode === 'image' ? 'solid' : backgroundMode,
    backgroundSolidColor: cleanHexColor(draft.backgroundSolidColor || '#111111'),
    backgroundImageDataUrl: backgroundImageStored ? backgroundImageDataUrl : '',
    backgroundImageName: backgroundImageStored ? backgroundImageName : '',
    backgroundImageFit: normalizeImageFit(draft.backgroundImageFit),
    backgroundRemovalMode: normalizeRemovalMode(draft.backgroundRemovalMode),
    personSegmentationEnabled: normalizeBoolean(draft.personSegmentationEnabled),
    personMaskPolarity: normalizeMaskPolarity(draft.personMaskPolarity),
    personMaskFlip: normalizeBoolean(draft.personMaskFlip),
    personMaskInvert: false,
    personMaskFeather: clampInteger(draft.personMaskFeather, 2, 0, 12),
    personMaskOpacity: clampFloat(draft.personMaskOpacity, 1, 0.2, 1),
    personSegmentationIntervalMs: clampInteger(draft.personSegmentationIntervalMs, 105, 70, 500),
    greenScreenEnabled: normalizeBoolean(draft.greenScreenEnabled),
    greenScreenKeyColor: cleanHexColor(draft.greenScreenKeyColor || '#00ff00'),
    greenScreenTolerance: clampInteger(draft.greenScreenTolerance, 34, 0, 100),
    greenScreenFeather: clampInteger(draft.greenScreenFeather, 8, 0, 100),
    greenScreenSpillReduction: clampInteger(draft.greenScreenSpillReduction, 10, 0, 100),
    cameraMirror: normalizeBooleanWithDefault(draft.cameraMirror, true),
    cameraZoom: clampInteger(draft.cameraZoom, 100, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX),
    cameraOffsetX: clampInteger(draft.cameraOffsetX, 0, -50, 50),
    cameraOffsetY: clampInteger(draft.cameraOffsetY, 0, -50, 50),
    cameraBrightness: clampInteger(draft.cameraBrightness, 100, CAMERA_BRIGHTNESS_MIN, CAMERA_BRIGHTNESS_MAX),
    cameraContrast: clampInteger(draft.cameraContrast, 100, CAMERA_CONTRAST_MIN, CAMERA_CONTRAST_MAX),
    cameraSaturation: clampInteger(draft.cameraSaturation, 100, CAMERA_SATURATION_MIN, CAMERA_SATURATION_MAX),
    studioOutputWidth: clampInteger(draft.studioOutputWidth, 1280, 320, 1920),
    studioOutputHeight: clampInteger(draft.studioOutputHeight, 720, 180, 1080),
    storageWarning,
  };
}

function writeSavedStudioPresets(presets) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schema: 'crablink.creator-studio-preset-store.v1',
        updatedAt: new Date().toISOString(),
        truthBoundary: 'Local display/preferences only. Not wallet, receipt, stream, ownership, or entitlement truth.',
        presets,
      }),
    );
    return true;
  } catch (_error) {
    return false;
  }
}

function sanitizeDraftPatch(value) {
  const source = objectValue(value);
  let backgroundMode = normalizeBackgroundMode(source.backgroundMode);
  const backgroundImageDataUrl = sanitizeBackgroundDataUrl(source.backgroundImageDataUrl);

  if (backgroundMode === 'image' && !backgroundImageDataUrl) {
    backgroundMode = 'none';
  }

  return {
    sourceMode: cleanString(source.sourceMode).slice(0, 96),
    ingestMode: cleanString(source.ingestMode).slice(0, 96),
    captureAudio: normalizeCaptureAudio(source.captureAudio),
    tags: cleanString(source.tags).slice(0, 180),
    backgroundMode,
    backgroundSolidColor: cleanHexColor(source.backgroundSolidColor || '#111111'),
    backgroundImageDataUrl,
    backgroundImageName: backgroundImageDataUrl ? cleanString(source.backgroundImageName).slice(0, 90) : '',
    backgroundImageFit: normalizeImageFit(source.backgroundImageFit),
    backgroundRemovalMode: normalizeRemovalMode(source.backgroundRemovalMode),
    personSegmentationEnabled: normalizeBoolean(source.personSegmentationEnabled),
    personMaskPolarity: normalizeMaskPolarity(source.personMaskPolarity),
    personMaskFlip: normalizeBoolean(source.personMaskFlip),
    personMaskInvert: false,
    personMaskFeather: clampInteger(source.personMaskFeather, 2, 0, 12),
    personMaskOpacity: clampFloat(source.personMaskOpacity, 1, 0.2, 1),
    personSegmentationIntervalMs: clampInteger(source.personSegmentationIntervalMs, 105, 70, 500),
    greenScreenEnabled: normalizeBoolean(source.greenScreenEnabled),
    greenScreenKeyColor: cleanHexColor(source.greenScreenKeyColor || '#00ff00'),
    greenScreenTolerance: clampInteger(source.greenScreenTolerance, 34, 0, 100),
    greenScreenFeather: clampInteger(source.greenScreenFeather, 8, 0, 100),
    greenScreenSpillReduction: clampInteger(source.greenScreenSpillReduction, 10, 0, 100),
    cameraMirror: normalizeBooleanWithDefault(source.cameraMirror, true),
    cameraZoom: clampInteger(source.cameraZoom, 100, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX),
    cameraOffsetX: clampInteger(source.cameraOffsetX, 0, -50, 50),
    cameraOffsetY: clampInteger(source.cameraOffsetY, 0, -50, 50),
    cameraBrightness: clampInteger(source.cameraBrightness, 100, CAMERA_BRIGHTNESS_MIN, CAMERA_BRIGHTNESS_MAX),
    cameraContrast: clampInteger(source.cameraContrast, 100, CAMERA_CONTRAST_MIN, CAMERA_CONTRAST_MAX),
    cameraSaturation: clampInteger(source.cameraSaturation, 100, CAMERA_SATURATION_MIN, CAMERA_SATURATION_MAX),
    studioOutputWidth: clampInteger(source.studioOutputWidth, 1280, 320, 1920),
    studioOutputHeight: clampInteger(source.studioOutputHeight, 720, 180, 1080),
  };
}

function sanitizeObject(value) {
  const source = objectValue(value);
  const out = {};

  Object.entries(source).forEach(([key, item]) => {
    const cleanKey = cleanString(key).slice(0, 48);

    if (!cleanKey) {
      return;
    }

    if (typeof item === 'boolean') {
      out[cleanKey] = item;
      return;
    }

    if (typeof item === 'number') {
      out[cleanKey] = Number.isFinite(item) ? item : 0;
      return;
    }

    out[cleanKey] = cleanString(item).slice(0, 240);
  });

  return out;
}

function sanitizeOutput(value) {
  const source = objectValue(value);

  return {
    preset: cleanString(source.preset).slice(0, 32) || 'proof',
    width: clampInteger(source.width, 640, 160, 1920),
    height: clampInteger(source.height, 360, 90, 1080),
    quality: clampFloat(source.quality, 0.72, 0.1, 0.95),
    frameIntervalMs: clampInteger(source.frameIntervalMs, 2000, 500, 30000),
  };
}

function sanitizeBackgroundDataUrl(value) {
  const clean = cleanString(value);

  if (!clean || clean.length > MAX_BACKGROUND_DATA_URL_CHARS) {
    return '';
  }

  if (!BACKGROUND_DATA_URL_PATTERN.test(clean)) {
    return '';
  }

  return clean;
}

function normalizeBackgroundMode(value) {
  const clean = cleanString(value);

  if (clean === 'image') return 'image';
  if (clean === 'solid') return 'solid';
  return 'none';
}

function normalizeRemovalMode(value) {
  const clean = cleanString(value);

  if (clean === 'person') return 'person';
  if (clean === 'chroma') return 'chroma';
  return 'none';
}

function normalizeImageFit(value) {
  return cleanString(value) === 'contain' ? 'contain' : 'cover';
}

function normalizeMaskPolarity(value) {
  const clean = cleanString(value);

  if (clean === 'flip' || clean === 'keep_not_value') {
    return 'flip';
  }

  return 'auto';
}

function normalizeCaptureAudio(value) {
  return cleanString(value) === 'on' ? 'on' : 'off';
}

function normalizeBoolean(value) {
  return value === true || cleanString(value) === 'true' || cleanString(value) === 'on';
}

function normalizeBooleanWithDefault(value, fallback) {
  if (value === undefined || value === null || cleanString(value) === '') {
    return fallback;
  }

  return normalizeBoolean(value);
}

function cleanHexColor(value) {
  const clean = cleanString(value);

  if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
    return clean.toLowerCase();
  }

  return '#111111';
}

function mergeTags(existing, next) {
  const tags = `${cleanString(existing)},${cleanString(next)}`
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(tags)].slice(0, 16).join(', ');
}

function makeLocalPresetId() {
  const random =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `local_${random}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, safe));
}

function clampFloat(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value ?? ''));
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, safe));
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}