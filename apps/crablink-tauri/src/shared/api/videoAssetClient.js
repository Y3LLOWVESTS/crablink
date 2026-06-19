import { callTauri } from '../../platform/tauriPlatform.js';

/**
 * RO:WHAT — Video asset API client for explicit paid crab://video minting.
 * RO:WHY — Brings the proven image prepare → hold → upload workflow to bounded video-lite assets and Rust-staged outputs.
 * RO:INTERACTS — GatewayClient, VideoPublishFlow, src-tauri asset upload commands, svc-gateway /assets/video and /assets/image routes.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; no silent ROC spend; backend remains publication truth.
 * RO:METRICS — gateway/command correlation IDs are preserved for diagnostics.
 * RO:CONFIG — uses configured gateway URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — paid proof headers are required; no private keys or local filesystem paths are sent.
 * RO:TEST — manual crab://video prepare → hold → staged bundle upload → crab://<hash>.video paid view smoke.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createVideoAssetClient(gateway) {
  return new VideoAssetClient(gateway);
}

export class VideoAssetClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Video asset request failed.'));
    this.name = 'VideoAssetClientError';
    this.reason = details.reason || 'video_asset_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
  }
}

export class VideoAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async prepareVideoAsset(payload = {}, options = {}) {
    this.assertGateway();

    const request = normalizeVideoPrepareRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'video-prepare',
    );

    return this.gateway.request('/assets/video/prepare', {
      method: 'POST',
      body: {
        ...request,
        client_idempotency_key: idempotencyKey,
      },
      label: 'Video asset prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      idempotencyKey,
    });
  }

  async uploadVideoAsset({ file, bytes, contentType, paidProof, metadata = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const blob = normalizeVideoBlob(file || bytes, contentType);
    const proof = normalizePaidProof(paidProof);
    const contentTypeHeader = stringValue(contentType, file?.type, blob.type, 'video/mp4');
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'video-upload',
          proof.txid,
          proof.receipt_hash,
          String(blob.size),
          contentTypeHeader,
          metadata?.title,
        ),
      'video-upload',
    );

    const headers = buildPaidUploadHeaders({
      gateway: this.gateway,
      proof,
      contentType: contentTypeHeader,
      idempotencyKey: idem,
      metadata,
      assetKind: 'video',
    });

    const response = canUseTauriInvoke()
      ? await uploadVideoWithTauriCommand({
          blob,
          headers,
          idempotencyKey: idem,
        })
      : await this.gateway.request('/assets/video', {
          method: 'POST',
          body: blob,
          label: 'Video asset upload',
          mutation: true,
          parseAs: 'json',
          headers,
          idempotencyKey: idem,
        });

    return normalizeUploadResponse({
      response,
      headers,
      proof,
      contentType: contentTypeHeader,
      bytes: blob.size,
      idempotencyKey: idem,
      assetKind: 'video',
      transport: canUseTauriInvoke() ? 'tauri_upload_video_asset_gateway' : 'gateway_request_blob',
    });
  }

  async hashStagedAsset({ stagedHandle, assetKind = 'video', contentType, role, maxBytes } = {}) {
    const kind = normalizeAssetKind(assetKind);

    if (!stringValue(stagedHandle).startsWith('staged://video-job/')) {
      throw makeVideoError('Staged hash requires a staged://video-job/... handle.', 'invalid_staged_handle');
    }

    if (!canUseTauriInvoke()) {
      throw makeVideoError(
        'Staged video outputs can only be hashed through the Tauri Rust bridge.',
        'tauri_required_for_staged_hash',
      );
    }

    return hashStagedWithTauriCommand({
      stagedHandle,
      assetKind: kind,
      contentType: stringValue(contentType, kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      role: stringValue(role, kind),
      maxBytes,
    });
  }

  async uploadStagedAsset({
    stagedHandle,
    assetKind = 'video',
    contentType,
    bytes,
    paidProof,
    metadata = {},
    idempotencyKey = '',
  } = {}) {
    this.assertGateway();

    const kind = normalizeAssetKind(assetKind);
    const proof = normalizePaidProof(paidProof);
    const contentTypeHeader = stringValue(contentType, kind === 'image' ? 'image/jpeg' : 'video/mp4');
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'staged-upload',
          kind,
          stagedHandle,
          proof.txid,
          proof.receipt_hash,
          String(bytes || ''),
          contentTypeHeader,
          metadata?.title,
        ),
      'staged-upload',
    );

    if (!stringValue(stagedHandle).startsWith('staged://video-job/')) {
      throw makeVideoError('Staged upload requires a staged://video-job/... handle.', 'invalid_staged_handle');
    }

    const headers = buildPaidUploadHeaders({
      gateway: this.gateway,
      proof,
      contentType: contentTypeHeader,
      idempotencyKey: idem,
      metadata,
      assetKind: kind,
    });

    if (!canUseTauriInvoke()) {
      throw makeVideoError(
        'Staged video outputs can only be uploaded through the Tauri Rust bridge.',
        'tauri_required_for_staged_upload',
      );
    }

    const response = await uploadStagedWithTauriCommand({
      stagedHandle,
      assetKind: kind,
      contentType: contentTypeHeader,
      bytes,
      headers,
      idempotencyKey: idem,
    });

    return normalizeUploadResponse({
      response,
      headers,
      proof,
      contentType: contentTypeHeader,
      bytes,
      idempotencyKey: idem,
      assetKind: kind,
      transport: kind === 'image'
        ? 'tauri_upload_staged_image_asset_gateway'
        : 'tauri_upload_staged_video_asset_gateway',
    });
  }

  assertGateway() {
    if (!this.ready) {
      throw makeVideoError('Video asset requests require the configured gateway client.', 'missing_gateway_client');
    }
  }
}

export function normalizeVideoPrepareRequest(payload = {}) {
  const bytes = normalizePositiveInteger(
    payload.bytes,
    payload.size,
    payload.size_bytes,
    payload.file_bytes,
    payload.fileBytes,
  );
  const payerAccount = stringValue(
    payload.payer_account,
    payload.payerAccount,
    payload.wallet_account,
    payload.walletAccount,
    payload.from,
  );
  const ownerPassport = stringValue(
    payload.owner_passport_subject,
    payload.ownerPassportSubject,
    payload.passport,
    payload.passportSubject,
  );
  const contentType = stringValue(payload.content_type, payload.contentType, payload.mime, 'video/mp4');
  const title = stringValue(payload.title, 'Untitled video draft').slice(0, 180);
  const description = stringValue(payload.description, payload.summary).slice(0, 800);
  const tags = normalizeTags(payload.tags);
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('video-prepare', payerAccount, ownerPassport, bytes, contentType, title),
    'video-prepare',
  );

  if (!bytes) {
    throw makeVideoError('Video prepare requires a positive byte count.', 'missing_video_bytes');
  }

  if (!payerAccount) {
    throw makeVideoError('Video prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeVideoError('Video prepare requires an owner passport subject.', 'missing_owner_passport');
  }

  if (!String(contentType).toLowerCase().startsWith('video/')) {
    throw makeVideoError('Video prepare requires a video/* content type.', 'invalid_video_content_type');
  }

  /*
   * Keep this request body strict.
   *
   * The RustyOnions backend parses /assets/video/prepare with a deny-unknown-fields DTO.
   * Do not send frontend-only fields such as:
   * - bundle_kind
   * - rendition_count
   * - local job ids
   * - staged handles
   * - rendition group previews
   *
   * Bundle/rendition metadata can travel later through upload headers or a future backend
   * video bundle manifest route, but not through this strict prepare DTO.
   */
  return stripEmpty({
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: contentType,
    title,
    description,
    tags,
    video_kind: stringValue(payload.video_kind, payload.videoKind),
    duration: stringValue(payload.duration),
    resolution: stringValue(payload.resolution),
    aspect_ratio: stringValue(payload.aspect_ratio, payload.aspectRatio),
    codec_format: stringValue(payload.codec_format, payload.codecFormat),
    frame_rate: stringValue(payload.frame_rate, payload.frameRate),
    language: stringValue(payload.language, 'en'),
    client_idempotency_key: idempotency,
  });
}

