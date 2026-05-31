/**
 * RO:WHAT — Privacy-safe image metadata cleanup before CrabLink Tauri image minting.
 * RO:WHY — Rewrites publish bytes before b3 prediction/upload so EXIF/XMP/IPTC/GPS/device metadata is not minted into canonical image assets.
 * RO:INTERACTS — ImagePublishFlow.jsx, ImagePage.jsx, imageRenditionGenerator.js, browser canvas/ImageBitmap APIs.
 * RO:INVARIANTS — sanitized bytes are the only publish bytes; b3 prediction must hash sanitized bytes; unsupported animated/vector images fail closed.
 * RO:METRICS — none.
 * RO:CONFIG — bounded decode/render caps and output quality constants in this file.
 * RO:SECURITY — no network action; no private keys; no localStorage; object URLs are revoked by caller/utility paths.
 * RO:TEST — manual EXIF/GPS JPEG/PNG mint: predicted sanitized b3 must match backend CID and paid view must render.
 */

const SOURCE_PIXEL_CAP = 64_000_000;
const SANITIZED_BYTE_CAP = 25 * 1024 * 1024;
const JPEG_QUALITY = 0.92;
const WEBP_QUALITY = 0.9;

const SUPPORTED_PRIVACY_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const TYPE_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
});

const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const STRIPPED_PNG_CHUNKS = new Set([
  'eXIf',
  'iTXt',
  'tEXt',
  'zTXt',
  'tIME',
]);

const BLOCKING_METADATA_PATTERNS = [
  /\bexif\b/i,
  /\bgps\b/i,
  /\bxmp\b/i,
  /\biptc\b/i,
  /\bphotoshop\b/i,
  /\bcomment\b/i,
  /\btext\b/i,
  /\btime\b/i,
];

