/**
 * RO:WHAT — Local preview canvas and browser media stream helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps MakePage focused on route orchestration.
 * RO:INTERACTS — MakePage.jsx, makeCompositor.js, browser video/canvas/MediaStream APIs.
 * RO:INVARIANTS — local preview/rendering only; no backend asset truth; no wallet/ledger mutation; no fake receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — local draft preview mode, scene, PiP, canvas, and stream state.
 * RO:SECURITY — no private paths, keys, capabilities, balances, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make start/stop preview and canvas smoke.
 */

import { drawMakeFrame } from './makeCompositor.js';

export function attachStream(video, stream) {
  if (!video) {
    return;
  }

  if (video.srcObject !== stream) {
    video.srcObject = stream || null;
  }

  if (stream) {
    const playResult = video.play?.();

    if (playResult?.catch) {
      playResult.catch(() => {});
    }
  }
}

export function drawPreviewLoop({
  canvas,
  cameraVideo,
  screenVideo,
  backgroundVideo,
  backgroundImageUrl = '',
  draft,
  inputState,
  outputPreset,
  onStatus,
}) {
  let rafId = 0;
  let frameCount = 0;
  let stopped = false;

  const draw = () => {
    if (stopped) {
      return;
    }

    const status = drawMakeFrame({
      canvas,
      cameraVideo,
      screenVideo,
      backgroundVideo,
      backgroundImageUrl,
      draft,
      inputState,
      outputPreset,
    });

    frameCount += 1;

    if (typeof onStatus === 'function' && frameCount % 12 === 0) {
      onStatus(status);
    }

    rafId = window.requestAnimationFrame(draw);
  };

  draw();

  return () => {
    stopped = true;
    window.cancelAnimationFrame(rafId);
  };
}

export function drawPreviewFrame({ context, canvas, cameraVideo, screenVideo, draft, inputState, outputPreset }) {
  const width = canvas.width;
  const height = canvas.height;
  const mode = draft.selectedMode;

  drawSceneBackground(context, width, height, draft.selectedScene);

  if ((mode === 'screen' || mode === 'screen_pip') && isVideoReady(screenVideo)) {
    drawCoverVideo(context, screenVideo, 0, 0, width, height);
  }

  if (mode === 'camera' && isVideoReady(cameraVideo)) {
    drawCoverVideo(context, cameraVideo, 0, 0, width, height);
  }

  if (mode === 'camera_background' && isVideoReady(cameraVideo)) {
    drawContainVideo(context, cameraVideo, width * 0.12, height * 0.08, width * 0.76, height * 0.82);
    drawGlassLabel(context, 'Scene background mode', width * 0.055, height * 0.08);
  }

  if (mode === 'screen_pip' && isVideoReady(cameraVideo)) {
    const pip = pipRect(width, height, draft.pipCorner, draft.pipSize);
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = 24;
    context.fillStyle = 'rgba(5, 5, 8, 0.82)';
    roundRect(context, pip.x - 8, pip.y - 8, pip.w + 16, pip.h + 16, 22);
    context.fill();
    context.restore();
    drawCoverVideo(context, cameraVideo, pip.x, pip.y, pip.w, pip.h, 18);
  }

  if (mode === 'audio_only') {
    drawAudioCard(context, width, height, draft);
  }

  if (inputState.status !== 'ready') {
    drawIdleOverlay(context, width, height, inputState.status, draft, outputPreset);
  }

  drawFooterHud(context, width, height, draft, outputPreset);
}

