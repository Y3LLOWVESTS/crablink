/**
 * RO:WHAT — Bounded local image rendition generation for CrabLink Tauri image mint bundles.
 * RO:WHY — Creates desktop/mobile/thumbnail/cover bytes locally before each rendition is minted through the backend.
 * RO:INTERACTS — ImagePage.jsx, ImageRenditions.jsx, ImagePublishFlow.jsx, imageDraftModel.js, browser canvas APIs.
 * RO:INVARIANTS — local bytes only until uploaded; no fake b3 CID; no fake crab URL; caller must revoke preview URLs.
 * RO:METRICS — none.
 * RO:CONFIG — target definitions from IMAGE_RENDITION_TARGET_OPTIONS.
 * RO:SECURITY — decodes selected local image only; bounded pixels and output bytes; no network action.
 * RO:TEST — select image → generate renditions → mint bundle → verify each backend-returned crab URL.
 */

const SOURCE_PIXEL_CAP = 64_000_000;
const OUTPUT_PIXEL_CAP = 4_000_000;
const OUTPUT_BYTE_CAP = 4 * 1024 * 1024;
const DEFAULT_OUTPUT_TYPE = 'image/webp';
const FALLBACK_OUTPUT_TYPE = 'image/png';
const DEFAULT_QUALITY = 0.86;

export async function generateImageRenditions(file, targets = []) {
  if (!file) {
    return makeResult([], null);
  }

  const normalizedTargets = targets
    .filter((target) => target && target.enabled !== false)
    .filter((target) => Number(target.width) > 0 && Number(target.height) > 0)
    .slice(0, 8);

  if (!normalizedTargets.length) {
    return makeResult([], null);
  }

  const image = await loadLocalImage(file);
  const sourceWidth = Number(image.width || image.naturalWidth || 0);
  const sourceHeight = Number(image.height || image.naturalHeight || 0);

  if (!sourceWidth || !sourceHeight) {
    throw new Error('Could not read local image dimensions.');
  }

  if (sourceWidth * sourceHeight > SOURCE_PIXEL_CAP) {
    throw new Error(
      `Source image is too large for local rendition generation: ${sourceWidth}×${sourceHeight}.`,
    );
  }

  const entries = [];

  for (const target of normalizedTargets) {
    const rendered = await renderTarget({ image, sourceWidth, sourceHeight, target });
    entries.push(rendered);
  }

  return makeResult(entries, {
    width: sourceWidth,
    height: sourceHeight,
    type: file.type || 'application/octet-stream',
    bytes: file.size || 0,
    name: file.name || '',
  });
}

export function revokeGeneratedImageRenditions(result) {
  const entries = Array.isArray(result?.entries) ? result.entries : [];

  for (const entry of entries) {
    if (entry?.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }
}

export function generatedRenditionTotalBytes(result) {
  const entries = Array.isArray(result?.entries) ? result.entries : [];
  return entries.reduce((total, entry) => total + Number(entry?.bytes || 0), 0);
}

async function renderTarget({ image, sourceWidth, sourceHeight, target }) {
  const boxWidth = Math.max(1, Math.round(Number(target.width || 0)));
  const boxHeight = Math.max(1, Math.round(Number(target.height || 0)));
  const fit = target.fit === 'cover' ? 'cover' : 'contain';
  const plannedPixels = boxWidth * boxHeight;

  if (plannedPixels > OUTPUT_PIXEL_CAP) {
    throw new Error(`${target.label || target.role} is too large for local generation.`);
  }

  const rect = computeDrawRect({
    sourceWidth,
    sourceHeight,
    boxWidth,
    boxHeight,
    fit,
  });

  const canvas = document.createElement('canvas');
  canvas.width = rect.canvasWidth;
  canvas.height = rect.canvasHeight;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Canvas rendering is unavailable.');
  }

  ctx.clearRect(0, 0, rect.canvasWidth, rect.canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    rect.sourceX,
    rect.sourceY,
    rect.sourceWidth,
    rect.sourceHeight,
    0,
    0,
    rect.canvasWidth,
    rect.canvasHeight,
  );

  let blob = await canvasToBlob(canvas, DEFAULT_OUTPUT_TYPE, DEFAULT_QUALITY);
  let contentType = blob.type || DEFAULT_OUTPUT_TYPE;

  if (!blob.type || blob.type !== DEFAULT_OUTPUT_TYPE) {
    blob = await canvasToBlob(canvas, FALLBACK_OUTPUT_TYPE, DEFAULT_QUALITY);
    contentType = blob.type || FALLBACK_OUTPUT_TYPE;
  }

  if (blob.size > OUTPUT_BYTE_CAP && contentType === DEFAULT_OUTPUT_TYPE) {
    blob = await canvasToBlob(canvas, DEFAULT_OUTPUT_TYPE, 0.72);
    contentType = blob.type || DEFAULT_OUTPUT_TYPE;
  }

  if (blob.size > OUTPUT_BYTE_CAP) {
    throw new Error(
      `${target.label || target.role} is ${formatBytes(blob.size)}, above the ${formatBytes(
        OUTPUT_BYTE_CAP,
      )} per-rendition upload cap.`,
    );
  }

  const extension = contentType === 'image/webp' ? 'webp' : 'png';
  const safeRole = String(target.role || 'rendition').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  return {
    role: target.role,
    label: target.label || target.role,
    useCase: target.useCase || target.role,
    width: rect.canvasWidth,
    height: rect.canvasHeight,
    targetWidth: boxWidth,
    targetHeight: boxHeight,
    fit,
    contentType,
    bytes: blob.size,
    blob,
    fileName: `${safeRole}.${extension}`,
    previewUrl: URL.createObjectURL(blob),
    backendVerified: false,
    minted: false,
    cid: null,
    crabUrl: null,
  };
}

function computeDrawRect({ sourceWidth, sourceHeight, boxWidth, boxHeight, fit }) {
  if (fit === 'cover') {
    const sourceRatio = sourceWidth / sourceHeight;
    const targetRatio = boxWidth / boxHeight;

    if (sourceRatio > targetRatio) {
      const croppedWidth = Math.round(sourceHeight * targetRatio);
      return {
        sourceX: Math.round((sourceWidth - croppedWidth) / 2),
        sourceY: 0,
        sourceWidth: croppedWidth,
        sourceHeight,
        canvasWidth: boxWidth,
        canvasHeight: boxHeight,
      };
    }

    const croppedHeight = Math.round(sourceWidth / targetRatio);
    return {
      sourceX: 0,
      sourceY: Math.round((sourceHeight - croppedHeight) / 2),
      sourceWidth,
      sourceHeight: croppedHeight,
      canvasWidth: boxWidth,
      canvasHeight: boxHeight,
    };
  }

  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight, 1);
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth,
    sourceHeight,
    canvasWidth: Math.max(1, Math.round(sourceWidth * scale)),
    canvasHeight: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas could not export local rendition bytes.'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function loadLocalImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (_error) {
      // Fall back to HTMLImageElement for WebView formats that createImageBitmap rejects.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode selected local image.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function makeResult(entries, source) {
  return {
    schema: 'crablink.local.image-renditions-preview.v1',
    generatedAt: new Date().toISOString(),
    localOnly: true,
    backendVerified: false,
    minted: false,
    source,
    entries,
  };
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}