export async function sanitizeImageForPublish(file, options = {}) {
  if (!file) {
    throw new Error('Choose an image before privacy cleanup.');
  }

  const sourceType = normalizeImageType(file.type, file.name);

  if (!SUPPORTED_PRIVACY_TYPES.has(sourceType)) {
    throw new Error(
      `Privacy-safe minting currently supports PNG, JPEG, WebP, and AVIF. ${sourceType || 'This image type'} is blocked so metadata is not minted accidentally.`,
    );
  }

  const detectedMetadata = await scanImageMetadata(file, sourceType);
  const sourceBlockingMetadata = blockingMetadataFindings(detectedMetadata);
  const image = await loadLocalImage(file);
  const sourceWidth = Number(image.width || image.naturalWidth || 0);
  const sourceHeight = Number(image.height || image.naturalHeight || 0);

  if (!sourceWidth || !sourceHeight) {
    closeImageBitmap(image);
    throw new Error('Could not read image dimensions for privacy cleanup.');
  }

  if (sourceWidth * sourceHeight > SOURCE_PIXEL_CAP) {
    closeImageBitmap(image);
    throw new Error(
      `Source image is too large for privacy cleanup: ${sourceWidth}×${sourceHeight}.`,
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    closeImageBitmap(image);
    throw new Error('Canvas rendering is unavailable for privacy cleanup.');
  }

  ctx.clearRect(0, 0, sourceWidth, sourceHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  closeImageBitmap(image);

  const preferredType = preferredOutputType(sourceType, options);
  const exportResult = await exportVerifiedCleanCanvas({
    canvas,
    preferredType,
    sourceType,
    originalBytes: Number(file.size || 0),
    options,
  });

  const blob = exportResult.blob;
  const outputType = exportResult.outputType;
  const cleanedDetectedMetadata = exportResult.cleanedDetectedMetadata;
  const cleanedBlockingMetadata = exportResult.cleanedBlockingMetadata;
  const strippedChunks = exportResult.strippedChunks || [];

  const fileName = privacyCleanFileName(file.name, outputType);
  const sanitizedFile = makeFileLikeBlob(blob, fileName, outputType, file.lastModified);
  const rewritten = blob.size !== Number(file.size || 0) || outputType !== sourceType;
  const metadataRemoved =
    sourceBlockingMetadata.length > 0 ||
    detectedMetadata.length > 0 ||
    strippedChunks.length > 0 ||
    rewritten;

  return {
    schema: 'crablink.image-privacy-clean.v1',
    status: 'clean',
    mode: 'privacy_safe_canvas_reencode',
    originalName: file.name || 'image',
    fileName,
    sourceType,
    contentType: outputType,
    sourceBytes: Number(file.size || 0),
    bytes: blob.size,
    width: sourceWidth,
    height: sourceHeight,
    blob: sanitizedFile,
    file: sanitizedFile,
    detectedMetadata,
    sourceBlockingMetadata,
    cleanedDetectedMetadata,
    cleanedBlockingMetadata,
    strippedChunks,
    metadataRemoved,
    rewritten,
    verification: {
      status: 'passed',
      method: 'container_marker_rescan_after_canvas_reencode_and_png_chunk_strip',
      originalDetectedMetadata: detectedMetadata,
      originalBlockingMetadata: sourceBlockingMetadata,
      cleanedDetectedMetadata,
      cleanedBlockingMetadata,
      selectedOutputType: outputType,
      strippedChunks,
      attempts: exportResult.attempts,
      note:
        'The cleaned publish blob was rescanned before b3 prediction/upload. EXIF/XMP/IPTC/comment/time metadata containers must be absent or minting fails. If PNG export still contains unsafe metadata chunks such as eXIf, CrabLink strips those PNG chunks and rescans before allowing mint.',
    },
    policy: {
      exif: 'removed_by_reencode_or_png_chunk_strip',
      gps: 'removed_by_reencode_or_png_chunk_strip',
      xmp: 'removed_by_reencode_or_png_chunk_strip',
      iptc: 'removed_by_reencode_or_png_chunk_strip',
      comments: 'removed_by_reencode_or_png_chunk_strip',
      timeMetadata: 'removed_by_reencode_or_png_chunk_strip',
      textChunks: 'removed_by_reencode_or_png_chunk_strip',
      colorProfile: outputType === 'image/jpeg' ? 'browser_encoded' : 'browser_encoded_or_srgb',
      animatedFrames: 'unsupported_fail_closed',
      vectorSources: 'unsupported_fail_closed',
      fallbackContainer:
        outputType !== sourceType
          ? `source_${sourceType || 'unknown'}_rewritten_as_${outputType}`
          : 'source_container_preserved_after_clean_verification',
      strippedChunks,
    },
    disclosure:
      'CrabLink privacy-cleaned this image before b3 prediction and upload. The minted bytes are rewritten publish bytes, not the original camera/file-system bytes.',
  };
}

export async function scanImageMetadata(file, contentType = '') {
  const type = normalizeImageType(contentType || file?.type, file?.name);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (type === 'image/jpeg') return scanJpegMetadata(bytes);
  if (type === 'image/png') return scanPngMetadata(bytes);
  if (type === 'image/webp') return scanWebpMetadata(bytes);
  if (type === 'image/avif') return scanAvifMetadata(bytes);

  return [];
}

export function summarizeImagePrivacy(cleaned) {
  if (!cleaned) {
    return {
      status: 'not_ready',
      mode: 'privacy_safe_canvas_reencode',
      metadataRemoved: false,
      detectedMetadata: [],
      sourceBlockingMetadata: [],
      cleanedDetectedMetadata: [],
      cleanedBlockingMetadata: [],
      strippedChunks: [],
      verification: {
        status: 'not_ready',
        method: 'not_run',
      },
    };
  }

  return {
    schema: cleaned.schema || 'crablink.image-privacy-clean.v1',
    status: cleaned.status || 'clean',
    mode: cleaned.mode || 'privacy_safe_canvas_reencode',
    sourceType: cleaned.sourceType || '',
    contentType: cleaned.contentType || '',
    sourceBytes: Number(cleaned.sourceBytes || 0),
    bytes: Number(cleaned.bytes || 0),
    width: Number(cleaned.width || 0),
    height: Number(cleaned.height || 0),
    detectedMetadata: Array.isArray(cleaned.detectedMetadata) ? cleaned.detectedMetadata : [],
    sourceBlockingMetadata: Array.isArray(cleaned.sourceBlockingMetadata)
      ? cleaned.sourceBlockingMetadata
      : blockingMetadataFindings(cleaned.detectedMetadata || []),
    cleanedDetectedMetadata: Array.isArray(cleaned.cleanedDetectedMetadata)
      ? cleaned.cleanedDetectedMetadata
      : [],
    cleanedBlockingMetadata: Array.isArray(cleaned.cleanedBlockingMetadata)
      ? cleaned.cleanedBlockingMetadata
      : blockingMetadataFindings(cleaned.cleanedDetectedMetadata || []),
    strippedChunks: Array.isArray(cleaned.strippedChunks) ? cleaned.strippedChunks : [],
    metadataRemoved: Boolean(cleaned.metadataRemoved),
    rewritten: Boolean(cleaned.rewritten),
    verification: cleaned.verification || {
      status: 'unknown',
      method: 'not_recorded',
    },
    policy: cleaned.policy || {},
    disclosure: cleaned.disclosure || '',
  };
}

export function normalizeImageType(type = '', name = '') {
  const clean = String(type || '').split(';')[0].trim().toLowerCase();

  if (clean === 'image/jpg') return 'image/jpeg';
  if (clean) return clean;

  const lowerName = String(name || '').toLowerCase();
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.avif')) return 'image/avif';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.svg')) return 'image/svg+xml';

  return '';
}

