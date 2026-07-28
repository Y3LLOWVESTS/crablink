/**
 * Internal ROC Beta Phase 2 compact receipt replay/audit posture.
 * recent receipt replay/audit labels are display-only.
 * recent receipt replay/audit labels are not paid unlock authority.
 */

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
  RECEIPT_DISPLAY_FILTERS as FILTERS,
  buildReceiptProofText as buildProofText,
  countReceiptDisplayGroups as buildCounts,
  filterReceiptDisplayList as filterReceipts,
  formatReceiptAmount as formatAmount,
  formatReceiptTimestamp as formatTimestamp,
  normalizeReceiptDisplayList as normalizeReceiptList,
  receiptActionLabel as labelFromAction,
  receiptDisplayClassName as classSafe,
  receiptDisplayKey as receiptKey,
} from '../../../../../packages/crablink-core/src/index.js';
import {
  clearRecentReceiptCache,
  dispatchReceiptsChanged,
} from '../../shared/receipts/recentReceipts.js';

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
          `  source_boundary: ${receipt.sourceLabel || receipt.source || 'local display'}`,
          `  backend_derived: ${receipt.backendDerived === true ? 'yes' : 'no'}`,
          `  display_cache: display-only; not paid entitlement`,
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
            Local display copies of backend-returned receipt metadata. Each card labels backend source and display-only cache status. Wallet and ledger truth remain backend-owned.
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
  const sourceLabel = receipt.sourceLabel || receipt.source || 'local display';
  const backendLabel = receipt.backendDerived === true ? 'yes — backend-derived receipt' : 'no — local display hint only';

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

      <div className="cl-receipt-source-strip" aria-label="Receipt source boundary">
        <ReceiptMini label="Source boundary" value={sourceLabel} />
        <ReceiptMini label="Backend-derived" value={backendLabel} />
        <ReceiptMini label="Display cache" value="display-only; not paid entitlement" />
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
        <ReceiptFact label="Source boundary" value={sourceLabel} />
        <ReceiptFact label="Backend-derived" value={backendLabel} />
        <ReceiptFact label="Display cache" value="display-only; not paid entitlement" />
        <ReceiptFact label="Created" value={formatTimestamp(receipt.createdAt || receipt.storedAt)} />
      </dl>

      <p className="cl-receipt-truth-note">
        Display-only copy. Backend wallet/ledger remain authoritative; this cache is not paid entitlement.
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
