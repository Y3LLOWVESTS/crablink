/**
 * RO:WHAT — Route-owned canvas compositor for crab://make preview and local recording.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; ports the proven local person cutout path into Make without stream backend coupling.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, makePersonSegmentation.js, browser canvas/video APIs.
 * RO:INVARIANTS — local visual compositor only; no b3, receipt, wallet, entitlement, ownership, or backend publish truth.
 * RO:METRICS — local status object only; no telemetry leaves the client.
 * RO:CONFIG — reads local Make draft scene/cutout/background/framing settings only.
 * RO:SECURITY — no arbitrary code, no local path exposure beyond object URLs controlled by MakePage, no secrets/capabilities.
 * RO:TEST — npm run build; manual camera cutout with solid/image/video background and screen+PiP smoke.
 */

import {
  clearMakePersonSegmentationMask,
  getMakePersonSegmentationStatus,
  requestMakePersonSegmentationMask,
} from './makePersonSegmentation.js';

const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;

const imageCache = new Map();

let subjectCanvas = null;
let maskCanvas = null;
let maskFitCanvas = null;
let pipCanvas = null;
let lastStatus = {
  ready: false,
  mode: 'idle',
  cutout: getMakePersonSegmentationStatus(),
  reason: 'not_started',
};

export function clearMakeCompositorState() {
  clearMakePersonSegmentationMask();
  imageCache.clear();
  lastStatus = {
    ready: false,
    mode: 'idle',
    cutout: getMakePersonSegmentationStatus(),
    reason: 'cleared',
  };
}

export function getMakeCompositorStatus() {
  return {
    ...lastStatus,
    cutout: getMakePersonSegmentationStatus(),
  };
}

export function drawMakeFrame({
  canvas,
  cameraVideo,
  screenVideo,
  backgroundVideo = null,
  backgroundImageUrl = '',
  draft = {},
  inputState = {},
  outputPreset = {},
} = {}) {
  if (!canvas) {
    return setLastStatus({
      ready: false,
      mode: 'missing_canvas',
      reason: 'missing_canvas',
    });
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return setLastStatus({
      ready: false,
      mode: 'missing_context',
      reason: 'missing_canvas_context',
    });
  }

  const width = clampInteger(outputPreset.width || draft.studioOutputWidth, DEFAULT_CANVAS_WIDTH, 240, 3840);
  const height = clampInteger(outputPreset.height || draft.studioOutputHeight, DEFAULT_CANVAS_HEIGHT, 240, 2160);
  ensureCanvasSize(canvas, width, height);

  const mode = describeMakeCompositorMode(draft, inputState);
  const cameraReady = isVideoReady(cameraVideo);
  const screenReady = isVideoReady(screenVideo);
  const backgroundVideoReady = isVideoReady(backgroundVideo);

  context.clearRect(0, 0, width, height);

  if (mode.id === 'audio_card') {
    drawActiveBackground(context, width, height, draft, backgroundVideo, backgroundVideoReady, backgroundImageUrl);
    drawAudioCard(context, width, height, draft);
    drawMakeBadges(context, width, height, draft, mode, null);
    canvas.dataset.captureReady = 'true';
    return setLastStatus({
      ready: true,
      mode: mode.id,
      reason: 'audio_card',
    });
  }

  if (mode.screenWanted) {
    drawActiveBackground(context, width, height, draft, backgroundVideo, backgroundVideoReady, backgroundImageUrl);

    if (screenReady) {
      drawFramedMedia(context, screenVideo, width, height, draft, {
        fit: 'contain',
        mirror: false,
        filter: false,
      });
    } else {
      drawIdleSlate(context, width, height, 'Choose a screen to start preview');
    }

    if (mode.pipWanted) {
      drawPipCamera(context, width, height, cameraVideo, cameraReady, draft);
    }

    drawMakeBadges(context, width, height, draft, mode, null);
    canvas.dataset.captureReady = screenReady ? 'true' : 'false';

    return setLastStatus({
      ready: screenReady,
      mode: mode.id,
      reason: screenReady ? 'ready' : 'screen_not_ready',
    });
  }

  if (!cameraReady && mode.cameraWanted) {
    drawActiveBackground(context, width, height, draft, backgroundVideo, backgroundVideoReady, backgroundImageUrl);
    drawIdleSlate(context, width, height, 'Start camera preview');
    drawMakeBadges(context, width, height, draft, mode, null);
    canvas.dataset.captureReady = 'false';

    return setLastStatus({
      ready: false,
      mode: mode.id,
      reason: 'camera_not_ready',
    });
  }

  drawActiveBackground(context, width, height, draft, backgroundVideo, backgroundVideoReady, backgroundImageUrl);

  let cutoutStatus = null;

  if (mode.cutoutWanted) {
    cutoutStatus = drawPersonCutout(context, cameraVideo, width, height, draft, {
      transparentBackground: false,
    });

    if (cutoutStatus !== 'ready') {
      drawFramedMedia(context, cameraVideo, width, height, draft, {
        fit: 'cover',
        mirror: draft.subjectMirror !== false,
        filter: true,
        transformSubject: true,
      });
    }
  } else if (cameraReady) {
    drawFramedMedia(context, cameraVideo, width, height, draft, {
      fit: 'cover',
      mirror: draft.subjectMirror !== false,
      filter: true,
      transformSubject: true,
    });
  }

  drawMakeBadges(context, width, height, draft, mode, cutoutStatus);
  canvas.dataset.captureReady = cameraReady ? 'true' : 'false';

  return setLastStatus({
    ready: cameraReady,
    mode: mode.id,
    reason: cameraReady ? 'ready' : 'camera_not_ready',
    cutout: getMakePersonSegmentationStatus(),
    cutoutStatus,
  });
}