async function exportVerifiedCleanCanvas({
  canvas,
  preferredType,
  sourceType,
  originalBytes,
  options = {},
}) {
  const candidates = buildOutputCandidates({
    preferredType,
    sourceType,
    allowOpaqueFallback: Boolean(options.allowOpaqueFallback),
  });
  const attempts = [];

  for (const candidateType of candidates) {
    const firstQuality = qualityForType(candidateType);
    const qualities = qualityPlan(candidateType, firstQuality);

    for (const quality of qualities) {
      let blob = await canvasToBlob(canvas, candidateType, quality);
      let outputType = normalizeImageType(blob.type || candidateType);

      if (!String(outputType || '').startsWith('image/')) {
        attempts.push({
          requestedType: candidateType,
          quality,
          outputType: outputType || 'unknown',
          status: 'skipped',
          reason: 'browser_did_not_return_image_blob',
        });
        continue;
      }

      if (blob.size > SANITIZED_BYTE_CAP) {
        attempts.push({
          requestedType: candidateType,
          quality,
          outputType,
          bytes: blob.size,
          status: 'retry_or_skip',
          reason: `above_${SANITIZED_BYTE_CAP}_byte_cap`,
        });
        continue;
      }

      let cleanedDetectedMetadata = await scanImageMetadata(blob, outputType);
      let cleanedBlockingMetadata = blockingMetadataFindings(cleanedDetectedMetadata);
      let strippedChunks = [];

      if (cleanedBlockingMetadata.length > 0) {
        const stripped = await stripKnownMetadataChunks(blob, outputType);

        if (stripped.changed) {
          blob = stripped.blob;
          strippedChunks = stripped.strippedChunks;
          outputType = normalizeImageType(blob.type || outputType);

          cleanedDetectedMetadata = await scanImageMetadata(blob, outputType);
          cleanedBlockingMetadata = blockingMetadataFindings(cleanedDetectedMetadata);
        }
      }

      attempts.push({
        requestedType: candidateType,
        quality,
        outputType,
        bytes: blob.size,
        originalBytes,
        strippedChunks,
        cleanedDetectedMetadata,
        cleanedBlockingMetadata,
        status: cleanedBlockingMetadata.length ? 'dirty' : 'clean',
      });

      if (!cleanedBlockingMetadata.length) {
        return {
          blob,
          outputType,
          cleanedDetectedMetadata,
          cleanedBlockingMetadata,
          strippedChunks,
          attempts,
        };
      }
    }
  }

  const dirtyReasons = attempts
    .filter((attempt) => attempt.cleanedBlockingMetadata?.length)
    .map((attempt) => {
      const chunks = attempt.strippedChunks?.length
        ? `; stripped ${attempt.strippedChunks.join(', ')}`
        : '';

      return `${attempt.outputType || attempt.requestedType}: ${attempt.cleanedBlockingMetadata.join(', ')}${chunks}`;
    });

  throw new Error(
    dirtyReasons.length
      ? `Privacy cleanup verification failed. All clean-container attempts still contained metadata blocks. ${dirtyReasons.join(' | ')}.`
      : 'Privacy cleanup verification failed. Browser image export could not produce a clean bounded image blob.',
  );
}

