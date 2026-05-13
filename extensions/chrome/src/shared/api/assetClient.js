/**
 * RO:WHAT — Asset API client for React CrabLink typed b3/crab asset views and explicit image publishing.
 * RO:WHY — Centralizes asset resolve, prepare, and upload calls through svc-gateway while preserving explicit ROC-gated actions.
 * RO:INTERACTS — gatewayClient, AssetPage, AssetResolver, AssetHydratedView, ImagePublishFlow.
 * RO:INVARIANTS — no fake b3 CIDs; no fake receipts; no direct storage/index/omnigate/wallet calls; no silent ROC spend.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured gateway client base URL, passport, wallet, timeout, and bearer token.
 * RO:SECURITY — mutating upload requires caller-supplied paid hold proof; raw image body is sent only to svc-gateway.
 * RO:TEST — React route smoke with crab://<hash>.image, b3:<hash>, and crab://image prepare/hold/upload.
 */

const HEX_64_RE = /^[0-9a-f]{64}$/;
const ASSET_KIND_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createAssetClient(gateway) {
  return new AssetClient(gateway);
}

export class AssetResolveError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Asset resolution failed.'));
    this.name = 'AssetResolveError';
    this.problemCode = details.problemCode || 'asset_resolve_failed';
    this.reason = details.reason || this.problemCode;
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.title = details.title || titleForProblem(this.problemCode);
    this.copy = details.copy || copyForProblem(this.problemCode);
    this.remediation = details.remediation || remediationForProblem(this.problemCode);
    this.target = details.target || null;
    this.attempts = Array.isArray(details.attempts) ? details.attempts : [];
    this.data = details.data || null;
    this.correlationId = details.correlationId || '';
    this.route = details.route || '';
  }
}

export class AssetClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async resolveRoute(route) {
    this.assertGateway();

    const target = normalizeAssetTarget(route);
    const attempts = [];

    const crabPath = `/crab/resolve?url=${encodeURIComponent(target.assetUrl)}`;

    try {
      const response = await this.gateway.request(crabPath, {
        label: 'Asset crab resolve',
      });

      attempts.push(attemptFromResponse(response, crabPath, true));

      return normalizeAssetResolveResponse(response, target, attempts);
    } catch (error) {
      attempts.push(attemptFromError(error, crabPath));
    }

    const b3Path = `/b3/${target.hash}.${target.kind}`;

