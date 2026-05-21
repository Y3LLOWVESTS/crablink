import { invoke } from '@tauri-apps/api/core';

/**
 * RO:WHAT — Music asset API client for explicit paid crab://music minting.
 * RO:WHY — Brings the proven video prepare → hold → upload workflow to bounded music-lite assets.
 * RO:INTERACTS — GatewayClient, MusicPublishFlow, Tauri upload_music_asset_gateway, svc-gateway /assets/music routes.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; no silent ROC spend; backend remains publication truth.
 * RO:METRICS — gateway/command correlation IDs are preserved for diagnostics.
 * RO:CONFIG — uses configured gateway URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — paid proof headers are required; no private keys, local filesystem paths, or cover-art bytes are sent.
 * RO:TEST — manual crab://music prepare → hold → upload → crab://<hash>.music paid view smoke.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createMusicAssetClient(gateway) {
  return new MusicAssetClient(gateway);
}

export class MusicAssetClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Music asset request failed.'));
    this.name = 'MusicAssetClientError';
    this.reason = details.reason || 'music_asset_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
  }
}

export class MusicAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async prepareMusicAsset(payload = {}, options = {}) {
    this.assertGateway();

    const request = normalizeMusicPrepareRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'music-prepare',
    );

    return this.gateway.request('/assets/music/prepare', {
      method: 'POST',
      body: {
        ...request,
        client_idempotency_key: idempotencyKey,
      },
      label: 'Music asset prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      idempotencyKey,
    });
  }

  async uploadMusicAsset({ file, bytes, contentType, paidProof, metadata = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const blob = normalizeMusicBlob(file || bytes, contentType);
    const proof = normalizePaidProof(paidProof);
    const contentTypeHeader = stringValue(contentType, file?.type, blob.type, inferAudioContentType(file?.name));
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'music-upload',
          proof.txid,
          proof.receipt_hash,
          String(blob.size),
          contentTypeHeader,
          metadata?.title,
        ),
      'music-upload',
    );

    const headers = {
      Accept: 'application/json',
      'Content-Type': contentTypeHeader,
      'Idempotency-Key': idem,
      'x-ron-paid-op': proof.op || 'hold',
      'x-ron-paid-asset': proof.asset || 'roc',
      'x-ron-paid-estimate-minor': proof.amount_minor,
      'x-ron-wallet-txid': proof.txid,
      'x-ron-wallet-receipt-hash': proof.receipt_hash,
      'x-ron-wallet-from': proof.from,
      'x-ron-wallet-to': proof.to,
    };

    const passportSubject = stringValue(this.gateway?.passportSubject);
    const walletAccount = stringValue(proof.from, this.gateway?.walletAccount);
    const title = stringValue(metadata.title);
    const description = stringValue(metadata.description, metadata.summary);
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(',') : stringValue(metadata.tags);
    const artist = stringValue(metadata.artistDisplay, metadata.artist_display, metadata.artist);
    const album = stringValue(metadata.albumTitle, metadata.album_title);
    const releaseType = stringValue(metadata.releaseType, metadata.release_type);
    const duration = stringValue(metadata.duration);
    const genre = stringValue(metadata.genre);
    const language = stringValue(metadata.language);
    const coverImageCrabUrl = stringValue(metadata.coverImageCrabUrl, metadata.cover_image_crab_url);
    const lyricsCrabUrl = stringValue(metadata.lyricsCrabUrl, metadata.lyrics_crab_url);
    const bpm = stringValue(metadata.bpm);
    const keySignature = stringValue(metadata.keySignature, metadata.key_signature);
    const explicitRating = stringValue(metadata.explicitRating, metadata.explicit_rating);
    const legalAttestation = stringValue(metadata.legalAttestationAccepted, metadata.legal_attestation_accepted);

    if (passportSubject) headers['x-ron-passport'] = passportSubject;
    if (walletAccount) headers['x-ron-wallet-account'] = walletAccount;
    if (title) headers['x-ron-asset-title'] = title;
    if (description) headers['x-ron-asset-description'] = description;
    if (tags) headers['x-ron-asset-tags'] = tags;
    if (artist) headers['x-ron-music-artist'] = artist;
    if (album) headers['x-ron-music-album'] = album;
    if (releaseType) headers['x-ron-music-release-type'] = releaseType;
    if (duration) headers['x-ron-music-duration'] = duration;
    if (genre) headers['x-ron-music-genre'] = genre;
    if (language) headers['x-ron-music-language'] = language;
    if (coverImageCrabUrl) headers['x-ron-cover-image-crab-url'] = coverImageCrabUrl;
    if (lyricsCrabUrl) headers['x-ron-lyrics-crab-url'] = lyricsCrabUrl;
    if (bpm) headers['x-ron-music-bpm'] = bpm;
    if (keySignature) headers['x-ron-music-key'] = keySignature;
    if (explicitRating) headers['x-ron-music-explicit-rating'] = explicitRating;
    if (legalAttestation) headers['x-ron-music-rights-attested'] = legalAttestation;

    const response = canUseTauriInvoke()
      ? await uploadMusicWithTauriCommand({
          blob,
          headers,
          idempotencyKey: idem,
        })
      : await this.gateway.request('/assets/music', {
          method: 'POST',
          body: blob,
          label: 'Music asset upload',
          mutation: true,
          parseAs: 'json',
          headers,
          idempotencyKey: idem,
        });

    const assetUrl = extractMusicAssetUrl(response?.data || response);
    const assetCid = extractMusicAssetCid(response?.data || response);

    return {
      ...response,
      request: {
        bytes: blob.size,
        content_type: contentTypeHeader,
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
        transport: canUseTauriInvoke() ? 'tauri_upload_music_asset_gateway' : 'gateway_request_blob',
        cover_art_upload: false,
      },
      paidProof: proof,
      musicAssetUrl: assetUrl,
      musicAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.ready) {
      throw makeMusicError('Music asset requests require the configured gateway client.', 'missing_gateway_client');
    }
  }
}

export function normalizeMusicPrepareRequest(payload = {}) {
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
  const contentType = stringValue(payload.content_type, payload.contentType, payload.mime, inferAudioContentType(payload.file_name));
  const title = stringValue(payload.title, 'Untitled music draft').slice(0, 180);
  const description = stringValue(payload.description, payload.summary).slice(0, 800);
  const tags = normalizeTags(payload.tags);
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('music-prepare', payerAccount, ownerPassport, bytes, contentType, title),
    'music-prepare',
  );

  if (!bytes) {
    throw makeMusicError('Music prepare requires a positive byte count.', 'missing_music_bytes');
  }

  if (!payerAccount) {
    throw makeMusicError('Music prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makeMusicError('Music prepare requires an owner passport subject.', 'missing_owner_passport');
  }

  if (!isAudioContentType(contentType)) {
    throw makeMusicError('Music prepare requires an audio/* content type.', 'invalid_music_content_type');
  }

  return stripEmpty({
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: contentType,
    title,
    description,
    tags,
    artist_display: stringValue(payload.artist_display, payload.artistDisplay, payload.artist),
    album_title: stringValue(payload.album_title, payload.albumTitle),
    release_type: stringValue(payload.release_type, payload.releaseType),
    duration: stringValue(payload.duration),
    genre: stringValue(payload.genre),
    mood: stringValue(payload.mood),
    bpm: stringValue(payload.bpm),
    key_signature: stringValue(payload.key_signature, payload.keySignature),
    explicit_rating: stringValue(payload.explicit_rating, payload.explicitRating),
    language: stringValue(payload.language, 'en'),
    cover_image_crab_url: stringValue(payload.cover_image_crab_url, payload.coverImageCrabUrl),
    lyrics_crab_url: stringValue(payload.lyrics_crab_url, payload.lyricsCrabUrl),
    rights_mode: stringValue(payload.rights_mode, payload.rightsMode),
    license_mode: stringValue(payload.license_mode, payload.licenseMode),
    legal_attestation_accepted: Boolean(payload.legal_attestation_accepted || payload.legalAttestationAccepted),
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
  };

  if (!proof.txid) {
    throw makeMusicError('Paid music upload requires x-ron-wallet-txid proof.', 'missing_wallet_txid');
  }

  if (!proof.receipt_hash) {
    throw makeMusicError('Paid music upload requires x-ron-wallet-receipt-hash proof.', 'missing_wallet_receipt_hash');
  }

  if (!proof.amount_minor) {
    throw makeMusicError('Paid music upload requires x-ron-paid-estimate-minor proof.', 'missing_paid_amount');
  }

  if (!proof.from) {
    throw makeMusicError('Paid music upload requires x-ron-wallet-from proof.', 'missing_wallet_from');
  }

  if (!proof.to) {
    throw makeMusicError('Paid music upload requires x-ron-wallet-to proof.', 'missing_wallet_to');
  }

  return proof;
}

export function extractMusicAssetUrl(data = {}) {
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.music_url,
    source.musicUrl,
    source.audio_url,
    source.audioUrl,
    source.url,
  );

  if (direct.startsWith('crab://')) {
    return direct;
  }

  const cid = extractMusicAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.music`;
  }

  return '';
}

export function extractMusicAssetCid(data = {}) {
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.music_cid,
    source.musicCid,
    source.audio_cid,
    source.audioCid,
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

  const nested = objectValue(source.asset) || objectValue(source.music) || objectValue(source.audio) || objectValue(source.object) || objectValue(source.manifest);
  return nested ? extractMusicAssetCid(nested) : '';
}

function normalizeMusicBlob(value, contentType = '') {
  if (value instanceof Blob) {
    return value;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return new Blob([value], {
      type: contentType || 'application/octet-stream',
    });
  }

  throw makeMusicError('Music upload requires a selected audio file/blob.', 'missing_music_file');
}

async function uploadMusicWithTauriCommand({ blob, headers, idempotencyKey }) {
  const bodyBytes = Array.from(new Uint8Array(await blob.arrayBuffer()));

  const response = await invoke('upload_music_asset_gateway', {
    request: {
      headers,
      bodyBytes,
      idempotencyKey,
    },
  });

  const status = Number(response?.status || 0);
  const data = response?.data ?? null;
  const correlationId = stringValue(response?.correlation_id, response?.correlationId);

  if (!response?.ok || status < 200 || status >= 300) {
    const error = makeMusicError(errorMessageFromCommandResponse(response), reasonFromCommandResponse(response));
    error.status = status;
    error.retryable = status === 408 || status === 429 || status >= 500;
    error.data = data;
    error.correlationId = correlationId;
    error.route = response?.route || '/assets/music';
    throw error;
  }

  return {
    ok: true,
    status,
    route: response?.route || '/assets/music',
    correlationId,
    data,
  };
}

function reasonFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(data.reason, data.code, data.error, response.reason, 'music_upload_failed');
}

function errorMessageFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(
    data.message,
    data.detail,
    data.error,
    data.code,
    `Music upload failed with HTTP ${Number(response?.status || 0)}.`,
  );
}

function canUseTauriInvoke() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
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

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function makeMusicError(message, reason = 'music_asset_client_error') {
  return new MusicAssetClientError(message, {
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

function inferAudioContentType(fileName = '') {
  const name = String(fileName || '').toLowerCase();

  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.flac')) return 'audio/flac';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.aac')) return 'audio/aac';
  if (name.endsWith('.ogg') || name.endsWith('.oga')) return 'audio/ogg';
  if (name.endsWith('.opus')) return 'audio/opus';
  if (name.endsWith('.webm')) return 'audio/webm';

  return 'audio/mpeg';
}

function isAudioContentType(value = '') {
  const clean = String(value || '').trim().toLowerCase();
  return clean.startsWith('audio/');
}