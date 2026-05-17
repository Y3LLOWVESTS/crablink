/**
 * RO:WHAT — Read-only recent receipt collector for CrabLink browser UI.
 * RO:WHY — Surfaces backend-returned wallet/site/asset receipts without inventing wallet or ledger truth.
 * RO:INTERACTS — SiteVisitAccess, PassportDrawer, RecentReceiptsPanel, LibraryPage, HomePage.
 * RO:INVARIANTS — display-only; no wallet mutation; no fake receipts; backend receipt_hash/txid/ledger_root remain truth.
 * RO:METRICS — none.
 * RO:CONFIG — browser local/session storage only.
 * RO:SECURITY — stores public receipt metadata only; no keys, bearer tokens, seed phrases, or spend authority.
 * RO:TEST — pay a site visit or publish a paid asset, reload extension, confirm receipt display cache remains visible.
 */

export const SITE_VISIT_RECEIPT_PREFIX = 'crablink.site_visit.receipt.v1';
export const GENERIC_RECEIPTS_KEY = 'crablink.recent_receipts.v1';
export const RECEIPTS_CHANGED_EVENT = 'crablink:recent-receipts-changed';

const MAX_RECEIPTS = 32;

export function readRecentReceipts(options = {}) {
  const limit = clampLimit(options.limit || MAX_RECEIPTS);
  const seen = new Set();
  const receipts = [];

  for (const receipt of readGenericReceipts()) {
    pushReceipt(receipts, seen, receipt);
  }

  for (const receipt of scanStorageForReceipts('sessionStorage')) {
    pushReceipt(receipts, seen, receipt);
  }

  for (const receipt of scanStorageForReceipts('localStorage')) {
    pushReceipt(receipts, seen, receipt);
  }

  return receipts
    .sort((a, b) => timestampForSort(b.createdAt || b.storedAt) - timestampForSort(a.createdAt || a.storedAt))
    .slice(0, limit);
}

export function writeRecentReceipt(input, options = {}) {
  const normalized = normalizeReceipt(input, {
    source: options.source || input?.source || 'write_recent_receipt',
    storageKey: options.storageKey || '',
  });

  if (!hasReceiptProof(normalized)) {
    return null;
  }

  const current = readGenericReceipts();
  const merged = dedupeReceipts([normalized, ...current]).slice(0, clampLimit(options.limit || MAX_RECEIPTS));

  writeJsonToStorage('localStorage', GENERIC_RECEIPTS_KEY, {
    schema: 'crablink.recent-receipts-cache.v1',
    generatedAt: new Date().toISOString(),
    receipts: merged,
    truthBoundary:
      'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
  });

  if (options.session !== false) {
    writeJsonToStorage('sessionStorage', GENERIC_RECEIPTS_KEY, {
      schema: 'crablink.recent-receipts-cache.v1',
      generatedAt: new Date().toISOString(),
      receipts: merged,
      truthBoundary:
        'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
    });
  }

  if (options.writeIndividualKey !== false) {
    const individualKey = receiptStorageKey(normalized);
    writeJsonToStorage('localStorage', individualKey, normalized);
    writeJsonToStorage('sessionStorage', individualKey, normalized);
  }

  dispatchReceiptsChanged();
  return normalized;
}

export function clearRecentReceiptCache() {
  removeStorageKey('localStorage', GENERIC_RECEIPTS_KEY);
  removeStorageKey('sessionStorage', GENERIC_RECEIPTS_KEY);

  for (const storageName of ['localStorage', 'sessionStorage']) {
    const storage = getStorage(storageName);
    if (!storage) {
      continue;
    }

    const keys = [];

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (isReceiptStorageKey(key)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        storage.removeItem(key);
      }
    } catch (_error) {
      // Browser storage can be unavailable in some contexts; ignore and keep UI functional.
    }
  }

  dispatchReceiptsChanged();
}