export function describeMakeCompositorMode(draft = {}, inputState = {}) {
  const selectedMode = cleanString(draft.selectedMode || inputState.mode);
  const backgroundRemovalMode = cleanString(draft.backgroundRemovalMode);
  const cutoutWanted =
    backgroundRemovalMode === 'person_cutout' ||
    draft.personCutoutEnabled === true ||
    selectedMode === 'camera_background';
  const pipStyle = resolvePipStyle(draft);
  const pipCutoutWanted = selectedMode === 'screen_pip' && pipStyle === 'cutout';

  if (selectedMode === 'audio_only') {
    return {
      id: 'audio_card',
      label: 'Audio card',
      cameraWanted: false,
      screenWanted: false,
      pipWanted: false,
      cutoutWanted: false,
    };
  }

  if (selectedMode === 'screen' || selectedMode === 'screen_pip') {
    return {
      id: selectedMode === 'screen_pip' ? 'screen_pip' : 'screen',
      label: selectedMode === 'screen_pip' ? 'Screen + PiP' : 'Screen',
      cameraWanted: selectedMode === 'screen_pip',
      screenWanted: true,
      pipWanted: selectedMode === 'screen_pip',
      pipStyle,
      cutoutWanted: pipCutoutWanted,
    };
  }

  if (cutoutWanted) {
    return {
      id: 'person_cutout',
      label: 'Person cutout',
      cameraWanted: true,
      screenWanted: false,
      pipWanted: false,
      cutoutWanted: true,
    };
  }

  return {
    id: 'camera',
    label: 'Camera',
    cameraWanted: true,
    screenWanted: false,
    pipWanted: false,
    cutoutWanted: false,
  };
}

function setLastStatus(next) {
  lastStatus = {
    ...lastStatus,
    ...next,
    cutout: next.cutout || getMakePersonSegmentationStatus(),
  };

  return lastStatus;
}

function drawActiveBackground(context, width, height, draft, backgroundVideo, backgroundVideoReady, backgroundImageUrl = '') {
  const kind = cleanString(draft.backgroundKind || 'scene');

  if (kind === 'solid') {
    context.fillStyle = validHexColor(draft.backgroundSolidColor) || '#111111';
    context.fillRect(0, 0, width, height);
    return;
  }

  const imageSource = backgroundImageUrl || draft.backgroundImageDataUrl;

  if (kind === 'image' && imageSource) {
    const image = getCachedImage(imageSource);

    if (image?.complete && image.naturalWidth > 0) {
      drawCoverMedia(context, image, 0, 0, width, height);
      return;
    }

    drawSceneGradient(context, width, height, draft.selectedScene);
    drawGlassLabel(context, 'Loading background image', 24, height - 34);
    return;
  }

  if (kind === 'video') {
    if (backgroundVideoReady) {
      drawCoverMedia(context, backgroundVideo, 0, 0, width, height);
      return;
    }

    context.fillStyle = validHexColor(draft.backgroundSolidColor) || '#111111';
    context.fillRect(0, 0, width, height);
    drawGlassLabel(context, draft.backgroundVideoName ? 'Loading background video' : 'Choose a background video', 24, height - 34);
    return;
  }

  drawSceneGradient(context, width, height, draft.selectedScene);
}

