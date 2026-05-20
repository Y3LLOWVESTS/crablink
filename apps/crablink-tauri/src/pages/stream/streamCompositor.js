/**
 * RO:WHAT — Local canvas compositor for CrabLink stream preview.
 * RO:WHY — Gives Creator Studio a stable canvas output with person cutout/background replacement before real MediaRecorder/WebRTC/OAP transport.
 * RO:INTERACTS — StreamLocalPreview, StreamLookPanel, streamPersonSegmentation, streamSessionClient capture helper, stream.css.
 * RO:INVARIANTS — local visual compositor only; creates no b3, stream truth, receipt truth, entitlement truth, wallet truth, or backend live status.
 * RO:METRICS — local segmentation status only; future native media manager should report dropped frames/latency.
 * RO:CONFIG — reads local draft source/look/framing/color hints only.
 * RO:SECURITY — no arbitrary code, no local path exposure, no remote user backgrounds, no secrets, no backend capabilities.
 * RO:TEST — npm run build; start camera; enable Person cutout; select image/solid background; verify wide zoom, mirror, position, brightness, contrast, saturation.
 */

import {
  clearPersonSegmentationMask,
  requestPersonSegmentationMask,
} from './streamPersonSegmentation.js';

const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;

let chromaWorkCanvas = null;
let personWorkCanvas = null;
let personFilteredCanvas = null;
let maskCanvas = null;
let mediaWorkCanvas = null;
const backgroundImageCache = new Map();

export function drawCompositedFrame({
  canvas,
  sourceVideo,
  overlayVideo = null,
  draft = {},
  preview = {},
} = {}) {
  if (!canvas) {
    return {
      ready: false,
      reason: 'missing_canvas',
    };
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return {
      ready: false,
      reason: 'missing_canvas_context',
    };
  }

  const bounds = getOutputBounds(draft);
  ensureCanvasSize(canvas, bounds.width, bounds.height);

  const width = canvas.width;
  const height = canvas.height;
  const sourceReady = isVideoReady(sourceVideo);
  const overlayReady = isVideoReady(overlayVideo);
  const mode = describeCompositorMode(draft, preview);

  if (!sourceReady) {
    clearPersonSegmentationMask();
    drawIdleSlate(context, width, height, mode);
    canvas.removeAttribute('data-capture-ready');

    return {
      ready: false,
      reason: 'source_not_ready',
      mode,
      width,
      height,
    };
  }

  drawActiveBackground(context, width, height, draft, mode);
  drawSourceVideo(context, sourceVideo, width, height, draft, mode);

  if (mode.overlayWanted) {
    if (overlayReady) {
      drawOverlayVideo(context, overlayVideo, width, height, mode);
    } else {
      drawOverlayPlaceholder(context, width, height, mode);
    }
  }

  drawStudioBadges(context, width, height, draft, preview, mode);

  canvas.dataset.captureReady = 'true';
  canvas.dataset.compositorMode = mode.id;

  return {
    ready: true,
    mode,
    width,
    height,
  };
}

export function describeCompositorMode(draft = {}, preview = {}) {
  const sourceMode = cleanString(draft.sourceMode);
  const previewSource = cleanString(preview.source);
  const backgroundRemovalMode = cleanString(draft.backgroundRemovalMode);
  const greenScreenEnabled = draft.greenScreenEnabled === true || draft.greenScreenEnabled === 'on';

  const personSegmentationWanted =
    backgroundRemovalMode === 'person' || draft.personSegmentationEnabled === true;
  const overlayWanted = sourceMode === 'screen_with_webcam_thumbnail_future';
  const greenScreenWanted =
    !personSegmentationWanted &&
    (greenScreenEnabled || sourceMode === 'camera_green_screen_background_future');
  const screenWanted = sourceMode === 'local_screen_preview' || overlayWanted || previewSource === 'screen';

  if (overlayWanted) {
    return {
      id: 'screen_with_webcam',
      label: 'Screen + webcam',
      sourceLabel: 'Screen',
      overlayWanted: true,
      greenScreenWanted: false,
      personSegmentationWanted: false,
      fit: 'contain',
    };
  }

  if (personSegmentationWanted) {
    return {
      id: 'person_cutout',
      label: 'Person cutout',
      sourceLabel: 'Camera',
      overlayWanted: false,
      greenScreenWanted: false,
      personSegmentationWanted: true,
      fit: 'cover',
    };
  }

  if (greenScreenWanted) {
    return {
      id: 'green_screen',
      label: 'Green screen',
      sourceLabel: 'Camera',
      overlayWanted: false,
      greenScreenWanted: true,
      personSegmentationWanted: false,
      fit: 'cover',
    };
  }

  if (screenWanted) {
    return {
      id: 'screen',
      label: 'Screen',
      sourceLabel: 'Screen',
      overlayWanted: false,
      greenScreenWanted: false,
      personSegmentationWanted: false,
      fit: 'contain',
    };
  }

  if (previewSource === 'file' || sourceMode === 'local_file_rehearsal_preview') {
    return {
      id: 'file',
      label: 'Local file',
      sourceLabel: 'File',
      overlayWanted: false,
      greenScreenWanted: false,
      personSegmentationWanted: false,
      fit: 'contain',
    };
  }

  return {
    id: 'camera',
    label: 'Camera',
    sourceLabel: 'Camera',
    overlayWanted: false,
    greenScreenWanted: false,
    personSegmentationWanted: false,
    fit: 'cover',
  };
}

