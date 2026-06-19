import { callTauri } from '../../platform/tauriPlatform.js';

/**
 * RO:WHAT — Podcast asset API client for explicit paid crab://podcast minting.
 * RO:WHY — Brings the proven music prepare → hold → upload workflow to bounded podcast-lite assets.
 * RO:INTERACTS — GatewayClient, PodcastPublishFlow, Tauri upload_podcast_asset_gateway, svc-gateway /assets/podcast routes.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; no silent ROC spend; backend remains publication truth.
 * RO:METRICS — gateway/command correlation IDs are preserved for diagnostics.
 * RO:CONFIG — uses configured gateway URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — paid proof headers are required; no private keys, local filesystem paths, or cover-art bytes are sent.
 * RO:TEST — manual crab://podcast prepare → hold → upload → crab://<hash>.podcast paid view smoke.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createPodcastAssetClient(gateway) {
  return new PodcastAssetClient(gateway);
}

export class PodcastAssetClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Podcast asset request failed.'));
    this.name = 'PodcastAssetClientError';
    this.reason = details.reason || 'podcast_asset_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
  }
}

export class PodcastAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async preparePodcastAsset(payload = {}, options = {}) {
    this.assertGateway();

    const request = normalizePodcastPrepareRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'podcast-prepare',
    );

    return this.gateway.request('/assets/podcast/prepare', {
      method: 'POST',
      body: {
        ...request,
        client_idempotency_key: idempotencyKey,
      },
      label: 'Podcast asset prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      idempotencyKey,
    });
  }

  async uploadPodcastAsset({
    file,
    bytes,
    contentType,
    paidProof,
    metadata = {},
    idempotencyKey = '',
  } = {}) {
    this.assertGateway();

    const blob = normalizePodcastBlob(file || bytes, contentType);
    const proof = normalizePaidProof(paidProof);
    const contentTypeHeader = stringValue(
      contentType,
      file?.type,
      blob.type,
      inferAudioContentType(file?.name),
    );
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'podcast-upload',
          proof.txid,
          proof.receipt_hash,
          String(blob.size),
          contentTypeHeader,
          metadata?.title,
          metadata?.showTitle,
        ),
      'podcast-upload',
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
    const showTitle = stringValue(metadata.showTitle, metadata.show_title);
    const hostDisplay = stringValue(metadata.hostDisplay, metadata.host_display, metadata.host);
    const guestDisplay = stringValue(metadata.guestDisplay, metadata.guest_display, metadata.guests);
    const seasonNumber = stringValue(metadata.seasonNumber, metadata.season_number, metadata.season);
    const episodeNumber = stringValue(metadata.episodeNumber, metadata.episode_number);
    const duration = stringValue(metadata.duration);
    const category = stringValue(metadata.category);
    const language = stringValue(metadata.language);
    const explicitRating = stringValue(metadata.explicitRating, metadata.explicit_rating);
    const coverImageCrabUrl = stringValue(metadata.coverImageCrabUrl, metadata.cover_image_crab_url);
    const transcriptCrabUrl = stringValue(metadata.transcriptCrabUrl, metadata.transcript_crab_url);
    const chaptersCrabUrl = stringValue(metadata.chaptersCrabUrl, metadata.chapters_crab_url);
    const showPageCrabUrl = stringValue(metadata.showPageCrabUrl, metadata.show_page_crab_url);
    const legalAttestation = stringValue(metadata.legalAttestationAccepted, metadata.legal_attestation_accepted);
    const guestPermission = stringValue(metadata.guestPermissionAttested, metadata.guest_permission_attested);

    if (passportSubject) headers['x-ron-passport'] = passportSubject;
    if (walletAccount) headers['x-ron-wallet-account'] = walletAccount;
    if (title) headers['x-ron-asset-title'] = title;
    if (description) headers['x-ron-asset-description'] = description;
    if (tags) headers['x-ron-asset-tags'] = tags;

    if (showTitle) headers['x-ron-podcast-show'] = showTitle;
    if (hostDisplay) headers['x-ron-podcast-host'] = hostDisplay;
    if (guestDisplay) headers['x-ron-podcast-guest'] = guestDisplay;
    if (seasonNumber) headers['x-ron-podcast-season'] = seasonNumber;
    if (episodeNumber) headers['x-ron-podcast-episode'] = episodeNumber;
    if (duration) headers['x-ron-podcast-duration'] = duration;
    if (category) headers['x-ron-podcast-category'] = category;
    if (language) headers['x-ron-podcast-language'] = language;
    if (explicitRating) headers['x-ron-podcast-explicit-rating'] = explicitRating;
    if (coverImageCrabUrl) headers['x-ron-podcast-cover-image-crab-url'] = coverImageCrabUrl;
    if (transcriptCrabUrl) headers['x-ron-podcast-transcript-crab-url'] = transcriptCrabUrl;
    if (chaptersCrabUrl) headers['x-ron-podcast-chapters-crab-url'] = chaptersCrabUrl;
    if (showPageCrabUrl) headers['x-ron-podcast-show-page-crab-url'] = showPageCrabUrl;
    if (legalAttestation) headers['x-ron-podcast-rights-attested'] = legalAttestation;
    if (guestPermission) headers['x-ron-podcast-guest-permission-attested'] = guestPermission;

    const response = canUseTauriInvoke()
      ? await uploadPodcastWithTauriCommand({
          blob,
          headers,
          idempotencyKey: idem,
        })
      : await this.gateway.request('/assets/podcast', {
          method: 'POST',
          body: blob,
          label: 'Podcast asset upload',
          mutation: true,
          parseAs: 'json',
          headers,
          idempotencyKey: idem,
        });

    const assetUrl = extractPodcastAssetUrl(response?.data || response);
    const assetCid = extractPodcastAssetCid(response?.data || response);

    return {
      ...response,
      request: {
        bytes: blob.size,
        content_type: contentTypeHeader,
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
        transport: canUseTauriInvoke()
          ? 'tauri_upload_podcast_asset_gateway'
          : 'gateway_request_blob',
        cover_art_upload: false,
      },
      paidProof: proof,
      podcastAssetUrl: assetUrl,
      podcastAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.ready) {
      throw makePodcastError(
        'Podcast asset requests require the configured gateway client.',
        'missing_gateway_client',
      );
    }
  }
}

export function normalizePodcastPrepareRequest(payload = {}) {
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
  const contentType = stringValue(
    payload.content_type,
    payload.contentType,
    payload.mime,
    inferAudioContentType(payload.file_name),
  );
  const title = stringValue(payload.title, 'Untitled podcast episode').slice(0, 180);
  const description = stringValue(payload.description, payload.summary).slice(0, 1200);
  const tags = normalizeTags(payload.tags);
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey(
        'podcast-prepare',
        payerAccount,
        ownerPassport,
        bytes,
        contentType,
        title,
      ),
    'podcast-prepare',
  );

  if (!bytes) {
    throw makePodcastError('Podcast prepare requires a positive byte count.', 'missing_podcast_bytes');
  }

  if (!payerAccount) {
    throw makePodcastError('Podcast prepare requires a payer wallet account.', 'missing_payer_account');
  }

  if (!ownerPassport) {
    throw makePodcastError(
      'Podcast prepare requires an owner passport subject.',
      'missing_owner_passport',
    );
  }

  if (!isAudioContentType(contentType)) {
    throw makePodcastError(
      'Podcast prepare requires an audio/* content type.',
      'invalid_podcast_content_type',
    );
  }

  const legalAccepted = Boolean(
    payload.legal_attestation_accepted || payload.legalAttestationAccepted,
  );
  const guestPermission = Boolean(
    payload.guest_permission_attested || payload.guestPermissionAttested,
  );

  if (!legalAccepted) {
    throw makePodcastError(
      'Podcast prepare requires the rights attestation.',
      'missing_podcast_rights_attestation',
    );
  }

  if (!guestPermission) {
    throw makePodcastError(
      'Podcast prepare requires the guest/voice permission attestation.',
      'missing_podcast_guest_permission_attestation',
    );
  }

  return stripEmpty({
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: contentType,
    title,
    description,
    tags,
    show_title: stringValue(payload.show_title, payload.showTitle),
    host_display: stringValue(payload.host_display, payload.hostDisplay, payload.host),
    guest_display: stringValue(payload.guest_display, payload.guestDisplay, payload.guests),
    season_number: stringValue(payload.season_number, payload.seasonNumber, payload.season),
    episode_number: stringValue(payload.episode_number, payload.episodeNumber),
    duration: stringValue(payload.duration),
    category: stringValue(payload.category),
    language: stringValue(payload.language, 'en'),
    explicit_rating: stringValue(payload.explicit_rating, payload.explicitRating),
    cover_image_crab_url: stringValue(payload.cover_image_crab_url, payload.coverImageCrabUrl),
    transcript_crab_url: stringValue(payload.transcript_crab_url, payload.transcriptCrabUrl),
    chapters_crab_url: stringValue(payload.chapters_crab_url, payload.chaptersCrabUrl),
    show_page_crab_url: stringValue(payload.show_page_crab_url, payload.showPageCrabUrl),
    rights_mode: stringValue(payload.rights_mode, payload.rightsMode),
    license_mode: stringValue(payload.license_mode, payload.licenseMode),
    guest_permission_attested: guestPermission,
    legal_attestation_accepted: legalAccepted,
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
    throw makePodcastError('Paid podcast upload requires x-ron-wallet-txid proof.', 'missing_wallet_txid');
  }

  if (!proof.receipt_hash) {
    throw makePodcastError(
      'Paid podcast upload requires x-ron-wallet-receipt-hash proof.',
      'missing_wallet_receipt_hash',
    );
  }

  if (!proof.amount_minor) {
    throw makePodcastError(
      'Paid podcast upload requires x-ron-paid-estimate-minor proof.',
      'missing_paid_amount',
    );
  }

  if (!proof.from) {
    throw makePodcastError('Paid podcast upload requires x-ron-wallet-from proof.', 'missing_wallet_from');
  }

  if (!proof.to) {
    throw makePodcastError('Paid podcast upload requires x-ron-wallet-to proof.', 'missing_wallet_to');
  }

  return proof;
}

export function extractPodcastAssetUrl(data = {}) {
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.podcast_url,
    source.podcastUrl,
    source.audio_url,
    source.audioUrl,
    source.url,
  );

  if (direct.startsWith('crab://')) {
    return direct;
  }

  const cid = extractPodcastAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.podcast`;
  }

  return '';
}

export function extractPodcastAssetCid(data = {}) {
  const source = objectValue(data?.data) || data || {};
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.podcast_cid,
    source.podcastCid,
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

  const nested =
    objectValue(source.asset) ||
    objectValue(source.podcast) ||
    objectValue(source.audio) ||
    objectValue(source.object) ||
    objectValue(source.manifest);

  return nested ? extractPodcastAssetCid(nested) : '';
}

function normalizePodcastBlob(value, contentType = '') {
  if (value instanceof Blob) {
    return value;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return new Blob([value], {
      type: contentType || 'application/octet-stream',
    });
  }

  throw makePodcastError('Podcast upload requires a selected audio file/blob.', 'missing_podcast_file');
}

async function uploadPodcastWithTauriCommand({ blob, headers, idempotencyKey }) {
  const bodyBytes = Array.from(new Uint8Array(await blob.arrayBuffer()));

  const response = await callTauri('upload_podcast_asset_gateway', {
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
    const error = makePodcastError(
      errorMessageFromCommandResponse(response),
      reasonFromCommandResponse(response),
    );
    error.status = status;
    error.retryable = status === 408 || status === 429 || status >= 500;
    error.data = data;
    error.correlationId = correlationId;
    error.route = response?.route || '/assets/podcast';
    throw error;
  }

  return {
    ok: true,
    status,
    route: response?.route || '/assets/podcast',
    correlationId,
    data,
  };
}

function reasonFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(data.reason, data.code, data.error, response.reason, 'podcast_upload_failed');
}

function errorMessageFromCommandResponse(response = {}) {
  const data = objectValue(response?.data) || {};
  return stringValue(
    data.message,
    data.detail,
    data.error,
    data.code,
    `Podcast upload failed with HTTP ${Number(response?.status || 0)}.`,
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
  return (
    parts
      .flat()
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(':') || `crablink:${Date.now()}:${Math.random().toString(16).slice(2)}`
  );
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

function makePodcastError(message, reason = 'podcast_asset_client_error') {
  return new PodcastAssetClientError(message, {
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