function drawSceneGradient(context, width, height, selectedScene) {
  const scene = cleanString(selectedScene);
  const gradient = context.createLinearGradient(0, 0, width, height);

  if (scene === 'ocean') {
    gradient.addColorStop(0, '#042f2e');
    gradient.addColorStop(0.5, '#075985');
    gradient.addColorStop(1, '#312e81');
  } else if (scene === 'ember') {
    gradient.addColorStop(0, '#431407');
    gradient.addColorStop(0.48, '#7c2d12');
    gradient.addColorStop(1, '#4c1d95');
  } else if (scene === 'paper') {
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.52, '#e2e8f0');
    gradient.addColorStop(1, '#cbd5e1');
  } else {
    gradient.addColorStop(0, '#020617');
    gradient.addColorStop(0.48, '#0f172a');
    gradient.addColorStop(1, '#134e4a');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = scene === 'paper' ? 0.18 : 0.24;
  context.fillStyle = scene === 'paper' ? '#0f172a' : '#ffffff';
  context.beginPath();
  context.arc(width * 0.18, height * 0.18, Math.min(width, height) * 0.34, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(width * 0.88, height * 0.12, Math.min(width, height) * 0.26, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawPersonCutout(context, video, width, height, draft, options = {}) {
  const segmentation = requestMakePersonSegmentationMask({
    source: video,
    enabled: true,
    minIntervalMs: clampInteger(draft.cutoutIntervalMs, 105, 70, 500),
  });
  const mask = segmentation.mask;

  if (!mask?.data?.length || !mask.width || !mask.height) {
    return segmentation.status || 'loading';
  }

  const subject = getSubjectCanvas();
  const subjectContext = subject.getContext('2d', { willReadFrequently: true });
  const rawMask = getMaskCanvas();
  const rawMaskContext = rawMask.getContext('2d', { willReadFrequently: true });
  const fittedMask = getMaskFitCanvas();
  const fittedMaskContext = fittedMask.getContext('2d', { willReadFrequently: true });

  if (!subjectContext || !rawMaskContext || !fittedMaskContext) {
    return 'canvas_unavailable';
  }

  subject.width = Math.max(1, width);
  subject.height = Math.max(1, height);
  rawMask.width = Math.max(1, mask.width);
  rawMask.height = Math.max(1, mask.height);
  fittedMask.width = subject.width;
  fittedMask.height = subject.height;

  subjectContext.clearRect(0, 0, subject.width, subject.height);
  drawFramedMedia(subjectContext, video, subject.width, subject.height, draft, {
    fit: 'cover',
    mirror: draft.subjectMirror !== false,
    filter: true,
    transformSubject: true,
  });

  const maskImage = rawMaskContext.createImageData(mask.width, mask.height);
  const personValue = clampInteger(mask.personValue ?? mask.personIndex, 1, 0, 255);
  const polarity = cleanString(draft.cutoutMaskPolarity || 'auto');
  const shouldFlip = polarity === 'flip' || polarity === 'keep_background';
  const opacity = clampFloat(draft.cutoutOpacity, 1, 0.2, 1);
  const alpha = Math.round(255 * opacity);

  for (let index = 0; index < mask.data.length; index += 1) {
    const out = index * 4;
    const value = mask.data[index];
    const isPerson = value === personValue;
    const keep = shouldFlip ? !isPerson : isPerson;

    maskImage.data[out] = 255;
    maskImage.data[out + 1] = 255;
    maskImage.data[out + 2] = 255;
    maskImage.data[out + 3] = keep ? alpha : 0;
  }

  rawMaskContext.putImageData(maskImage, 0, 0);

  fittedMaskContext.clearRect(0, 0, fittedMask.width, fittedMask.height);
  drawFramedMedia(fittedMaskContext, rawMask, fittedMask.width, fittedMask.height, draft, {
    fit: 'cover',
    mirror: draft.subjectMirror !== false,
    filter: false,
    transformSubject: true,
  });

  subjectContext.save();
  subjectContext.globalCompositeOperation = 'destination-in';
  subjectContext.filter = `blur(${clampInteger(draft.cutoutFeather, 3, 0, 16)}px)`;
  subjectContext.drawImage(fittedMask, 0, 0, subject.width, subject.height);
  subjectContext.restore();
  subjectContext.filter = 'none';

  context.save();

  if (options.transparentBackground) {
    context.globalAlpha = 1;
  } else {
    context.shadowColor = 'rgba(0, 0, 0, 0.30)';
    context.shadowBlur = 22;
  }

  context.drawImage(subject, 0, 0, width, height);
  context.restore();

  return 'ready';
}

function drawPipCamera(context, width, height, cameraVideo, cameraReady, draft) {
  const rect = pipRect(width, height, draft.pipCorner, draft.pipSize);
  const pipStyle = resolvePipStyle(draft);

  if (!cameraReady) {
    drawRegularPipCamera(context, rect, cameraVideo, draft, {
      label: 'Camera PiP waiting',
      muted: true,
    });
    return;
  }

  if (pipStyle === 'cutout') {
    drawCutoutPipCamera(context, rect, cameraVideo, draft);
    return;
  }

  drawRegularPipCamera(context, rect, cameraVideo, draft, {
    label: 'Regular PiP',
  });
}

function drawRegularPipCamera(context, rect, cameraVideo, draft, options = {}) {
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  context.fillStyle = options.muted ? 'rgba(15, 23, 42, 0.92)' : 'rgba(2, 6, 23, 0.82)';
  roundRect(context, rect.x - 8, rect.y - 8, rect.width + 16, rect.height + 16, 26);
  context.fill();
  context.restore();

  context.save();
  roundRect(context, rect.x, rect.y, rect.width, rect.height, 20);
  context.clip();

  if (isVideoReady(cameraVideo)) {
    drawFramedMedia(context, cameraVideo, rect.width, rect.height, draft, {
      fit: 'cover',
      mirror: draft.subjectMirror !== false,
      filter: true,
      offsetX: rect.x,
      offsetY: rect.y,
      transformSubject: false,
    });
  } else {
    context.fillStyle = 'rgba(15, 23, 42, 0.92)';
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  context.restore();

  context.save();
  context.strokeStyle = 'rgba(255, 255, 255, 0.26)';
  context.lineWidth = 2;
  roundRect(context, rect.x, rect.y, rect.width, rect.height, 20);
  context.stroke();

  if (options.label) {
    drawGlassLabel(context, options.label, rect.x + 14, rect.y + rect.height - 18);
  }

  context.restore();
}

function drawCutoutPipCamera(context, rect, cameraVideo, draft) {
  const pip = getPipCanvas();
  const pipContext = pip.getContext('2d', { willReadFrequently: true });

  if (!pipContext) {
    drawRegularPipCamera(context, rect, cameraVideo, draft, {
      label: 'Cutout unavailable',
    });
    return;
  }

  pip.width = Math.max(1, Math.floor(rect.width));
  pip.height = Math.max(1, Math.floor(rect.height));
  pipContext.clearRect(0, 0, pip.width, pip.height);

  if (draft.pipCutoutBackground === true) {
    pipContext.save();
    pipContext.fillStyle = 'rgba(2, 6, 23, 0.62)';
    roundRect(pipContext, 0, 0, pip.width, pip.height, 24);
    pipContext.fill();
    pipContext.clip();
    drawActiveBackground(pipContext, pip.width, pip.height, draft, null, false);
    pipContext.restore();
  }

  const status = drawPersonCutout(pipContext, cameraVideo, pip.width, pip.height, draft, {
    transparentBackground: true,
  });

  if (status !== 'ready') {
    drawRegularPipCamera(context, rect, cameraVideo, draft, {
      label: `Cutout ${status || 'loading'}`,
    });
    return;
  }

  if (draft.pipCutoutBackground === true) {
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.36)';
    context.shadowBlur = 22;
    context.shadowOffsetY = 10;
    roundRect(context, rect.x - 8, rect.y - 8, rect.width + 16, rect.height + 16, 26);
    context.fillStyle = 'rgba(2, 6, 23, 0.34)';
    context.fill();
    context.restore();
  }

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.42)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 10;
  context.drawImage(pip, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  context.save();
  context.font = `800 ${Math.max(11, Math.floor(rect.width * 0.045))}px Inter, ui-sans-serif, system-ui`;
  context.fillStyle = 'rgba(255, 255, 255, 0.88)';
  context.textAlign = 'right';
  context.fillText('Cutout PiP', rect.x + rect.width - 10, rect.y + rect.height - 12);
  context.restore();
}

function drawAudioCard(context, width, height, draft) {
  const title = cleanString(draft.title) || 'Untitled CrabLink clip';
  const description = cleanString(draft.description) || 'Local audio-first recording. Not minted yet.';

  context.save();
  context.textAlign = 'center';
  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  context.font = `700 ${Math.max(30, Math.floor(width * 0.055))}px Inter, ui-sans-serif, system-ui`;
  context.fillText(title.slice(0, 72), width / 2, height * 0.44);

  context.font = `500 ${Math.max(16, Math.floor(width * 0.022))}px Inter, ui-sans-serif, system-ui`;
  context.fillStyle = 'rgba(226, 232, 240, 0.82)';
  context.fillText(description.slice(0, 96), width / 2, height * 0.51);

  for (let index = 0; index < 36; index += 1) {
    const barWidth = width * 0.006;
    const gap = width * 0.006;
    const x = width * 0.5 - 18 * (barWidth + gap) + index * (barWidth + gap);
    const h = height * (0.035 + ((index * 17) % 23) / 260);
    context.fillStyle = `rgba(20, 184, 166, ${0.35 + ((index % 5) * 0.09)})`;
    roundRect(context, x, height * 0.62 - h / 2, barWidth, h, barWidth / 2);
    context.fill();
  }

  context.restore();
}

function drawIdleSlate(context, width, height, text) {
  context.save();
  context.fillStyle = 'rgba(2, 6, 23, 0.45)';
  context.fillRect(0, 0, width, height);
  context.textAlign = 'center';
  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  context.font = `700 ${Math.max(18, Math.floor(width * 0.026))}px Inter, ui-sans-serif, system-ui`;
  context.fillText(text, width / 2, height / 2);
  context.font = `500 ${Math.max(13, Math.floor(width * 0.015))}px Inter, ui-sans-serif, system-ui`;
  context.fillStyle = 'rgba(226, 232, 240, 0.72)';
  context.fillText('Local preview only — no backend upload or receipt is created here.', width / 2, height / 2 + 34);
  context.restore();
}

function drawMakeBadges(context, width, height, draft, mode, cutoutStatus) {
  // Keep the recording canvas clean by default.
  // These labels are useful as UI/status chrome, but drawing them here bakes them
  // into exported videos. Only draw them if a future explicit debug/export overlay
  // flag is turned on.
  if (draft?.showCanvasDebugBadges !== true) {
    return;
  }

  const labels = [
    mode.label,
    mode.pipWanted ? `${mode.pipStyle === 'cutout' ? 'cutout' : 'regular'} PiP` : null,
    draft.backgroundKind === 'video' ? 'video background' : draft.backgroundKind === 'image' ? 'image background' : null,
    mode.cutoutWanted ? `cutout ${cutoutStatus || 'loading'}` : null,
  ].filter(Boolean);

  context.save();

  let x = 18;
  const y = 18;

  for (const label of labels) {
    context.font = `700 ${Math.max(12, Math.floor(width * 0.012))}px Inter, ui-sans-serif, system-ui`;
    const text = String(label).slice(0, 38);
    const metrics = context.measureText(text);
    const chipWidth = metrics.width + 26;

    context.fillStyle = 'rgba(2, 6, 23, 0.62)';
    roundRect(context, x, y, chipWidth, 30, 15);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillText(text, x + 13, y + 20);
    x += chipWidth + 8;
  }

  context.restore();
}

function drawFramedMedia(context, media, targetWidth, targetHeight, draft, options = {}) {
  if (!media) {
    return;
  }

  const sourceWidth = Number(media.videoWidth || media.naturalWidth || media.width || 0);
  const sourceHeight = Number(media.videoHeight || media.naturalHeight || media.height || 0);

  if (!sourceWidth || !sourceHeight) {
    return;
  }

  const fit = options.fit || 'cover';
  const baseRect = fit === 'contain'
    ? containRect(sourceWidth, sourceHeight, targetWidth, targetHeight)
    : coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight);
  const rect = options.transformSubject
    ? applySubjectTransform(baseRect, targetWidth, targetHeight, draft)
    : baseRect;

  const offsetX = Number(options.offsetX || 0);
  const offsetY = Number(options.offsetY || 0);

  context.save();

  if (options.filter) {
    context.filter = [
      `brightness(${clampInteger(draft.subjectBrightness, 100, 40, 180)}%)`,
      `contrast(${clampInteger(draft.subjectContrast, 100, 40, 200)}%)`,
      `saturate(${clampInteger(draft.subjectSaturation, 100, 0, 220)}%)`,
    ].join(' ');
  }

  if (options.mirror) {
    context.translate(offsetX + targetWidth, offsetY);
    context.scale(-1, 1);
    context.drawImage(media, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh);
  } else {
    context.drawImage(
      media,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      offsetX + rect.dx,
      offsetY + rect.dy,
      rect.dw,
      rect.dh,
    );
  }

  context.restore();
}

function applySubjectTransform(rect, targetWidth, targetHeight, draft) {
  const scale = clampFloat(draft.subjectScale, 100, 60, 180) / 100;
  const offsetX = (clampFloat(draft.subjectOffsetX, 0, -100, 100) / 100) * targetWidth * 0.34;
  const offsetY = (clampFloat(draft.subjectOffsetY, 0, -100, 100) / 100) * targetHeight * 0.34;
  const dw = rect.dw * scale;
  const dh = rect.dh * scale;

  return {
    ...rect,
    dx: rect.dx + (rect.dw - dw) / 2 + offsetX,
    dy: rect.dy + (rect.dh - dh) / 2 + offsetY,
    dw,
    dh,
  };
}

function drawCoverMedia(context, media, x, y, width, height) {
  const sourceWidth = Number(media.videoWidth || media.naturalWidth || media.width || 0);
  const sourceHeight = Number(media.videoHeight || media.naturalHeight || media.height || 0);

  if (!sourceWidth || !sourceHeight) {
    return;
  }

  const rect = coverRect(sourceWidth, sourceHeight, width, height);
  context.drawImage(media, rect.sx, rect.sy, rect.sw, rect.sh, x, y, width, height);
}

function getCachedImage(dataUrl) {
  if (!dataUrl) {
    return null;
  }

  const cached = imageCache.get(dataUrl);

  if (cached) {
    return cached;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = dataUrl;
  imageCache.set(dataUrl, image);
  return image;
}

function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (sourceRatio > targetRatio) {
    const sw = sourceHeight * targetRatio;
    return {
      sx: (sourceWidth - sw) / 2,
      sy: 0,
      sw,
      sh: sourceHeight,
      dx: 0,
      dy: 0,
      dw: targetWidth,
      dh: targetHeight,
    };
  }

  const sh = sourceWidth / targetRatio;

  return {
    sx: 0,
    sy: (sourceHeight - sh) / 2,
    sw: sourceWidth,
    sh,
    dx: 0,
    dy: 0,
    dw: targetWidth,
    dh: targetHeight,
  };
}

function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;

  return {
    sx: 0,
    sy: 0,
    sw: sourceWidth,
    sh: sourceHeight,
    dx: (targetWidth - dw) / 2,
    dy: (targetHeight - dh) / 2,
    dw,
    dh,
  };
}

function pipRect(width, height, corner, sizePercent) {
  const size = clampInteger(sizePercent, 28, 18, 46) / 100;
  const pipWidth = Math.max(180, width * size);
  const pipHeight = pipWidth * 9 / 16;
  const margin = Math.max(18, width * 0.022);
  const safeCorner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(corner)
    ? corner
    : 'bottom-right';

  return {
    x: safeCorner.endsWith('right') ? width - pipWidth - margin : margin,
    y: safeCorner.startsWith('bottom') ? height - pipHeight - margin : margin,
    width: pipWidth,
    height: pipHeight,
  };
}

function drawGlassLabel(context, text, x, y) {
  const copy = String(text || '').slice(0, 72);
  context.save();
  context.font = '700 14px Inter, ui-sans-serif, system-ui';
  const width = context.measureText(copy).width + 24;
  context.fillStyle = 'rgba(2, 6, 23, 0.62)';
  roundRect(context, x, y - 21, width, 30, 15);
  context.fill();
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.fillText(copy, x + 12, y);
  context.restore();
}

function ensureCanvasSize(canvas, width, height) {
  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }
}

function getSubjectCanvas() {
  subjectCanvas ||= document.createElement('canvas');
  return subjectCanvas;
}

function getMaskCanvas() {
  maskCanvas ||= document.createElement('canvas');
  return maskCanvas;
}

function getMaskFitCanvas() {
  maskFitCanvas ||= document.createElement('canvas');
  return maskFitCanvas;
}

function getPipCanvas() {
  pipCanvas ||= document.createElement('canvas');
  return pipCanvas;
}

function isVideoReady(video) {
  return Boolean(video && video.readyState >= 2 && (video.videoWidth || video.naturalWidth || video.width));
}

function resolvePipStyle(draft = {}) {
  return draft.pipStyle === 'cutout' || draft.pipCutoutEnabled === true ? 'cutout' : 'regular';
}

function validHexColor(value) {
  const raw = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '';
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function clampFloat(value, fallback, min, max) {
  const parsed = Number.parseFloat(String(value));

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}