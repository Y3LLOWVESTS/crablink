/**
 * RO:WHAT — Local person/background segmentation helper for CrabLink stream compositor.
 * RO:WHY — Enables TikTok/Zoom-style background replacement without requiring a physical green screen.
 * RO:INTERACTS — streamCompositor.js, StreamLookPanel.jsx, @mediapipe/tasks-vision.
 * RO:INVARIANTS — local visual mask only; no b3, wallet, receipt, entitlement, stream session, ownership, or backend truth.
 * RO:METRICS — exposes lightweight status for UI/compositor badges; no telemetry leaves the client.
 * RO:CONFIG — uses MediaPipe dev CDN/model URL for the MVP; production should bundle model/wasm locally.
 * RO:SECURITY — no arbitrary code, no secrets, no wallet authority, no local path exposure; model output is display-only.
 * RO:TEST — npm install; npm run build; start camera; set Background removal to Person cutout; verify background replacement.
 */

import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite';

const MIN_SEGMENT_INTERVAL_MS = 95;

const state = {
  status: 'idle',
  error: '',
  readyAt: '',
  lastRunAt: 0,
  inFlight: false,
  modelLoading: false,
  segmenter: null,
  segmenterPromise: null,
  mask: null,
  labels: [],
  personValue: 1,
  personValueSource: 'fallback',
  histogram: {},
  centerHistogram: {},
};

export function getPersonSegmentationStatus() {
  return {
    status: state.status,
    error: state.error,
    readyAt: state.readyAt,
    hasMask: Boolean(state.mask?.data?.length),
    maskWidth: state.mask?.width || 0,
    maskHeight: state.mask?.height || 0,
    labels: state.labels,
    personValue: state.personValue,
    personValueSource: state.personValueSource,
    histogram: state.histogram,
    centerHistogram: state.centerHistogram,
  };
}

export function clearPersonSegmentationMask() {
  state.mask = null;
  state.error = '';
  state.status = state.segmenter ? 'ready' : 'idle';
}

export function requestPersonSegmentationMask({
  source,
  enabled,
  minIntervalMs = MIN_SEGMENT_INTERVAL_MS,
} = {}) {
  if (!enabled) {
    return {
      ...getPersonSegmentationStatus(),
      mask: null,
    };
  }

  if (!source || !source.videoWidth || !source.videoHeight || source.readyState < 2) {
    return {
      ...getPersonSegmentationStatus(),
      status: 'waiting_for_video',
      mask: state.mask,
    };
  }

  ensureSegmenter();

  if (!state.segmenter) {
    return {
      ...getPersonSegmentationStatus(),
      status: state.status || 'loading',
      mask: state.mask,
    };
  }

  const now = performance.now();

  if (!state.inFlight && now - state.lastRunAt >= minIntervalMs) {
    state.lastRunAt = now;
    runSegmentation(source, now);
  }

  return {
    ...getPersonSegmentationStatus(),
    mask: state.mask,
  };
}

function ensureSegmenter() {
  if (state.segmenter || state.segmenterPromise || state.modelLoading) {
    return state.segmenterPromise;
  }

  state.status = 'loading';
  state.modelLoading = true;
  state.error = '';

  state.segmenterPromise = createSegmenter()
    .then((segmenter) => {
      state.segmenter = segmenter;
      state.labels = safeLabels(segmenter);
      state.status = 'ready';
      state.readyAt = new Date().toISOString();
      state.error = '';
      return segmenter;
    })
    .catch((error) => {
      state.status = 'error';
      state.error = normalizeError(error);
      state.segmenter = null;
      return null;
    })
    .finally(() => {
      state.modelLoading = false;
      state.segmenterPromise = null;
    });

  return state.segmenterPromise;
}

async function createSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  return ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });
}

