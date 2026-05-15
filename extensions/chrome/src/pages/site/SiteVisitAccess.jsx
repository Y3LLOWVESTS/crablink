/**
 * RO:WHAT — Paid site_visit gate for named CrabLink sites.
 * RO:WHY — NEXT_LEVEL creator-economy proof: quote/pay before rendering paid creator sites.
 * RO:INTERACTS — siteVisitClient, SiteRender, GatewayClient, BalanceChip refresh events.
 * RO:INVARIANTS — no silent spend; no fake receipt; render unlock follows backend quote/pay truth only.
 * RO:METRICS — displays gateway correlation IDs and returned receipt identifiers.
 * RO:CONFIG — uses current app settings wallet/passport and optional dev auto-pay cap.
 * RO:SECURITY — pay button requires explicit click unless a future explicit capped dev setting is enabled.
 * RO:TEST — Visitor B opens crab://ron3, quotes 10 ROC, pays through gateway, then sandbox renders.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import ErrorPanel from '../../shared/components/ErrorPanel.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { createSiteVisitClient } from '../../shared/api/siteVisitClient.js';

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
  const target = useMemo(() => normalizeAccessTarget(summary), [summary]);
  const policy = useMemo(() => deriveSiteVisitPolicy(summary, app), [summary, app]);
  const [state, setState] = useState(() => ({
    status: policy.requiresPayment ? 'idle' : 'free',
    quote: null,
    payment: null,
    error: null,
  }));

  useEffect(() => {
    const next = policy.requiresPayment ? PENDING_ACCESS : FREE_ACCESS;
    setState({
      status: next.status,
      quote: null,
      payment: null,
      error: null,
    });
    onAccessChange?.(next);
  }, [policy.requiresPayment, target.siteName, onAccessChange]);

  useEffect(() => {
    if (!policy.requiresPayment || !visitClient?.ready || state.status !== 'idle') {
      return;
    }

    let alive = true;

    async function quoteVisit() {
      setState((current) => ({ ...current, status: 'quoting', error: null }));
      onAccessChange?.({ ...PENDING_ACCESS, status: 'quoting' });

      try {
        const quote = await visitClient.quote(target.siteName, buildQuotePayload({ app, summary, policy, target }));

        if (!alive) {
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
        onAccessChange?.(access);
      } catch (error) {
        if (!alive) {
          return;
        }

        const backendPending = Boolean(error?.backendMissing);
        const access = {
          requiresPayment: true,
          canRender: backendPending && canUseBackendPendingPreview(app),
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
        onAccessChange?.(access);
      }
    }

    void quoteVisit();

    return () => {
      alive = false;
    };
  }, [app, policy, state.status, summary, target, visitClient, onAccessChange]);

  async function payVisit() {
    if (!state.quote || state.status === 'paying') {
      return;
    }

    setState((current) => ({ ...current, status: 'paying', error: null }));
    onAccessChange?.({
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
        buildPayPayload({ app, summary, policy, target, quote: state.quote }),
        { confirmed: true },
      );

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
      onAccessChange?.(access);
      notifyBalanceRefresh(app, payment);
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
      onAccessChange?.(access);
    }
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
          This site advertises paid <code>site_visit</code> access, but the gateway did not yet expose the quote/pay
          route. Developer mode may preview the page, but no ROC was deducted and no creator payout was credited.
        </p>
        <div className="site-visit-facts" aria-label="Pending paid access facts">
          <Fact label="Action" value={policy.action || 'site_visit'} />
          <Fact label="Expected price" value={policy.expectedDisplayAmount || 'backend quote required'} />
          <Fact label="Payer" value={policy.payerAccount || 'not configured'} />
          <Fact label="Recipient" value={policy.recipientAccount || 'not returned'} />
        </div>
        <JsonPreview label="Backend pending error" data={state.error} />
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
            <Button variant="secondary" onClick={() => setState({ status: 'idle', quote: null, payment: null, error: null })}>
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
        copy="The wallet transfer was not confirmed by the backend, so CrabLink is keeping the site preview locked."
        error={state.error}
        actions={
          <div className="site-visit-actions">
            <Button variant="secondary" onClick={() => setState({ status: 'quoted', quote: state.quote, payment: null, error: null })}>
              Back to quote
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
      title={state.status === 'paid' ? 'Site visit paid' : 'Pay to open this site'}
      className="site-visit-access-card"
      actions={
        <Badge tone={state.status === 'paid' ? 'success' : state.status === 'paying' ? 'warning' : 'info'}>
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
          Backend payment confirmed. The preview is unlocked from the returned receipt; CrabLink did not edit local
          balances or fabricate a payout.
        </p>
      )}

      <div className="site-visit-facts" aria-label="Paid site visit facts">
        <Fact label="Action" value={paymentSummary?.action || quoteSummary?.action || policy.action || 'site_visit'} />
        <Fact label="Amount" value={paymentSummary?.displayAmount || (paymentSummary?.amountMinor ? `${paymentSummary.amountMinor} ROC` : amount || 'pending')} />
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
          <Button variant="secondary" onClick={() => setState({ status: 'idle', quote: null, payment: null, error: null })}>
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

export function deriveSiteVisitPolicy(summary = {}, app = null) {
  const action = cleanString(summary.payoutMode || summary.default_action || summary.payout_action || '');
  const recipientAccount = cleanString(summary.payoutRecipient || summary.ownerWallet || '');
  const payerAccount = cleanString(app?.settings?.walletAccount || app?.state?.walletAccount || '');
  const visitorPassport = cleanString(app?.settings?.passportSubject || app?.state?.passportSubject || '');
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

function buildQuotePayload({ app, summary, policy, target }) {
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
    client_idempotency_key: siteVisitIdem('quote', target.siteName, policy.payerAccount, policy.recipientAccount, app),
  };
}

function buildPayPayload({ app, summary, policy, target, quote }) {
  const quoteSummary = quote?.summary || {};

  return {
    site_name: target.siteName,
    crab_url: target.crabUrl,
    action: 'site_visit',
    quantity: 1,
    payer_account: quoteSummary.payerAccount || policy.payerAccount,
    visitor_wallet_account: quoteSummary.payerAccount || policy.payerAccount,
    visitor_passport_subject: quoteSummary.visitorPassport || policy.visitorPassport,
    recipient_account: quoteSummary.recipientAccount || policy.recipientAccount || summary.ownerWallet || '',
    amount_minor: quoteSummary.amountMinor || policy.expectedAmountMinor,
    asset: quoteSummary.asset || 'roc',
    quote_id: quoteSummary.quoteId || '',
    quote_hash: quoteSummary.quoteHash || '',
    quote: quote?.data || null,
    client_idempotency_key: siteVisitIdem(
      'pay',
      target.siteName,
      quoteSummary.payerAccount || policy.payerAccount,
      quoteSummary.recipientAccount || policy.recipientAccount,
      app,
    ),
  };
}

function siteVisitIdem(scope, siteName, payer, recipient, app) {
  const passport = cleanString(app?.settings?.passportSubject || 'visitor');
  return ['crablink-react', 'site-visit', scope, siteName, payer, recipient, passport]
    .filter(Boolean)
    .join(':')
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .slice(0, 64);
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
        <Fact label="Txid" value={proof.txid || 'not returned'} />
        <Fact label="Receipt hash" value={proof.receiptHash || 'not returned'} />
        <Fact label="Ledger root" value={proof.ledgerRoot || 'not returned'} />
        <Fact label="Nonce" value={proof.nonce || 'not returned'} />
        <Fact label="Idempotency" value={proof.idempotencyKey || 'not returned'} />
        <Fact label="Manifest" value={proof.manifestCid || 'not returned'} />
      </div>
    </section>
  );
}

function notifyBalanceRefresh(app, payment) {
  try {
    app?.events?.emit?.('wallet:refresh', {
      reason: 'site_visit_paid',
      payment: payment?.summary || null,
    });
    app?.refreshIdentity?.();
    app?.refreshWallet?.();
  } catch (_error) {
    // Balance refresh is best-effort; the receipt panel remains the visible backend proof.
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

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
  );
}

function cleanString(value) {
  return String(value ?? '').trim();
}