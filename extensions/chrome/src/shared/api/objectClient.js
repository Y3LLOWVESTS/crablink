/**
 * RO:WHAT — Gateway-only paid object upload helper for React CrabLink.
 * RO:WHY — Ports the old root HTML storage proof into the React lane without calling svc-storage directly.
 * RO:INTERACTS — GatewayClient, SiteLaunchFlow, future raw/object asset flows.
 * RO:INVARIANTS — gateway-only; explicit paid proof required; no fake b3 CID; no direct storage/index/ledger calls.
 * RO:METRICS — gateway client supplies x-correlation-id for backend trace correlation.
 * RO:CONFIG — configured GatewayClient base URL, passport, wallet, bearer token, timeout.
 * RO:SECURITY — treats uploaded bytes as untrusted content; caller controls content type and sandboxed preview.
 * RO:TEST — React crab://site prepare → hold → store root HTML → create site smoke.
 */

const B3_RE = /^b3:[0-9a-f]{64}$/;
const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createObjectClient(gateway) {
  return new ObjectClient(gateway);
}

export class ObjectClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Object request failed.'));
    this.name = 'ObjectClientError';
    this.reason = details.reason || 'object_request_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = String(details.correlationId || '');
  }
}

export class ObjectClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async uploadPaidObject({
    bytes,
    contentType = 'application/octet-stream',
    objectKind = 'object',
    paidProof,
    idempotencyKey = '',
    label = 'Paid object upload',
    route = '/paid/o',
  } = {}) {
    this.assertGateway();

    const blob = normalizeBlob(bytes, contentType);
    const proof = normalizePaidProof(paidProof);

    const response = await this.gateway.request(route, {
      method: 'POST',
      body: blob,
      label,
      mutation: true,
      parseAs: 'json',
      idempotencyKey:
        idempotencyKey ||
        stableObjectIdempotencyKey('paid-object', proof.txid, String(blob.size), objectKind),
      headers: {
        'Content-Type': contentType,
        'x-ron-paid-op': proof.op || 'hold',
        'x-ron-paid-asset': proof.asset || 'roc',
        'x-ron-paid-estimate-minor': proof.amount_minor,
        'x-ron-wallet-txid': proof.txid,
        'x-ron-wallet-receipt-hash': proof.receipt_hash,
        'x-ron-wallet-from': proof.from,
        'x-ron-wallet-to': proof.to,
        'x-ron-object-kind': objectKind,
        'x-ron-content-type': contentType,
      },
    });

    const cid = findCanonicalCid(response?.data);

    return {
      ...response,
      objectCid: cid,
      paidProof: proof,
      object: {
        cid,
        bytes: blob.size,
        content_type: contentType,
        object_kind: objectKind,
      },
    };
  }

  async uploadSiteRootHtml({ html, paidProof, idempotencyKey = '' } = {}) {
    const source = String(html || '');
    const validation = validateSiteRootHtml(source);

    if (!validation.ok) {
      throw new ObjectClientError(validation.message, {
        reason: validation.reason,
        retryable: false,
      });
    }

    const response = await this.uploadPaidObject({
      bytes: source,
      contentType: 'text/html; charset=utf-8',
      objectKind: 'site_root_html',
      paidProof,
      idempotencyKey:
        idempotencyKey ||
        stableObjectIdempotencyKey(
          'site-root-html',
          paidProof?.txid || '',
          String(byteLength(source)),
          sourceFingerprint(source),
        ),
      label: 'Site root HTML storage',
      route: '/paid/o',
    });

    if (!response.objectCid) {
      throw new ObjectClientError('Root HTML storage response did not include a canonical b3 CID.', {
        reason: 'missing_cid',
        status: response?.status || 0,
        retryable: false,
        data: response?.data || null,
        correlationId: response?.correlationId || '',
      });
    }

    const imageCids = referencedImageCidsFromSource(source);
    if (imageCids.has(response.objectCid)) {
      throw new ObjectClientError(
        'Storage returned an image asset CID as the root. A site root must be HTML/document bytes, not image bytes.',
        {
          reason: 'image_cid_as_site_root',
          status: response?.status || 0,
          retryable: false,
          data: response?.data || null,
          correlationId: response?.correlationId || '',
        },
      );
    }

    return response;
  }

  assertGateway() {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw new ObjectClientError('Object upload requires the configured gateway client.', {
        reason: 'missing_gateway_client',
        retryable: false,
      });
    }
  }
}

