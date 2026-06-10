/**
 * RO:WHAT — Linked-video preview route/payment-proof helpers for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps linked preview policy shape out of MakePage.jsx.
 * RO:INTERACTS — MakePage.jsx, MakeLinkedVideoDraftPreview.jsx future split, content_view quote/pay flow.
 * RO:INVARIANTS — derives display/payload/header facts only; no wallet mutation; no fake receipts; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — canonical crab://<b3>.video links and configured gateway base URLs.
 * RO:SECURITY — proof headers are backend-derived payment facts only; no secrets or spend authority.
 * RO:TEST — npm run build; manual linked-video quote/pay/preview smoke.
 */

export const LINKED_VIDEO_PREVIEW_RE = /^crab:\/\/([0-9a-f]{64})\.video$/i;


export const MAX_LINKED_VIDEO_PREVIEW_BYTES = 12 * 1024 * 1024;


export function linkedVideoHashFromUrl(value) {
  const match = String(value || '').trim().toLowerCase().match(LINKED_VIDEO_PREVIEW_RE);
  return match?.[1] || '';
}


export function buildLinkedVideoPreviewSources(item, app) {
  const hash = linkedVideoHashFromUrl(item?.url);

  if (!hash) {
    return [];
  }

  const gateway = app?.clients?.gateway || app?.gateway || null;

  if (typeof gateway?.url === 'function') {
    return [
      gateway.url(`/o/b3:${hash}`),
      gateway.url(`/b3/${hash}.video`),
    ];
  }

  const baseUrl = String(
    gateway?.baseUrl ||
    app?.settings?.gatewayUrl ||
    app?.settings?.baseUrl ||
    'http://127.0.0.1:8090',
  ).replace(/\/+$/, '');

  return [
    `${baseUrl}/o/b3:${hash}`,
    `${baseUrl}/b3/${hash}.video`,
  ];
}


export function linkedVideoPreviewSeconds(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return Math.max(0, number / 1000);
}


export function linkedVideoPreviewRangeLabel(item = {}) {
  const startMs = Number(item.sourceStartMs || 0);
  const endMs = Number(item.sourceEndMs || 0);

  if (item.rangeLabel) {
    return item.rangeLabel;
  }

  if (item.useEntireSource || endMs <= startMs) {
    return startMs > 0
      ? `Preview from ${formatLinkedVideoPreviewClock(startMs)}`
      : 'Preview whole source';
  }

  return `Preview ${formatLinkedVideoPreviewClock(startMs)} → ${formatLinkedVideoPreviewClock(endMs)}`;
}


export function formatLinkedVideoPreviewClock(ms = 0) {
  const totalSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}


export function buildLinkedVideoPreviewRoutes(item) {
  const hash = linkedVideoHashFromUrl(item?.url);

  if (!hash) {
    return [];
  }

  return [
    {
      route: `/o/b3:${hash}`,
      label: 'Content ID object',
    },
    {
      route: `/b3/${hash}.video`,
      label: 'Typed b3 route',
    },
  ];
}


export function linkedVideoPreviewTarget(item = {}) {
  const hash = linkedVideoHashFromUrl(item?.url);

  return {
    hash,
    cid: hash ? `b3:${hash}` : '',
    kind: 'video',
    assetKind: 'video',
    assetCrabUrl: String(item?.url || '').trim().toLowerCase(),
  };
}


export function linkedVideoPreviewPayload({ payerAccount = '', passportSubject = '' } = {}) {
  return {
    payer_account: payerAccount,
    viewer_wallet_account: payerAccount,
    viewer_passport_subject: passportSubject,
  };
}


export function linkedVideoPreviewAcceptHeader() {
  return 'video/mp4,video/webm,video/ogg,video/*,*/*';
}


