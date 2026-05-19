/**
 * RO:WHAT — Recent wallet/site/asset receipt panel for the CrabLink passport drawer.
 * RO:WHY — Gives creators/visitors a readable local receipt history after paid site/image/text actions.
 * RO:INTERACTS — PassportDrawer, recentReceipts.js, CopyButton, JsonPreview.
 * RO:INVARIANTS — display-only; no local wallet mutation; no fake receipt; backend txid/receipt_hash/ledger_root remain truth.
 * RO:METRICS — none.
 * RO:CONFIG — reads recent receipt cache supplied by caller.
 * RO:SECURITY — renders public receipt metadata only; no keys, tokens, or spend authority.
 * RO:TEST — pay site_visit or publish a paid asset, open drawer, copy txid/receipt hash/ledger root, reload extension.
 */

import { useMemo, useState } from 'react';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import {
  clearRecentReceiptCache,
  dispatchReceiptsChanged,
} from '../../shared/receipts/recentReceipts.js';

const FILTERS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'site_visit', label: 'Site visits' },
  { id: 'publishes', label: 'Publishes' },
  { id: 'wallet', label: 'Wallet' },
]);

export default function RecentReceiptsPanel({
  receipts = [],
  onRefresh = null,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [copyState, setCopyState] = useState('');

  const latest = useMemo(() => normalizeReceiptList(receipts), [receipts]);
  const filtered = useMemo(() => filterReceipts(latest, activeFilter), [latest, activeFilter]);
  const counts = useMemo(() => buildCounts(latest), [latest]);
  const hasReceipts = latest.length > 0;

  function clearGenericCache() {
    clearRecentReceiptCache();
    onRefresh?.();
  }

  function refreshReceipts() {
    dispatchReceiptsChanged();
    onRefresh?.();
  }

  async function copyReceiptSummary() {
    const lines = [
      'CrabLink recent receipts',
      '',
      `Total: ${latest.length}`,
      `Site visits: ${counts.site_visit}`,
      `Publishes: ${counts.publishes}`,
      `Wallet: ${counts.wallet}`,
      '',
      ...latest.map((receipt) =>
        [
          `${receipt.action || receipt.kind || 'receipt'} — ${receipt.title || receipt.crabUrl || receipt.txid || 'receipt'}`,
          `  amount: ${receipt.amountDisplay || receipt.amountMinor || 'not returned'}`,
          `  route: ${receipt.crabUrl || 'not returned'}`,
          `  from: ${receipt.payer || receipt.from || 'not returned'}`,
          `  to: ${receipt.recipient || receipt.to || 'not returned'}`,
          `  txid: ${receipt.txid || 'not returned'}`,
          `  receipt_hash: ${receipt.receiptHash || 'not returned'}`,
          `  ledger_root: ${receipt.ledgerRoot || 'not returned'}`,
          `  nonce: ${receipt.nonce || 'not returned'}`,
        ].join('\n'),
      ),
      '',
      'Truth boundary:',
      'These are browser-local display copies only. They do not authorize spending and do not replace backend wallet/ledger reads.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyState('Copied receipt summary');
    } catch (_error) {
      setCopyState('Clipboard unavailable');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  return (
    <section className="cl-passport-truth" aria-label="Recent receipts">
      <header className="cl-drawer-panel-head">
        <div>
          <strong>Recent receipts</strong>
          <p>
            Local display copies of backend-returned receipt metadata. Wallet and ledger truth remain backend-owned.
          </p>
        </div>
        <span className="cl-local-count-pill">{latest.length}</span>
      </header>

      <div className="cl-receipt-summary-grid" aria-label="Receipt summary">
        <ReceiptSummary label="Total" value={latest.length} />
        <ReceiptSummary label="Site visits" value={counts.site_visit} />
        <ReceiptSummary label="Publishes" value={counts.publishes} />
        <ReceiptSummary label="Wallet" value={counts.wallet} />
      </div>

      <div className="cl-passport-actions">
        <button type="button" onClick={refreshReceipts}>
          Refresh receipts
        </button>
        <button type="button" onClick={copyReceiptSummary} disabled={!hasReceipts}>
          Copy summary
        </button>
        <button type="button" onClick={clearGenericCache}>
          Clear display cache
        </button>
      </div>

      {copyState && <p className="cl-receipt-copy-state">{copyState}</p>}

      <div className="cl-receipt-filter-bar" role="tablist" aria-label="Receipt filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={filter.id === activeFilter ? 'is-active' : ''}
            onClick={() => setActiveFilter(filter.id)}
            aria-pressed={filter.id === activeFilter}
          >
            <span>{filter.label}</span>
            <strong>{counts[filter.id] ?? latest.length}</strong>
          </button>
        ))}
      </div>

      {!hasReceipts && (
        <div className="cl-passport-empty-state">
          <strong>No local receipts yet</strong>
          <span>
            Pay a site visit or publish a paid asset, then return here to see the returned txid, receipt hash,
            ledger root, and nonce.
          </span>
        </div>
      )}

      {hasReceipts && filtered.length === 0 && (
        <div className="cl-passport-empty-state">
          <strong>No receipts in this group</strong>
          <span>
            The local receipt cache has entries, but none match this filter.
          </span>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="cl-receipt-list" aria-label="Recent receipt list">
          {filtered.map((receipt, index) => (
            <ReceiptCard
              key={receiptKey(receipt, index)}
              receipt={receipt}
            />
          ))}
        </div>
      )}

      {hasReceipts && (
        <JsonPreview
          label="Recent receipt cache"
          data={{
            count: latest.length,
            filtered_count: filtered.length,
            active_filter: activeFilter,
            receipts: latest,
            truth_boundary:
              'These are local display copies of backend-returned receipts. They do not authorize spending and do not replace backend wallet/ledger reads.',
          }}
        />
      )}
    </section>
  );
}

