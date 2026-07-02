/**
 * RO:WHAT — Gateway-only paid site_visit quote/pay client for CrabLink React.
 * RO:WHY — NEXT_LEVEL creator economy proof: Visitor B pays Creator A through backend-owned wallet/ledger truth.
 * RO:INTERACTS — GatewayClient, SiteVisitAccess, SiteRender, svc-gateway /sites/:name/visit routes.
 * RO:INVARIANTS — no direct wallet/ledger calls; no fake receipts; payment helper requires confirmed=true.
 * RO:METRICS — forwards x-correlation-id through GatewayClient and exposes returned IDs in summaries.
 * RO:CONFIG — uses configured gateway URL, timeout, passport, wallet, bearer token from GatewayClient.
 * RO:SECURITY — quote is read-only; pay is mutation=true and caller-confirmed only.
 * RO:TEST — manual crab://ron3 Visitor B quote/pay smoke after backend route is wired.
 */

import { makeCrabSiteUrl, normalizeSiteName } from '../utils/crabUrl.js';

const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export function createSiteVisitClient(gateway) {
  return new SiteVisitClient(gateway);
}

export class SiteVisitError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Site visit request failed.'));
    this.name = 'SiteVisitError';
    this.reason = details.reason || 'site_visit_failed';
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

export class SiteVisitClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway?.request);
  }

  async quote(siteNameOrUrl, payload = {}, options = {}) {
    const target = normalizeSiteVisitTarget(siteNameOrUrl);
    const request = normalizeSiteVisitQuoteRequest(target, payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        request.client_idempotency_key ||
        stableSiteVisitIdempotencyKey('quote', target.siteName, request.payer_account, request.recipient_account),
    );

    this.assertGateway('Site visit quote');

    try {
      const response = await this.gateway.request(`/sites/${encodeURIComponent(target.siteName)}/visit/quote`, {
        method: 'POST',
        body: request,
        label: 'Site visit quote',
        headers: siteVisitContextHeaders(request, idempotencyKey),
        idempotencyKey,
      });

      return Object.freeze({
        ok: true,
        target,
        request,
        response: responseSummary(response),
        summary: summarizeSiteVisitQuoteData(response?.data || {}, request, target),
        data: response?.data || null,
        quotedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw wrapSiteVisitError('Unable to quote paid site visit through the configured gateway.', error, {
        target,
        request,
        reason: 'site_visit_quote_failed',
      });
    }
  }

  async pay(siteNameOrUrl, payload = {}, options = {}) {
    const target = normalizeSiteVisitTarget(siteNameOrUrl);

    if (options.confirmed !== true) {
      throw new SiteVisitError('Site visit payment requires explicit caller confirmation.', {
        reason: 'confirmation_required',
        retryable: false,
        target,
      });
    }

    const request = normalizeSiteVisitPayRequest(target, payload);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        request.client_idempotency_key ||
        stableSiteVisitIdempotencyKey(
          'pay',
          target.siteName,
          request.payer_account,
          request.recipient_account,
          request.amount_minor,
          request.quote_id,
        ),
    );

    this.assertGateway('Site visit payment');

    try {
      const response = await this.gateway.request(`/sites/${encodeURIComponent(target.siteName)}/visit/pay`, {
        method: 'POST',
        body: request,
        label: 'Site visit payment',
        mutation: true,
        headers: siteVisitContextHeaders(request, idempotencyKey),
        idempotencyKey,
      });

      return Object.freeze({
        ok: true,
        target,
        request,
        response: responseSummary(response),
        summary: summarizeSiteVisitPaymentData(response?.data || {}, request, target),
        data: response?.data || null,
        paidAt: new Date().toISOString(),
      });
    } catch (error) {
      throw wrapSiteVisitError('Unable to pay paid site visit through the configured gateway.', error, {
        target,
        request,
        reason: 'site_visit_pay_failed',
      });
    }
  }

  assertGateway(label = 'Site visit request') {
    if (!this.gateway || typeof this.gateway.request !== 'function') {
      throw new SiteVisitError(`${label} requires the configured gateway client.`, {
        reason: 'missing_gateway_client',
        retryable: false,
      });
    }
  }
}