function getOutputBounds(draft = {}) {
  const width = clampInteger(draft?.studioOutputWidth, DEFAULT_CANVAS_WIDTH, 320, 1920);
  const height = clampInteger(draft?.studioOutputHeight, DEFAULT_CANVAS_HEIGHT, 180, 1080);

  return {
    width,
    height,
  };
}

function ensureCanvasSize(canvas, width, height) {
  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }
}

function drawActiveBackground(context, width, height, draft, mode) {
  const backgroundMode = cleanString(draft.backgroundMode);
  const backgroundColor = cleanString(draft.backgroundSolidColor) || '#111111';
  const backgroundImageDataUrl = cleanString(draft.backgroundImageDataUrl);

  if (backgroundMode === 'image' && backgroundImageDataUrl) {
    const drawn = drawBackgroundImage(context, width, height, backgroundImageDataUrl, draft);

    if (drawn) {
      return;
    }

    drawActiveFallbackBackground(context, width, height, backgroundColor, mode);
    return;
  }

  if (backgroundMode === 'solid') {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    return;
  }

  drawActiveFallbackBackground(context, width, height, backgroundColor, mode);
}

function drawActiveFallbackBackground(context, width, height, backgroundColor, mode) {
  const gradient = context.createLinearGradient(0, 0, width, height);

  if (mode.personSegmentationWanted) {
    gradient.addColorStop(0, backgroundColor || '#06140d');
    gradient.addColorStop(0.5, '#0b0b0b');
    gradient.addColorStop(1, '#000000');
  } else if (mode.greenScreenWanted) {
    gradient.addColorStop(0, '#071f14');
    gradient.addColorStop(0.52, '#0d120f');
    gradient.addColorStop(1, '#000000');
  } else {
    gradient.addColorStop(0, '#090909');
    gradient.addColorStop(0.46, '#111111');
    gradient.addColorStop(1, '#000000');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawBackgroundImage(context, width, height, dataUrl, draft) {
  const image = getCachedBackgroundImage(dataUrl);

  if (!image.loaded) {
    return false;
  }

  const fit = cleanString(draft.backgroundImageFit) || 'cover';
  const rect =
    fit === 'contain'
      ? fitInside(image.element.naturalWidth, image.element.naturalHeight, width, height)
      : coverInside(image.element.naturalWidth, image.element.naturalHeight, width, height);

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  if (fit === 'contain') {
    const matte = cleanString(draft.backgroundSolidColor) || '#050505';
    context.fillStyle = matte;
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image.element, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  return true;
}

function getCachedBackgroundImage(dataUrl) {
  const cached = backgroundImageCache.get(dataUrl);

  if (cached) {
    return cached;
  }

  const image = new Image();
  const entry = {
    element: image,
    loaded: false,
    error: '',
  };

  image.onload = () => {
    entry.loaded = true;
  };

  image.onerror = () => {
    entry.error = 'Unable to load local background image.';
  };

  image.src = dataUrl;
  backgroundImageCache.set(dataUrl, entry);

  return entry;
}

function drawSourceVideo(context, video, width, height, draft, mode) {
  if (mode.personSegmentationWanted) {
    const status = drawPersonSegmentedVideo(context, video, width, height, draft, mode);

    if (status !== 'ready') {
      drawSourceVideoRaw(context, video, width, height, draft, mode);
      drawFutureEffectBadge(context, width, height, personStatusText(status));
    }

    return;
  }

  if (mode.greenScreenWanted) {
    const keyed = drawChromaKeyVideo(context, video, width, height, draft, mode);

    if (!keyed) {
      drawSourceVideoRaw(context, video, width, height, draft, mode);
      drawFutureEffectBadge(context, width, height, 'Green screen unavailable in this WebView');
    }

    return;
  }

  drawSourceVideoRaw(context, video, width, height, draft, mode);
}

function drawPersonSegmentedVideo(context, video, width, height, draft, mode) {
  const segmentation = requestPersonSegmentationMask({
    source: video,
    enabled: true,
    minIntervalMs: clampInteger(draft.personSegmentationIntervalMs, 105, 70, 500),
  });

  const mask = segmentation.mask;

  if (!mask?.data?.length || !mask.width || !mask.height) {
    return segmentation.status || 'loading';
  }

  try {
    const work = getPersonWorkCanvas();
    const filtered = getPersonFilteredCanvas();
    const maskSourceCanvas = getMaskCanvas();

    const workContext = work.getContext('2d', { willReadFrequently: true });
    const filteredContext = filtered.getContext('2d', { willReadFrequently: true });
    const maskContext = maskSourceCanvas.getContext('2d', { willReadFrequently: true });

    if (!workContext || !filteredContext || !maskContext) {
      return 'canvas_unavailable';
    }

    work.width = Math.max(1, width);
    work.height = Math.max(1, height);
    filtered.width = work.width;
    filtered.height = work.height;
    maskSourceCanvas.width = mask.width;
    maskSourceCanvas.height = mask.height;

    filteredContext.clearRect(0, 0, filtered.width, filtered.height);
    drawFramedMedia(filteredContext, video, filtered.width, filtered.height, draft, mode, {
      fit: 'cover',
      mirror: shouldMirrorCamera(draft, mode),
      adjustCameraPixels: true,
    });

    workContext.clearRect(0, 0, work.width, work.height);
    workContext.drawImage(filtered, 0, 0);

    const maskImage = maskContext.createImageData(mask.width, mask.height);
    const personValue = clampInteger(mask.personValue ?? mask.personIndex, 1, 0, 255);
    const shouldFlip =
      draft.personMaskFlip === true ||
      cleanString(draft.personMaskPolarity) === 'flip' ||
      cleanString(draft.personMaskPolarity) === 'keep_not_value';
    const opacity = clampFloat(draft.personMaskOpacity, 1, 0.2, 1);
    const alphaBoost = Math.round(255 * opacity);

    for (let index = 0; index < mask.data.length; index += 1) {
      const out = index * 4;
      const value = mask.data[index];
      const isPerson = value === personValue;
      const keep = shouldFlip ? !isPerson : isPerson;

      maskImage.data[out] = 255;
      maskImage.data[out + 1] = 255;
      maskImage.data[out + 2] = 255;
      maskImage.data[out + 3] = keep ? alphaBoost : 0;
    }

    maskContext.putImageData(maskImage, 0, 0);

    const transformedMask = getMediaWorkCanvas();
    transformedMask.width = work.width;
    transformedMask.height = work.height;
    const transformedMaskContext = transformedMask.getContext('2d', { willReadFrequently: true });

    if (!transformedMaskContext) {
      return 'canvas_unavailable';
    }

    transformedMaskContext.clearRect(0, 0, transformedMask.width, transformedMask.height);
    drawFramedMedia(
      transformedMaskContext,
      maskSourceCanvas,
      transformedMask.width,
      transformedMask.height,
      draft,
      mode,
      {
        fit: 'cover',
        mirror: shouldMirrorCamera(draft, mode),
        adjustCameraPixels: false,
      },
    );

    workContext.save();
    workContext.globalCompositeOperation = 'destination-in';
    workContext.filter = `blur(${clampInteger(draft.personMaskFeather, 2, 0, 12)}px)`;
    workContext.drawImage(transformedMask, 0, 0);
    workContext.restore();
    workContext.filter = 'none';

    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.28)';
    context.shadowBlur = 18;
    context.drawImage(work, 0, 0, width, height);
    context.restore();

    return 'ready';
  } catch (_error) {
    return 'error';
  }
}

function drawSourceVideoRaw(context, video, width, height, draft, mode) {
  context.save();

  if (mode.fit === 'contain') {
    const containRect = fitInside(video.videoWidth, video.videoHeight, width, height);
    context.shadowColor = 'rgba(0, 0, 0, 0.42)';
    context.shadowBlur = 28;
    roundRect(context, containRect.x, containRect.y, containRect.width, containRect.height, 26);
    context.clip();
  }

  if (isCameraLikeMode(mode)) {
    const work = getMediaWorkCanvas();
    work.width = width;
    work.height = height;
    const workContext = work.getContext('2d', { willReadFrequently: true });

    if (workContext) {
      workContext.clearRect(0, 0, width, height);
      drawFramedMedia(workContext, video, width, height, draft, mode, {
        fit: mode.fit,
        mirror: shouldMirrorCamera(draft, mode),
        adjustCameraPixels: true,
      });
      context.drawImage(work, 0, 0);
    } else {
      drawFramedMedia(context, video, width, height, draft, mode, {
        fit: mode.fit,
        mirror: shouldMirrorCamera(draft, mode),
        adjustCameraPixels: false,
      });
    }
  } else {
    drawFramedMedia(context, video, width, height, draft, mode, {
      fit: mode.fit,
      mirror: false,
      adjustCameraPixels: false,
    });
  }

  context.restore();

  if (mode.fit === 'contain') {
    const containRect = fitInside(video.videoWidth, video.videoHeight, width, height);
    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    context.lineWidth = 2;
    roundRect(context, containRect.x, containRect.y, containRect.width, containRect.height, 26);
    context.stroke();
    context.restore();
  }
}

function drawChromaKeyVideo(context, video, width, height, draft, mode) {
  try {
    const work = getChromaWorkCanvas();
    const workContext = work.getContext('2d', { willReadFrequently: true });

    if (!workContext) {
      return false;
    }

    work.width = Math.max(1, width);
    work.height = Math.max(1, height);

    workContext.clearRect(0, 0, work.width, work.height);
    drawFramedMedia(workContext, video, work.width, work.height, draft, mode, {
      fit: 'cover',
      mirror: shouldMirrorCamera(draft, mode),
      adjustCameraPixels: true,
    });

    const imageData = workContext.getImageData(0, 0, work.width, work.height);
    const data = imageData.data;
    const key = parseHexColor(draft.greenScreenKeyColor || '#00ff00');
    const tolerance = clampInteger(draft.greenScreenTolerance, 34, 0, 100);
    const feather = clampInteger(draft.greenScreenFeather, 8, 0, 100);
    const spill = clampInteger(draft.greenScreenSpillReduction, 10, 0, 100);

    const threshold = 18 + tolerance * 3.8;
    const featherRange = 1 + feather * 2.4;
    const spillStrength = spill / 100;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      if (data[index + 3] === 0) {
        continue;
      }

      const distance = colorDistance(red, green, blue, key.r, key.g, key.b);

      if (distance <= threshold) {
        data[index + 3] = 0;
        continue;
      }

      if (distance <= threshold + featherRange) {
        const alpha = (distance - threshold) / featherRange;
        data[index + 3] = Math.round(data[index + 3] * alpha);
      }

      if (spillStrength > 0 && green > red * 1.08 && green > blue * 1.08) {
        data[index + 1] = Math.round(green - (green - Math.max(red, blue)) * spillStrength);
      }
    }

    workContext.putImageData(imageData, 0, 0);

    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.28)';
    context.shadowBlur = 18;
    context.drawImage(work, 0, 0, width, height);
    context.restore();

    return true;
  } catch (_error) {
    return false;
  }
}

