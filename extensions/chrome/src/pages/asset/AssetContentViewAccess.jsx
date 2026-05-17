/**
 * RO:WHAT — Explicit paid content_view gate for b3-backed asset pages.
 * RO:WHY — NEXT_LEVEL creator economy proof: article readers pay through gateway-backed wallet truth before content is displayed.
 * RO:INTERACTS — contentViewClient, AssetHydratedView, recentReceipts, localCatalog, GatewayClient.
 * RO:INVARIANTS — no silent spend; no fake unlock; no direct wallet/ledger calls; receipt cache is display-only.
 * RO:METRICS — displays returned gateway correlation IDs, txid, receipt_hash, and ledger_root.
 * RO:CONFIG — uses current CrabLink wallet/passport settings and configured gateway URL.
 * RO:SECURITY — pay button requires explicit click; local cache never grants authorization.
 * RO:TEST — open crab://<hash>.article, quote, click Pay, confirm article body unlocks and receipt appears.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import { createContentViewClient } from '../../shared/api/contentViewClient.js';
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import { writeRecentReceipt } from '../../shared/receipts/recentReceipts.js';

const PAYABLE_KINDS = new Set(['article']);

export default function AssetContentViewAccess({ app, summary, onAccessChange }) {
  const gateway = app?.clients?.gateway || app?.gateway || null;
  const client = useMemo(() => createContentViewClient(gateway), [gateway]);
  const [state, setState] = useState({
    status: 'idle',
    quote: null,
    payment: null,
    receipt: null,
    error: null,
  });

  const target = useMemo(() => normalizeTarget(summary), [summary]);
  const payerAccount = cleanString(app?.settings?.walletAccount || gateway?.walletAccount || '');
  const passportSubject = cleanString(app?.settings?.passportSubject || gateway?.passportSubject || '');
  const shouldQuote = PAYABLE_KINDS.has(target.kind);

  const publishAccess = useCallback(
    (patch) => {
      const next = {
        requiresPayment: shouldQuote,
        canView: Boolean(patch?.canView),
        status: patch?.status || 'idle',
        quote: patch?.quote || null,
        payment: patch?.payment || null,
        receipt: patch?.receipt || null,
        error: patch?.error || null,
      };

      if (typeof onAccessChange === 'function') {
        onAccessChange(next);
      }

      return next;
    },
    [onAccessChange, shouldQuote],
  );

  const quoteContentView = useCallback(async () => {
    if (!shouldQuote) {
      setState({
        status: 'free',
        quote: null,
        payment: null,
        receipt: null,
        error: null,
      });
      publishAccess({
        canView: true,
        status: 'free',
      });
      return null;
    }

    if (!target.assetCrabUrl || !target.cid || !target.kind) {
      const error = new Error('Content view quote requires a canonical crab asset URL.');
      setState({
        status: 'error',
        quote: null,
        payment: null,
        receipt: null,
        error,
      });
      publishAccess({
        canView: false,
        status: 'error',
        error,
      });
      return null;
    }

    if (!payerAccount) {
      const error = new Error('Configure a wallet account before quoting paid content_view.');
      setState({
        status: 'error',
        quote: null,
        payment: null,
        receipt: null,
        error,
      });
      publishAccess({
        canView: false,
        status: 'error',
        error,
      });
      return null;
    }

    setState((current) => ({
      ...current,
      status: 'quoting',
      error: null,
    }));
    publishAccess({
      canView: false,
      status: 'quoting',
    });

    try {
      const quote = await client.quote(target, {
        payer_account: payerAccount,
        viewer_wallet_account: payerAccount,
        viewer_passport_subject: passportSubject,
      });

      setState({
        status: 'quoted',
        quote,
        payment: null,
        receipt: null,
        error: null,
      });
      publishAccess({
        canView: false,
        status: 'quoted',
        quote,
      });

      return quote;
    } catch (error) {
      setState({
        status: 'error',
        quote: null,
        payment: null,
        receipt: null,
        error,
      });
      publishAccess({
        canView: false,
        status: 'error',
        error,
      });
      return null;
    }
  }, [client, passportSubject, payerAccount, publishAccess, shouldQuote, target]);

  useEffect(() => {
    let alive = true;

    async function run() {
      const quote = await quoteContentView();

      if (!alive || !quote) {
        return;
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [quoteContentView]);

  const payContentView = useCallback(async () => {
    const quote = state.quote;

    if (!quote?.summary) {
      await quoteContentView();
      return;
    }

    setState((current) => ({
      ...current,
      status: 'paying',
      error: null,
    }));
    publishAccess({
      canView: false,
      status: 'paying',
      quote,
    });

    try {
      const payment = await client.pay(
        target,
        quote,
        {
          payer_account: payerAccount,
          viewer_wallet_account: payerAccount,
          viewer_passport_subject: passportSubject,
        },
        {
          confirmed: true,
        },
      );

      const receipt = persistContentViewProof({
        target,
        summary,
        quote,
        payment,
      });

      setState({
        status: 'paid',
        quote,
        payment,
        receipt,
        error: null,
      });
      publishAccess({
        canView: true,
        status: 'paid',
        quote,
        payment,
        receipt,
      });

      if (typeof app?.refreshWallet === 'function') {
        void app.refreshWallet(payerAccount);
      }

      if (typeof app?.notify === 'function') {
        app.notify({
          title: 'Paid content view unlocked',
          message: `${payment.summary?.displayAmount || `${payment.summary?.amountMinor || ''} ROC`} paid for ${target.assetCrabUrl}.`,
          tone: 'success',
        });
      }
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error,
      }));
      publishAccess({
        canView: false,
        status: 'error',
        quote,
        error,
      });

      if (typeof app?.notify === 'function') {
        app.notify({
          title: 'Content view payment failed',
          message: error?.message || 'The gateway rejected the content_view payment.',
          tone: 'warning',
        });
      }
    }
  }, [app, client, passportSubject, payerAccount, publishAccess, quoteContentView, state.quote, summary, target]);

  if (!shouldQuote) {
    return null;
  }

  const quoteSummary = state.quote?.summary || {};
  const paymentSummary = state.payment?.summary || {};
  const isBusy = state.status === 'quoting' || state.status === 'paying';
  const hasQuote = Boolean(state.quote?.summary);
  const hasPayment = state.status === 'paid';

  return (
    <Card
      eyebrow="Paid content view"
      title={hasPayment ? 'Article view paid and unlocked' : 'Pay to view this article'}
      className={`asset-content-view-card is-${state.status}`}
      actions={
        <div className="asset-copy-actions">
          <Button
            variant="primary"
            onClick={payContentView}
            disabled={isBusy || !hasQuote || hasPayment}
          >
            {state.status === 'paying'
              ? 'Paying…'
              : hasPayment
                ? 'Paid'
                : `Pay ${quoteSummary.displayAmount || quoteSummary.amountMinor || 'quoted ROC'}`}
          </Button>
          <Button variant="secondary" onClick={quoteContentView} disabled={isBusy || hasPayment}>
            Re-quote
          </Button>
          <CopyButton text={target.assetCrabUrl} label="Copy asset URL" />
        </div>
      }
    >
      <div className="asset-content-view-status">
        <Badge tone={hasPayment ? 'success' : hasQuote ? 'warning' : 'neutral'} uppercase={false}>
          {statusLabel(state.status)}
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          article content_view
        </Badge>
        <Badge tone="neutral" uppercase={false}>
          gateway-only
        </Badge>
      </div>

      <p className="asset-description">
        CrabLink is using the backend <code>/content/view/quote</code> and <code>/content/view/pay</code> routes.
        The article body stays hidden until a backend payment receipt is returned.
      </p>

      <div className="asset-fact-grid asset-content-view-facts">
        <Fact label="Amount" value={quoteSummary.displayAmount || paymentSummary.displayAmount || quoteSummary.amountMinor || 'Not quoted'} />
        <Fact label="Payer" value={quoteSummary.payerAccount || paymentSummary.payerAccount || payerAccount || 'Not configured'} monospace />
        <Fact label="Recipient" value={quoteSummary.recipientAccount || paymentSummary.recipientAccount || 'Manifest recipient not quoted'} monospace />
        <Fact label="Quote id" value={quoteSummary.quoteId || 'Not quoted'} monospace />
        <Fact label="Quote hash" value={quoteSummary.quoteHash || 'Not quoted'} monospace />
        <Fact label="Manifest CID" value={quoteSummary.manifestCid || paymentSummary.manifestCid || target.manifestCid || 'Not returned'} monospace />
      </div>

      {hasPayment && (
        <div className="asset-content-view-receipt">
          <Fact label="Transaction" value={paymentSummary.txid || 'n/a'} monospace />
          <Fact label="Receipt hash" value={paymentSummary.receiptHash || 'n/a'} monospace />
          <Fact label="Ledger root" value={paymentSummary.ledgerRoot || 'n/a'} monospace />
        </div>
      )}

      {state.error && (
        <ErrorPanel
          title="Paid content_view is not available yet"
          error={state.error}
          copy="The asset resolved, but the backend quote/pay route did not return a usable content_view proof. CrabLink will not unlock the article body from local state."
        />
      )}

      <TruthBoundary
        tone={hasPayment ? 'success' : 'warning'}
        title={hasPayment ? 'Backend receipt unlocked this article view' : 'No silent spend / no fake unlock'}
        copy={
          hasPayment
            ? 'The article body below is unlocked only after svc-gateway returned wallet receipt metadata for content_view. Local receipt memory is display-only.'
            : 'CrabLink does not direct-call wallet or ledger, does not adjust local balances, and does not show article content until a backend content_view receipt is returned.'
        }
      />

      <details className="asset-content-view-json">
        <summary>Developer content_view JSON</summary>
        <JsonPreview
          label="content_view quote/payment"
          data={{
            target,
            state: state.status,
            quote: state.quote,
            payment: state.payment,
            receipt: state.receipt,
            error: serializeError(state.error),
            truth_boundary:
              'This is a local display copy of backend-returned content_view metadata. Wallet and ledger truth remain backend-owned.',
          }}
        />
      </details>
    </Card>
  );
}

function persistContentViewProof({ target, summary, quote, payment }) {
  const now = new Date().toISOString();
  const quoteSummary = quote?.summary || {};
  const paymentSummary = payment?.summary || {};

  let persistedReceipt = null;

  try {
    persistedReceipt = writeRecentReceipt({
      schema: 'crablink.recent-receipt.content-view.v1',
      kind: 'content_view',
      action: 'content_view',
      title: `Paid content view: ${target.assetCrabUrl}`,
      crabUrl: target.assetCrabUrl,
      amountMinor: paymentSummary.amountMinor || quoteSummary.amountMinor,
      asset: paymentSummary.asset || quoteSummary.asset || 'roc',
      payerAccount: paymentSummary.payerAccount || quoteSummary.payerAccount,
      recipientAccount: paymentSummary.recipientAccount || quoteSummary.recipientAccount,
      txid: paymentSummary.txid,
      receiptHash: paymentSummary.receiptHash,
      ledgerRoot: paymentSummary.ledgerRoot,
      nonce: paymentSummary.nonce,
      idempotencyKey: paymentSummary.idempotencyKey || quoteSummary.idempotencyKey,
      manifestCid: paymentSummary.manifestCid || quoteSummary.manifestCid || summary?.manifestCid,
      source: 'content_view_payment_success',
      createdAt: now,
      raw: {
        quote_summary: quoteSummary,
        payment_summary: paymentSummary,
        quote_response: quote?.response || null,
        payment_response: payment?.response || null,
        asset_summary: pickAssetSummary(summary),
        truth_boundary:
          'This is a local display copy of backend-returned receipt metadata. Wallet and ledger truth remain backend-owned.',
      },
    });
  } catch (_error) {
    persistedReceipt = null;
  }

  try {
    writeLocalCatalogEntry({
      schema: 'crablink.local-catalog-entry.v1',
      kind: target.kind || 'article',
      crabUrl: target.assetCrabUrl,
      title: cleanString(summary?.title) || `${labelFromKind(target.kind)} asset`,
      status: 'paid content_view receipt cached',
      detail: paymentSummary.receiptHash || paymentSummary.txid || paymentSummary.ledgerRoot || target.cid,
      source: 'content_view_payment_success',
      cid: target.cid,
      hash: target.hash,
      createdAt: now,
      raw: {
        receipt: persistedReceipt,
        quote_summary: quoteSummary,
        payment_summary: paymentSummary,
        asset_summary: pickAssetSummary(summary),
        truth_boundary:
          'This is a browser-local paid-view catalog entry. Backend ownership and wallet truth remain gateway-owned.',
      },
    });
  } catch (_error) {
    // Local catalog is optional display memory.
  }

  return persistedReceipt;
}

function normalizeTarget(summary = {}) {
  const hash = cleanHash(summary.hash || summary.raw_hash_hex);
  const kind = cleanKind(summary.kind || summary.assetKind || 'article');
  const cid = cleanCid(summary.cid || summary.assetCid || (hash ? `b3:${hash}` : ''));
  const assetCrabUrl = cleanString(summary.crabUrl || summary.assetCrabUrl || (hash ? `crab://${hash}.${kind}` : ''));

  return {
    hash,
    kind,
    assetKind: kind,
    cid,
    assetCrabUrl,
    manifestCid: cleanCid(summary.manifestCid || summary.manifest_cid),
  };
}

function Fact({ label, value, monospace = false }) {
  const clean = value === null || value === undefined || value === '' ? 'n/a' : String(value);

  return (
    <div className="asset-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean}
      </strong>
    </div>
  );
}

function pickAssetSummary(summary = {}) {
  return {
    kind: summary.kind || '',
    cid: summary.cid || '',
    hash: summary.hash || '',
    crabUrl: summary.crabUrl || '',
    manifestCid: summary.manifestCid || '',
    title: summary.title || '',
    owner: summary.owner || '',
    payout: summary.payout || '',
  };
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    status: Number(error.status || 0),
    reason: error.reason || error.code || '',
    correlationId: error.correlationId || '',
    data: error.data || null,
  };
}

function statusLabel(status) {
  switch (status) {
    case 'quoting':
      return 'quoting backend';
    case 'quoted':
      return 'quote ready';
    case 'paying':
      return 'paying through wallet';
    case 'paid':
      return 'paid receipt returned';
    case 'error':
      return 'backend unavailable';
    default:
      return 'quote pending';
  }
}

function cleanHash(value) {
  const clean = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? clean : '';
}

function cleanCid(value) {
  const clean = String(value || '').trim().toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(clean)) {
    return clean;
  }

  if (/^[0-9a-f]{64}$/.test(clean)) {
    return `b3:${clean}`;
  }

  return '';
}

function cleanKind(value) {
  const clean = String(value || 'article').trim().toLowerCase();
  return /^[a-z][a-z0-9_-]{0,31}$/.test(clean) ? clean : 'article';
}

function cleanString(value) {
  return String(value || '').trim();
}

function labelFromKind(kind) {
  return String(kind || 'asset')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}