export function normalizePaidProof(input = {}) {
  const source = input?.walletHold || input?.hold || input?.receipt || input?.data || input || {};

  const proof = {
    op: stringValue(source.op, source.paid_op, 'hold'),
    asset: stringValue(source.asset, 'roc').toLowerCase(),
    amount_minor: normalizePositiveInteger(
      source.amount_minor,
      source.amountMinor,
      source.amount,
      input.amount_minor,
      input.amountMinor,
    ),
    txid: stringValue(
      source.txid,
      source.tx_id,
      source.transaction_id,
      source.wallet_txid,
      source.walletTxid,
      input.txid,
      input.tx_id,
    ),
    receipt_hash: stringValue(
      source.receipt_hash,
      source.receiptHash,
      source.wallet_receipt_hash,
      source.walletReceiptHash,
      input.receipt_hash,
      input.receiptHash,
    ),
    from: stringValue(source.from, source.payer, input.from),
    to: stringValue(source.to, source.escrow, source.payee, input.to),
    idem: stringValue(source.idem, source.idempotency_key, source.idempotencyKey, input.idem),
  };

  if (!proof.txid) {
    throw makeVideoError('Paid video upload requires x-ron-wallet-txid proof.', 'missing_wallet_txid');
  }

  if (!proof.receipt_hash) {
    throw makeVideoError('Paid video upload requires x-ron-wallet-receipt-hash proof.', 'missing_wallet_receipt_hash');
  }

  if (!proof.amount_minor) {
    throw makeVideoError('Paid video upload requires x-ron-paid-estimate-minor proof.', 'missing_paid_amount');
  }

  if (!proof.from) {
    throw makeVideoError('Paid video upload requires x-ron-wallet-from proof.', 'missing_wallet_from');
  }

  if (!proof.to) {
    throw makeVideoError('Paid video upload requires x-ron-wallet-to proof.', 'missing_wallet_to');
  }

  return proof;
}

