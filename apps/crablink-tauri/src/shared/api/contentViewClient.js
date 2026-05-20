/**
 * RO:WHAT — Gateway-only paid content_view quote/pay client for CrabLink React asset pages.
 * RO:WHY — NEXT_LEVEL creator economy proof: visitors explicitly pay creators for b3-backed asset views through backend wallet truth.
 * RO:INTERACTS — GatewayClient, AssetContentViewAccess, AssetHydratedView, svc-gateway /content/view routes.
 * RO:INVARIANTS — no direct wallet/ledger calls; no fake receipts; payment helper requires confirmed=true.
 * RO:METRICS — forwards x-correlation-id through GatewayClient and exposes returned IDs in summaries.
 * RO:CONFIG — uses configured gateway URL, timeout, passport, wallet, bearer token from GatewayClient.
 * RO:SECURITY — quote is read-only; pay is mutation=true and caller-confirmed only.
 * RO:TEST — open crab://<hash>.article, quote content_view, pay, refresh wallet, and confirm receipt cache.
 */

import { parseTypedAssetBody, makeCrabAssetUrl, normalizeAssetKind, normalizeB3Cid, normalizeHash } from '../utils/crabUrl.js';

const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createContentViewClient(gateway) {
  return new ContentViewClient(gateway);
}

export class ContentViewError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Content view request failed.'));
    this.name = 'ContentViewError';
    this.reason = details.reason || 'content_view_failed';
    this.status = Number(details.status || 0);
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
    this.correlationId = String(details.correlationId || '');
    this.target = details.target || null;
    this.request = details.request || null;
    this.backendMissing = Boolean(
      details.backendMissing ||
        this.status === 404 ||
        this.status === 405 ||
        this.status === 501 ||
        this.reason === 'not_found',
    );
  }
}

export class ContentViewClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async quote(assetTarget, payload = {}, options = {}) {
    const target = normalizeContentViewTarget(assetTarget, payload);
    const request = normalizeQuoteRequest(target, payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        request.client_idempotency_key ||
        stableContentViewIdempotencyKey('quote', target.assetCrabUrl, request.payer_account),
    );

    this.assertGateway('Content view quote');

    try {
      const response = await this.gateway.request('/content/view/quote', {
        method: 'POST',
        label: 'Content view quote',
        headers: contentViewContextHeaders(request, idempotencyKey),
        body: {
          ...request,
          client_idempotency_key: idempotencyKey,
        },
      });

      return normalizeQuoteResponse(response, target, {
        ...request,
        client_idempotency_key: idempotencyKey,
      });
    } catch (error) {
      throw normalizeContentViewError(error, target, request, 'content_view_quote_failed');
    }
  }

  async pay(assetTarget, quoteResult, payload = {}, options = {}) {
    if (options.confirmed !== true) {
      throw new ContentViewError('Content view payment requires explicit user confirmation.', {
        reason: 'payment_not_confirmed',
        target: normalizeContentViewTarget(assetTarget, payload),
        retryable: false,
      });
    }

    const target = normalizeContentViewTarget(assetTarget, payload);
    const quoteSummary = normalizeContentViewSummary(quoteResult?.summary || quoteResult?.data || quoteResult || {});
    const request = normalizePayRequest(target, quoteSummary, payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        request.client_idempotency_key ||
        stableContentViewIdempotencyKey('pay', target.assetCrabUrl, request.payer_account),
    );

    this.assertGateway('Content view payment');

    try {
      const response = await this.gateway.request('/content/view/pay', {
        method: 'POST',
        label: 'Content view payment',
        mutation: true,
        headers: contentViewContextHeaders(request, idempotencyKey),
        body: {
          ...request,
          client_idempotency_key: idempotencyKey,
        },
      });

      return normalizePaymentResponse(response, target, quoteSummary, {
        ...request,
        client_idempotency_key: idempotencyKey,
      });
    } catch (error) {
      throw normalizeContentViewError(error, target, request, 'content_view_payment_failed');
    }
  }

  assertGateway(label = 'Content view request') {
    if (!this.ready) {
      throw new ContentViewError(`${label} requires the configured gateway client.`, {
        reason: 'gateway_client_unavailable',
        retryable: true,
      });
    }
  }
}