function ReceiptSummary({ label, value }) {
  return (
    <article className="cl-receipt-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ReceiptCard({ receipt }) {
  const action = receipt.action || receipt.kind || 'receipt';
  const kindLabel = labelFromAction(action);
  const amount = receipt.amountDisplay || formatAmount(receipt.amountMinor, receipt.asset);
  const paidFrom = receipt.payer || receipt.from || 'not returned';
  const paidTo = receipt.recipient || receipt.to || 'not returned';
  const proofText = buildProofText(receipt);
  const route = receipt.crabUrl || receipt.route || '';

  return (
    <article className={`cl-receipt-card is-${classSafe(action)}`}>
      <header>
        <div>
          <span>{kindLabel}</span>
          <strong title={receipt.title || route || receipt.txid || 'Receipt'}>
            {receipt.title || route || receipt.txid || 'Receipt'}
          </strong>
        </div>
        <CopyButton text={proofText} label="Copy proof" disabled={!proofText} />
      </header>

      <div className="cl-receipt-proof-strip">
        <ReceiptMini label="Amount" value={amount || 'not returned'} />
        <ReceiptMini label="Nonce" value={receipt.nonce || 'not returned'} />
        <ReceiptMini label="Asset" value={String(receipt.asset || 'roc').toUpperCase()} />
      </div>

      <dl className="cl-proof-grid">
        <ReceiptFact label="Action" value={action || 'not returned'} />
        <ReceiptFact label="Crab URL" value={route || 'not returned'} monospace copyable />
        <ReceiptFact label="From" value={paidFrom} monospace />
        <ReceiptFact label="To" value={paidTo} monospace />
        <ReceiptFact label="Txid" value={receipt.txid || 'not returned'} monospace copyable />
        <ReceiptFact label="Receipt hash" value={receipt.receiptHash || 'not returned'} monospace copyable />
        <ReceiptFact label="Ledger root" value={receipt.ledgerRoot || 'not returned'} monospace copyable />
        <ReceiptFact label="Manifest CID" value={receipt.manifestCid || 'not returned'} monospace copyable />
        <ReceiptFact label="Root CID" value={receipt.rootDocumentCid || 'not returned'} monospace copyable />
        <ReceiptFact label="Idempotency" value={receipt.idempotencyKey || 'not returned'} monospace copyable />
        <ReceiptFact label="Source" value={receipt.source || 'local_display_cache'} />
        <ReceiptFact label="Created" value={formatTimestamp(receipt.createdAt || receipt.storedAt)} />
      </dl>

      <p className="cl-receipt-truth-note">
        Display-only copy. Backend wallet/ledger remain authoritative.
      </p>
    </article>
  );
}

function ReceiptMini({ label, value }) {
  return (
    <div className="cl-receipt-mini">
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function ReceiptFact({ label, value, monospace = false, copyable = false }) {
  const cleanValue = String(value || '').trim();
  const canCopy = copyable && cleanValue && cleanValue !== 'not returned';

  return (
    <div className="cl-proof-row">
      <dt>{label}</dt>
      <dd
        className={`cl-proof-value ${monospace ? 'is-monospace' : ''}`}
        title={cleanValue}
      >
        <span>{cleanValue || 'n/a'}</span>
        {canCopy && (
          <CopyButton text={cleanValue} label="Copy" />
        )}
      </dd>
    </div>
  );
}

function normalizeReceiptList(receipts) {
  return Array.isArray(receipts)
    ? receipts
        .filter(Boolean)
        .slice()
        .sort((a, b) => timestampForSort(b.createdAt || b.storedAt) - timestampForSort(a.createdAt || a.storedAt))
    : [];
}

function filterReceipts(receipts, filter) {
  switch (filter) {
    case 'site_visit':
      return receipts.filter((receipt) => normalizeAction(receipt.action || receipt.kind).includes('site_visit'));
    case 'publishes':
      return receipts.filter((receipt) => {
        const action = normalizeAction(receipt.action || receipt.kind);
        return action.includes('publish') || action.includes('asset') || action.includes('image') || action.includes('post') || action.includes('comment') || action.includes('article');
      });
    case 'wallet':
      return receipts.filter((receipt) => {
        const action = normalizeAction(receipt.action || receipt.kind);
        return action.includes('wallet') || action.includes('hold') || action.includes('transfer') || action.includes('issue') || action.includes('burn');
      });
    case 'all':
    default:
      return receipts;
  }
}

function buildCounts(receipts) {
  return {
    all: receipts.length,
    site_visit: filterReceipts(receipts, 'site_visit').length,
    publishes: filterReceipts(receipts, 'publishes').length,
    wallet: filterReceipts(receipts, 'wallet').length,
  };
}

function buildProofText(receipt) {
  const lines = [
    `action=${receipt.action || receipt.kind || 'receipt'}`,
    receipt.crabUrl ? `crab_url=${receipt.crabUrl}` : '',
    receipt.amountDisplay || receipt.amountMinor ? `amount=${receipt.amountDisplay || receipt.amountMinor}` : '',
    receipt.payer || receipt.from ? `from=${receipt.payer || receipt.from}` : '',
    receipt.recipient || receipt.to ? `to=${receipt.recipient || receipt.to}` : '',
    receipt.txid ? `txid=${receipt.txid}` : '',
    receipt.receiptHash ? `receipt_hash=${receipt.receiptHash}` : '',
    receipt.ledgerRoot ? `ledger_root=${receipt.ledgerRoot}` : '',
    receipt.nonce ? `nonce=${receipt.nonce}` : '',
    receipt.manifestCid ? `manifest_cid=${receipt.manifestCid}` : '',
    receipt.rootDocumentCid ? `root_document_cid=${receipt.rootDocumentCid}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

function receiptKey(receipt, index) {
  return [
    receipt?.receiptHash,
    receipt?.txid,
    receipt?.ledgerRoot,
    receipt?.idempotencyKey,
    receipt?.storageKey,
    receipt?.crabUrl,
    index,
  ]
    .filter(Boolean)
    .join(':');
}

function normalizeAction(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
}

function labelFromAction(action) {
  return String(action || 'receipt')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
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

function formatTimestamp(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return 'not returned';
  }

  if (/^[0-9]+$/.test(raw)) {
    const n = Number(raw);
    const millis = n > 10_000_000_000 ? n : n * 1000;
    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : raw;
  }

  const parsed = Date.parse(raw);

  if (!Number.isFinite(parsed)) {
    return raw;
  }

  return new Date(parsed).toLocaleString();
}

function classSafe(value) {
  return String(value || 'receipt').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}