export function extractVideoAssetUrl(data = {}) {
  return extractAssetUrl(data, 'video');
}

export function extractVideoAssetCid(data = {}) {
  return extractAssetCid(data);
}

export function extractAssetUrl(data = {}, assetKind = 'video') {
  const kind = normalizeAssetKind(assetKind);
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.video_url,
    source.videoUrl,
    source.image_url,
    source.imageUrl,
    source.url,
  );

  if (direct.startsWith('crab://')) {
    return direct;
  }

  const cid = extractAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.${kind}`;
  }

  return '';
}

export function extractAssetCid(data = {}) {
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.video_cid,
    source.videoCid,
    source.image_cid,
    source.imageCid,
    source.asset_cid,
    source.assetCid,
    source.b3,
    source.hash,
    source.digest,
  );
  const normalized = normalizeCid(direct);

  if (normalized) {
    return normalized;
  }

  const nested = objectValue(source.asset) || objectValue(source.video) || objectValue(source.image) || objectValue(source.object) || objectValue(source.manifest);
  return nested ? extractAssetCid(nested) : '';
}

function buildPaidUploadHeaders({ gateway, proof, contentType, idempotencyKey, metadata = {}, assetKind = 'video' }) {
  const kind = normalizeAssetKind(assetKind);

  const headers = {
    Accept: 'application/json',
    'Content-Type': contentType,
    'Idempotency-Key': idempotencyKey,
    'x-ron-paid-op': proof.op || 'hold',
    'x-ron-paid-asset': proof.asset || 'roc',
    'x-ron-paid-estimate-minor': proof.amount_minor,
    'x-ron-wallet-txid': proof.txid,
    'x-ron-wallet-receipt-hash': proof.receipt_hash,
    'x-ron-wallet-from': proof.from,
    'x-ron-wallet-to': proof.to,
  };

  const passportSubject = stringValue(gateway?.passportSubject);
  const walletAccount = stringValue(proof.from, gateway?.walletAccount);
  const title = stringValue(metadata.title);
  const description = stringValue(metadata.description, metadata.summary, metadata.altText, metadata.alt_text);
  const tags = Array.isArray(metadata.tags) ? metadata.tags.join(',') : stringValue(metadata.tags);
  const duration = stringValue(metadata.duration);
  const resolution = stringValue(metadata.resolution);
  const aspectRatio = stringValue(metadata.aspectRatio, metadata.aspect_ratio);
  const videoKind = stringValue(metadata.videoKind, metadata.video_kind);
  const language = stringValue(metadata.language);
  const role = stringValue(metadata.renditionRole, metadata.rendition_role, metadata.role);
  const label = stringValue(metadata.renditionLabel, metadata.rendition_label, metadata.label);
  const bundleHeader = compactJsonHeader(metadata.renditionGroup || metadata.rendition_group || metadata.videoRenditionGroup);

  if (passportSubject) headers['x-ron-passport'] = passportSubject;
  if (walletAccount) headers['x-ron-wallet-account'] = walletAccount;
  if (title) headers['x-ron-asset-title'] = title;
  if (description) headers['x-ron-asset-description'] = description;
  if (tags) headers['x-ron-asset-tags'] = tags;

  if (kind === 'video') {
    if (duration) headers['x-ron-video-duration'] = duration;
    if (resolution) headers['x-ron-video-resolution'] = resolution;
    if (aspectRatio) headers['x-ron-video-aspect-ratio'] = aspectRatio;
    if (videoKind) headers['x-ron-video-kind'] = videoKind;
    if (language) headers['x-ron-video-language'] = language;
    if (role) headers['x-ron-video-rendition-role'] = role;
    if (label) headers['x-ron-video-rendition-label'] = label;
    if (bundleHeader) headers['x-ron-video-rendition-group'] = bundleHeader;
  }

  if (kind === 'image') {
    if (role) headers['x-ron-image-rendition-role'] = role;
    if (label) headers['x-ron-image-rendition-label'] = label;
    if (bundleHeader) headers['x-ron-image-rendition-group'] = bundleHeader;
  }

  return headers;
}

function normalizeUploadResponse({ response, headers, proof, contentType, bytes, idempotencyKey, assetKind, transport }) {
  const kind = normalizeAssetKind(assetKind);
  const payload = response?.data || response;
  const assetUrl = extractAssetUrl(payload, kind);
  const assetCid = extractAssetCid(payload);

  return {
    ...response,
    request: {
      bytes: Number(bytes || 0),
      content_type: contentType,
      headers: redactProofHeaders(headers),
      idempotency_key: idempotencyKey,
      asset_kind: kind,
      transport,
    },
    paidProof: proof,
    assetKind: kind,
    assetUrl,
    assetCid,
    videoAssetUrl: kind === 'video' ? assetUrl : '',
    videoAssetCid: kind === 'video' ? assetCid : '',
  };
}

function normalizeVideoBlob(value, contentType = '') {
  if (value instanceof Blob) {
    return value;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return new Blob([value], {
      type: contentType || 'application/octet-stream',
    });
  }

  throw makeVideoError('Video upload requires a selected video file/blob.', 'missing_video_file');
}

async function hashStagedWithTauriCommand({ stagedHandle, assetKind, contentType, role, maxBytes }) {
  const response = await callTauri('hash_staged_asset_bytes', {
    request: {
      stagedHandle,
      expectedAssetKind: assetKind,
      contentTypeHint: contentType,
      role,
      maxBytes: Number(maxBytes || 0) || undefined,
    },
  });

  const hash = normalizeHash(response?.hash);
  const kind = normalizeAssetKind(response?.assetKind || response?.asset_kind || assetKind);

  if (!hash) {
    throw makeVideoError('Tauri staged hash command did not return a canonical b3 hash.', 'missing_staged_hash');
  }

  return {
    schema: response?.schema || 'crablink.tauri.staged-asset-hash-response.v1',
    assetKind: kind,
    role: stringValue(response?.role, role),
    contentType: stringValue(response?.contentType, response?.content_type, contentType),
    bytes: Number(response?.bytes || 0),
    hash,
    cid: normalizeCid(response?.cid || hash),
    crabUrl: stringValue(response?.crabUrl, response?.crab_url, `crab://${hash}.${kind}`),
    stagedHandleRedacted: stringValue(response?.stagedHandleRedacted, response?.staged_handle_redacted),
  };
}