function contentViewContextHeaders(request = {}, idempotencyKey = '') {
  const payerAccount = firstString(
    request.payer_account,
    request.payerAccount,
    request.viewer_wallet_account,
    request.viewerWalletAccount,
    '',
  );
  const viewerPassport = firstString(
    request.viewer_passport_subject,
    request.viewerPassportSubject,
    '',
  );

  return dropEmpty({
    'Idempotency-Key': idempotencyKey,
    'x-ron-wallet-account': payerAccount,
    'x-ron-passport': viewerPassport,
  });
}

export function normalizeContentViewTarget(assetTarget, payload = {}) {
  const raw = typeof assetTarget === 'string' ? assetTarget : objectOrEmpty(assetTarget);
  const payloadObject = objectOrEmpty(payload);

  if (typeof raw === 'string') {
    const typed = parseTypedAssetBody(raw);

    if (typed) {
      return Object.freeze({
        hash: typed.hash,
        cid: typed.cid,
        kind: typed.kind,
        assetKind: typed.kind,
        assetCrabUrl: typed.crabUrl,
      });
    }
  }

  const hash = normalizeHash(
    firstString(
      raw.hash,
      raw.rawHashHex,
      raw.raw_hash_hex,
      raw.asset_hash,
      raw.assetHash,
      raw.cid,
      raw.asset_cid,
      raw.assetCid,
      payloadObject.hash,
      payloadObject.cid,
      payloadObject.asset_cid,
      payloadObject.assetCid,
    ),
  );
  const kind = normalizeAssetKind(
    firstString(raw.kind, raw.assetKind, raw.asset_kind, payloadObject.kind, payloadObject.assetKind, payloadObject.asset_kind),
    'article',
  );
  const cid = normalizeB3Cid(firstString(raw.cid, raw.asset_cid, raw.assetCid, payloadObject.cid, payloadObject.asset_cid, payloadObject.assetCid, hash));
  const assetCrabUrl = firstString(
    raw.assetCrabUrl,
    raw.asset_crab_url,
    raw.crabUrl,
    raw.crab_url,
    raw.assetUrl,
    raw.asset_url,
    payloadObject.assetCrabUrl,
    payloadObject.asset_crab_url,
    payloadObject.crabUrl,
    payloadObject.crab_url,
    hash ? makeCrabAssetUrl(hash, kind) : '',
  );

  const typed = parseTypedAssetBody(assetCrabUrl);

  return Object.freeze({
    hash: typed?.hash || hash,
    cid: typed?.cid || cid,
    kind: typed?.kind || kind,
    assetKind: typed?.kind || kind,
    assetCrabUrl: typed?.crabUrl || assetCrabUrl,
  });
}