function drawOverlayVideo(context, video, width, height, mode) {
  const rect = overlayRect(width, height, mode);

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.46)';
  context.shadowBlur = 24;
  roundRect(context, rect.x, rect.y, rect.width, rect.height, 26);
  context.clip();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  context.save();
  context.strokeStyle = 'rgba(34, 197, 94, 0.82)';
  context.lineWidth = Math.max(2, Math.round(width * 0.0028));
  roundRect(context, rect.x, rect.y, rect.width, rect.height, 26);
  context.stroke();
  context.restore();
}

function drawOverlayPlaceholder(context, width, height, mode) {
  const rect = overlayRect(width, height, mode);

  context.save();
  context.fillStyle = 'rgba(5, 8, 8, 0.86)';
  context.strokeStyle = 'rgba(34, 197, 94, 0.55)';
  context.lineWidth = 2;
  roundRect(context, rect.x, rect.y, rect.width, rect.height, 26);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255, 255, 255, 0.86)';
  context.font = `800 ${Math.max(16, Math.round(width * 0.018))}px Inter, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Webcam overlay', rect.x + rect.width / 2, rect.y + rect.height / 2 - 10);

  context.fillStyle = 'rgba(255, 255, 255, 0.52)';
  context.font = `700 ${Math.max(12, Math.round(width * 0.012))}px Inter, system-ui, sans-serif`;
  context.fillText('waiting for camera', rect.x + rect.width / 2, rect.y + rect.height / 2 + 18);
  context.restore();
}

function drawIdleSlate(context, width, height, mode) {
  drawIdleBackdrop(context, width, height, mode);

  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.28)';
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(34, 197, 94, 0.88)';
  context.font = `950 ${Math.max(14, Math.round(width * 0.014))}px Inter, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('LOCAL COMPOSITOR', width / 2, height / 2 - 44);

  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.font = `950 ${Math.max(34, Math.round(width * 0.05))}px Inter, system-ui, sans-serif`;
  context.fillText(mode.label || 'Preview', width / 2, height / 2 + 8);

  context.fillStyle = 'rgba(255, 255, 255, 0.58)';
  context.font = `750 ${Math.max(14, Math.round(width * 0.014))}px Inter, system-ui, sans-serif`;
  context.fillText('Start a local source to render the stream canvas.', width / 2, height / 2 + 58);
  context.restore();
}