export function linkedVideoPreviewFirstString(...values) {
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


export function linkedVideoPreviewDropEmpty(value = {}) {
  const out = {};

  for (const [key, item] of Object.entries(value || {})) {
    if (item === null || item === undefined || item === '') {
      continue;
    }

    out[key] = String(item);
  }

  return out;
}


export function linkedVideoPreviewPaymentSummary(payment = {}) {
  const summary = payment?.summary || {};
  const data = payment?.data || {};
  const nestedPayment = data?.payment || {};
  const receipt = data?.receipt || {};
  const walletReceipt =
    data?.wallet_receipt ||
    data?.walletReceipt ||
    nestedPayment?.wallet_receipt ||
    nestedPayment?.walletReceipt ||
    {};

  return {
    asset: linkedVideoPreviewFirstString(summary.asset, data.asset, nestedPayment.asset, walletReceipt.asset, 'roc').toLowerCase(),
    amountMinor: linkedVideoPreviewFirstString(
      summary.amountMinor,
      summary.amount_minor,
      data.amountMinor,
      data.amount_minor,
      nestedPayment.amountMinor,
      nestedPayment.amount_minor,
      walletReceipt.amountMinor,
      walletReceipt.amount_minor,
    ),
    payerAccount: linkedVideoPreviewFirstString(
      summary.payerAccount,
      summary.payer_account,
      summary.viewerWalletAccount,
      summary.viewer_wallet_account,
      data.payerAccount,
      data.payer_account,
      nestedPayment.payerAccount,
      nestedPayment.payer_account,
      walletReceipt.from,
    ),
    recipientAccount: linkedVideoPreviewFirstString(
      summary.recipientAccount,
      summary.recipient_account,
      data.recipientAccount,
      data.recipient_account,
      nestedPayment.recipientAccount,
      nestedPayment.recipient_account,
      walletReceipt.to,
    ),
    txid: linkedVideoPreviewFirstString(
      summary.txid,
      summary.tx_id,
      data.txid,
      data.tx_id,
      nestedPayment.txid,
      nestedPayment.tx_id,
      walletReceipt.txid,
      walletReceipt.tx_id,
      receipt.walletTxid,
      receipt.wallet_txid,
    ),
    receiptHash: linkedVideoPreviewFirstString(
      summary.receiptHash,
      summary.receipt_hash,
      data.receiptHash,
      data.receipt_hash,
      nestedPayment.receiptHash,
      nestedPayment.receipt_hash,
      walletReceipt.receiptHash,
      walletReceipt.receipt_hash,
      receipt.walletReceiptHash,
      receipt.wallet_receipt_hash,
    ),
    quoteId: linkedVideoPreviewFirstString(
      summary.quoteId,
      summary.quote_id,
      data.quoteId,
      data.quote_id,
      nestedPayment.quoteId,
      nestedPayment.quote_id,
    ),
    quoteHash: linkedVideoPreviewFirstString(
      summary.quoteHash,
      summary.quote_hash,
      data.quoteHash,
      data.quote_hash,
      nestedPayment.quoteHash,
      nestedPayment.quote_hash,
    ),
    idempotencyKey: linkedVideoPreviewFirstString(
      summary.idempotencyKey,
      summary.idempotency_key,
      data.clientIdempotencyKey,
      data.client_idempotency_key,
      nestedPayment.clientIdempotencyKey,
      nestedPayment.client_idempotency_key,
      walletReceipt.idem,
    ),
  };
}


export function linkedVideoPreviewProofHeaders(payment, { payerAccount = '', passportSubject = '', target = {} } = {}) {
  const proof = linkedVideoPreviewPaymentSummary(payment);

  return linkedVideoPreviewDropEmpty({
    'x-ron-passport': passportSubject,
    'x-ron-wallet-account': linkedVideoPreviewFirstString(proof.payerAccount, payerAccount),
    'x-ron-asset-kind': 'video',
    'x-ron-asset-cid': target.cid,
    'x-ron-asset-crab-url': target.assetCrabUrl,

    // Backend-returned payment proof only. These are not invented locally and
    // remain scoped to previewing this same content_view target.
    'x-ron-paid-op': 'content_view',
    'x-ron-paid-asset': proof.asset || 'roc',
    'x-ron-paid-estimate-minor': proof.amountMinor,
    'x-ron-wallet-txid': proof.txid,
    'x-ron-wallet-receipt-hash': proof.receiptHash,
    'x-ron-wallet-from': linkedVideoPreviewFirstString(proof.payerAccount, payerAccount),
    'x-ron-wallet-to': proof.recipientAccount,
    'x-ron-wallet-idem': proof.idempotencyKey,
    'x-ron-content-view-quote-id': proof.quoteId,
    'x-ron-content-view-quote-hash': proof.quoteHash,
  });
}
