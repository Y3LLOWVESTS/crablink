/**
 * RO:WHAT — Pure receipt display projection shared by CrabLink desktop and future TV receipt surfaces.
 * RO:WHY — Centralizes receipt labels, filtering, proof text, redaction, and display-only posture.
 * RO:INTERACTS — desktop recentReceipts.js, ReceiptsPage.jsx, RecentReceiptsPanel.jsx, future TV account UI.
 * RO:INVARIANTS — explicit backend-derived input only; no paid entitlement, wallet, ledger, network, storage, or session authority.
 * RO:SECURITY — allowlisted fields only; unknown, secret-shaped, control-character, and oversized values fail closed.
 * RO:TEST — receiptDisplay.test.mjs and check-crablink-receipt-display-boundary.mjs.
 */

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const PROOF_FIELD_LIMIT = 512;
const ROUTE_FIELD_LIMIT = 2048;
const TITLE_FIELD_LIMIT = 240;
const LABEL_FIELD_LIMIT = 160;
const TIMESTAMP_FIELD_LIMIT = 128;

export const RECEIPT_DISPLAY_FILTERS = Object.freeze([
  Object.freeze({ id: 'all', label: 'All' }),
  Object.freeze({ id: 'site_visit', label: 'Site visits' }),
  Object.freeze({ id: 'publishes', label: 'Publishes' }),
  Object.freeze({ id: 'wallet', label: 'Wallet' }),
]);

export function normalizeReceiptAction(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (!clean) return '';
  if (clean.includes('site_visit')) return 'site_visit';
  if (clean.includes('image')) return 'image_publish';
  if (clean.includes('post')) return 'post_publish';
  if (clean.includes('comment')) return 'comment_publish';
  if (clean.includes('article')) return 'article_publish';
  if (clean.includes('hold')) return 'wallet_hold';
  if (clean.includes('transfer')) return 'wallet_transfer';

  return clean.replace(/[^a-z0-9_-]+/g, '_');
}