function runSegmentation(source, timestampMs) {
  if (!state.segmenter) {
    return;
  }

  state.inFlight = true;

  try {
    state.segmenter.segmentForVideo(source, timestampMs, (result) => {
      const mask = copyCategoryMask(result);

      if (mask) {
        state.mask = mask;
        state.personValue = mask.personValue;
        state.personValueSource = mask.personValueSource;
        state.histogram = mask.histogram;
        state.centerHistogram = mask.centerHistogram;
        state.status = 'ready';
        state.error = '';
      } else {
        state.status = 'error';
        state.error = 'MediaPipe returned no person mask.';
      }

      closeResult(result);
      state.inFlight = false;
    });
  } catch (error) {
    state.status = 'error';
    state.error = normalizeError(error);
    state.inFlight = false;
  }
}

function copyCategoryMask(result) {
  const mask = result?.categoryMask;

  if (!mask) {
    return null;
  }

  const width = Number(mask.width || mask.getWidth?.() || 0);
  const height = Number(mask.height || mask.getHeight?.() || 0);
  const raw = mask.getAsUint8Array?.();

  if (!width || !height || !raw?.length) {
    return null;
  }

  const data = new Uint8ClampedArray(raw);
  const histogram = buildHistogram(data);
  const centerPick = detectLikelyPersonValueFromFrameCenter(data, width, height);
  const labelPick = inferPersonValueFromLabels(state.labels, histogram);
  const finalPick = labelPick || centerPick;

  return {
    schema: 'crablink.local-person-mask.v1',
    width,
    height,
    data,
    labels: state.labels,
    personValue: finalPick.value,
    personValueSource: finalPick.source,
    histogram,
    centerHistogram: centerPick.centerHistogram,
    generatedAt: performance.now(),
    truthBoundary:
      'Local ML person mask only. Not backend truth, stream truth, receipt truth, wallet truth, or entitlement truth.',
  };
}

function buildHistogram(data) {
  const histogram = {};

  for (let index = 0; index < data.length; index += 1) {
    const value = data[index];
    histogram[value] = (histogram[value] || 0) + 1;
  }

  return histogram;
}

function detectLikelyPersonValueFromFrameCenter(data, width, height) {
  /*
   * This fixes the silhouette bug without trusting model label order.
   * In normal creator-camera framing, the person occupies the center/upper-body
   * region. We pick the dominant category there as the subject value.
   */
  const x0 = Math.floor(width * 0.32);
  const x1 = Math.ceil(width * 0.68);
  const y0 = Math.floor(height * 0.18);
  const y1 = Math.ceil(height * 0.88);
  const centerHistogram = {};

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const value = data[y * width + x];
      centerHistogram[value] = (centerHistogram[value] || 0) + 1;
    }
  }

  const sorted = Object.entries(centerHistogram)
    .map(([value, count]) => ({
      value: Number(value),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    value: sorted[0]?.value ?? 1,
    source: 'center_subject_region',
    centerHistogram,
  };
}

function inferPersonValueFromLabels(labels, histogram) {
  const normalized = Array.isArray(labels)
    ? labels.map((label) => String(label || '').toLowerCase())
    : [];

  const likelyIndex = normalized.findIndex(
    (label) =>
      label === 'person' ||
      label.includes('person') ||
      label.includes('human') ||
      label.includes('selfie') ||
      label.includes('foreground'),
  );

  if (likelyIndex >= 0 && Number.isFinite(histogram[likelyIndex])) {
    return {
      value: likelyIndex,
      source: `label:${labels[likelyIndex]}`,
    };
  }

  return null;
}

function closeResult(result) {
  try {
    result?.categoryMask?.close?.();
  } catch (_error) {
    // Best-effort cleanup only.
  }

  try {
    result?.confidenceMasks?.forEach?.((mask) => mask?.close?.());
  } catch (_error) {
    // Best-effort cleanup only.
  }
}

function safeLabels(segmenter) {
  try {
    return segmenter.getLabels?.() || [];
  } catch (_error) {
    return [];
  }
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || 'Unable to initialize person segmentation.');
}