    try {
      const response = await this.gateway.request(b3Path, {
        label: 'Asset b3 resolve',
      });

      attempts.push(attemptFromResponse(response, b3Path, true));

      return normalizeAssetResolveResponse(response, target, attempts);
    } catch (error) {
      attempts.push(attemptFromError(error, b3Path));

      throw new AssetResolveError(error?.message || 'Asset could not be resolved.', {
        problemCode: statusToProblemCode(error?.status),
        reason: error?.reason || statusToProblemCode(error?.status),
        status: Number(error?.status || 0),
        retryable: Boolean(error?.retryable || isRetryableStatus(error?.status)),
        target,
        attempts,
        data: error?.data || null,
        correlationId: error?.correlationId || '',
        route: error?.route || b3Path,
      });
    }
  }

  previewSources(hash, kind = 'image') {
    const normalizedHash = normalizeHash(hash);
    const assetKind = normalizeKind(kind);

    if (!normalizedHash) {
      return [];
    }

    if (typeof this.gateway?.url === 'function') {
      return [
        this.gateway.url(`/o/b3:${normalizedHash}`),
        this.gateway.url(`/b3/${normalizedHash}.${assetKind}`),
      ];
    }

    const baseUrl = String(this.gateway?.baseUrl || 'http://127.0.0.1:8090').replace(/\/+$/, '');

    return [
      `${baseUrl}/o/b3:${normalizedHash}`,
      `${baseUrl}/b3/${normalizedHash}.${assetKind}`,
    ];
  }

  async prepareImage(payload = {}) {
    this.assertGateway();

    const request = normalizeImagePrepareRequest(payload);

    return this.gateway.request('/assets/image/prepare', {
      method: 'POST',
      body: request,
      label: 'Image prepare',
      mutation: true,
      headers: {
        'Idempotency-Key': request.client_idempotency_key,
      },
      idempotencyKey: request.client_idempotency_key,
    });
  }

  async uploadImage({ file, bytes, contentType, paidProof, metadata = {}, idempotencyKey = '' } = {}) {
    this.assertGateway();

    const blob = normalizeImageBlob(file || bytes, contentType);
    const proof = normalizePaidProof(paidProof);
    const contentTypeHeader = stringValue(contentType, file?.type, blob.type, 'application/octet-stream');
    const idem = compactIdempotencyKey(
      idempotencyKey ||
        stableIdempotencyKey(
          'image-upload',
          proof.txid,
          proof.receipt_hash,
          String(blob.size),
          contentTypeHeader,
          metadata?.title,
        ),
      'image-upload',
    );

    const headers = {
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

    const title = stringValue(metadata.title);
    const description = stringValue(metadata.description, metadata.altText, metadata.alt_text);
    const tags = Array.isArray(metadata.tags) ? metadata.tags.join(',') : stringValue(metadata.tags);

    if (title) headers['x-ron-asset-title'] = title;
    if (description) headers['x-ron-asset-description'] = description;
    if (tags) headers['x-ron-asset-tags'] = tags;

    const response = await this.gateway.request('/assets/image', {
      method: 'POST',
      body: blob,
      label: 'Image upload',
      mutation: true,
      parseAs: 'json',
      headers,
      idempotencyKey: idem,
    });

    const assetUrl = extractImageAssetUrl(response?.data || response);
    const assetCid = extractImageAssetCid(response?.data || response);

    return {
      ...response,
      request: {
        bytes: blob.size,
        content_type: contentTypeHeader,
        headers: redactProofHeaders(headers),
        idempotency_key: idem,
      },
      paidProof: proof,
      imageAssetUrl: assetUrl,
      imageAssetCid: assetCid,
    };
  }

  assertGateway() {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw new AssetResolveError('Asset request requires the configured gateway client.', {
        problemCode: 'missing_gateway_client',
        reason: 'missing_gateway_client',
        retryable: false,
      });
    }
  }
}