function siteVisitContextHeaders(request = {}, idempotencyKey = '') {
  const payerAccount = cleanString(
    request.payer_account ||
      request.payerAccount ||
      request.visitor_wallet_account ||
      request.visitorWalletAccount ||
      '',
  );
  const visitorPassport = cleanString(
    request.visitor_passport_subject ||
      request.visitorPassportSubject ||
      '',
  );

  return stripEmpty({
    'Idempotency-Key': idempotencyKey,
    'x-ron-wallet-account': payerAccount,
    'x-ron-passport': visitorPassport,
  });
}

export function normalizeSiteVisitTarget(value) {
  const raw = cleanString(value);
  const siteName = normalizeSiteName(raw) || normalizeSiteName(raw.replace(/^crab:\/\//i, ''));

  if (!siteName) {
    throw new SiteVisitError('Paid site visit requires a safe crab://<site_name> pointer.', {
      reason: 'invalid_site_name',
      retryable: false,
      target: {
        siteName: '',
        crabUrl: raw,
      },
    });
  }

  return Object.freeze({
    siteName,
    crabUrl: makeCrabSiteUrl(siteName),
  });
}

export function normalizeSiteVisitQuoteRequest(target = {}, payload = {}) {
  const object = objectValue(payload);
  const siteName = normalizeSiteName(object.site_name || object.siteName || target.siteName);
  const crabUrl = cleanString(object.crab_url || object.crabUrl || target.crabUrl || (siteName ? `crab://${siteName}` : ''));
  const payerAccount = cleanString(
    object.payer_account ||
      object.payerAccount ||
      object.visitor_wallet_account ||
      object.visitorWalletAccount ||
      object.wallet_account,
  );
  const visitorPassport = cleanString(
    object.visitor_passport_subject ||
      object.visitorPassportSubject ||
      object.passport_subject ||
      object.passportSubject,
  );
  const recipientAccount = cleanString(
    object.recipient_account ||
      object.recipientAccount ||
      object.owner_wallet_account ||
      object.ownerWalletAccount ||
      object.site_owner_account,
  );
  const maxAmountMinor = normalizePositiveInteger(
    object.max_amount_minor || object.maxAmountMinor || object.max_spend_minor || object.maxSpendMinor,
  );
  const quantity = normalizePositiveInteger(object.quantity || '1') || '1';
  const idem = cleanString(
    object.client_idempotency_key ||
      object.idempotency_key ||
      stableSiteVisitIdempotencyKey('quote', siteName, payerAccount, recipientAccount),
  );

  if (!siteName) {
    throw new SiteVisitError('Site visit quote requires a safe site_name.', {
      reason: 'invalid_site_name',
      retryable: false,
    });
  }

  if (!payerAccount) {
    throw new SiteVisitError('Site visit quote requires a visitor wallet account.', {
      reason: 'missing_payer_account',
      retryable: false,
    });
  }

  return stripEmpty({
    site_name: siteName,
    crab_url: crabUrl,
    action: 'site_visit',
    quantity: Number(quantity),
    payer_account: payerAccount,
    visitor_wallet_account: payerAccount,
    visitor_passport_subject: visitorPassport,
    recipient_account: recipientAccount,
    max_amount_minor: maxAmountMinor,
    client_idempotency_key: compactIdempotencyKey(idem),
  });
}

export function normalizeSiteVisitPayRequest(target = {}, payload = {}) {
  const object = objectValue(payload);
  const quote = objectValue(object.quote || object.site_visit_quote || object.visit_quote);
  const siteName = normalizeSiteName(object.site_name || object.siteName || quote.site_name || quote.siteName || target.siteName);
  const crabUrl = cleanString(
    object.crab_url ||
      object.crabUrl ||
      quote.crab_url ||
      quote.crabUrl ||
      target.crabUrl ||
      (siteName ? `crab://${siteName}` : ''),
  );
  const payerAccount = cleanString(
    object.payer_account ||
      object.payerAccount ||
      object.visitor_wallet_account ||
      object.visitorWalletAccount ||
      quote.payer_account ||
      quote.payerAccount ||
      quote.visitor_wallet_account,
  );
  const visitorPassport = cleanString(
    object.visitor_passport_subject ||
      object.visitorPassportSubject ||
      quote.visitor_passport_subject ||
      quote.visitorPassportSubject,
  );
  const recipientAccount = cleanString(
    object.recipient_account ||
      object.recipientAccount ||
      object.owner_wallet_account ||
      object.ownerWalletAccount ||
      quote.recipient_account ||
      quote.recipientAccount ||
      quote.owner_wallet_account,
  );
  const amountMinor = normalizePositiveInteger(
    object.amount_minor ||
      object.amountMinor ||
      object.price_minor ||
      object.priceMinor ||
      quote.amount_minor ||
      quote.amountMinor ||
      quote.price_minor ||
      quote.priceMinor,
  );
  const asset = cleanString(object.asset || quote.asset || 'roc').toLowerCase();
  const quantity = normalizePositiveInteger(object.quantity || quote.quantity || '1') || '1';
  const quoteId = cleanString(object.quote_id || object.quoteId || quote.quote_id || quote.quoteId || quote.id);
  const quoteHash = cleanString(object.quote_hash || object.quoteHash || quote.quote_hash || quote.quoteHash || quote.hash);
  const idem = cleanString(
    object.client_idempotency_key ||
      object.idempotency_key ||
      stableSiteVisitIdempotencyKey('pay', siteName, payerAccount, recipientAccount, amountMinor, quoteId),
  );

  if (!siteName) {
    throw new SiteVisitError('Site visit payment requires a safe site_name.', {
      reason: 'invalid_site_name',
      retryable: false,
    });
  }

  if (!payerAccount) {
    throw new SiteVisitError('Site visit payment requires a visitor wallet account.', {
      reason: 'missing_payer_account',
      retryable: false,
    });
  }

  if (!recipientAccount) {
    throw new SiteVisitError('Site visit payment requires a payout recipient account.', {
      reason: 'missing_recipient_account',
      retryable: false,
    });
  }

  if (asset !== 'roc') {
    throw new SiteVisitError('Site visit payment currently supports only the internal roc asset.', {
      reason: 'invalid_asset',
      retryable: false,
    });
  }

  if (!amountMinor) {
    throw new SiteVisitError('Site visit payment requires a positive amount_minor from the backend quote.', {
      reason: 'missing_amount_minor',
      retryable: false,
    });
  }

  return stripEmpty({
    site_name: siteName,
    crab_url: crabUrl,
    action: 'site_visit',
    quantity: Number(quantity),
    payer_account: payerAccount,
    visitor_wallet_account: payerAccount,
    visitor_passport_subject: visitorPassport,
    recipient_account: recipientAccount,
    amount_minor: amountMinor,
    asset,
    quote_id: quoteId,
    quote_hash: quoteHash,
    client_idempotency_key: compactIdempotencyKey(idem),
  });
}

export function summarizeSiteVisitQuoteData(data = {}, request = {}, target = {}) {
  const object = objectValue(data);
  const quote = objectValue(
    object.quote ||
      object.site_visit_quote ||
      object.visit_quote ||
      object.estimate ||
      object.payment ||
      object,
  );
  const policy = objectValue(object.policy || quote.policy);
  const payout = objectValue(object.payout || quote.payout || object.recipient || quote.recipient);
  const siteName = normalizeSiteName(quote.site_name || object.site_name || request.site_name || target.siteName);
  const amountMinor = normalizePositiveInteger(
    quote.amount_minor ||
      quote.amountMinor ||
      quote.price_minor ||
      quote.priceMinor ||
      quote.cost_minor ||
      quote.costMinor ||
      quote.estimate_minor ||
      quote.estimateMinor ||
      quote.total_minor ||
      quote.totalMinor ||
      object.amount_minor ||
      object.price_minor,
  );
  const recipientAccount = cleanString(
    quote.recipient_account ||
      quote.recipientAccount ||
      payout.recipient_account ||
      payout.wallet_account ||
      payout.account ||
      request.recipient_account,
  );
  const payerAccount = cleanString(
    quote.payer_account ||
      quote.payerAccount ||
      quote.visitor_wallet_account ||
      object.payer_account ||
      request.payer_account,
  );

  return Object.freeze({
    ok: object.ok !== false,
    schema: cleanString(object.schema || quote.schema || 'ron.site-visit-quote.v1'),
    action: cleanString(quote.action || object.action || request.action || policy.action || 'site_visit'),
    siteName,
    crabUrl: cleanString(quote.crab_url || object.crab_url || request.crab_url || target.crabUrl || (siteName ? `crab://${siteName}` : '')),
    quoteId: cleanString(quote.quote_id || quote.quoteId || quote.id || object.quote_id || object.id),
    quoteHash: cleanString(quote.quote_hash || quote.quoteHash || quote.hash || object.quote_hash),
    asset: cleanString(quote.asset || object.asset || request.asset || 'roc').toLowerCase(),
    amountMinor,
    displayAmount: cleanString(quote.display_amount || quote.displayAmount || object.display_amount || (amountMinor ? `${amountMinor} ROC` : '')),
    quantity: String(quote.quantity || object.quantity || request.quantity || '1'),
    payerAccount,
    visitorPassport: cleanString(
      quote.visitor_passport_subject || object.visitor_passport_subject || request.visitor_passport_subject,
    ),
    recipientAccount,
    recipientKind: cleanString(payout.kind || payout.to || quote.recipient_kind || 'site_owner'),
    expiresAt: cleanString(quote.expires_at || quote.expiresAt || object.expires_at),
    status: cleanString(quote.status || object.status || 'quoted'),
    policy: Object.freeze({ ...policy }),
    raw: object,
  });
}

export function summarizeSiteVisitPaymentData(data = {}, request = {}, target = {}) {
  const object = objectValue(data);
  const payment = objectValue(
    object.payment ||
      object.site_visit_payment ||
      object.visit_payment ||
      object.transfer ||
      object.wallet_transfer ||
      object,
  );
  const walletReceipt = objectValue(
    object.wallet_receipt ||
      object.walletReceipt ||
      payment.wallet_receipt ||
      payment.walletReceipt ||
      object.wallet ||
      payment.wallet,
  );
  const siteReceipt = objectValue(
    object.receipt ||
      object.site_visit_receipt ||
      object.siteVisitReceipt ||
      payment.receipt ||
      payment.site_visit_receipt ||
      payment.siteVisitReceipt,
  );
  const fallbackReceipt = objectHasKeys(walletReceipt) ? walletReceipt : siteReceipt;
  const siteName = normalizeSiteName(payment.site_name || object.site_name || request.site_name || target.siteName);
  const amountMinor = normalizePositiveInteger(
    payment.amount_minor ||
      payment.amountMinor ||
      object.amount_minor ||
      object.amountMinor ||
      walletReceipt.amount_minor ||
      walletReceipt.amountMinor ||
      request.amount_minor,
  );
  const txid = cleanString(
    payment.txid ||
      payment.tx_id ||
      object.txid ||
      object.tx_id ||
      walletReceipt.txid ||
      walletReceipt.tx_id ||
      siteReceipt.wallet_txid ||
      siteReceipt.walletTxid ||
      fallbackReceipt.txid ||
      fallbackReceipt.tx_id,
  );
  const receiptHash = cleanString(
    payment.receipt_hash ||
      payment.receiptHash ||
      object.receipt_hash ||
      object.receiptHash ||
      walletReceipt.receipt_hash ||
      walletReceipt.receiptHash ||
      walletReceipt.hash ||
      siteReceipt.wallet_receipt_hash ||
      siteReceipt.walletReceiptHash ||
      siteReceipt.receipt_hash ||
      siteReceipt.hash,
  );
  const ledgerRoot = cleanString(
    payment.ledger_root ||
      payment.ledgerRoot ||
      object.ledger_root ||
      object.ledgerRoot ||
      walletReceipt.ledger_root ||
      walletReceipt.ledgerRoot ||
      siteReceipt.ledger_root ||
      siteReceipt.ledgerRoot,
  );
  const operationId = cleanString(
    payment.operation_id ||
      payment.operationId ||
      object.operation_id ||
      object.operationId ||
      walletReceipt.operation_id ||
      walletReceipt.operationId ||
      siteReceipt.operation_id ||
      siteReceipt.operationId,
  );

  return Object.freeze({
    ok: object.ok !== false,
    schema: cleanString(object.schema || payment.schema || 'ron.site-visit-payment.v1'),
    action: cleanString(payment.action || object.action || request.action || 'site_visit'),
    siteName,
    crabUrl: cleanString(payment.crab_url || object.crab_url || request.crab_url || target.crabUrl || (siteName ? `crab://${siteName}` : '')),
    asset: cleanString(payment.asset || object.asset || walletReceipt.asset || request.asset || 'roc').toLowerCase(),
    amountMinor,
    displayAmount: cleanString(payment.display_amount || object.display_amount || (amountMinor ? `${amountMinor} ROC` : '')),
    payerAccount: cleanString(
      payment.payer_account ||
        payment.from ||
        object.payer_account ||
        object.from ||
        walletReceipt.from ||
        request.payer_account,
    ),
    recipientAccount: cleanString(
      payment.recipient_account ||
        payment.to ||
        object.recipient_account ||
        object.to ||
        walletReceipt.to ||
        request.recipient_account,
    ),
    nonce: normalizePositiveInteger(payment.nonce || object.nonce || walletReceipt.nonce || request.nonce),
    txid,
    receiptHash,
    ledgerRoot,
    operationId,
    idempotencyKey: cleanString(
      siteReceipt.idempotency_key ||
        siteReceipt.idempotencyKey ||
        walletReceipt.idem ||
        walletReceipt.idempotency_key ||
        object.client_idempotency_key ||
        request.client_idempotency_key,
    ),
    manifestCid: cleanString(siteReceipt.manifest_cid || siteReceipt.manifestCid || object.manifest_cid || payment.manifest_cid),
    rootDocumentCid: cleanString(
      siteReceipt.root_document_cid ||
        siteReceipt.rootDocumentCid ||
        object.root_document_cid ||
        payment.root_document_cid,
    ),
    paidAtMs: cleanString(siteReceipt.paid_at_ms || siteReceipt.paidAtMs || object.paid_at_ms || payment.paid_at_ms),
    walletReceipt,
    siteReceipt,
    receipt: fallbackReceipt,
    status: cleanString(payment.status || object.status || 'paid'),
    raw: object,
  });
}

export function stableSiteVisitIdempotencyKey(scope, ...parts) {
  return compactIdempotencyKey(
    ['crablink-react', 'site-visit', scope, ...parts]
      .map((part) => cleanString(part))
      .filter(Boolean)
      .join(':'),
  );
}

function responseSummary(response = {}) {
  return Object.freeze({
    status: Number(response?.status || 0),
    route: response?.route || '',
    correlationId: response?.correlationId || '',
  });
}

function wrapSiteVisitError(message, error, details = {}) {
  return new SiteVisitError(error?.message || message, {
    reason: error?.reason || details.reason || 'site_visit_failed',
    status: Number(error?.status || 0),
    retryable: Boolean(error?.retryable),
    data: error?.data || null,
    correlationId: String(error?.correlationId || ''),
    target: details.target || null,
    request: details.request || null,
    backendMissing: Boolean(error?.backendMissing),
  });
}

function compactIdempotencyKey(value) {
  const normalized = cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const prefix = 'crablink-visit';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
}

function normalizePositiveInteger(value) {
  const raw = cleanString(value);

  if (/^[0-9]+$/.test(raw) && raw !== '0') {
    return raw;
  }

  const n = Number(raw);
  if (Number.isSafeInteger(n) && n > 0) {
    return String(n);
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