export function normalizeContentViewSummary(value) {
  const data = objectOrEmpty(value);
  const quote = objectOrEmpty(data.quote);
  const payment = objectOrEmpty(data.payment);
  const receipt = objectOrEmpty(data.receipt);
  const walletReceipt = objectOrEmpty(data.wallet_receipt || data.walletReceipt || payment.wallet_receipt || payment.walletReceipt);

  return {
    schema: firstString(data.schema, quote.schema, payment.schema),
    ok: data.ok === true || quote.ok === true || payment.ok === true,
    action: firstString(data.action, quote.action, payment.action, 'content_view'),
    asset: firstString(data.asset, quote.asset, payment.asset, walletReceipt.asset, 'roc').toLowerCase(),
    amountMinor: firstString(data.amountMinor, data.amount_minor, quote.amountMinor, quote.amount_minor, payment.amountMinor, payment.amount_minor, walletReceipt.amountMinor, walletReceipt.amount_minor),
    displayAmount: firstString(data.displayAmount, data.display_amount, quote.displayAmount, quote.display_amount),
    payerAccount: firstString(data.payerAccount, data.payer_account, quote.payerAccount, quote.payer_account, payment.payerAccount, payment.payer_account, walletReceipt.from),
    viewerWalletAccount: firstString(data.viewerWalletAccount, data.viewer_wallet_account, quote.viewerWalletAccount, quote.viewer_wallet_account, payment.viewerWalletAccount, payment.viewer_wallet_account),
    viewerPassportSubject: firstString(data.viewerPassportSubject, data.viewer_passport_subject, quote.viewerPassportSubject, quote.viewer_passport_subject),
    recipientAccount: firstString(data.recipientAccount, data.recipient_account, quote.recipientAccount, quote.recipient_account, payment.recipientAccount, payment.recipient_account, walletReceipt.to),
    assetCid: firstString(data.assetCid, data.asset_cid, quote.assetCid, quote.asset_cid, payment.assetCid, payment.asset_cid, receipt.assetCid, receipt.asset_cid),
    assetKind: firstString(data.assetKind, data.asset_kind, quote.assetKind, quote.asset_kind, payment.assetKind, payment.asset_kind, receipt.assetKind, receipt.asset_kind),
    assetCrabUrl: firstString(data.assetCrabUrl, data.asset_crab_url, quote.assetCrabUrl, quote.asset_crab_url, payment.assetCrabUrl, payment.asset_crab_url, receipt.assetCrabUrl, receipt.asset_crab_url),
    manifestCid: firstString(data.manifestCid, data.manifest_cid, quote.asset_page?.manifest_cid, quote.assetPage?.manifestCid, payment.manifestCid, payment.manifest_cid, receipt.manifestCid, receipt.manifest_cid),
    quoteId: firstString(data.quoteId, data.quote_id, quote.quoteId, quote.quote_id),
    quoteHash: firstString(data.quoteHash, data.quote_hash, quote.quoteHash, quote.quote_hash),
    txid: firstString(data.txid, data.tx_id, payment.txid, payment.tx_id, walletReceipt.txid, walletReceipt.tx_id, receipt.walletTxid, receipt.wallet_txid),
    receiptHash: firstString(data.receiptHash, data.receipt_hash, payment.receiptHash, payment.receipt_hash, walletReceipt.receiptHash, walletReceipt.receipt_hash, receipt.walletReceiptHash, receipt.wallet_receipt_hash),
    ledgerRoot: firstString(data.ledgerRoot, data.ledger_root, payment.ledgerRoot, payment.ledger_root, walletReceipt.ledgerRoot, walletReceipt.ledger_root),
    nonce: firstString(data.nonce, payment.nonce, walletReceipt.nonce),
    idempotencyKey: firstString(data.clientIdempotencyKey, data.client_idempotency_key, payment.clientIdempotencyKey, payment.client_idempotency_key, receipt.idempotencyKey, receipt.idempotency_key, walletReceipt.idem),
    expiresInSeconds: firstString(data.expiresInSeconds, data.expires_in_seconds, quote.expiresInSeconds, quote.expires_in_seconds),
    raw: data,
  };
}

function normalizeQuoteRequest(target, payload = {}) {
  const safe = objectOrEmpty(payload);
  const payer = firstString(safe.payerAccount, safe.payer_account, safe.viewerWalletAccount, safe.viewer_wallet_account, safe.walletAccount, safe.wallet_account);
  const passport = firstString(safe.viewerPassportSubject, safe.viewer_passport_subject, safe.passportSubject, safe.passport_subject);

  return dropEmpty({
    asset_crab_url: target.assetCrabUrl,
    asset_cid: target.cid,
    asset_kind: target.kind,
    action: 'content_view',
    payer_account: payer,
    viewer_wallet_account: firstString(safe.viewerWalletAccount, safe.viewer_wallet_account, payer),
    viewer_passport_subject: passport,
    recipient_account: firstString(safe.recipientAccount, safe.recipient_account),
    max_amount_minor: firstString(safe.maxAmountMinor, safe.max_amount_minor),
    client_idempotency_key: firstString(safe.clientIdempotencyKey, safe.client_idempotency_key),
  });
}