function buildOutputCandidates({ preferredType, sourceType, allowOpaqueFallback = false }) {
  const candidates = [];

  pushUnique(candidates, preferredType);

  if (sourceType === 'image/png') {
    pushUnique(candidates, 'image/webp');
    if (allowOpaqueFallback) pushUnique(candidates, 'image/jpeg');
  } else if (sourceType === 'image/webp') {
    pushUnique(candidates, 'image/png');
    if (allowOpaqueFallback) pushUnique(candidates, 'image/jpeg');
  } else if (sourceType === 'image/avif') {
    pushUnique(candidates, 'image/webp');
    pushUnique(candidates, 'image/png');
    if (allowOpaqueFallback) pushUnique(candidates, 'image/jpeg');
  } else if (sourceType === 'image/jpeg') {
    pushUnique(candidates, 'image/webp');
  }

  pushUnique(candidates, 'image/png');
  pushUnique(candidates, 'image/webp');

  if (sourceType === 'image/jpeg' || allowOpaqueFallback) {
    pushUnique(candidates, 'image/jpeg');
  }

  return candidates.filter((type) => SUPPORTED_PRIVACY_TYPES.has(type) && type !== 'image/avif');
}

function pushUnique(list, value) {
  const clean = normalizeImageType(value);

  if (clean && !list.includes(clean)) {
    list.push(clean);
  }
}

function qualityPlan(type, firstQuality) {
  if (type === 'image/jpeg') {
    return unique([firstQuality, 0.86, 0.78]);
  }

  if (type === 'image/webp') {
    return unique([firstQuality, 0.82, 0.74]);
  }

  return [firstQuality];
}

function preferredOutputType(sourceType, options = {}) {
  const requested = normalizeImageType(options.outputType || '');

  if (requested && SUPPORTED_PRIVACY_TYPES.has(requested) && requested !== 'image/avif') {
    return requested;
  }

  if (sourceType === 'image/jpeg') return 'image/jpeg';
  if (sourceType === 'image/webp') return 'image/webp';
  if (sourceType === 'image/png') return 'image/png';

  return 'image/png';
}

function qualityForType(type) {
  if (type === 'image/jpeg') return JPEG_QUALITY;
  if (type === 'image/webp') return WEBP_QUALITY;
  return 0.92;
}

function privacyCleanFileName(name = '', contentType = 'image/png') {
  const raw = String(name || 'image').replace(/\.[^.]+$/, '');
  const safeBase = raw.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'image';
  const extension = TYPE_EXTENSIONS[contentType] || 'png';
  return `${safeBase}.privacy-clean.${extension}`;
}

function makeFileLikeBlob(blob, fileName, contentType, lastModified) {
  if (typeof File === 'function') {
    return new File([blob], fileName, {
      type: contentType || blob.type || 'image/png',
      lastModified: Number.isFinite(lastModified) ? lastModified : Date.now(),
    });
  }

  Object.defineProperties(blob, {
    name: { value: fileName, configurable: true },
    lastModified: {
      value: Number.isFinite(lastModified) ? lastModified : Date.now(),
      configurable: true,
    },
  });

  return blob;
}

async function stripKnownMetadataChunks(blob, outputType) {
  if (outputType === 'image/png') {
    return stripPngMetadataChunks(blob);
  }

  return {
    blob,
    strippedChunks: [],
    changed: false,
  };
}

async function stripPngMetadataChunks(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return {
      blob,
      strippedChunks: [],
      changed: false,
    };
  }

  const parts = [bytes.slice(0, 8)];
  const strippedChunks = [];
  let offset = 8;
  let sawIend = false;
  let valid = true;

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const chunkEnd = dataStart + length + 4;

    if (chunkEnd > bytes.length) {
      valid = false;
      break;
    }

    const type = asciiPrefix(bytes.subarray(typeStart, typeStart + 4));
    const chunk = bytes.slice(offset, chunkEnd);

    if (STRIPPED_PNG_CHUNKS.has(type)) {
      strippedChunks.push(type);
    } else {
      parts.push(chunk);
    }

    offset = chunkEnd;

    if (type === 'IEND') {
      sawIend = true;
      break;
    }
  }

  if (!valid || !sawIend || !strippedChunks.length) {
    return {
      blob,
      strippedChunks,
      changed: false,
    };
  }

  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const cleaned = new Uint8Array(size);
  let writeOffset = 0;

  for (const part of parts) {
    cleaned.set(part, writeOffset);
    writeOffset += part.length;
  }

  return {
    blob: new Blob([cleaned], { type: 'image/png' }),
    strippedChunks: unique(strippedChunks),
    changed: true,
  };
}

