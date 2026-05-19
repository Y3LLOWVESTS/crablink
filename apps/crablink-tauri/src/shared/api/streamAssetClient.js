/**
 * RO:WHAT — Stream descriptor asset API client for explicit paid crab://stream minting.
 * RO:WHY — Adds the stream equivalent of video prepare → hold → backend publish without pretending live segment streaming exists.
 * RO:INTERACTS — GatewayClient, StreamPublishFlow, svc-gateway /assets/stream/prepare, /assets/stream.
 * RO:INVARIANTS — no fake b3 CIDs; no fake stream URL; no fake receipts; no silent ROC spend; backend remains publication truth.
 * RO:METRICS — gateway correlation IDs are preserved for diagnostics.
 * RO:CONFIG — uses configured gateway URL, passport, wallet, timeout, and bearer token through GatewayClient.
 * RO:SECURITY — paid proof headers are required for publish; no stream keys, ingest secrets, or private media paths are sent.
 * RO:TEST — manual crab://stream prepare → hold → publish descriptor smoke after backend routes exist.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createStreamAssetClient(gateway) {
  return new StreamAssetClient(gateway);
}

export class StreamAssetClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Stream asset request failed.'));
    this.name = 'StreamAssetClientError';
    this.reason = details.reason || 'stream_asset_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
  }
}

export class StreamAssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async prepareStream(payload = {}, options = {}) {
    this.assertGateway();

    const request = normalizeStreamPublishRequest(payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey || request.client_idempotency_key,
      'stream-prepare',
    );

    return this.gateway.request('/assets/stream/prepare', {
      method: 'POST',
      body: {
        ...request,
        client_idempotency_key: idempotencyKey,
      },
      label: 'Stream descriptor prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      idempotencyKey,
    });
  }

  async publishStream({ request, paidProof, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const body = normalizeStreamPublishRequest(request);
    const proof = normalizePaidProof(paidProof);
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'stream-publish',
          proof.txid,
          proof.receipt_hash,
          body.title,
          body.access_policy?.price_roc,
          body.access_policy?.interval_seconds,
        ),
      'stream-publish',
    );

    return this.gateway.request('/assets/stream', {
      method: 'POST',
      body: {
        ...body,
        client_idempotency_key: idem,
      },
      label: 'Stream descriptor publish',
      mutation: true,
      headers: stripEmpty({
        'Idempotency-Key': idem,
        'x-ron-paid-op': 'hold',
        'x-ron-paid-asset': proof.asset || 'roc',
        'x-ron-paid-estimate-minor': proof.amount_minor,
        'x-ron-wallet-txid': proof.txid,
        'x-ron-wallet-receipt-hash': proof.receipt_hash,
        'x-ron-wallet-from': proof.from,
        'x-ron-wallet-to': proof.to,
        'x-ron-asset-kind': 'stream',
        'x-ron-asset-title': body.title,
        'x-ron-asset-description': body.description,
        'x-ron-asset-tags': Array.isArray(body.tags) ? body.tags.join(',') : '',
      }),
      idempotencyKey: idem,
    });
  }

  assertGateway() {
    if (!this.ready) {
      throw new StreamAssetClientError('Gateway client is not ready.', {
        reason: 'gateway_unavailable',
        retryable: true,
      });
    }
  }
}

export function buildStreamPublishRequest({
  draft = {},
  previewState = {},
  pricing = {},
  manifest = null,
  settings = {},
  idempotencyKey = '',
} = {}) {
  const title = cleanString(draft.title) || 'Untitled stream';
  const description = cleanString(draft.description || draft.streamNotes);
  const streamKind = cleanString(draft.streamKind) || 'live_video';
  const tags = normalizeTags(draft.tags);
  const priceRoc = positiveIntegerString(pricing.priceRoc || draft.priceRoc, '5');
  const intervalSeconds = positiveIntegerNumber(
    pricing.intervalSeconds || Number(draft.intervalMinutes || 5) * 60,
    300,
    60,
    86_400,
  );
  const graceSeconds = positiveIntegerNumber(pricing.graceSeconds || draft.graceSeconds, 0, 0, 3_600);
  const freePreviewSeconds = positiveIntegerNumber(
    pricing.freePreviewSeconds || draft.freePreviewSeconds,
    0,
    0,
    3_600,
  );
  const renewPromptSeconds = positiveIntegerNumber(
    pricing.renewPromptSeconds || draft.renewPromptSeconds,
    30,
    0,
    3_600,
  );

  const walletAccount = cleanString(draft.creatorWalletAccount || settings.walletAccount);
  const passportSubject = cleanString(settings.passportSubject || settings.passport || draft.passportSubject);
  const creatorDisplay = cleanString(draft.hostDisplay || draft.channelDisplay || settings.handle || passportSubject);

  const request = {
    schema: 'crablink.stream.publish.request.v1',
    kind: 'stream',
    title,
    description,
    tags,
    stream_kind: streamKind,
    status_hint: 'scheduled',
    creator: stripEmpty({
      display: creatorDisplay,
      passport_subject: passportSubject,
      wallet_account: walletAccount,
    }),
    source: {
      mode: cleanString(draft.sourceMode) || 'local_preview_then_future_gateway_ingest',
      ingest_mode: cleanString(draft.ingestMode) || 'future_gateway_segment_ingest',
      preview_source: cleanString(previewState.source) || 'none',
      preview_label: cleanString(previewState.label) || 'No local preview',
      preview_status: cleanString(previewState.status) || 'idle',
      has_audio: Boolean(previewState.hasAudio),
      local_preview_only: true,
      media_sent_to_backend: false,
    },
    access_policy: {
      action: 'stream_watch_interval',
      asset: 'roc',
      price_roc: priceRoc,
      interval_seconds: intervalSeconds,
      grace_seconds: graceSeconds,
      free_preview_seconds: freePreviewSeconds,
      renew_prompt_seconds: renewPromptSeconds,
      manual_renew_only: true,
      autopay_enabled: false,
      recipient_account: walletAccount,
    },
    linked_assets: stripEmpty({
      cover_image_crab_url: cleanString(draft.coverImageCrabUrl),
      poster_image_crab_url: cleanString(draft.posterImageCrabUrl),
      trailer_video_crab_url: cleanString(draft.trailerVideoCrabUrl),
      replay_video_crab_url: cleanString(draft.replayVideoCrabUrl),
      site_context_crab_url: cleanString(draft.siteContextCrabUrl),
      podcast_output_crab_url: cleanString(draft.podcastOutputCrabUrl),
      podcast_transcript_crab_url: cleanString(draft.podcastTranscriptCrabUrl),
    }),
    chat: stripEmpty({
      mode: cleanString(draft.chatMode),
      welcome: cleanString(draft.chatWelcome),
    }),
    moderation: stripEmpty({
      mode: cleanString(draft.moderationMode),
      content_warning: cleanString(draft.contentWarning),
    }),
    rights: stripEmpty({
      mode: cleanString(draft.rightsMode),
    }),
    payout: stripEmpty({
      mode: cleanString(draft.payoutMode),
      recipient_account: walletAccount,
    }),
    live_delivery: {
      descriptor_only: true,
      live_segments_backend_required: true,
      segment_route: null,
      viewer_route: null,
      no_drm_claim: true,
    },
    local_manifest_preview: manifest || null,
    client_idempotency_key:
      compactIdempotencyKey(idempotencyKey, 'stream-publish') ||
      stableIdempotencyKey('stream-publish', title, passportSubject, walletAccount, priceRoc, intervalSeconds),
  };

  return normalizeStreamPublishRequest(request);
}

export function normalizeStreamPublishRequest(payload = {}) {
  const body = objectValue(payload);
  const title = cleanString(body.title) || 'Untitled stream';
  const description = cleanString(body.description);
  const tags = normalizeTags(body.tags);

  const accessPolicy = objectValue(body.access_policy);
  const creator = objectValue(body.creator);
  const source = objectValue(body.source);

  const normalized = {
    schema: cleanString(body.schema) || 'crablink.stream.publish.request.v1',
    kind: 'stream',
    title,
    description,
    tags,
    stream_kind: cleanString(body.stream_kind) || 'live_video',
    status_hint: cleanString(body.status_hint) || 'scheduled',
    creator: stripEmpty({
      display: cleanString(creator.display),
      passport_subject: cleanString(creator.passport_subject),
      wallet_account: cleanString(creator.wallet_account),
    }),
    source: {
      mode: cleanString(source.mode) || 'local_preview_then_future_gateway_ingest',
      ingest_mode: cleanString(source.ingest_mode) || 'future_gateway_segment_ingest',
      preview_source: cleanString(source.preview_source) || 'none',
      preview_label: cleanString(source.preview_label) || 'No local preview',
      preview_status: cleanString(source.preview_status) || 'idle',
      has_audio: Boolean(source.has_audio),
      local_preview_only: source.local_preview_only !== false,
      media_sent_to_backend: false,
    },
    access_policy: {
      action: 'stream_watch_interval',
      asset: 'roc',
      price_roc: positiveIntegerString(accessPolicy.price_roc, '5'),
      interval_seconds: positiveIntegerNumber(accessPolicy.interval_seconds, 300, 60, 86_400),
      grace_seconds: positiveIntegerNumber(accessPolicy.grace_seconds, 0, 0, 3_600),
      free_preview_seconds: positiveIntegerNumber(accessPolicy.free_preview_seconds, 0, 0, 3_600),
      renew_prompt_seconds: positiveIntegerNumber(accessPolicy.renew_prompt_seconds, 30, 0, 3_600),
      manual_renew_only: true,
      autopay_enabled: false,
      recipient_account: cleanString(accessPolicy.recipient_account),
    },
    linked_assets: stripEmpty(objectValue(body.linked_assets)),
    chat: stripEmpty(objectValue(body.chat)),
    moderation: stripEmpty(objectValue(body.moderation)),
    rights: stripEmpty(objectValue(body.rights)),
    payout: stripEmpty(objectValue(body.payout)),
    live_delivery: {
      descriptor_only: true,
      live_segments_backend_required: true,
      segment_route: null,
      viewer_route: null,
      no_drm_claim: true,
      ...stripEmpty(objectValue(body.live_delivery)),
      descriptor_only: true,
      live_segments_backend_required: true,
      no_drm_claim: true,
    },
    local_manifest_preview: objectHasKeys(body.local_manifest_preview) ? body.local_manifest_preview : null,
    client_idempotency_key: compactIdempotencyKey(body.client_idempotency_key, 'stream-publish'),
  };

  return normalized;
}

export function normalizePaidProof(input = {}) {
  const proof = objectValue(input);
  const txid = cleanString(proof.txid || proof.tx_id || proof.wallet_txid || proof.hold_txid);
  const receiptHash = cleanString(
    proof.receipt_hash || proof.receiptHash || proof.wallet_receipt_hash || proof.hash,
  );
  const amountMinor = positiveIntegerString(
    proof.amount_minor || proof.amountMinor || proof.estimate_minor || proof.estimateMinor,
    '',
  );
  const from = cleanString(proof.from || proof.from_account || proof.fromAccount || proof.payer_account);
  const to = cleanString(proof.to || proof.to_account || proof.toAccount || proof.escrow_account);

  if (!txid) {
    throw new StreamAssetClientError('Missing wallet hold txid for stream publish.', {
      reason: 'missing_wallet_txid',
    });
  }

  if (!receiptHash) {
    throw new StreamAssetClientError('Missing wallet receipt hash for stream publish.', {
      reason: 'missing_receipt_hash',
    });
  }

  if (!amountMinor) {
    throw new StreamAssetClientError('Missing paid estimate amount for stream publish.', {
      reason: 'missing_paid_amount',
    });
  }

  return {
    asset: cleanString(proof.asset) || 'roc',
    txid,
    receipt_hash: receiptHash,
    amount_minor: amountMinor,
    from,
    to,
    raw: proof,
  };
}

export function extractStreamAssetCid(data = {}) {
  const root = objectValue(data);
  const candidates = [
    root.cid,
    root.content_id,
    root.contentId,
    root.asset_cid,
    root.assetCid,
    root.stream_cid,
    root.streamCid,
    root.manifest_cid,
    root.manifestCid,
    root?.asset?.cid,
    root?.asset?.content_id,
    root?.stream?.cid,
    root?.manifest?.cid,
  ];

  for (const candidate of candidates) {
    const cid = normalizeCid(candidate);

    if (cid) {
      return cid;
    }
  }

  return '';
}

export function extractStreamAssetUrl(data = {}) {
  const root = objectValue(data);
  const candidates = [
    root.crab_url,
    root.crabUrl,
    root.stream_url,
    root.streamUrl,
    root.asset_url,
    root.assetUrl,
    root?.asset?.crab_url,
    root?.stream?.crab_url,
    root?.manifest?.crab_url,
  ];

  for (const candidate of candidates) {
    const url = cleanString(candidate);

    if (/^crab:\/\/[0-9a-f]{64}\.stream$/i.test(url)) {
      return url.toLowerCase();
    }
  }

  const cid = extractStreamAssetCid(root).replace(/^b3:/, '');

  if (HEX_64_RE.test(cid)) {
    return `crab://${cid}.stream`;
  }

  return '';
}

export function extractStreamId(data = {}) {
  const root = objectValue(data);
  return cleanString(
    root.stream_id ||
      root.streamId ||
      root?.stream?.id ||
      root?.stream?.stream_id ||
      root?.session?.stream_id ||
      root?.session?.id,
  );
}

export function stableIdempotencyKey(...parts) {
  const source = parts.map((part) => cleanString(part)).filter(Boolean).join(':');
  const hash = fnv1aHex(source || `${Date.now()}:${Math.random()}`);
  const label = cleanString(parts[0]) || 'stream';
  return compactIdempotencyKey(`${label}:${hash}`, 'stream');
}

export function compactIdempotencyKey(value, fallbackPrefix = 'stream') {
  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const prefix = cleanString(fallbackPrefix) || 'stream';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
}

function normalizeCid(value) {
  const raw = cleanString(value).toLowerCase();

  if (raw.startsWith('b3:') && HEX_64_RE.test(raw.slice(3))) {
    return raw;
  }

  if (HEX_64_RE.test(raw)) {
    return `b3:${raw}`;
  }

  return '';
}

function normalizeTags(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/,|\n/);

  return raw
    .map((tag) => cleanString(tag).replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 24);
}

function positiveIntegerString(value, fallback) {
  const raw = cleanString(value).replace(/[^0-9]/g, '');

  if (/^[0-9]+$/.test(raw) && raw !== '0') {
    return raw;
  }

  return cleanString(fallback);
}

function positiveIntegerNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, safe));
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

function objectHasKeys(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0);
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
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