export function drawSceneBackground(context, width, height, scene) {
  const gradient = context.createLinearGradient(0, 0, width, height);

  if (scene === 'ocean') {
    gradient.addColorStop(0, '#06283d');
    gradient.addColorStop(0.5, '#136f8f');
    gradient.addColorStop(1, '#0ef0b8');
  } else if (scene === 'ember') {
    gradient.addColorStop(0, '#22092c');
    gradient.addColorStop(0.55, '#872341');
    gradient.addColorStop(1, '#f05941');
  } else if (scene === 'paper') {
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.55, '#e2e8f0');
    gradient.addColorStop(1, '#cbd5e1');
  } else {
    gradient.addColorStop(0, '#070711');
    gradient.addColorStop(0.58, '#15172a');
    gradient.addColorStop(1, '#0f766e');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(width * 0.78, height * 0.18, Math.min(width, height) * 0.25, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.16;
  context.beginPath();
  context.arc(width * 0.16, height * 0.82, Math.min(width, height) * 0.32, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function drawAudioCard(context, width, height, draft) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.38)';
  roundRect(context, width * 0.12, height * 0.18, width * 0.76, height * 0.58, 42);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `${Math.max(34, Math.round(width * 0.043))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'center';
  context.fillText(draft.title || 'Audio card', width * 0.5, height * 0.38);
  context.font = `${Math.max(18, Math.round(width * 0.018))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.globalAlpha = 0.82;
  context.fillText('CrabLink Make Studio', width * 0.5, height * 0.49);

  for (let i = 0; i < 36; i += 1) {
    const barHeight = (Math.sin(i * 0.86) + 1.5) * height * 0.035;
    const x = width * 0.27 + i * width * 0.013;
    context.globalAlpha = 0.36 + (i % 5) * 0.08;
    roundRect(context, x, height * 0.62 - barHeight / 2, width * 0.006, barHeight, 99);
    context.fill();
  }

  context.restore();
}

export function drawIdleOverlay(context, width, height, status, draft, outputPreset) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.48)';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = `${Math.max(28, Math.round(width * 0.035))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(draft.title || 'Make Studio preview', width / 2, height * 0.43);
  context.font = `${Math.max(15, Math.round(width * 0.014))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.globalAlpha = 0.84;
  context.fillText(`Click Start preview • ${outputPreset.width}×${outputPreset.height} • ${status}`, width / 2, height * 0.51);
  context.restore();
}

export function drawFooterHud(context, width, height, draft, outputPreset) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.46)';
  roundRect(context, width * 0.035, height - 68, width * 0.93, 42, 18);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `${Math.max(14, Math.round(width * 0.012))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'left';
  context.globalAlpha = 0.88;
  context.fillText(
    `${draft.title || 'Untitled clip'}  •  ${outputPreset.label}  •  ${draft.targetFps}fps  •  crab://make`,
    width * 0.055,
    height - 42,
  );
  context.restore();
}

export function drawGlassLabel(context, text, x, y) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.42)';
  roundRect(context, x, y, 260, 42, 999);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '700 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  context.fillText(text, x + 20, y + 27);
  context.restore();
}

export function drawCoverVideo(context, video, x, y, width, height, radius = 0) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;

  context.save();
  if (radius > 0) {
    roundRect(context, x, y, width, height, radius);
    context.clip();
  }
  context.drawImage(video, dx, dy, drawWidth, drawHeight);
  context.restore();
}

export function drawContainVideo(context, video, x, y, width, height) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 30;
  context.drawImage(video, dx, dy, drawWidth, drawHeight);
  context.restore();
}

export function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

export function pipRect(width, height, corner, sizePercent) {
  const pipWidth = width * (Number(sizePercent || 28) / 100);
  const pipHeight = pipWidth * (9 / 16);
  const margin = width * 0.035;
  const top = corner.startsWith('top');
  const left = corner.endsWith('left');

  return {
    x: left ? margin : width - margin - pipWidth,
    y: top ? margin : height - margin - pipHeight - 48,
    w: pipWidth,
    h: pipHeight,
  };
}

export function isVideoReady(video) {
  return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
}

export function audioTracksFrom(stream) {
  return stream?.getAudioTracks?.().filter((track) => track.readyState === 'live') || [];
}

export function stopAllStreams(state) {
  const streams = [state?.cameraStream, state?.screenStream, state?.micStream].filter(Boolean);

  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_error) {
        // Best-effort browser media cleanup.
      }
    }
  }
}

export function stopRecorderStream(stream) {
  if (!stream?.getVideoTracks) {
    return;
  }

  for (const track of stream.getVideoTracks()) {
    try {
      track.stop();
    } catch (_error) {
      // Best-effort canvas capture cleanup.
    }
  }
}