export function dispatchReceiptsChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent(RECEIPTS_CHANGED_EVENT, {
        detail: {
          generatedAt: new Date().toISOString(),
        },
      }),
    );
  } catch (_error) {
    // No-op for test/worker contexts.
  }
}

export function subscribeRecentReceipts(callback) {
  if (typeof window === 'undefined' || typeof callback !== 'function') {
    return () => {};
  }

  const handler = () => callback(readRecentReceipts());

  window.addEventListener(RECEIPTS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(RECEIPTS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function normalizeReceipt(input, options = {}) {
  const raw = objectOrEmpty(input);
  const payment = objectOrEmpty(firstObject(raw.payment, raw.site_visit_payment, raw.siteVisitPayment));
  const receipt = objectOrEmpty(firstObject(raw.receipt, raw.wallet_receipt, raw.walletReceipt, payment.receipt));
  const quote = objectOrEmpty(firstObject(raw.quote, raw.site_visit_quote, raw.siteVisitQuote));
  const result = objectOrEmpty(raw.result);

  const action = normalizeAction(
    firstString(
      raw.action,
      raw.kind,
      payment.action,
      quote.action,
      receipt.action,
      result.action,
      raw.op,
      receipt.op,
      payment.op,
    ),
  );

  const crabUrl = firstString(
    raw.crabUrl,
    raw.crab_url,
    raw.siteCrabUrl,
    raw.site_crab_url,
    raw.assetCrabUrl,
    raw.asset_crab_url,
    payment.crabUrl,
    payment.crab_url,
    quote.crabUrl,
    quote.crab_url,
    result.crabUrl,
    result.crab_url,
    raw.route,
    raw.target,
    raw.site,
  );

  const txid = firstString(
    raw.txid,
    raw.tx_id,
    raw.transactionId,
    raw.transaction_id,
    receipt.txid,
    receipt.tx_id,
    payment.txid,
    payment.tx_id,
    result.txid,
    result.tx_id,
  );

  const receiptHash = firstString(
    raw.receiptHash,
    raw.receipt_hash,
    raw.hash,
    receipt.receiptHash,
    receipt.receipt_hash,
    receipt.hash,
    payment.receiptHash,
    payment.receipt_hash,
    result.receiptHash,
    result.receipt_hash,
  );

  const ledgerRoot = cleanCid(
    firstString(
      raw.ledgerRoot,
      raw.ledger_root,
      raw.root,
      receipt.ledgerRoot,
      receipt.ledger_root,
      payment.ledgerRoot,
      payment.ledger_root,
      result.ledgerRoot,
      result.ledger_root,
    ),
  );

  const amountMinor = firstString(
    raw.amountMinor,
    raw.amount_minor,
    raw.amount,
    receipt.amountMinor,
    receipt.amount_minor,
    receipt.amount,
    payment.amountMinor,
    payment.amount_minor,
    payment.amount,
    quote.amountMinor,
    quote.amount_minor,
    result.amountMinor,
    result.amount_minor,
  );

  const asset = firstString(
    raw.asset,
    raw.assetCode,
    raw.asset_code,
    receipt.asset,
    payment.asset,
    quote.asset,
    result.asset,
    'roc',
  ).toLowerCase();

  const payer = firstString(
    raw.payer,
    raw.payerAccount,
    raw.payer_account,
    raw.from,
    receipt.payer,
    receipt.payer_account,
    receipt.from,
    payment.payer,
    payment.payer_account,
    payment.from,
    quote.payer_account,
    result.from,
  );

  const recipient = firstString(
    raw.recipient,
    raw.recipientAccount,
    raw.recipient_account,
    raw.to,
    receipt.recipient,
    receipt.recipient_account,
    receipt.to,
    payment.recipient,
    payment.recipient_account,
    payment.to,
    quote.recipient_account,
    result.to,
  );

  const nonce = firstString(
    raw.nonce,
    receipt.nonce,
    payment.nonce,
    result.nonce,
  );

  const manifestCid = cleanCid(
    firstString(
      raw.manifestCid,
      raw.manifest_cid,
      payment.manifestCid,
      payment.manifest_cid,
      result.manifestCid,
      result.manifest_cid,
    ),
  );

  const rootDocumentCid = cleanCid(
    firstString(
      raw.rootDocumentCid,
      raw.root_document_cid,
      raw.rootCid,
      raw.root_cid,
      payment.rootDocumentCid,
      payment.root_document_cid,
      result.rootDocumentCid,
      result.root_document_cid,
    ),
  );

  const idempotencyKey = firstString(
    raw.idempotencyKey,
    raw.idempotency_key,
    payment.idempotencyKey,
    payment.idempotency_key,
    receipt.idempotencyKey,
    receipt.idempotency_key,
  );

  const createdAt = firstString(
    raw.createdAt,
    raw.created_at,
    raw.paidAt,
    raw.paid_at,
    raw.generatedAt,
    raw.generated_at,
    payment.createdAt,
    payment.created_at,
    receipt.createdAt,
    receipt.created_at,
    result.createdAt,
    result.created_at,
    new Date().toISOString(),
  );

  const title = firstString(
    raw.title,
    payment.title,
    result.title,
    titleForReceipt(action, crabUrl, amountMinor, asset),
  );

  return {
    schema: 'crablink.recent-receipt.v1',
    type: 'receipt',
    kind: action || 'receipt',
    action: action || 'receipt',
    title,
    crabUrl,
    route: crabUrl,
    amountMinor: amountMinor || '',
    amountDisplay: formatAmount(amountMinor, asset),
    asset: asset || 'roc',
    payer,
    recipient,
    from: payer,
    to: recipient,
    txid,
    receiptHash,
    ledgerRoot,
    nonce,
    manifestCid,
    rootDocumentCid,
    idempotencyKey,
    source: options.source || raw.source || 'recent_receipts',
    storageKey: options.storageKey || raw.storageKey || raw.storage_key || '',
    createdAt,
    storedAt: new Date().toISOString(),
    raw,
    truthBoundary:
      'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
  };
}

function readGenericReceipts() {
  const out = [];

  for (const storageName of ['localStorage', 'sessionStorage']) {
    const parsed = readJsonFromStorage(storageName, GENERIC_RECEIPTS_KEY);

    if (Array.isArray(parsed)) {
      out.push(...parsed);
      continue;
    }

    if (Array.isArray(parsed?.receipts)) {
      out.push(...parsed.receipts);
    }
  }

  return out.map((receipt) =>
    normalizeReceipt(receipt, {
      source: receipt?.source || 'generic_receipts_cache',
    }),
  );
}

function scanStorageForReceipts(storageName) {
  const storage = getStorage(storageName);
  const out = [];

  if (!storage) {
    return out;
  }

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (!isReceiptStorageKey(key)) {
        continue;
      }

      const parsed = readJsonFromStorage(storageName, key);

      if (!parsed) {
        continue;
      }

      out.push(
        normalizeReceipt(parsed, {
          source: key?.startsWith(SITE_VISIT_RECEIPT_PREFIX)
            ? 'site_visit_receipt_storage'
            : `${storageName}_receipt_storage`,
          storageKey: key,
        }),
      );
    }
  } catch (_error) {
    return out;
  }

  return out;
}

function pushReceipt(receipts, seen, receipt) {
  const normalized = normalizeReceipt(receipt);

  if (!hasReceiptProof(normalized)) {
    return;
  }

  const key = receiptDedupeKey(normalized);

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  receipts.push(normalized);
}

function dedupeReceipts(receipts) {
  const out = [];
  const seen = new Set();

  for (const receipt of receipts) {
    pushReceipt(out, seen, receipt);
  }

  return out.sort((a, b) => timestampForSort(b.createdAt || b.storedAt) - timestampForSort(a.createdAt || a.storedAt));
}

function hasReceiptProof(receipt) {
  return Boolean(
    receipt?.txid ||
      receipt?.receiptHash ||
      receipt?.ledgerRoot ||
      receipt?.crabUrl ||
      receipt?.idempotencyKey ||
      receipt?.storageKey,
  );
}

function receiptDedupeKey(receipt) {
  return [
    receipt.receiptHash,
    receipt.txid,
    receipt.ledgerRoot,
    receipt.idempotencyKey,
    receipt.action,
    receipt.crabUrl,
    receipt.nonce,
    receipt.createdAt,
  ]
    .filter(Boolean)
    .join('|');
}

function receiptStorageKey(receipt) {
  const proof = sanitizeKeyPart(receipt.receiptHash || receipt.txid || receipt.ledgerRoot || receipt.idempotencyKey || Date.now());
  const action = sanitizeKeyPart(receipt.action || 'receipt');

  if (receipt.action === 'site_visit' || receipt.kind === 'site_visit') {
    return `${SITE_VISIT_RECEIPT_PREFIX}.${action}.${proof}`;
  }

  return `${SITE_VISIT_RECEIPT_PREFIX}.generic.${action}.${proof}`;
}

function isReceiptStorageKey(key) {
  return (
    typeof key === 'string' &&
    key.startsWith(SITE_VISIT_RECEIPT_PREFIX) &&
    key !== GENERIC_RECEIPTS_KEY
  );
}

function readJsonFromStorage(storageName, key) {
  const storage = getStorage(storageName);

  if (!storage || !key) {
    return null;
  }

  try {
    const raw = storage.getItem(key);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function writeJsonToStorage(storageName, key, value) {
  const storage = getStorage(storageName);

  if (!storage || !key) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
}

function removeStorageKey(storageName, key) {
  const storage = getStorage(storageName);

  if (!storage || !key) {
    return;
  }

  try {
    storage.removeItem(key);
  } catch (_error) {
    // Ignore storage failures.
  }
}

function getStorage(storageName) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window?.[storageName] || null;
  } catch (_error) {
    return null;
  }
}

function titleForReceipt(action, crabUrl, amountMinor, asset) {
  const actionLabel = labelFromAction(action || 'receipt');
  const amount = formatAmount(amountMinor, asset);
  const target = crabUrl ? `: ${crabUrl}` : '';

  if (amount) {
    return `${actionLabel} ${amount}${target}`;
  }

  return `${actionLabel}${target}`;
}

function formatAmount(amountMinor, asset = 'roc') {
  const clean = String(amountMinor || '').trim();

  if (!clean) {
    return '';
  }

  const suffix = String(asset || 'roc').toUpperCase();

  if (/^[0-9]+$/.test(clean)) {
    return `${clean} ${suffix}`;
  }

  return `${clean} ${suffix}`;
}

function normalizeAction(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (!clean) {
    return '';
  }

  if (clean.includes('site_visit')) {
    return 'site_visit';
  }

  if (clean.includes('image')) {
    return 'image_publish';
  }

  if (clean.includes('post')) {
    return 'post_publish';
  }

  if (clean.includes('comment')) {
    return 'comment_publish';
  }

  if (clean.includes('article')) {
    return 'article_publish';
  }

  if (clean.includes('hold')) {
    return 'wallet_hold';
  }

  if (clean.includes('transfer')) {
    return 'wallet_transfer';
  }

  return clean.replace(/[^a-z0-9_-]+/g, '_');
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === 'object' && !Array.isArray(value)) || {};
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

function cleanCid(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(clean)) {
    return clean;
  }

  if (/^[0-9a-f]{64}$/.test(clean)) {
    return `b3:${clean}`;
  }

  const match = clean.match(/b3:[0-9a-f]{64}/);
  return match?.[0] || '';
}

function timestampForSort(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 0;
  }

  if (/^[0-9]+$/.test(raw)) {
    const n = Number(raw);
    return n > 10_000_000_000 ? n : n * 1000;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return MAX_RECEIPTS;
  }

  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function sanitizeKeyPart(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-z0-9:_-]+/gi, '_')
    .slice(0, 96);
}

function labelFromAction(action) {
  return String(action || 'receipt')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}