function drawIdleBackdrop(context, width, height, mode) {
  const gradient = context.createLinearGradient(0, 0, width, height);

  if (mode.personSegmentationWanted || mode.greenScreenWanted) {
    gradient.addColorStop(0, '#071f14');
    gradient.addColorStop(0.48, '#101010');
    gradient.addColorStop(1, '#000000');
  } else {
    gradient.addColorStop(0, '#090909');
    gradient.addColorStop(0.46, '#111111');
    gradient.addColorStop(1, '#000000');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.2;
  context.fillStyle = '#22c55e';
  context.beginPath();
  context.arc(width * 0.18, height * 0.16, width * 0.34, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.1;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(width * 0.88, height * 0.1, width * 0.22, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFutureEffectBadge(context, width, height, text) {
  context.save();

  const padX = Math.round(width * 0.018);
  const padY = Math.round(height * 0.02);
  const badgeHeight = Math.round(height * 0.062);
  const badgeWidth = Math.min(Math.round(width * 0.54), Math.max(330, Math.round(width * 0.34)));
  const x = padX;
  const y = padY;

  context.fillStyle = 'rgba(0, 0, 0, 0.55)';
  context.strokeStyle = 'rgba(245, 158, 11, 0.56)';
  context.lineWidth = 2;
  roundRect(context, x, y, badgeWidth, badgeHeight, 999);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255, 255, 255, 0.86)';
  context.font = `850 ${Math.max(12, Math.round(width * 0.013))}px Inter, system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, x + badgeWidth / 2, y + badgeHeight / 2);
  context.restore();
}

function drawStudioBadges(context, width, height, draft, preview, mode) {
  const title = cleanString(draft.title) || 'CrabLink stream';
  const keyState = mode.greenScreenWanted ? ' · GREEN KEY' : '';
  const personState = mode.personSegmentationWanted ? ' · PERSON CUTOUT' : '';
  const mirrorState = isCameraLikeMode(mode) && draft.cameraMirror !== false ? ' · MIRROR' : '';
  const zoomState = isCameraLikeMode(mode) ? ` · ${clampInteger(draft.cameraZoom, 100, 33, 220)}%` : '';
  const left = `LOCAL CANVAS · ${mode.label.toUpperCase()}${keyState}${personState}${mirrorState}${zoomState}`;
  const right = cleanString(preview.label) || 'Preview only';

  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.58)';
  context.fillRect(0, height - 70, width, 70);

  context.fillStyle = 'rgba(34, 197, 94, 0.94)';
  context.font = `950 ${Math.max(12, Math.round(width * 0.012))}px Inter, system-ui, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(truncateCanvasText(context, left, width * 0.58), 24, height - 44);

  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.font = `900 ${Math.max(16, Math.round(width * 0.018))}px Inter, system-ui, sans-serif`;
  context.fillText(truncateCanvasText(context, title, width * 0.56), 24, height - 20);

  context.fillStyle = 'rgba(255, 255, 255, 0.68)';
  context.font = `800 ${Math.max(12, Math.round(width * 0.012))}px Inter, system-ui, sans-serif`;
  context.textAlign = 'right';
  context.fillText(truncateCanvasText(context, right, width * 0.34), width - 24, height - 30);
  context.restore();
}

function drawFramedMedia(context, media, targetWidth, targetHeight, draft, mode, options = {}) {
  const mediaWidth = media.videoWidth || media.naturalWidth || media.width || targetWidth;
  const mediaHeight = media.videoHeight || media.naturalHeight || media.height || targetHeight;
  const fit = options.fit === 'contain' ? 'contain' : 'cover';
  const rect = getFramedMediaRect(mediaWidth, mediaHeight, targetWidth, targetHeight, draft, mode, fit);

  context.save();
  context.beginPath();
  context.rect(0, 0, targetWidth, targetHeight);
  context.clip();

  if (options.mirror) {
    context.translate(targetWidth / 2, targetHeight / 2);
    context.scale(-1, 1);
    context.translate(-targetWidth / 2, -targetHeight / 2);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(media, rect.x, rect.y, rect.width, rect.height);
  context.restore();

  if (options.adjustCameraPixels && isCameraLikeMode(mode)) {
    applyCameraPixelAdjustments(context, targetWidth, targetHeight, draft);
  }
}

function getFramedMediaRect(mediaWidth, mediaHeight, targetWidth, targetHeight, draft, mode, fit) {
  const base =
    fit === 'contain'
      ? fitInside(mediaWidth, mediaHeight, targetWidth, targetHeight)
      : coverInside(mediaWidth, mediaHeight, targetWidth, targetHeight);

  if (!isCameraLikeMode(mode)) {
    return base;
  }

  const zoom = clampInteger(draft.cameraZoom, 100, 33, 220) / 100;
  const offsetX = clampInteger(draft.cameraOffsetX, 0, -50, 50);
  const offsetY = clampInteger(draft.cameraOffsetY, 0, -50, 50);

  const width = Math.round(base.width * zoom);
  const height = Math.round(base.height * zoom);
  const extraX = width - base.width;
  const extraY = height - base.height;

  return {
    x: Math.round(base.x - extraX / 2 + (offsetX / 100) * targetWidth * 0.42),
    y: Math.round(base.y - extraY / 2 + (offsetY / 100) * targetHeight * 0.42),
    width,
    height,
  };
}

function applyCameraPixelAdjustments(context, width, height, draft) {
  const brightness = clampInteger(draft.cameraBrightness, 100, 40, 180);
  const contrast = clampInteger(draft.cameraContrast, 100, 40, 200);
  const saturation = clampInteger(draft.cameraSaturation, 100, 0, 220);

  if (brightness === 100 && contrast === 100 && saturation === 100) {
    return;
  }

  try {
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    const brightnessScale = brightness / 100;
    const contrastScale = contrast / 100;
    const saturationScale = saturation / 100;

    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) {
        continue;
      }

      let red = data[index] * brightnessScale;
      let green = data[index + 1] * brightnessScale;
      let blue = data[index + 2] * brightnessScale;

      red = (red - 128) * contrastScale + 128;
      green = (green - 128) * contrastScale + 128;
      blue = (blue - 128) * contrastScale + 128;

      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      red = luma + (red - luma) * saturationScale;
      green = luma + (green - luma) * saturationScale;
      blue = luma + (blue - luma) * saturationScale;

      data[index] = clampByte(red);
      data[index + 1] = clampByte(green);
      data[index + 2] = clampByte(blue);
    }

    context.putImageData(imageData, 0, 0);
  } catch (_error) {
    /*
     * Local camera/video sources should be readable, but keep the compositor
     * fail-open if a WebView blocks pixel access for an unusual source.
     */
  }
}

function shouldMirrorCamera(draft, mode) {
  return isCameraLikeMode(mode) && draft.cameraMirror !== false;
}

function isCameraLikeMode(mode = {}) {
  return (
    mode.sourceLabel === 'Camera' ||
    mode.id === 'camera' ||
    mode.id === 'person_cutout' ||
    mode.id === 'green_screen'
  );
}

function overlayRect(width) {
  const overlayWidth = Math.round(width * 0.24);
  const overlayHeight = Math.round(overlayWidth * 0.5625);
  const margin = Math.round(width * 0.025);

  return {
    x: width - overlayWidth - margin,
    y: Math.round(margin),
    width: overlayWidth,
    height: overlayHeight,
  };
}

function fitInside(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const safeSourceWidth = Math.max(1, Number(sourceWidth) || targetWidth || 1);
  const safeSourceHeight = Math.max(1, Number(sourceHeight) || targetHeight || 1);
  const scale = Math.min(targetWidth / safeSourceWidth, targetHeight / safeSourceHeight);
  const width = Math.round(safeSourceWidth * scale);
  const height = Math.round(safeSourceHeight * scale);

  return {
    x: Math.round((targetWidth - width) / 2),
    y: Math.round((targetHeight - height) / 2),
    width,
    height,
  };
}

function coverInside(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const safeSourceWidth = Math.max(1, Number(sourceWidth) || targetWidth || 1);
  const safeSourceHeight = Math.max(1, Number(sourceHeight) || targetHeight || 1);
  const scale = Math.max(targetWidth / safeSourceWidth, targetHeight / safeSourceHeight);
  const width = Math.round(safeSourceWidth * scale);
  const height = Math.round(safeSourceHeight * scale);

  return {
    x: Math.round((targetWidth - width) / 2),
    y: Math.round((targetHeight - height) / 2),
    width,
    height,
  };
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function truncateCanvasText(context, text, maxWidth) {
  const clean = cleanString(text);

  if (context.measureText(clean).width <= maxWidth) {
    return clean;
  }

  let out = clean;

  while (out.length > 4 && context.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }

  return `${out}…`;
}

function getChromaWorkCanvas() {
  if (!chromaWorkCanvas) {
    chromaWorkCanvas = document.createElement('canvas');
  }

  return chromaWorkCanvas;
}

function getPersonWorkCanvas() {
  if (!personWorkCanvas) {
    personWorkCanvas = document.createElement('canvas');
  }

  return personWorkCanvas;
}

function getPersonFilteredCanvas() {
  if (!personFilteredCanvas) {
    personFilteredCanvas = document.createElement('canvas');
  }

  return personFilteredCanvas;
}

function getMaskCanvas() {
  if (!maskCanvas) {
    maskCanvas = document.createElement('canvas');
  }

  return maskCanvas;
}

function getMediaWorkCanvas() {
  if (!mediaWorkCanvas) {
    mediaWorkCanvas = document.createElement('canvas');
  }

  return mediaWorkCanvas;
}

function colorDistance(redA, greenA, blueA, redB, greenB, blueB) {
  const red = redA - redB;
  const green = greenA - greenB;
  const blue = blueA - blueB;

  return Math.sqrt(red * red + green * green + blue * blue);
}

function parseHexColor(value) {
  const clean = cleanString(value).replace('#', '');
  const hex = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : '00ff00';

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function personStatusText(status) {
  if (status === 'loading' || status === 'idle') {
    return 'Loading person cutout model';
  }

  if (status === 'waiting_for_video') {
    return 'Waiting for camera frame';
  }

  if (status === 'error') {
    return 'Person cutout unavailable';
  }

  if (status === 'canvas_unavailable') {
    return 'Canvas mask unavailable';
  }

  return 'Preparing person cutout';
}

function isVideoReady(video) {
  return Boolean(video?.videoWidth && video?.videoHeight && video.readyState >= 2);
}

function clampByte(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(255, Math.round(value)));
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

function cleanString(value) {
  return String(value ?? '').trim();
}