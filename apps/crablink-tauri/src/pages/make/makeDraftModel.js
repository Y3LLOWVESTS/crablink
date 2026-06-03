/**
 * RO:WHAT — Local draft/session model helpers for the crab://make creator studio.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps Make draft state explicit without creating backend truth.
 * RO:INTERACTS — MakePage.jsx, makeCompositor.js, browser MediaRecorder APIs, future VideoPage handoff, localStorage/sessionStorage.
 * RO:INVARIANTS — local draft only; no fake CIDs; no fake receipts; no wallet mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — browser-local draft and latest session plan keys.
 * RO:SECURITY — no video bytes, tokens, secrets, private paths, or spend authority are persisted here.
 * RO:TEST — npm run build; manual crab://make draft save/clear, cutout controls, and session-plan JSON smoke.
 */

export const MAKE_DRAFT_STORAGE_KEY = 'crablink.make.draft.v2';
export const MAKE_SESSION_PLAN_STORAGE_KEY = 'crablink.make.latestSessionPlan.v1';

export const MAKE_MODES = Object.freeze([
  {
    value: 'camera',
    label: 'Camera',
    shortLabel: 'Camera',
    copy: 'Record a direct camera clip with optional microphone audio.',
    needsCamera: true,
    needsScreen: false,
  },
  {
    value: 'screen',
    label: 'Screen',
    shortLabel: 'Screen',
    copy: 'Record a screen capture canvas with optional microphone narration.',
    needsCamera: false,
    needsScreen: true,
  },
  {
    value: 'screen_pip',
    label: 'Screen + PiP',
    shortLabel: 'PiP',
    copy: 'Record screen capture with your camera framed as a picture-in-picture tile.',
    needsCamera: true,
    needsScreen: true,
  },
  {
    value: 'camera_background',
    label: 'Person Cutout',
    shortLabel: 'Cutout',
    copy: 'Record camera with software background removal and a local solid, image, or video background.',
    needsCamera: true,
    needsScreen: false,
  },
  {
    value: 'audio_only',
    label: 'Audio Card',
    shortLabel: 'Audio',
    copy: 'Record an audio-first clip with a branded title card canvas.',
    needsCamera: false,
    needsScreen: false,
  },
]);

export const MAKE_SCENES = Object.freeze([
  {
    value: 'midnight',
    label: 'Midnight Studio',
    copy: 'Dark polished creator-card background.',
  },
  {
    value: 'ocean',
    label: 'Ocean Glass',
    copy: 'Blue/teal gradient for tutorials and calm explainers.',
  },
  {
    value: 'ember',
    label: 'Ember Desk',
    copy: 'Warm orange/purple gradient for music and commentary.',
  },
  {
    value: 'paper',
    label: 'Clean Paper',
    copy: 'Light neutral background for course-style clips.',
  },
]);

export const MAKE_BACKGROUND_KINDS = Object.freeze([
  {
    value: 'scene',
    label: 'Studio scene',
    copy: 'Use the selected Make scene gradient.',
  },
  {
    value: 'solid',
    label: 'Solid color',
    copy: 'Use a local solid color behind the subject.',
  },
  {
    value: 'image',
    label: 'Image',
    copy: 'Use a local image data URL behind the subject.',
  },
  {
    value: 'video',
    label: 'Video',
    copy: 'Use a local looping video object URL behind the subject. The video file itself is not persisted.',
  },
]);

export const MAKE_CUTOUT_POLARITIES = Object.freeze([
  { value: 'auto', label: 'Auto subject' },
  { value: 'flip', label: 'Flip mask' },
]);

export const MAKE_PIP_STYLES = Object.freeze([
  {
    value: 'regular',
    label: 'Regular camera',
    copy: 'Draw the webcam as a framed PiP card over the screen.',
  },
  {
    value: 'cutout',
    label: 'Person cutout',
    copy: 'Draw only the locally cut-out subject over the screen.',
  },
]);