export function normalizePaidProof(proof = {}) {
  const object = proof?.walletHold && typeof proof.walletHold === 'object' ? proof.walletHold : proof;
  const txid = stringValue(object.txid, object.tx_id, object.hold_id, object.holdId, object.receipt?.txid);
  const receiptHash = stringValue(
    object.receipt_hash,
    object.receiptHash,
    object.wallet_receipt_hash,
    object.walletReceiptHash,
    object.receipt?.hash,
    object.receipt?.receipt_hash,
  );
  const from = stringValue(object.from, object.payer, object.payer_account, object.wallet_from);
  const to = stringValue(object.to, object.escrow, object.escrow_account, object.wallet_to);
  const amountMinor = normalizePositiveInteger(
    object.amount_minor ||
      object.amountMinor ||
      object.held_minor ||
      object.heldMinor ||
      object.amount,
  );
  const asset = stringValue(object.asset, 'roc').toLowerCase();
  const op = stringValue(object.op, object.operation, 'hold').toLowerCase();

  if (!txid) {
    throw new ObjectClientError('Paid object proof is missing txid.', {
      reason: 'missing_paid_txid',
      retryable: false,
      data: proof,
    });
  }

  if (!receiptHash) {
    throw new ObjectClientError('Paid object proof is missing receipt_hash.', {
      reason: 'missing_paid_receipt_hash',
      retryable: false,
      data: proof,
    });
  }

  if (!from || !to) {
    throw new ObjectClientError('Paid object proof is missing payer or escrow account.', {
      reason: 'missing_paid_accounts',
      retryable: false,
      data: proof,
    });
  }

  if (!amountMinor) {
    throw new ObjectClientError('Paid object proof is missing amount_minor.', {
      reason: 'missing_paid_amount',
      retryable: false,
      data: proof,
    });
  }

  return Object.freeze({
    txid,
    receipt_hash: receiptHash,
    from,
    to,
    amount_minor: amountMinor,
    asset,
    op,
  });
}

export function findCanonicalCid(value) {
  const seen = new Set();

  function visit(child) {
    if (child === null || child === undefined) {
      return '';
    }

    if (typeof child === 'string') {
      const cid = normalizeB3Cid(child);
      if (cid) {
        return cid;
      }

      const embedded = child.match(/b3:[0-9a-f]{64}/i);
      if (embedded) {
        return normalizeB3Cid(embedded[0]);
      }

      return '';
    }

    if (typeof child !== 'object') {
      return '';
    }

    if (seen.has(child)) {
      return '';
    }

    seen.add(child);

    const preferredKeys = [
      'cid',
      'content_id',
      'contentId',
      'object_cid',
      'objectCid',
      'b3',
      'hash',
      'addr',
      'address',
      'id',
    ];

    for (const key of preferredKeys) {
      const cid = visit(child[key]);
      if (cid) {
        return cid;
      }
    }

    if (Array.isArray(child)) {
      for (const item of child) {
        const cid = visit(item);
        if (cid) {
          return cid;
        }
      }

      return '';
    }

    for (const item of Object.values(child)) {
      const cid = visit(item);
      if (cid) {
        return cid;
      }
    }

    return '';
  }

  return visit(value);
}

export function normalizeB3Cid(value) {
  const raw = String(value || '').trim().toLowerCase();
  const clean = raw
    .replace(/^https?:\/\/[^/]+\/o\//, '')
    .replace(/^https?:\/\/[^/]+\/b3\//, '')
    .replace(/^\/o\//, '')
    .replace(/^\/b3\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\.[a-z][a-z0-9_-]{0,31}$/i, '');

  const hash = clean.startsWith('b3:') ? clean.slice(3) : clean;

  if (/^[0-9a-f]{64}$/.test(hash)) {
    return `b3:${hash}`;
  }

  return '';
}

export function validateSiteRootHtml(source) {
  const html = String(source || '');
  const bytes = byteLength(html);

  if (!html.trim()) {
    return {
      ok: false,
      reason: 'empty_root_html',
      message: 'Root HTML is empty. Add a static HTML root before storing.',
    };
  }

  if (bytes > 1024 * 1024) {
    return {
      ok: false,
      reason: 'root_html_too_large',
      message: 'Root HTML is over the 1 MiB MVP limit. Use a smaller static root document.',
    };
  }

  if (referencedImageCidsFromSource(html).size > 0 && !looksLikeHtml(html)) {
    return {
      ok: false,
      reason: 'image_reference_without_html',
      message: 'The root appears to contain only an image reference. A site root must be an HTML document.',
    };
  }

  return {
    ok: true,
    reason: 'ok',
    message: 'Root HTML is ready for paid object storage.',
  };
}

export function referencedImageCidsFromSource(source) {
  const html = String(source || '');
  const out = new Set();
  const crabImageRe = /crab:\/\/([0-9a-f]{64})\.image(?:[?#][^\s"'<>]*)?/gi;
  let match = crabImageRe.exec(html);

  while (match) {
    out.add(`b3:${String(match[1] || '').toLowerCase()}`);
    match = crabImageRe.exec(html);
  }

  return out;
}

export function stableObjectIdempotencyKey(scope, ...parts) {
  return compactIdempotencyKey(
    ['crablink-react', scope, ...parts]
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .join(':'),
  );
}

export function sourceFingerprint(source) {
  return fnv1aHex(String(source || ''));
}

function normalizeBlob(bytes, contentType) {
  if (bytes instanceof Blob) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Blob([bytes], { type: contentType });
  }

  return new Blob([String(bytes ?? '')], { type: contentType });
}

function looksLikeHtml(value) {
  const text = String(value || '').trim().toLowerCase();
  return text.includes('<!doctype html') || text.includes('<html') || text.includes('<body') || text.includes('<main');
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

function normalizePositiveInteger(value) {
  const raw = String(value ?? '').trim();

  if (/^[0-9]+$/.test(raw) && raw !== '0') {
    return raw;
  }

  const n = Number(raw);
  if (Number.isSafeInteger(n) && n > 0) {
    return String(n);
  }

  return '';
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

function compactIdempotencyKey(value) {
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
  const prefix = 'cl-object';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
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