async function uploadVideoWithTauriCommand({ blob, headers, idempotencyKey }) {
  const bodyBytes = Array.from(new Uint8Array(await blob.arrayBuffer()));

  const response = await callTauri('upload_video_asset_gateway', {
    request: {
      headers,
      bodyBytes,
      idempotencyKey,
    },
  });

  return normalizeCommandResponse(response, '/assets/video');
}

async function uploadStagedWithTauriCommand({ stagedHandle, assetKind, contentType, bytes, headers, idempotencyKey }) {
  const command = assetKind === 'image'
    ? 'upload_staged_image_asset_gateway'
    : 'upload_staged_video_asset_gateway';

  const response = await callTauri(command, {
    request: {
      headers,
      stagedHandle,
      idempotencyKey,
      expectedAssetKind: assetKind,
      contentTypeHint: contentType,
      maxBytes: Number(bytes || 0) || undefined,
    },
  });

  return normalizeCommandResponse(response, assetKind === 'image' ? '/assets/image' : '/assets/video');
}

function normalizeCommandResponse(response, fallbackRoute) {
  const status = Number(response?.status || 0);
  const data = response?.data ?? null;
  const correlationId = stringValue(response?.correlation_id, response?.correlationId);

  if (!response?.ok || status < 200 || status >= 300) {
    const error = makeVideoError(errorMessageFromCommandResponse(response), reasonFromCommandResponse(response));
    error.status = status;
    error.retryable = status === 408 || status === 429 || status >= 500;
    error.data = data;
    error.correlationId = correlationId;
    error.route = response?.route || fallbackRoute;
    throw error;
  }

  return {
    ok: true,
    status,
    route: response?.route || fallbackRoute,
    correlationId,
    data,
  };
}

function reasonFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(data.reason, data.code, data.error, response.reason, 'video_upload_failed');
}

function errorMessageFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(
    data.message,
    data.detail,
    data.error,
    data.code,
    `Video upload failed with HTTP ${Number(response?.status || 0)}.`,
  );
}

function canUseTauriInvoke() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

function normalizeAssetKind(value) {
  const clean = stringValue(value, 'video').toLowerCase();

  if (clean === 'image') return 'image';
  return 'video';
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizePositiveInteger(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw) && raw !== '0') {
      return raw;
    }

    const n = Number(raw);
    if (Number.isSafeInteger(n) && n > 0) {
      return String(n);
    }
  }

  return '';
}

function normalizeCid(value) {
  const hash = normalizeHash(value);
  return hash ? `b3:${hash}` : '';
}

function normalizeHash(value) {
  const raw = String(value || '').trim().replace(/^b3:/i, '').toLowerCase();
  return HEX_64_RE.test(raw) ? raw : '';
}

function redactProofHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => {
      if (key.toLowerCase().includes('receipt') || key.toLowerCase().includes('txid')) {
        const raw = String(value || '');
        return [key, raw.length > 16 ? `${raw.slice(0, 8)}…${raw.slice(-6)}` : raw];
      }

      return [key, value];
    }),
  );
}

export function stableVideoIdempotencyKey(...parts) {
  return stableIdempotencyKey(...parts);
}

function stableIdempotencyKey(...parts) {
  return parts
    .flat()
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(':') || `crablink:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export function compactIdempotencyKey(value, prefix = 'crablink') {
  const raw = String(value || '').trim();
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const cleanPrefix = String(prefix || 'crablink')
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .slice(0, 20);
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - cleanPrefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${cleanPrefix}:${hash}:${suffix}` : `${cleanPrefix}:${hash}`;
}

function compactJsonHeader(value) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  try {
    const compact = JSON.stringify(value);

    if (compact.length > 7000) {
      return '';
    }

    return compact;
  } catch (_error) {
    return '';
  }
}

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function makeVideoError(message, reason = 'video_asset_client_error') {
  return new VideoAssetClientError(message, {
    reason,
    retryable: false,
  });
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
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