function scanJpegMetadata(bytes) {
  const found = [];

  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return found;
  }

  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;

    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (!length || offset + 2 + length > bytes.length) break;

    const segmentStart = offset + 4;
    const segmentEnd = offset + 2 + length;
    const segment = bytes.subarray(segmentStart, Math.min(segmentEnd, segmentStart + 256));
    const ascii = asciiPrefix(segment);

    if (marker === 0xe1 && ascii.startsWith('Exif\0\0')) found.push('EXIF');
    else if (marker === 0xe1 && ascii.includes('http://ns.adobe.com/xap/1.0/')) found.push('XMP');
    else if (marker === 0xe1 && ascii.toLowerCase().includes('xmp')) found.push('XMP');
    else if (marker === 0xed) found.push('Photoshop/IPTC');
    else if (marker === 0xfe) found.push('JPEG comment');
    else if (marker === 0xe2 && ascii.startsWith('ICC_PROFILE')) found.push('ICC profile');

    offset += 2 + length;
  }

  return unique(found);
}

function scanPngMetadata(bytes) {
  const found = [];

  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return found;
  }

  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = asciiPrefix(bytes.subarray(offset + 4, offset + 8));
    const chunkEnd = offset + 12 + length;

    if (chunkEnd > bytes.length) {
      break;
    }

    if (type === 'eXIf') found.push('PNG eXIf');
    else if (type === 'iTXt') found.push('PNG iTXt text metadata');
    else if (type === 'tEXt') found.push('PNG tEXt text metadata');
    else if (type === 'zTXt') found.push('PNG zTXt text metadata');
    else if (type === 'tIME') found.push('PNG tIME');
    else if (type === 'iCCP') found.push('PNG ICC profile');

    offset += 12 + length;
    if (type === 'IEND') break;
  }

  return unique(found);
}

function scanWebpMetadata(bytes) {
  const found = [];

  if (asciiPrefix(bytes.subarray(0, 4)) !== 'RIFF' || asciiPrefix(bytes.subarray(8, 12)) !== 'WEBP') {
    return found;
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const type = asciiPrefix(bytes.subarray(offset, offset + 4));
    const length = readUint32Le(bytes, offset + 4);
    const chunkEnd = offset + 8 + length + (length % 2);

    if (chunkEnd > bytes.length) {
      break;
    }

    if (type === 'EXIF') found.push('WebP EXIF');
    if (type === 'XMP ') found.push('WebP XMP');
    if (type === 'ICCP') found.push('WebP ICC profile');

    offset = chunkEnd;
  }

  return unique(found);
}

function scanAvifMetadata(bytes) {
  const haystack = asciiPrefix(bytes.subarray(0, Math.min(bytes.length, 512 * 1024)));
  const found = [];

  if (haystack.includes('Exif')) found.push('AVIF EXIF');
  if (haystack.includes('http://ns.adobe.com/xap/1.0/') || haystack.includes('XMP')) found.push('AVIF XMP');
  if (haystack.includes('colr')) found.push('AVIF color box');

  return unique(found);
}

function blockingMetadataFindings(values) {
  const findings = Array.isArray(values) ? values : [];

  return unique(
    findings.filter((value) => {
      const text = String(value || '');

      if (!text) return false;

      if (/icc profile/i.test(text)) return false;
      if (/color box/i.test(text)) return false;

      return BLOCKING_METADATA_PATTERNS.some((pattern) => pattern.test(text));
    }),
  );
}

function asciiPrefix(bytes) {
  let out = '';

  for (const value of bytes) {
    out += value >= 32 && value <= 126 ? String.fromCharCode(value) : '\0';
  }

  return out;
}

function readUint32(bytes, offset) {
  return (
    ((bytes[offset] || 0) * 0x1000000) +
    ((bytes[offset + 1] || 0) << 16) +
    ((bytes[offset + 2] || 0) << 8) +
    (bytes[offset + 3] || 0)
  );
}

function readUint32Le(bytes, offset) {
  return (
    (bytes[offset] || 0) +
    ((bytes[offset + 1] || 0) << 8) +
    ((bytes[offset + 2] || 0) << 16) +
    ((bytes[offset + 3] || 0) * 0x1000000)
  );
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas could not export privacy-cleaned image bytes.'));
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
      // Some WebViews reject AVIF/WebP here even when <img> can decode them.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not decode selected local image for privacy cleanup.'));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function closeImageBitmap(image) {
  if (image && typeof image.close === 'function') {
    image.close();
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}