export function receiptActionLabel(action) {
  return String(action || 'receipt')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatReceiptAmount(amountMinor, asset = 'roc') {
  const clean = safeDisplayString(amountMinor, PROOF_FIELD_LIMIT);

  return clean
    ? `${clean} ${normalizeReceiptAsset(asset).toUpperCase()}`
    : '';
}

export function receiptTimestampMillis(value) {
  const raw = safeDisplayString(value, TIMESTAMP_FIELD_LIMIT);

  if (!raw) return 0;

  if (/^[0-9]+$/.test(raw)) {
    const numeric = Number(raw);

    if (!Number.isFinite(numeric)) return 0;

    return numeric > 10_000_000_000
      ? numeric
      : numeric * 1000;
  }

  const parsed = Date.parse(raw);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export function formatReceiptTimestamp(value) {
  const raw = safeDisplayString(value, TIMESTAMP_FIELD_LIMIT);

  if (!raw) return 'not returned';

  const millis = receiptTimestampMillis(raw);

  if (millis === 0) return raw;

  const date = new Date(millis);

  return Number.isFinite(date.getTime())
    ? date.toLocaleString()
    : raw;
}

export function receiptDisplayClassName(value) {
  return String(value || 'receipt')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .toLowerCase();
}

export function normalizeReceiptDisplay(input) {
  const raw = objectOrEmpty(input);
  const txid = proofString(raw.txid);
  const receiptHash = proofString(raw.receiptHash);
  const ledgerRoot = proofString(raw.ledgerRoot);
  const operationId = proofString(raw.operationId);

  const hasBackendProof = Boolean(
    txid ||
    receiptHash ||
    ledgerRoot ||
    operationId,
  );

  if (
    raw.backendDerived !== true ||
    !hasBackendProof
  ) {
    return null;
  }

  const action =
    normalizeReceiptAction(
      raw.action || raw.kind,
    ) || 'receipt';

  const crabUrl = safeDisplayString(
    raw.crabUrl || raw.route,
    ROUTE_FIELD_LIMIT,
  );

  const amountMinor = proofString(
    raw.amountMinor,
  );

  const asset = normalizeReceiptAsset(
    raw.asset,
  );

  const payer = proofString(
    raw.payer || raw.from,
  );

  const recipient = proofString(
    raw.recipient || raw.to,
  );

  const nonce = proofString(
    raw.nonce,
  );

  const manifestCid = proofString(
    raw.manifestCid,
  );

  const rootDocumentCid = proofString(
    raw.rootDocumentCid,
  );

  const idempotencyKey = proofString(
    raw.idempotencyKey,
  );

  const source =
    safeDisplayString(
      raw.source,
      LABEL_FIELD_LIMIT,
    ) || 'recent_receipts';

  const sourceLabel =
    safeDisplayString(
      raw.sourceLabel,
      LABEL_FIELD_LIMIT,
    ) || 'backend-derived receipt';

  const storageKey = safeDisplayString(
    raw.storageKey,
    PROOF_FIELD_LIMIT,
  );

  const createdAt = safeDisplayString(
    raw.createdAt,
    TIMESTAMP_FIELD_LIMIT,
  );

  const storedAt = safeDisplayString(
    raw.storedAt,
    TIMESTAMP_FIELD_LIMIT,
  );

  const title =
    safeDisplayString(
      raw.title,
      TITLE_FIELD_LIMIT,
    ) ||
    crabUrl ||
    txid ||
    receiptActionLabel(action);

  return Object.freeze({
    schema: 'crablink.receipt-display.v1',
    type: 'receipt',
    kind: action,
    action,
    title,
    backendDerived: true,
    displayOnly: true,
    sourceLabel,
    paidEntitlementAuthority: false,
    crabUrl,
    route: crabUrl,
    amountMinor,
    amountDisplay:
      safeDisplayString(
        raw.amountDisplay,
        PROOF_FIELD_LIMIT,
      ) ||
      formatReceiptAmount(
        amountMinor,
        asset,
      ),
    asset,
    payer,
    recipient,
    from: payer,
    to: recipient,
    txid,
    receiptHash,
    ledgerRoot,
    operationId,
    nonce,
    manifestCid,
    rootDocumentCid,
    idempotencyKey,
    source,
    storageKey,
    createdAt,
    storedAt,
    truthBoundary:
      'Display-only projection of explicit backend-derived receipt metadata. Backend wallet and ledger remain authoritative; this projection is not paid entitlement.',
  });
}

export function normalizeReceiptDisplayList(receipts) {
  if (!Array.isArray(receipts)) {
    return Object.freeze([]);
  }

  const normalized = receipts
    .map(normalizeReceiptDisplay)
    .filter(Boolean)
    .sort(
      (left, right) =>
        receiptTimestampMillis(
          right.createdAt || right.storedAt,
        ) -
        receiptTimestampMillis(
          left.createdAt || left.storedAt,
        ),
    );

  return Object.freeze(normalized);
}

export function filterReceiptDisplayList(
  receipts,
  filter = 'all',
) {
  const normalized =
    normalizeReceiptDisplayList(receipts);

  let filtered;

  switch (filter) {
    case 'site_visit':
      filtered = normalized.filter(
        (receipt) =>
          receipt.action.includes(
            'site_visit',
          ),
      );
      break;

    case 'publishes':
      filtered = normalized.filter(
        (receipt) =>
          isPublishAction(
            receipt.action,
          ),
      );
      break;

    case 'wallet':
      filtered = normalized.filter(
        (receipt) =>
          isWalletAction(
            receipt.action,
          ),
      );
      break;

    default:
      filtered = [...normalized];
      break;
  }

  return Object.freeze(filtered);
}

export function countReceiptDisplayGroups(receipts) {
  const normalized =
    normalizeReceiptDisplayList(receipts);

  return Object.freeze({
    all: normalized.length,
    site_visit:
      filterReceiptDisplayList(
        normalized,
        'site_visit',
      ).length,
    publishes:
      filterReceiptDisplayList(
        normalized,
        'publishes',
      ).length,
    wallet:
      filterReceiptDisplayList(
        normalized,
        'wallet',
      ).length,
  });
}

export function buildReceiptProofText(receipt) {
  const normalized =
    normalizeReceiptDisplay(receipt);

  if (!normalized) return '';

  return [
    `action=${normalized.action}`,
    normalized.crabUrl
      ? `crab_url=${normalized.crabUrl}`
      : '',
    normalized.amountDisplay ||
    normalized.amountMinor
      ? `amount=${
          normalized.amountDisplay ||
          normalized.amountMinor
        }`
      : '',
    normalized.payer
      ? `from=${normalized.payer}`
      : '',
    normalized.recipient
      ? `to=${normalized.recipient}`
      : '',
    normalized.txid
      ? `txid=${normalized.txid}`
      : '',
    normalized.receiptHash
      ? `receipt_hash=${normalized.receiptHash}`
      : '',
    normalized.ledgerRoot
      ? `ledger_root=${normalized.ledgerRoot}`
      : '',
    normalized.nonce
      ? `nonce=${normalized.nonce}`
      : '',
    normalized.manifestCid
      ? `manifest_cid=${normalized.manifestCid}`
      : '',
    normalized.rootDocumentCid
      ? `root_document_cid=${normalized.rootDocumentCid}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function receiptDisplayKey(
  receipt,
  index = 0,
) {
  const normalized =
    normalizeReceiptDisplay(receipt);

  if (!normalized) {
    return `receipt:${Number(index) || 0}`;
  }

  return [
    normalized.receiptHash,
    normalized.txid,
    normalized.ledgerRoot,
    normalized.operationId,
    normalized.idempotencyKey,
    normalized.storageKey,
    normalized.crabUrl,
    Number(index) || 0,
  ]
    .filter(
      (value) =>
        value !== '' &&
        value !== null &&
        value !== undefined,
    )
    .join(':');
}

function safeDisplayString(
  value,
  maxLength,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  const clean = String(value).trim();

  if (
    !clean ||
    clean.length > maxLength ||
    CONTROL_CHARACTERS.test(clean)
  ) {
    return '';
  }

  return clean;
}

function proofString(value) {
  return safeDisplayString(
    value,
    PROOF_FIELD_LIMIT,
  );
}

function normalizeReceiptAsset(value) {
  const clean =
    safeDisplayString(
      value,
      32,
    ).toLowerCase();

  return /^[a-z0-9_-]{1,32}$/.test(clean)
    ? clean
    : 'roc';
}

function objectOrEmpty(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
    ? value
    : {};
}

function isPublishAction(action) {
  return [
    'publish',
    'asset',
    'image',
    'post',
    'comment',
    'article',
  ].some(
    (token) =>
      action.includes(token),
  );
}

function isWalletAction(action) {
  return [
    'wallet',
    'hold',
    'transfer',
    'issue',
    'burn',
  ].some(
    (token) =>
      action.includes(token),
  );
}