export const MAKE_SCENE_PRESETS = Object.freeze([
  {
    value: 'studio_demo',
    label: 'Studio Demo',
    eyebrow: 'Creator update',
    copy: 'A clean camera-first setup for announcements, creator updates, and product demos.',
    patch: {
      selectedMode: 'camera',
      selectedScene: 'midnight',
      outputPreset: 'social_720p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 28,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      backgroundKind: 'scene',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'cutout_solid',
    label: 'Cutout Studio',
    eyebrow: 'Background replacement',
    copy: 'Camera with software person cutout over a clean local studio color.',
    patch: {
      selectedMode: 'camera_background',
      selectedScene: 'midnight',
      outputPreset: 'social_720p',
      targetFps: 30,
      includeMic: true,
      backgroundRemovalMode: 'person_cutout',
      personCutoutEnabled: true,
      backgroundKind: 'solid',
      backgroundSolidColor: '#071f14',
      subjectMirror: true,
      subjectScale: 100,
      subjectOffsetX: 0,
      subjectOffsetY: 0,
      cutoutFeather: 3,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'screen_tutorial',
    label: 'Screen Tutorial',
    eyebrow: 'Teach clearly',
    copy: 'Desktop canvas with screen capture, camera PiP, and microphone narration.',
    patch: {
      selectedMode: 'screen_pip',
      selectedScene: 'ocean',
      outputPreset: 'desktop_1080p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 24,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'screen_cutout_pip',
    label: 'Cutout PiP',
    eyebrow: 'Screen + subject',
    copy: 'Screen recording with camera PiP using software person cutout.',
    patch: {
      selectedMode: 'screen_pip',
      selectedScene: 'ocean',
      outputPreset: 'desktop_1080p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 28,
      pipStyle: 'cutout',
      backgroundRemovalMode: 'off',
      personCutoutEnabled: false,
      pipCutoutEnabled: true,
      pipCutoutBackground: false,
    },
  },
  {
    value: 'podcast_clip',
    label: 'Podcast Clip',
    eyebrow: 'Audio-first',
    copy: 'A branded audio card for quick commentary, podcast teasers, or narration clips.',
    patch: {
      selectedMode: 'audio_only',
      selectedScene: 'ember',
      outputPreset: 'social_720p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 28,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      backgroundKind: 'scene',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'music_visualizer',
    label: 'Music Visualizer',
    eyebrow: 'Visualizer draft',
    copy: 'Warm scene and audio-card layout for music snippets. Final audio truth still comes later.',
    patch: {
      selectedMode: 'audio_only',
      selectedScene: 'ember',
      outputPreset: 'social_720p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 28,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      backgroundKind: 'scene',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'course_lesson',
    label: 'Course Lesson',
    eyebrow: 'Lesson mode',
    copy: 'Crisp screen-and-camera layout for lessons, walkthroughs, and technical explainers.',
    patch: {
      selectedMode: 'screen_pip',
      selectedScene: 'paper',
      outputPreset: 'desktop_1080p',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'top-right',
      pipSize: 22,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
  {
    value: 'vertical_short',
    label: 'Vertical Short',
    eyebrow: 'Phone-first',
    copy: 'Vertical canvas for short-form social clips without borrowing brand names or fake publish claims.',
    patch: {
      selectedMode: 'camera',
      selectedScene: 'midnight',
      outputPreset: 'vertical_720x1280',
      targetFps: 30,
      includeMic: true,
      pipCorner: 'bottom-right',
      pipSize: 28,
      pipStyle: 'regular',
      backgroundRemovalMode: 'off',
      backgroundKind: 'scene',
      personCutoutEnabled: false,
      pipCutoutEnabled: false,
    },
  },
]);

export const MAKE_OUTPUT_PRESETS = Object.freeze([
  {
    value: 'social_720p',
    label: 'Social 720p',
    width: 1280,
    height: 720,
    fps: 30,
    copy: 'Good default for local preview clips and later MP4 staging.',
  },
  {
    value: 'desktop_1080p',
    label: 'Desktop 1080p',
    width: 1920,
    height: 1080,
    fps: 30,
    copy: 'Sharper screen recordings; final upload still goes through the video pipeline.',
  },
  {
    value: 'vertical_720x1280',
    label: 'Vertical 720×1280',
    width: 720,
    height: 1280,
    fps: 30,
    copy: 'Phone-first vertical draft canvas for short clips.',
  },
]);

export const DEFAULT_MAKE_DRAFT = Object.freeze({
  title: '',
  description: '',
  tagsText: '',
  creatorNotes: '',
  scriptText: '',
  teleprompterEnabled: false,
  teleprompterSpeed: 38,
  teleprompterAnchor: 'bottom',
  accessPriceRoc: '0',
  scenePreset: 'studio_demo',
  selectedMode: 'camera',
  selectedScene: 'midnight',
  outputPreset: 'social_720p',
  targetFps: 30,
  includeMic: true,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  pipCorner: 'bottom-right',
  pipSize: 28,
  pipStyle: 'regular',
  backgroundRemovalMode: 'off',
  backgroundKind: 'scene',
  backgroundSolidColor: '#071f14',
  backgroundImageDataUrl: '',
  backgroundImageName: '',
  backgroundVideoName: '',
  personCutoutEnabled: false,
  pipCutoutEnabled: false,
  pipCutoutBackground: false,
  subjectMirror: true,
  subjectScale: 100,
  subjectOffsetX: 0,
  subjectOffsetY: 0,
  subjectBrightness: 100,
  subjectContrast: 100,
  subjectSaturation: 100,
  cutoutFeather: 3,
  cutoutOpacity: 1,
  cutoutMaskPolarity: 'auto',
  cutoutIntervalMs: 105,
});

const MAX_TITLE_CHARS = 90;
const MAX_DESCRIPTION_CHARS = 2000;
const MAX_NOTES_CHARS = 2000;
const MAX_SCRIPT_CHARS = 5000;
const MAX_TAGS = 12;
const MAX_TAG_CHARS = 32;
const MAX_BACKGROUND_DATA_URL_CHARS = 640_000;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;

export function createMakeDraft(overrides = {}) {
  return normalizeMakeDraft({
    ...DEFAULT_MAKE_DRAFT,
    ...overrides,
  });
}

export function readStoredMakeDraft() {
  try {
    const raw =
      localStorage.getItem(MAKE_DRAFT_STORAGE_KEY) ||
      localStorage.getItem('crablink.make.draft.v1');

    if (!raw) {
      return createMakeDraft();
    }

    return createMakeDraft(JSON.parse(raw));
  } catch (_error) {
    return createMakeDraft();
  }
}

export function writeStoredMakeDraft(draft) {
  const normalized = createMakeDraft(draft);

  try {
    localStorage.setItem(MAKE_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
  } catch (_error) {
    // Local draft persistence is convenience only. The page can continue in memory.
  }

  return normalized;
}

export function clearStoredMakeDraft() {
  try {
    localStorage.removeItem(MAKE_DRAFT_STORAGE_KEY);
    localStorage.removeItem('crablink.make.draft.v1');
  } catch (_error) {
    // Ignore optional localStorage cleanup failure.
  }
}

export function writeLatestMakeSessionPlan(plan) {
  const safePlan = stripSessionPlanForStorage(plan);

  try {
    sessionStorage.setItem(MAKE_SESSION_PLAN_STORAGE_KEY, JSON.stringify(safePlan));
  } catch (_error) {
    // Session-plan handoff is optional display metadata only.
  }

  return safePlan;
}

export function normalizeMakeDraft(input = {}) {
  const selectedMode = enumValue(input.selectedMode, MAKE_MODES, DEFAULT_MAKE_DRAFT.selectedMode);
  const selectedScene = enumValue(input.selectedScene, MAKE_SCENES, DEFAULT_MAKE_DRAFT.selectedScene);
  const scenePreset = enumValue(input.scenePreset, MAKE_SCENE_PRESETS, DEFAULT_MAKE_DRAFT.scenePreset);
  const outputPreset = enumValue(input.outputPreset, MAKE_OUTPUT_PRESETS, DEFAULT_MAKE_DRAFT.outputPreset);
  const backgroundKind = enumValue(input.backgroundKind, MAKE_BACKGROUND_KINDS, DEFAULT_MAKE_DRAFT.backgroundKind);
  const preset = findOutputPreset(outputPreset);
  const fps = clampInteger(input.targetFps, 12, 60, preset.fps || 30);
  const backgroundRemovalMode = ['off', 'person_cutout'].includes(input.backgroundRemovalMode)
    ? input.backgroundRemovalMode
    : input.personCutoutEnabled === true
      ? 'person_cutout'
      : DEFAULT_MAKE_DRAFT.backgroundRemovalMode;
  const pipStyle = enumValue(
    input.pipStyle,
    MAKE_PIP_STYLES,
    input.pipCutoutEnabled === true ? 'cutout' : DEFAULT_MAKE_DRAFT.pipStyle,
  );

  return {
    title: clampText(input.title, MAX_TITLE_CHARS),
    description: clampText(input.description, MAX_DESCRIPTION_CHARS),
    tagsText: normalizeTags(input.tagsText || input.tags || '').join(', '),
    creatorNotes: clampText(input.creatorNotes, MAX_NOTES_CHARS),
    scriptText: clampText(input.scriptText, MAX_SCRIPT_CHARS),
    teleprompterEnabled: input.teleprompterEnabled === true,
    teleprompterSpeed: clampInteger(input.teleprompterSpeed, 10, 90, DEFAULT_MAKE_DRAFT.teleprompterSpeed),
    teleprompterAnchor: ['top', 'bottom'].includes(input.teleprompterAnchor)
      ? input.teleprompterAnchor
      : DEFAULT_MAKE_DRAFT.teleprompterAnchor,
    accessPriceRoc: normalizeRocText(input.accessPriceRoc),
    scenePreset,
    selectedMode,
    selectedScene,
    outputPreset,
    targetFps: fps,
    includeMic: input.includeMic !== false,
    echoCancellation: input.echoCancellation !== false,
    noiseSuppression: input.noiseSuppression !== false,
    autoGainControl: input.autoGainControl !== false,
    pipCorner: ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(input.pipCorner)
      ? input.pipCorner
      : DEFAULT_MAKE_DRAFT.pipCorner,
    pipSize: clampInteger(input.pipSize, 18, 46, DEFAULT_MAKE_DRAFT.pipSize),
    pipStyle,
    backgroundRemovalMode,
    backgroundKind,
    backgroundSolidColor: normalizeHexColor(input.backgroundSolidColor, DEFAULT_MAKE_DRAFT.backgroundSolidColor),
    backgroundImageDataUrl: normalizeBackgroundImageDataUrl(input.backgroundImageDataUrl),
    backgroundImageName: clampText(input.backgroundImageName, 120),
    backgroundVideoName: clampText(input.backgroundVideoName, 120),
    personCutoutEnabled: backgroundRemovalMode === 'person_cutout' || input.personCutoutEnabled === true,
    pipCutoutEnabled: pipStyle === 'cutout',
    pipCutoutBackground: pipStyle === 'cutout' && input.pipCutoutBackground === true,
    subjectMirror: input.subjectMirror !== false,
    subjectScale: clampInteger(input.subjectScale, 60, 180, DEFAULT_MAKE_DRAFT.subjectScale),
    subjectOffsetX: clampInteger(input.subjectOffsetX, -100, 100, DEFAULT_MAKE_DRAFT.subjectOffsetX),
    subjectOffsetY: clampInteger(input.subjectOffsetY, -100, 100, DEFAULT_MAKE_DRAFT.subjectOffsetY),
    subjectBrightness: clampInteger(input.subjectBrightness, 40, 180, DEFAULT_MAKE_DRAFT.subjectBrightness),
    subjectContrast: clampInteger(input.subjectContrast, 40, 200, DEFAULT_MAKE_DRAFT.subjectContrast),
    subjectSaturation: clampInteger(input.subjectSaturation, 0, 220, DEFAULT_MAKE_DRAFT.subjectSaturation),
    cutoutFeather: clampInteger(input.cutoutFeather, 0, 16, DEFAULT_MAKE_DRAFT.cutoutFeather),
    cutoutOpacity: clampFloat(input.cutoutOpacity, 0.2, 1, DEFAULT_MAKE_DRAFT.cutoutOpacity),
    cutoutMaskPolarity: enumValue(input.cutoutMaskPolarity, MAKE_CUTOUT_POLARITIES, DEFAULT_MAKE_DRAFT.cutoutMaskPolarity),
    cutoutIntervalMs: clampInteger(input.cutoutIntervalMs, 70, 500, DEFAULT_MAKE_DRAFT.cutoutIntervalMs),
  };
}

export function normalizeTags(value) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '');

  return raw
    .split(/[#,]/)
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
    .map((tag) => tag.replace(/[^a-z0-9_.-]/g, '').slice(0, MAX_TAG_CHARS))
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, MAX_TAGS);
}

export function findMakeMode(value) {
  return MAKE_MODES.find((mode) => mode.value === value) || MAKE_MODES[0];
}

export function findOutputPreset(value) {
  return MAKE_OUTPUT_PRESETS.find((preset) => preset.value === value) || MAKE_OUTPUT_PRESETS[0];
}

export function findMakeScene(value) {
  return MAKE_SCENES.find((scene) => scene.value === value) || MAKE_SCENES[0];
}

export function findMakeScenePreset(value) {
  return MAKE_SCENE_PRESETS.find((preset) => preset.value === value) || MAKE_SCENE_PRESETS[0];
}

export function findMakeBackgroundKind(value) {
  return MAKE_BACKGROUND_KINDS.find((kind) => kind.value === value) || MAKE_BACKGROUND_KINDS[0];
}

export function applyMakePreset(draft, presetValue) {
  const preset = findMakeScenePreset(presetValue);

  return createMakeDraft({
    ...draft,
    ...preset.patch,
    scenePreset: preset.value,
  });
}

export function deriveMakeReadiness({ draft, clips = [], inputStatus = 'idle', recorderStatus = 'idle' } = {}) {
  const safeDraft = createMakeDraft(draft);
  const mode = findMakeMode(safeDraft.selectedMode);
  const preset = findOutputPreset(safeDraft.outputPreset);
  const hasTitle = Boolean(safeDraft.title.trim());
  const hasClips = clips.length > 0;
  const inputReady = inputStatus === 'ready';
  const recorderSupported = typeof window !== 'undefined' && typeof window.MediaRecorder === 'function';
  const cutoutWanted =
    safeDraft.selectedMode === 'camera_background' ||
    safeDraft.backgroundRemovalMode === 'person_cutout' ||
    safeDraft.pipStyle === 'cutout';

  return {
    summary: hasTitle && hasClips ? 'ready_to_export_draft' : 'drafting',
    cards: [
      {
        key: 'title',
        label: 'Title',
        value: hasTitle ? 'set' : 'missing',
        tone: hasTitle ? 'success' : 'warning',
        help: hasTitle ? safeDraft.title : 'Add a short title before export.',
      },
      {
        key: 'input',
        label: 'Preview input',
        value: inputReady ? 'ready' : inputStatus,
        tone: inputReady ? 'success' : 'info',
        help: `${mode.label} mode`,
      },
      {
        key: 'cutout',
        label: 'Cutout',
        value: cutoutWanted ? 'local effect' : 'off',
        tone: cutoutWanted ? 'info' : 'neutral',
        help: cutoutWanted
          ? 'Software cutout is local compositor state; it creates no backend truth.'
          : 'Background replacement is optional.',
      },
      {
        key: 'recorder',
        label: 'Recorder',
        value: recorderSupported ? recorderStatus : 'unsupported',
        tone: recorderSupported ? (recorderStatus === 'recording' ? 'warning' : 'info') : 'danger',
        help: recorderSupported ? 'Browser MediaRecorder path.' : 'This WebView does not expose MediaRecorder.',
      },
      {
        key: 'clips',
        label: 'Clips',
        value: String(clips.length),
        tone: hasClips ? 'success' : 'neutral',
        help: hasClips ? 'Local blobs only; not minted yet.' : 'Record at least one clip.',
      },
      {
        key: 'preset',
        label: 'Canvas',
        value: `${preset.width}×${preset.height}`,
        tone: 'neutral',
        help: `${safeDraft.targetFps}fps preview recorder`,
      },
      {
        key: 'prompter',
        label: 'Prompt',
        value: safeDraft.teleprompterEnabled ? (safeDraft.scriptText.trim() ? 'ready' : 'empty') : 'off',
        tone: safeDraft.teleprompterEnabled ? (safeDraft.scriptText.trim() ? 'success' : 'warning') : 'neutral',
        help: safeDraft.teleprompterEnabled
          ? 'Preview-only overlay; not recorded into the canvas.'
          : 'Optional local teleprompter.',
      },
    ],
  };
}

export function buildMakeSessionPlan({ draft, clips = [], inputStatus = 'idle', recorderStatus = 'idle' } = {}) {
  const safeDraft = createMakeDraft(draft);
  const mode = findMakeMode(safeDraft.selectedMode);
  const scene = findMakeScene(safeDraft.selectedScene);
  const preset = findOutputPreset(safeDraft.outputPreset);
  const scenePreset = findMakeScenePreset(safeDraft.scenePreset);
  const backgroundKind = findMakeBackgroundKind(safeDraft.backgroundKind);
  const tags = normalizeTags(safeDraft.tagsText);

  return stripSessionPlanForStorage({
    schema: 'crablink.make.session-plan.v2',
    generatedAt: new Date().toISOString(),
    route: 'crab://make',
    targetRoute: 'crab://video',
    status: {
      input: inputStatus,
      recorder: recorderStatus,
      clipCount: clips.length,
    },
    draft: {
      title: safeDraft.title,
      description: safeDraft.description,
      tags,
      creatorNotes: safeDraft.creatorNotes,
      scriptCharacters: safeDraft.scriptText.length,
      accessPriceRoc: safeDraft.accessPriceRoc,
    },
    studio: {
      scenePreset: scenePreset.value,
      scenePresetLabel: scenePreset.label,
      mode: mode.value,
      modeLabel: mode.label,
      scene: scene.value,
      sceneLabel: scene.label,
      outputPreset: preset.value,
      width: preset.width,
      height: preset.height,
      targetFps: safeDraft.targetFps,
      includeMic: safeDraft.includeMic,
      teleprompter: {
        enabled: safeDraft.teleprompterEnabled,
        anchor: safeDraft.teleprompterAnchor,
        speed: safeDraft.teleprompterSpeed,
        scriptCharacters: safeDraft.scriptText.length,
        recordedIntoCanvas: false,
      },
      pipCorner: safeDraft.pipCorner,
      pipSizePercent: safeDraft.pipSize,
      pipStyle: safeDraft.pipStyle,
      cutout: {
        backgroundRemovalMode: safeDraft.backgroundRemovalMode,
        personCutoutEnabled: safeDraft.personCutoutEnabled,
        pipCutoutEnabled: safeDraft.pipCutoutEnabled,
        pipCutoutBackground: safeDraft.pipCutoutBackground,
        cutoutFeather: safeDraft.cutoutFeather,
        cutoutMaskPolarity: safeDraft.cutoutMaskPolarity,
        subjectMirror: safeDraft.subjectMirror,
        subjectBrightness: safeDraft.subjectBrightness,
        subjectContrast: safeDraft.subjectContrast,
        subjectSaturation: safeDraft.subjectSaturation,
      },
      background: {
        kind: backgroundKind.value,
        label: backgroundKind.label,
        solidColor: safeDraft.backgroundSolidColor,
        imageName: safeDraft.backgroundImageName,
        imageDataUrlPersisted: Boolean(safeDraft.backgroundImageDataUrl),
        videoName: safeDraft.backgroundVideoName,
        videoBytesPersisted: false,
      },
    },
    clips: clips.map((clip, index) => ({
      index,
      id: clip.id,
      name: clip.name,
      mimeType: clip.mimeType,
      sizeBytes: clip.sizeBytes,
      durationMs: clip.durationMs,
      createdAt: clip.createdAt,
      localOnly: true,
    })),
    handoff: {
      copy:
        'Make creates local preview clips and a session plan. Final MP4 conversion, rendition generation, paid prepare/confirm/upload, backend receipt, and crab://<b3>.video truth still belong to the existing video pipeline.',
      nextManualStep:
        'Download/export the local clip, then open crab://video and run the existing Rust/FFmpeg prepare + mint flow.',
    },
    truthBoundary:
      'This is local creator workspace metadata. It is not a CID, receipt, wallet balance, paid entitlement, ownership proof, or published video manifest.',
  });
}

export function selectRecorderMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder !== 'function') {
    return '';
  }

  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ];

  return candidates.find((candidate) => window.MediaRecorder.isTypeSupported(candidate)) || '';
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / (1024 ** index);

  return `${scaled >= 10 || index === 0 ? scaled.toFixed(0) : scaled.toFixed(1)} ${units[index]}`;
}

export function formatDurationMs(ms) {
  const totalSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function stripSessionPlanForStorage(plan) {
  return JSON.parse(JSON.stringify(plan || {}));
}

function enumValue(value, options, fallback) {
  return options.some((option) => option.value === value) ? value : fallback;
}

function clampText(value, maxChars) {
  return String(value || '').slice(0, maxChars);
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function clampFloat(value, min, max, fallback) {
  const parsed = Number.parseFloat(String(value));

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function normalizeHexColor(value, fallback) {
  const raw = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function normalizeBackgroundImageDataUrl(value) {
  const raw = String(value || '');

  if (!raw || raw.length > MAX_BACKGROUND_DATA_URL_CHARS || !IMAGE_DATA_URL_PATTERN.test(raw)) {
    return '';
  }

  return raw;
}

function normalizeRocText(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '0';
  }

  const parsed = Number.parseInt(raw.replace(/[^0-9]/g, ''), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return '0';
  }

  return String(parsed);
}