function normalizePayRequest(target, quoteSummary, payload = {}) {
  const safe = objectOrEmpty(payload);
  const payer = firstString(safe.payerAccount, safe.payer_account, quoteSummary.payerAccount, quoteSummary.viewerWalletAccount);
  const amountMinor = firstString(safe.amountMinor, safe.amount_minor, quoteSummary.amountMinor);
  const recipient = firstString(safe.recipientAccount, safe.recipient_account, quoteSummary.recipientAccount);

  return dropEmpty({
    asset_crab_url: target.assetCrabUrl || quoteSummary.assetCrabUrl,
    asset_cid: target.cid || quoteSummary.assetCid,
    asset_kind: target.kind || quoteSummary.assetKind,
    action: 'content_view',
    payer_account: payer,
    viewer_wallet_account: firstString(safe.viewerWalletAccount, safe.viewer_wallet_account, quoteSummary.viewerWalletAccount, payer),
    viewer_passport_subject: firstString(safe.viewerPassportSubject, safe.viewer_passport_subject, quoteSummary.viewerPassportSubject),
    recipient_account: recipient,
    amount_minor: amountMinor,
    asset: firstString(safe.asset, quoteSummary.asset, 'roc').toLowerCase(),
    quote_id: firstString(safe.quoteId, safe.quote_id, quoteSummary.quoteId),
    quote_hash: firstString(safe.quoteHash, safe.quote_hash, quoteSummary.quoteHash),
    nonce: normalizeNonce(safe.nonce),
    client_idempotency_key: firstString(safe.clientIdempotencyKey, safe.client_idempotency_key),
  });
}

function normalizeQuoteResponse(response, target, request) {
  const data = unwrapGatewayData(response);
  const summary = normalizeContentViewSummary(data);

  return {
    ok: true,
    type: 'content_view_quote',
    response,
    data,
    target,
    request,
    summary,
  };
}

function normalizePaymentResponse(response, target, quoteSummary, request) {
  const data = unwrapGatewayData(response);
  const summary = normalizeContentViewSummary(data);

  return {
    ok: true,
    type: 'content_view_payment',
    response,
    data,
    target,
    request,
    quoteSummary,
    summary,
  };
}

function normalizeContentViewError(error, target, request, fallbackReason) {
  if (error instanceof ContentViewError) {
    return error;
  }

  const status = Number(error?.status || error?.response?.status || 0);
  const reason = String(error?.reason || error?.data?.reason || error?.data?.code || fallbackReason || 'content_view_failed').trim();

  return new ContentViewError(error?.message || 'Content view request failed.', {
    reason,
    status,
    retryable: Boolean(error?.retryable || status === 408 || status === 429 || status >= 500),
    data: error?.data || error?.response?.data || null,
    correlationId: error?.correlationId || error?.response?.correlationId || '',
    target,
    request,
    backendMissing: status === 404 || status === 405 || status === 501,
  });
}

function stableContentViewIdempotencyKey(action, assetCrabUrl, payerAccount) {
  const typed = parseTypedAssetBody(assetCrabUrl);
  const safeAction = String(action || 'pay').trim().toLowerCase() === 'quote' ? 'quote' : 'pay';
  const payerHash = fnv1aHex(String(payerAccount || '').trim() || 'anonymous');

  if (typed?.hash) {
    return compactIdempotencyKey(`cl-view-${safeAction}:${typed.hash.slice(0, 16)}:${payerHash}`);
  }

  const seed = [safeAction, assetCrabUrl, payerAccount].filter(Boolean).join(':');
  return compactIdempotencyKey(`cl-view-${safeAction}:${fnv1aHex(seed)}:${payerHash}`);
}

function compactIdempotencyKey(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9:_.-]+/g, '-');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const prefix = 'crablink-view';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
}

function normalizeNonce(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dropEmpty(value) {
  const out = {};

  for (const [key, item] of Object.entries(value || {})) {
    if (item === undefined || item === null || item === '') {
      continue;
    }

    out[key] = item;
  }

  return out;
}

function unwrapGatewayData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data;
  }

  return response || null;
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstString(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }

    const clean = String(value).trim();

    if (clean) {
      return clean;
    }
  }

  return '';
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