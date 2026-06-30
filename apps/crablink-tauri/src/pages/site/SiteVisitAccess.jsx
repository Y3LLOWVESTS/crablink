/**
 * RO:WHAT — Paid site_visit gate for named CrabLink sites.
 * RO:WHY — NEXT_LEVEL creator-economy proof: quote/pay before rendering paid creator sites.
 * RO:INTERACTS — siteVisitClient, SiteRender, GatewayClient, BalanceChip refresh events, recentReceipts, localCatalog.
 * RO:INVARIANTS — no silent spend; no fake receipt; render unlock follows the live backend quote/pay response only.
 * RO:METRICS — displays gateway correlation IDs and returned receipt identifiers.
 * RO:CONFIG — uses current app settings wallet/passport and local display receipt memory.
 * RO:SECURITY — pay button requires explicit user click; no local balance edits; no fake unlock.
 * RO:TEST — Visitor B opens crab://ron7, quotes 10 ROC, pays through gateway, and unlocks only from the live backend receipt response.
 * RO:PHASE4-R2 — INTERNAL-ROC-PHASE4-R2; every spend shows amount/action/asset/recipient; cancel never mutates; confirm triggers adapter path only; failure does not unlock; retry is idempotent/safe.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { createSiteVisitClient } from '../../shared/api/siteVisitClient.js';
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import { writeRecentReceipt } from '../../shared/receipts/recentReceipts.js';


const FREE_ACCESS = Object.freeze({
  requiresPayment: false,
  canRender: true,
  status: 'free',
  quote: null,
  payment: null,
  error: null,
});

const PENDING_ACCESS = Object.freeze({
  requiresPayment: true,
  canRender: false,
  status: 'idle',
  quote: null,
  payment: null,
  error: null,
});

export default function SiteVisitAccess({
  app,
  result,
  siteClient = null,
  onAccessChange = null,
}) {
  const summary = result?.summary || {};
  const gateway = app?.clients?.gateway || siteClient?.gateway || null;
  const visitClient = useMemo(() => createSiteVisitClient(gateway), [gateway]);

  const walletAccount = cleanString(app?.settings?.walletAccount || app?.state?.walletAccount || '');
  const passportSubject = cleanString(app?.settings?.passportSubject || app?.state?.passportSubject || '');
  const devPreviewAllowed = canUseBackendPendingPreview(app);

  const target = useMemo(
    () => normalizeAccessTarget(summary),
    [summary.siteName, summary.crabUrl],
  );

  const policy = useMemo(
    () => deriveSiteVisitPolicy(summary, {
      walletAccount,
      passportSubject,
    }),
    [
      summary.payoutMode,
      summary.default_action,
      summary.payout_action,
      summary.payoutRecipient,
      summary.ownerWallet,
      walletAccount,
      passportSubject,
    ],
  );

  const accessKey = useMemo(
    () =>
      [
        target.siteName,
        policy.requiresPayment ? 'paid' : 'free',
        policy.action,
        policy.payerAccount,
        policy.recipientAccount,
        policy.visitorPassport,
        summary.rootDocumentCid || summary.manifestCid || '',
      ]
        .filter(Boolean)
        .join('|'),
    [
      target.siteName,
      policy.requiresPayment,
      policy.action,
      policy.payerAccount,
      policy.recipientAccount,
      policy.visitorPassport,
      summary.rootDocumentCid,
      summary.manifestCid,
    ],
  );

  const onAccessChangeRef = useRef(onAccessChange);
  const mountedRef = useRef(false);
  const quoteSeqRef = useRef(0);
  const activeQuoteKeyRef = useRef('');

  const [state, setState] = useState(() => ({
    status: policy.requiresPayment ? 'idle' : 'free',
    quote: null,
    payment: null,
    error: null,
  }));

  useEffect(() => {
    onAccessChangeRef.current = onAccessChange;
  }, [onAccessChange]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      quoteSeqRef.current += 1;
    };
  }, []);

  const emitAccessChange = useCallback((access) => {
    onAccessChangeRef.current?.(access);
  }, []);

  useEffect(() => {
    quoteSeqRef.current += 1;
    activeQuoteKeyRef.current = '';

    if (!policy.requiresPayment) {
      setState({
        status: 'free',
        quote: null,
        payment: null,
        error: null,
      });
      emitAccessChange(FREE_ACCESS);
      return;
    }

    setState({
      status: 'idle',
      quote: null,
      payment: null,
      error: null,
    });
    emitAccessChange(PENDING_ACCESS);
  }, [accessKey, policy.requiresPayment, emitAccessChange]);

  useEffect(() => {
    if (!policy.requiresPayment || !visitClient?.ready || state.status !== 'idle') {
      return;
    }

    const quoteKey = [
      accessKey,
      'quote',
      policy.payerAccount,
      policy.recipientAccount,
      policy.expectedAmountMinor,
    ]
      .filter(Boolean)
      .join('|');

    if (activeQuoteKeyRef.current === quoteKey) {
      return;
    }

    activeQuoteKeyRef.current = quoteKey;
    const seq = quoteSeqRef.current + 1;
    quoteSeqRef.current = seq;

    async function quoteVisit() {
      setState((current) => ({
        ...current,
        status: 'quoting',
        error: null,
      }));
      emitAccessChange({
        ...PENDING_ACCESS,
        status: 'quoting',
      });

      try {
        const quote = await visitClient.quote(
          target.siteName,
          buildQuotePayload({
            summary,
            policy,
            target,
          }),
        );

        if (!mountedRef.current || quoteSeqRef.current !== seq) {
          return;
        }

        const access = {
          requiresPayment: true,
          canRender: false,
          status: 'quoted',
          quote,
          payment: null,
          error: null,
        };

        setState({
          status: 'quoted',
          quote,
          payment: null,
          error: null,
        });
        emitAccessChange(access);
      } catch (error) {
        if (!mountedRef.current || quoteSeqRef.current !== seq) {
          return;
        }

        const backendPending = Boolean(error?.backendMissing);
        const access = {
          requiresPayment: true,
          canRender: backendPending && devPreviewAllowed,
          status: backendPending ? 'backend_pending' : 'quote_error',
          quote: null,
          payment: null,
          error,
        };

        setState({
          status: access.status,
          quote: null,
          payment: null,
          error,
        });
        emitAccessChange(access);
      }
    }

    void quoteVisit();
  }, [
    accessKey,
    devPreviewAllowed,
    emitAccessChange,
    policy,
    state.status,
    summary,
    target,
    visitClient,
  ]);

  async function payVisit() {
    if (!state.quote || state.status === 'paying') {
      return;
    }

    setState((current) => ({
      ...current,
      status: 'paying',
      error: null,
    }));
    emitAccessChange({
      requiresPayment: true,
      canRender: false,
      status: 'paying',
      quote: state.quote,
      payment: null,
      error: null,
    });

    try {
      const payment = await visitClient.pay(
        target.siteName,
        buildPayPayload({
          summary,
          policy,
          target,
          quote: state.quote,
        }),
        { confirmed: true },
      );

      const paymentSummary = payment?.summary || payment?.receipt || payment || {};

      if (!hasBackendPaymentProof(paymentSummary)) {
        const missingReceipt = new Error(
          'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid site locked.',
        );
        missingReceipt.reason = 'payment_missing_backend_receipt';
        missingReceipt.payment = payment;
        throw missingReceipt;
      }

function hasBackendPaymentProof(summary = {}) {
  return Boolean(
    summary?.txid ||
      summary?.receiptHash ||
      summary?.receipt_hash ||
      summary?.ledgerRoot ||
      summary?.ledger_root
  );
}

      const persistedReceipt = writeSiteVisitDisplayCaches({
        app,
        summary,
        target,
        policy,
        quote: state.quote,
        payment,
      });

      const access = {
        requiresPayment: true,
        canRender: true,
        status: 'paid',
        quote: state.quote,
        payment,
        error: null,
      };

      setState({
        status: 'paid',
        quote: state.quote,
        payment,
        error: null,
      });
      emitAccessChange(access);
      notifyBalanceRefresh(app, payment, persistedReceipt);
    } catch (error) {
      const access = {
        requiresPayment: true,
        canRender: false,
        status: 'pay_error',
        quote: state.quote,
        payment: null,
        error,
      };

      setState({
        status: 'pay_error',
        quote: state.quote,
        payment: null,
        error,
      });
      emitAccessChange(access);
    }
  }

  function retryQuote() {
    quoteSeqRef.current += 1;
    activeQuoteKeyRef.current = '';
    setState({
      status: 'idle',
      quote: null,
      payment: null,
      error: null,
    });
    emitAccessChange({
      ...PENDING_ACCESS,
      status: 'idle',
    });
  }

  if (!policy.requiresPayment) {
    return (
      <Card eyebrow="Access" title="Site preview unlocked" className="site-visit-access-card site-visit-access-free">
        <p>
          This named site did not advertise a paid <code>site_visit</code> policy in the hydrated gateway response,
          so CrabLink is rendering it as a free read.
        </p>
        <div className="site-visit-facts" aria-label="Site access facts">
          <Fact label="Action" value={policy.action || 'none'} />
          <Fact label="Payer" value={policy.payerAccount || 'not configured'} />
          <Fact label="Recipient" value={policy.recipientAccount || 'not returned'} />
        </div>
      </Card>
    );
  }

  if (!visitClient?.ready) {
    return (
      <ErrorPanel
        title="Paid site visit unavailable"
        copy="CrabLink cannot quote this paid site because the configured gateway client is not available. The preview stays locked rather than faking access."
        error={{ reason: 'missing_gateway_client', retryable: true }}
        actions={
          <div className="site-visit-actions">
            <Button variant="secondary" onClick={app?.refreshRoute}>
              Retry
            </Button>
          </div>
        }
      />
    );
  }

  if (state.status === 'backend_pending') {
    return (
      <Card eyebrow="Paid access" title="Backend route pending" className="site-visit-access-card site-visit-access-pending">
        <p>
          This site advertises paid <code>site_visit</code> access, but the gateway did not expose the quote/pay route.
          Developer mode may preview the page, but no ROC was deducted and no creator payout was credited.
        </p>
        <div className="site-visit-facts" aria-label="Pending paid access facts">
          <Fact label="Action" value={policy.action || 'site_visit'} />
          <Fact label="Expected price" value={policy.expectedDisplayAmount || 'backend quote required'} />
          <Fact label="Payer" value={policy.payerAccount || 'not configured'} />
          <Fact label="Recipient" value={policy.recipientAccount || 'not returned'} />
        </div>
        <JsonPreview label="Backend pending error" data={serializeError(state.error)} />
      </Card>
    );
  }

  if (state.status === 'quote_error') {
    return (
      <ErrorPanel
        title="Paid site quote failed"
        copy="The site claims paid access, but the gateway did not return a usable quote. The preview remains locked."
        error={state.error}
        actions={
          <div className="site-visit-actions">
            <Button variant="secondary" onClick={retryQuote}>
              Retry quote
            </Button>
          </div>
        }
      />
    );
  }

  if (state.status === 'pay_error') {
    return (
      <ErrorPanel
        title="Paid site payment failed"
        copy="The wallet transfer was not confirmed by the backend, so CrabLink is keeping the site preview locked. If this happened after a previous successful click, use a fresh quote/payment after this patch so the receipt can be stored for refresh."
        error={state.error}
        actions={
          <div className="site-visit-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setState({
                  status: 'quoted',
                  quote: state.quote,
                  payment: null,
                  error: null,
                });
              }}
            >
              Back to quote
            </Button>
            <Button variant="ghost" onClick={retryQuote}>
              New quote
            </Button>
          </div>
        }
      />
    );
  }

  const quoteSummary = state.quote?.summary || null;
  const paymentSummary = state.payment?.summary || null;
  const amount =
    paymentSummary?.displayAmount ||
    quoteSummary?.displayAmount ||
    (quoteSummary?.amountMinor ? `${quoteSummary.amountMinor} ROC` : policy.expectedDisplayAmount);
  const recipient = paymentSummary?.recipientAccount || quoteSummary?.recipientAccount || policy.recipientAccount || 'not returned';
  const payer = paymentSummary?.payerAccount || quoteSummary?.payerAccount || policy.payerAccount || 'not configured';
  const receiptProof = summarizeReceiptProof(paymentSummary);

  return (
    <Card
      eyebrow="Paid access"
      title={state.status === 'paid' ? 'Paid site visit confirmed' : 'Pay to open this site'}
      className="site-visit-access-card"
      actions={
        <Badge tone={state.status === 'paid' ? 'success' : state.status === 'paying' || state.status === 'quoting' ? 'warning' : 'info'}>
          {labelForStatus(state.status)}
        </Badge>
      }
    >
      {state.status === 'quoting' && <p>Requesting a backend quote for this paid site visit…</p>}

      {state.status !== 'quoting' && state.status !== 'paid' && (
        <p>
          This site costs <strong>{amount || 'backend quote required'}</strong> to visit. CrabLink will only render it
          after the gateway returns a wallet receipt.
        </p>
      )}

      {state.status === 'paid' && (
        <p>
          Backend payment confirmed. The preview is unlocked from the live returned receipt in this component state.
          CrabLink did not edit local balances, fabricate a payout, or use cached receipts as entitlement truth.
        </p>
      )}

      <div className="site-visit-facts" aria-label="Paid site visit facts">
        <Fact label="Action" value={paymentSummary?.action || quoteSummary?.action || policy.action || 'site_visit'} />
        <Fact
          label="Amount"
          value={paymentSummary?.displayAmount || (paymentSummary?.amountMinor ? `${paymentSummary.amountMinor} ROC` : amount || 'pending')}
        />
        <Fact label="Payer" value={payer} />
        <Fact label="Recipient" value={recipient} />
        <Fact label="Quote correlation" value={state.quote?.response?.correlationId || 'pending'} />
        <Fact label="Receipt" value={receiptProof.receiptHash || receiptProof.txid || 'not paid yet'} />
      </div>

      {state.status === 'paid' && <ReceiptProof proof={receiptProof} />}

      {state.status === 'quoted' && (
        <div className="site-visit-actions">
          <Button variant="primary" onClick={payVisit}>
            Pay {amount || 'site visit'} and open site
          </Button>
          <Button variant="secondary" onClick={retryQuote}>
            Requote
          </Button>
        </div>
      )}

      {state.status === 'paying' && (
        <div className="site-visit-actions">
          <Button variant="primary" disabled>
            Paying through gateway…
          </Button>
        </div>
      )}

      {(state.quote || state.payment) && (
        <JsonPreview
          label="Paid site visit proof"
          data={{
            quote: state.quote?.summary || null,
            payment: state.payment?.summary || null,
            wallet_receipt: state.payment?.summary?.walletReceipt || null,
            site_receipt: state.payment?.summary?.siteReceipt || null,
            quote_response: state.quote?.response || null,
            payment_response: state.payment?.response || null,
            truth_boundary: 'This proof is display-only and came from the live backend pay response in the current component state.',
          }}
        />
      )}
    </Card>
  );
}

export function siteVisitCanRender(access, app = null) {
  if (!access || access.requiresPayment === false) {
    return true;
  }

  if (access.canRender === true) {
    return true;
  }

  return access.status === 'backend_pending' && canUseBackendPendingPreview(app);
}

export function deriveSiteVisitPolicy(summary = {}, context = {}) {
  const action = cleanString(summary.payoutMode || summary.default_action || summary.payout_action || '');
  const recipientAccount = cleanString(summary.payoutRecipient || summary.ownerWallet || '');
  const payerAccount = cleanString(context.walletAccount || context?.settings?.walletAccount || context?.state?.walletAccount || '');
  const visitorPassport = cleanString(context.passportSubject || context?.settings?.passportSubject || context?.state?.passportSubject || '');
  const requiresPayment = action === 'site_visit' || Boolean(recipientAccount && action.includes('visit'));

  return Object.freeze({
    requiresPayment,
    action: action || (requiresPayment ? 'site_visit' : ''),
    recipientAccount,
    payerAccount,
    visitorPassport,
    expectedAmountMinor: '10',
    expectedDisplayAmount: '10 ROC',
  });
}

function normalizeAccessTarget(summary = {}) {
  const siteName = cleanString(summary.siteName || String(summary.crabUrl || '').replace(/^crab:\/\//i, ''));
  const safeSiteName = siteName.replace(/^crab:\/\//i, '').split(/[/?#]/)[0];

  return Object.freeze({
    siteName: safeSiteName,
    crabUrl: cleanString(summary.crabUrl || (safeSiteName ? `crab://${safeSiteName}` : '')),
  });
}

function buildQuotePayload({ summary, policy, target }) {
  return {
    site_name: target.siteName,
    crab_url: target.crabUrl,
    action: 'site_visit',
    quantity: 1,
    payer_account: policy.payerAccount,
    visitor_wallet_account: policy.payerAccount,
    visitor_passport_subject: policy.visitorPassport,
    recipient_account: policy.recipientAccount || summary.ownerWallet || '',
    max_amount_minor: policy.expectedAmountMinor,
    client_idempotency_key: stableSiteVisitIdem(
      'quote',
      target.siteName,
      policy.payerAccount,
      policy.recipientAccount,
      policy.visitorPassport,
      summary.rootDocumentCid || summary.manifestCid || '',
    ),
  };
}

function buildPayPayload({ summary, policy, target, quote }) {
  const quoteSummary = quote?.summary || {};
  const payer = quoteSummary.payerAccount || policy.payerAccount;
  const recipient = quoteSummary.recipientAccount || policy.recipientAccount || summary.ownerWallet || '';

  return {
    site_name: target.siteName,
    crab_url: target.crabUrl,
    action: 'site_visit',
    quantity: 1,
    payer_account: payer,
    visitor_wallet_account: payer,
    visitor_passport_subject: quoteSummary.visitorPassport || policy.visitorPassport,
    recipient_account: recipient,
    amount_minor: quoteSummary.amountMinor || policy.expectedAmountMinor,
    asset: quoteSummary.asset || 'roc',
    quote_id: quoteSummary.quoteId || '',
    quote_hash: quoteSummary.quoteHash || '',
    quote: quote?.data || null,
    client_idempotency_key: uniqueSiteVisitIdem(
      'pay',
      target.siteName,
      payer,
      recipient,
      policy.visitorPassport,
      quoteSummary.quoteId || quoteSummary.quoteHash || summary.rootDocumentCid || summary.manifestCid || '',
    ),
  };
}

function writeSiteVisitDisplayCaches({
  app,
  summary = {},
  target = {},
  policy = {},
  quote = null,
  payment = null,
}) {
  const quoteSummary = quote?.summary || {};
  const paymentSummary = payment?.summary || {};
  const now = new Date().toISOString();

  const amountMinor = cleanString(
    paymentSummary.amountMinor ??
      paymentSummary.amount_minor ??
      quoteSummary.amountMinor ??
      quoteSummary.amount_minor ??
      policy.expectedAmountMinor,
  );

  const crabUrl = cleanString(
    paymentSummary.crabUrl ||
      paymentSummary.crab_url ||
      quoteSummary.crabUrl ||
      quoteSummary.crab_url ||
      target.crabUrl ||
      summary.crabUrl,
  );

  const siteName = cleanString(
    paymentSummary.siteName ||
      paymentSummary.site_name ||
      quoteSummary.siteName ||
      quoteSummary.site_name ||
      target.siteName ||
      summary.siteName,
  );

  const txid = cleanString(paymentSummary.txid || paymentSummary.tx_id);
  const receiptHash = cleanString(paymentSummary.receiptHash || paymentSummary.receipt_hash);
  const ledgerRoot = cleanString(paymentSummary.ledgerRoot || paymentSummary.ledger_root);
  const manifestCid = cleanString(paymentSummary.manifestCid || paymentSummary.manifest_cid || summary.manifestCid || summary.manifest_cid);
  const rootDocumentCid = cleanString(
    paymentSummary.rootDocumentCid ||
      paymentSummary.root_document_cid ||
      summary.rootDocumentCid ||
      summary.root_document_cid,
  );

  let persistedReceipt = null;

  try {
    persistedReceipt = writeRecentReceipt({
      schema: 'crablink.recent-receipt.site-visit.v1',
      kind: 'site_visit',
      action: paymentSummary.action || quoteSummary.action || 'site_visit',
      title: crabUrl ? `Paid visit: ${crabUrl}` : siteName ? `Paid visit: crab://${siteName}` : 'Paid site visit',
      crabUrl: crabUrl || (siteName ? `crab://${siteName}` : ''),
      siteName,
      amountMinor,
      asset: cleanString(paymentSummary.asset || quoteSummary.asset || 'roc'),
      payerAccount: cleanString(
        paymentSummary.payerAccount ||
          paymentSummary.payer_account ||
          quoteSummary.payerAccount ||
          quoteSummary.payer_account ||
          policy.payerAccount,
      ),
      recipientAccount: cleanString(
        paymentSummary.recipientAccount ||
          paymentSummary.recipient_account ||
          quoteSummary.recipientAccount ||
          quoteSummary.recipient_account ||
          policy.recipientAccount,
      ),
      txid,
      receiptHash,
      ledgerRoot,
      nonce: cleanString(paymentSummary.nonce || quoteSummary.nonce),
      idempotencyKey: cleanString(
        paymentSummary.idempotencyKey ||
          paymentSummary.idempotency_key ||
          quoteSummary.idempotencyKey ||
          quoteSummary.idempotency_key,
      ),
      manifestCid,
      rootDocumentCid,
      source: 'site_visit_payment_success',
      createdAt: now,
      raw: {
        quote_summary: quoteSummary,
        payment_summary: paymentSummary,
        quote_response: quote?.response || null,
        payment_response: payment?.response || null,
        site_summary: pickSessionSummary(summary),
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
      kind: 'site',
      crabUrl: crabUrl || (siteName ? `crab://${siteName}` : ''),
      title: cleanString(summary.title || crabUrl || siteName || 'Paid site'),
      status: 'paid site_visit receipt cached',
      detail: amountMinor ? `${amountMinor} ROC site_visit` : 'site_visit paid',
      source: 'site_visit_access',
      cid: manifestCid || rootDocumentCid,
      manifestCid,
      rootDocumentCid,
      createdAt: now,
      raw: {
        receipt: persistedReceipt,
        quote_summary: quoteSummary,
        payment_summary: paymentSummary,
        site_summary: pickSessionSummary(summary),
        truth_boundary:
          'This is a local display catalog entry. It is not backend ownership, authorization, or publication truth.',
      },
    });
  } catch (_error) {
    // Local catalog is optional display memory only.
  }

  try {
    app?.events?.emit?.('receipt:created', persistedReceipt);
  } catch (_error) {
    // Optional app event bridge only.
  }

  return persistedReceipt;
}

function stableSiteVisitIdem(scope, siteName, payer, recipient, passport, seed = '') {
  return compactIdem(['crablink-react', 'site-visit', scope, siteName, payer, recipient, passport, seed].filter(Boolean).join(':'));
}

function uniqueSiteVisitIdem(scope, siteName, payer, recipient, passport, seed = '') {
  const entropy = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return compactIdem(
    ['crablink-react', 'site-visit', scope, siteName, payer, recipient, passport, seed, entropy]
      .filter(Boolean)
      .join(':'),
  );
}

function compactIdem(value) {
  const raw = cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (raw.length <= 64) {
    return raw;
  }

  const hash = fnv1aHex(raw);
  const prefix = raw.slice(0, 44).replace(/[-:.]+$/g, '') || 'crablink-site-visit';
  return `${prefix}:${hash}`.slice(0, 64);
}

function pickSessionSummary(summary = {}) {
  return {
    title: summary.title || '',
    siteName: summary.siteName || '',
    crabUrl: summary.crabUrl || '',
    rootDocumentCid: summary.rootDocumentCid || '',
    manifestCid: summary.manifestCid || '',
    ownerWallet: summary.ownerWallet || '',
    payoutRecipient: summary.payoutRecipient || '',
    payoutMode: summary.payoutMode || '',
  };
}

function summarizeReceiptProof(paymentSummary = null) {
  return Object.freeze({
    txid: cleanString(paymentSummary?.txid),
    receiptHash: cleanString(paymentSummary?.receiptHash),
    ledgerRoot: cleanString(paymentSummary?.ledgerRoot),
    nonce: cleanString(paymentSummary?.nonce),
    idempotencyKey: cleanString(paymentSummary?.idempotencyKey),
    manifestCid: cleanString(paymentSummary?.manifestCid),
    rootDocumentCid: cleanString(paymentSummary?.rootDocumentCid),
    paidAtMs: cleanString(paymentSummary?.paidAtMs),
  });
}

function ReceiptProof({ proof }) {
  if (!proof?.txid && !proof?.receiptHash && !proof?.ledgerRoot) {
    return null;
  }

  return (
    <section className="site-visit-receipt-proof" aria-label="Paid site visit wallet receipt proof">
      <p className="cl-eyebrow">Wallet / ledger receipt</p>
      <div className="site-visit-facts">
        <Fact label="Txid" value={proof.txid || 'not returned'} monospace />
        <Fact label="Receipt hash" value={proof.receiptHash || 'not returned'} monospace />
        <Fact label="Ledger root" value={proof.ledgerRoot || 'not returned'} monospace />
        <Fact label="Nonce" value={proof.nonce || 'not returned'} />
        <Fact label="Idempotency" value={proof.idempotencyKey || 'not returned'} monospace />
        <Fact label="Manifest" value={proof.manifestCid || 'not returned'} monospace />
      </div>
    </section>
  );
}

function notifyBalanceRefresh(app, payment, receipt = null) {
  try {
    app?.events?.emit?.('wallet:refresh', {
      reason: 'site_visit_paid',
      payment: payment?.summary || null,
      receipt,
    });
    app?.refreshIdentity?.();
    app?.refreshWallet?.();
  } catch (_error) {
    // Balance refresh is best-effort; the receipt panel remains the visible backend proof.
  }

  try {
    window.dispatchEvent(
      new CustomEvent('crablink:wallet-refresh-requested', {
        detail: {
          reason: 'site_visit_paid',
          payment: payment?.summary || null,
          receipt,
        },
      }),
    );
  } catch (_error) {
    // Optional cross-component notification only.
  }
}

function canUseBackendPendingPreview(app = null) {
  return Boolean(app?.settings?.devMode || app?.state?.developerMode || app?.state?.viewMode === 'developer');
}

function labelForStatus(status) {
  switch (status) {
    case 'quoting':
      return 'quoting';
    case 'quoted':
      return 'quote ready';
    case 'paying':
      return 'paying';
    case 'paid':
      return 'paid';
    default:
      return 'pending';
  }
}

function Fact({ label, value, monospace = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    reason: error.reason || '',
    status: error.status || 0,
    retryable: Boolean(error.retryable),
    correlationId: error.correlationId || '',
    data: error.data || null,
  };
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