export function normalizeImagePrepareRequest(payload = {}) {
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
  const contentType = stringValue(payload.content_type, payload.contentType, payload.mime, 'image/png');
  const title = stringValue(payload.title, 'Untitled image draft').slice(0, 160);
  const description = stringValue(payload.description, payload.altText, payload.alt_text).slice(0, 500);
  const tags = normalizeTags(payload.tags);
  const idempotency = compactIdempotencyKey(
    payload.client_idempotency_key ||
      payload.clientIdempotencyKey ||
      payload.idempotency_key ||
      stableIdempotencyKey('image-prepare', payerAccount, ownerPassport, bytes, contentType, title),
    'image-prepare',
  );

  if (!bytes) {
    throw makeAssetError('Image prepare requires a positive byte count.', 'missing_image_bytes');
  }

  if (!payerAccount) {
    throw makeAssetError('Image prepare requires a payer wallet account.', 'missing_payer_account');
  }

  return stripEmpty({
    bytes: Number(bytes),
    payer_account: payerAccount,
    owner_passport_subject: ownerPassport,
    content_type: contentType,
    title,
    description,
    tags,
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
    throw makeAssetError('Paid upload requires x-ron-wallet-txid proof.', 'missing_wallet_txid');
  }

  if (!proof.receipt_hash) {
    throw makeAssetError('Paid upload requires x-ron-wallet-receipt-hash proof.', 'missing_wallet_receipt_hash');
  }

  if (!proof.amount_minor) {
    throw makeAssetError('Paid upload requires x-ron-paid-estimate-minor proof.', 'missing_paid_amount');
  }

  if (!proof.from) {
    throw makeAssetError('Paid upload requires x-ron-wallet-from proof.', 'missing_wallet_from');
  }

  if (!proof.to) {
    throw makeAssetError('Paid upload requires x-ron-wallet-to proof.', 'missing_wallet_to');
  }

  return proof;
}

export function extractImageAssetUrl(data = {}) {
  const source = data?.data && typeof data.data === 'object' ? data.data : data;
  const direct = stringValue(
    source.crab_url,
    source.crabUrl,
    source.asset_url,
    source.assetUrl,
    source.url,
    source.image_url,
    source.imageUrl,
  );

  if (direct.startsWith('crab://')) {
    return direct;
  }

  const cid = extractImageAssetCid(source);

  if (cid?.startsWith('b3:')) {
    return `crab://${cid.slice(3)}.image`;
  }

  return '';
}

export function extractImageAssetCid(data = {}) {
  const source = data?.data && typeof data.data === 'object' ? data.data : data;
  const direct = stringValue(
    source.cid,
    source.content_id,
    source.contentId,
    source.image_cid,
    source.imageCid,
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
    objectValue(source.image) ||
    objectValue(source.object) ||
    objectValue(source.manifest) ||
    null;

  if (nested) {
    return extractImageAssetCid(nested);
  }

  return '';
}

export function normalizeAssetResolveProblem(error) {
  if (error instanceof AssetResolveError) {
    return {
      title: error.title,
      copy: error.copy,
      message: error.message,
      problemCode: error.problemCode,
      reason: error.reason,
      status: error.status,
      retryable: error.retryable,
      target: error.target,
      attempts: error.attempts,
      remediation: error.remediation,
      correlationId: error.correlationId,
      route: error.route,
      data: error.data,
    };
  }

  const status = Number(error?.status || 0);
  const code = statusToProblemCode(status);

  return {
    title: titleForProblem(code),
    copy: copyForProblem(code),
    message: String(error?.message || 'Asset request failed.'),
    problemCode: code,
    reason: error?.reason || code,
    status,
    retryable: Boolean(error?.retryable || isRetryableStatus(status)),
    target: error?.target || null,
    attempts: Array.isArray(error?.attempts) ? error.attempts : [],
    remediation: remediationForProblem(code),
    correlationId: error?.correlationId || '',
    route: error?.route || '',
    data: error?.data || null,
  };
}

function normalizeAssetResolveResponse(response, target, attempts) {
  const data = response?.data || response || {};
  const cid = extractImageAssetCid(data) || target.cid;
  const crabUrl = extractImageAssetUrl(data) || target.assetUrl;

  return {
    ...response,
    data,
    asset: data,
    summary: stripEmpty({
      hash: cid?.startsWith('b3:') ? cid.slice(3) : target.hash,
      cid,
      crabUrl,
      kind: target.kind,
      status: response?.status || 200,
      correlationId: response?.correlationId || '',
    }),
    target,
    attempts,
  };
}

function normalizeAssetTarget(route) {
  const params = route?.params || {};
  const raw =
    stringValue(route?.normalizedInput, route?.rawInput, params.assetUrl, params.crabUrl) ||
    `crab://${params.cid || params.hash || ''}.${params.assetKind || params.kind || 'image'}`;

  const parsed = parseAssetUrl(raw);
  const hash = normalizeHash(params.hash || params.cid || parsed.hash);
  const kind = normalizeKind(params.assetKind || params.kind || parsed.kind || 'image');

  if (!hash) {
    throw new AssetResolveError('Typed asset route requires a 64-character lowercase b3 hash.', {
      problemCode: 'invalid_asset_hash',
      reason: 'invalid_asset_hash',
      retryable: false,
      target: { raw },
    });
  }

  if (!kind) {
    throw new AssetResolveError('Typed asset route requires an asset kind.', {
      problemCode: 'invalid_asset_kind',
      reason: 'invalid_asset_kind',
      retryable: false,
      target: { raw, hash },
    });
  }

  return {
    raw,
    hash,
    cid: `b3:${hash}`,
    kind,
    assetUrl: `crab://${hash}.${kind}`,
  };
}

function parseAssetUrl(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^crab:\/\/([0-9a-f]{64})\.([a-z][a-z0-9_-]{0,31})$/i);

  if (match) {
    return {
      hash: match[1].toLowerCase(),
      kind: match[2].toLowerCase(),
    };
  }

  const b3 = raw.match(/^b3:([0-9a-f]{64})$/i);

  if (b3) {
    return {
      hash: b3[1].toLowerCase(),
      kind: 'image',
    };
  }

  return {
    hash: '',
    kind: '',
  };
}

function normalizeHash(value) {
  const raw = String(value || '')
    .trim()
    .replace(/^b3:/i, '')
    .toLowerCase();

  return HEX_64_RE.test(raw) ? raw : '';
}

function normalizeCid(value) {
  const hash = normalizeHash(value);
  return hash ? `b3:${hash}` : '';
}

function normalizeKind(value) {
  const kind = String(value || '').trim().toLowerCase();
  return ASSET_KIND_RE.test(kind) ? kind : '';
}

function normalizeImageBlob(value, contentType = '') {
  if (value instanceof Blob) {
    return value;
  }

  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return new Blob([value], {
      type: contentType || 'application/octet-stream',
    });
  }

  if (typeof value === 'string') {
    return new Blob([value], {
      type: contentType || 'text/plain;charset=utf-8',
    });
  }

  throw makeAssetError('Image upload requires a selected file/blob.', 'missing_image_file');
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

function attemptFromResponse(response, route, ok) {
  return {
    ok: Boolean(ok),
    route,
    status: Number(response?.status || 200),
    reason: ok ? 'ok' : '',
    message: ok ? 'resolved' : '',
    correlationId: response?.correlationId || '',
  };
}

function attemptFromError(error, route) {
  return {
    ok: false,
    route: error?.route || route,
    status: Number(error?.status || 0),
    reason: error?.reason || statusToProblemCode(error?.status),
    message: String(error?.message || 'request failed'),
    correlationId: error?.correlationId || '',
  };
}

function statusToProblemCode(status) {
  const code = Number(status || 0);

  if (code === 0) return 'gateway_unavailable';
  if (code === 400) return 'asset_bad_request';
  if (code === 401) return 'asset_unauthorized';
  if (code === 403) return 'asset_policy_denied';
  if (code === 404) return 'asset_not_found';
  if (code === 408) return 'asset_timeout';
  if (code === 413) return 'asset_too_large';
  if (code === 429) return 'asset_rate_limited';
  if (code >= 500) return 'asset_upstream_unavailable';

  return `asset_http_${code}`;
}

function titleForProblem(code) {
  if (code === 'asset_not_found') return 'Asset not found';
  if (code === 'gateway_unavailable') return 'Gateway unavailable';
  if (code === 'asset_policy_denied') return 'Asset access denied';
  return 'Asset could not be resolved';
}

function copyForProblem(code) {
  if (code === 'asset_not_found') {
    return 'The gateway was reachable, but it could not find this typed b3-backed asset.';
  }

  if (code === 'gateway_unavailable') {
    return 'CrabLink could not reach the configured gateway for this typed asset route.';
  }

  return 'CrabLink could not hydrate this typed asset through the configured gateway.';
}

function remediationForProblem(code) {
  if (code === 'asset_not_found') {
    return 'If the local dev database was reset, upload the image again or use a current known-good asset URL.';
  }

  if (code === 'gateway_unavailable') {
    return 'Start the RustyOnions dev stack, then refresh the route from extension-origin React.';
  }

  if (code === 'asset_policy_denied') {
    return 'Check passport/capability settings before retrying.';
  }

  return 'Review gateway logs and the structured problem JSON before changing route code.';
}

function makeAssetError(message, reason = 'asset_client_error') {
  const error = new Error(message);
  error.name = 'AssetClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
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

function compactIdempotencyKey(value, prefix = 'crablink') {
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
      return true;
    }),
  );
}

function isRetryableStatus(status) {
  const code = Number(status || 0);
  return code === 408 || code === 429 || code >= 500;
}