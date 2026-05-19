/**
 * RO:WHAT — Dedicated CrabLink receipt history page.
 * RO:WHY — Moves receipt/debug detail out of the Passport drawer while preserving local display proof for paid actions.
 * RO:INTERACTS — recentReceipts.js, localCatalog.js, PageHeader, CopyButton, JsonPreview.
 * RO:INVARIANTS — display-only; no wallet mutation; no fake receipt; backend txid/receipt_hash/ledger_root remain truth.
 * RO:METRICS — none.
 * RO:CONFIG — browser local/session storage only.
 * RO:SECURITY — stores/renders public receipt metadata only; no keys, bearer tokens, seed phrases, or spend authority.
 * RO:TEST — crab://receipts after site_visit and text publish smokes; verify copy proof and clear display cache.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import {
  clearRecentReceiptCache,
  dispatchReceiptsChanged,
  readRecentReceipts,
  subscribeRecentReceipts,
} from '../../shared/receipts/recentReceipts.js';
import './receipts.css';

const FILTERS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'site_visit', label: 'Site visits' },
  { id: 'publishes', label: 'Publishes' },
  { id: 'wallet', label: 'Wallet' },
]);

export default function ReceiptsPage({ app }) {
  const [receipts, setReceipts] = useState(() => safeReadReceipts());
  const [activeFilter, setActiveFilter] = useState('all');
  const [copyState, setCopyState] = useState('');

  useEffect(() => subscribeRecentReceipts(setReceipts), []);

  const normalized = useMemo(() => normalizeReceiptList(receipts), [receipts]);
  const counts = useMemo(() => buildCounts(normalized), [normalized]);
  const filtered = useMemo(() => filterReceipts(normalized, activeFilter), [normalized, activeFilter]);

  function refreshReceipts() {
    dispatchReceiptsChanged();
    setReceipts(safeReadReceipts());
  }

  function clearReceipts() {
    clearRecentReceiptCache();
    setReceipts(safeReadReceipts());
  }

  async function copyReceiptSummary() {
    const lines = [
      'CrabLink receipt display cache',
      '',
      `Total: ${normalized.length}`,
      `Site visits: ${counts.site_visit}`,
      `Publishes: ${counts.publishes}`,
      `Wallet: ${counts.wallet}`,
      '',
      ...normalized.map((receipt) => buildProofText(receipt)),
      '',
      'Truth boundary:',
      'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n\n'));
      setCopyState('Copied receipt summary');
    } catch (_error) {
      setCopyState('Clipboard unavailable');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  return (
    <section className="cl-page receipts-page">
      <PageHeader
        eyebrow="Receipt history"
        title="Receipts"
        copy="Display-only copies of backend-returned paid action receipts. This page exists so the Passport drawer can stay clean."
        meta={
          <>
            <Badge tone={normalized.length > 0 ? 'success' : 'warning'}>{normalized.length} receipts</Badge>
            <Badge tone="neutral">display cache</Badge>
            <Badge tone="info">wallet/ledger backend truth</Badge>
          </>
        }
        actions={
          <div className="receipts-header-actions">
            <Button variant="secondary" onClick={refreshReceipts}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://library')}>
              Open Library
            </Button>
            <Button variant="secondary" onClick={() => app?.navigate?.('crab://quickchain')}>
              QuickChain
            </Button>
            <Button variant="ghost" onClick={copyReceiptSummary} disabled={normalized.length === 0}>
              Copy summary
            </Button>
          </div>
        }
      />

      {copyState && <p className="receipts-copy-state">{copyState}</p>}

      <section className="receipts-stat-grid" aria-label="Receipt summary">
        <ReceiptStat label="Total" value={normalized.length} detail="all local receipt display entries" />
        <ReceiptStat label="Site visits" value={counts.site_visit} detail="paid site_visit receipts" />
        <ReceiptStat label="Publishes" value={counts.publishes} detail="paid asset publish receipts/holds" />
        <ReceiptStat label="Wallet" value={counts.wallet} detail="wallet hold/transfer/issue display entries" />
      </section>

      <TruthBoundary
        tone="warning"
        title="Receipts are display copies here"
        copy="CrabLink can display txid, receipt_hash, ledger_root, nonce, amount, payer, and recipient returned by backend routes, but it does not verify ledger continuity locally and does not authorize spending."
      />

      <Card className="receipts-toolbar" eyebrow="Browse receipts" title="Filter receipt display cache">
        <div className="receipts-tab-row" role="tablist" aria-label="Receipt filters">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={filter.id === activeFilter ? 'is-active' : ''}
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={filter.id === activeFilter}
            >
              <span>{filter.label}</span>
              <strong>{counts[filter.id] ?? normalized.length}</strong>
            </button>
          ))}
        </div>

        <div className="receipts-toolbar-actions">
          <Button variant="secondary" onClick={refreshReceipts}>
            Refresh display cache
          </Button>
          <Button variant="ghost" onClick={clearReceipts}>
            Clear display cache
          </Button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card eyebrow="No receipts" title={normalized.length === 0 ? 'No local receipts yet' : 'No receipts in this group'}>
          <p>
            Pay a site visit or publish a paid asset, then return here. The Passport drawer now links here instead of rendering
            all receipt details inline.
          </p>
        </Card>
      ) : (
        <section className="receipts-list" aria-label="Receipt list">
          {filtered.map((receipt, index) => (
            <ReceiptCard key={receiptKey(receipt, index)} receipt={receipt} app={app} />
          ))}
        </section>
      )}

      <details className="receipts-dev-json">
        <summary>Developer receipt JSON</summary>
        <JsonPreview
          label="Recent receipts"
          data={{
            schema: 'crablink.receipts-page.v1',
            generated_at: new Date().toISOString(),
            active_filter: activeFilter,
            counts,
            receipts: normalized,
            filtered,
            truth_boundary:
              'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
          }}
        />
      </details>
    </section>
  );
}

function ReceiptStat({ label, value, detail }) {
  return (
    <article className="receipts-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ReceiptCard({ receipt, app }) {
  const action = receipt.action || receipt.kind || 'receipt';
  const route = receipt.crabUrl || receipt.route || '';
  const amount = receipt.amountDisplay || formatAmount(receipt.amountMinor, receipt.asset);
  const proofText = buildProofText(receipt);

  return (
    <article className={`receipts-card is-${classSafe(action)}`}>
      <header>
        <div>
          <span>{labelFromAction(action)}</span>
          <strong>{receipt.title || route || receipt.txid || receipt.receiptHash || 'Receipt'}</strong>
        </div>
        <Badge tone={toneForReceipt(action)}>{receipt.source || 'local display'}</Badge>
      </header>

      <div className="receipts-proof-strip">
        <ReceiptMini label="Amount" value={amount || 'not returned'} />
        <ReceiptMini label="Nonce" value={receipt.nonce || 'not returned'} />
        <ReceiptMini label="Asset" value={String(receipt.asset || 'roc').toUpperCase()} />
      </div>

      <div className="receipts-fact-grid">
        <ReceiptFact label="Action" value={action || 'not returned'} />
        <ReceiptFact label="Crab URL" value={route || 'not returned'} monospace />
        <ReceiptFact label="From" value={receipt.payer || receipt.from || 'not returned'} monospace />
        <ReceiptFact label="To" value={receipt.recipient || receipt.to || 'not returned'} monospace />
        <ReceiptFact label="Txid" value={receipt.txid || 'not returned'} monospace />
        <ReceiptFact label="Receipt hash" value={receipt.receiptHash || 'not returned'} monospace />
        <ReceiptFact label="Ledger root" value={receipt.ledgerRoot || 'not returned'} monospace />
        <ReceiptFact label="Manifest CID" value={receipt.manifestCid || 'not returned'} monospace />
        <ReceiptFact label="Root CID" value={receipt.rootDocumentCid || 'not returned'} monospace />
        <ReceiptFact label="Idempotency" value={receipt.idempotencyKey || 'not returned'} monospace />
        <ReceiptFact label="Created" value={formatTimestamp(receipt.createdAt || receipt.storedAt)} />
        <ReceiptFact label="Source" value={receipt.source || 'local_display_cache'} />
      </div>

      <footer className="receipts-card-actions">
        <Button variant="primary" onClick={() => app?.navigate?.(route)} disabled={!route || !app?.navigate}>
          Open route
        </Button>
        <CopyButton text={route} label="Copy route" disabled={!route} />
        <CopyButton text={receipt.txid || ''} label="Copy txid" disabled={!receipt.txid} />
        <CopyButton text={receipt.receiptHash || ''} label="Copy receipt" disabled={!receipt.receiptHash} />
        <CopyButton text={proofText} label="Copy proof" disabled={!proofText} />
      </footer>
    </article>
  );
}

function ReceiptMini({ label, value }) {
  return (
    <div className="receipts-mini">
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function ReceiptFact({ label, value, monospace = false }) {
  const clean = String(value || '').trim();

  return (
    <div className="receipts-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean || 'n/a'}
      </strong>
    </div>
  );
}

function safeReadReceipts() {
  try {
    return readRecentReceipts() || [];
  } catch (_error) {
    return [];
  }
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
        return (
          action.includes('publish') ||
          action.includes('asset') ||
          action.includes('image') ||
          action.includes('post') ||
          action.includes('comment') ||
          action.includes('article')
        );
      });
    case 'wallet':
      return receipts.filter((receipt) => {
        const action = normalizeAction(receipt.action || receipt.kind);
        return (
          action.includes('wallet') ||
          action.includes('hold') ||
          action.includes('transfer') ||
          action.includes('issue') ||
          action.includes('burn')
        );
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
  return [
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
  ]
    .filter(Boolean)
    .join('\n');
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

function toneForReceipt(action) {
  const normalized = normalizeAction(action);

  if (normalized.includes('site_visit')) {
    return 'success';
  }

  if (normalized.includes('publish')) {
    return 'info';
  }

  if (normalized.includes('wallet') || normalized.includes('hold') || normalized.includes('transfer')) {
    return 'neutral';
  }

  return 'warning';
}