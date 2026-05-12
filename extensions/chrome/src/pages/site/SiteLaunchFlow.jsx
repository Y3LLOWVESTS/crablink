/**
 * RO:WHAT — Explicit React prepare → wallet hold → store root HTML → site create flow for crab://site.
 * RO:WHY — Restores old protected site-launch parity: backend root CID auto-fill before /sites create.
 * RO:INTERACTS — siteClient, objectClient, walletClient, SitePage, app.refreshWallet, gateway /sites/prepare, /wallet/hold, /paid/o, /sites.
 * RO:INVARIANTS — no silent ROC spend; create requires real root_document_cid and backend hold proof; no direct storage/index/ledger calls.
 * RO:METRICS — displays gateway correlation IDs for prepare/root-store/create diagnostics.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — root HTML is stored as untrusted bytes and later rendered only in a scriptless sandbox.
 * RO:TEST — manual crab://site prepare/hold/store-root/create smoke from extension React button.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import Field from '../../shared/components/Field.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { createObjectClient } from '../../shared/api/objectClient.js';
import {
  expectedNonceFromWalletError,
  loadNextNonceHint,
  normalizeWalletHoldResponse,
  persistNextNonceHint,
} from '../../shared/api/walletClient.js';
import {
  createSiteClient,
  normalizeSiteCid,
  normalizeSiteCreateRequest,
  normalizeSitePaidProof,
  normalizeSitePrepareRequest,
  stableSiteIdempotencyKey,
  summarizeSiteCreateData,
} from '../../shared/api/siteClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';

const IDLE = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
});

export default function SiteLaunchFlow({ app, draftState }) {
  const settings = app?.settings || {};
  const siteClient = useMemo(
    () => createSiteClient(app?.clients?.gateway),
    [app?.clients?.gateway],
  );
  const objectClient = useMemo(
    () => createObjectClient(app?.clients?.gateway),
    [app?.clients?.gateway],
  );

  const [escrowAccount, setEscrowAccount] = useState(DEFAULT_ESCROW_ACCOUNT);
  const [holdNonce, setHoldNonce] = useState(() => loadNextNonceHint(settings.walletAccount));
  const [prepareState, setPrepareState] = useState(IDLE);
  const [holdState, setHoldState] = useState(IDLE);
  const [rootStoreState, setRootStoreState] = useState(IDLE);
  const [createState, setCreateState] = useState(IDLE);
  const [storedRootCid, setStoredRootCid] = useState('');

  const draft = draftState?.draft || {};
  const stats = draftState?.stats || {};
  const manifest = draftState?.manifest || {};
  const updateDraft = draftState?.updateDraft;

  const rootDocumentCid = normalizeSiteCid(storedRootCid || draft.rootDocumentCid);
  const rootHtmlBytes = byteLength(draft.rootHtml || '');
  const rootHtmlFingerprint = sourceFingerprint(draft.rootHtml || '');

  const preflight = getPreflight({
    draft,
    rootDocumentCid,
    rootHtmlBytes,
    settings,
    stats,
  });

  const prepareRequest = useMemo(() => {
    try {
      return normalizeSitePrepareRequest({
        site_name: draft.siteName,
        files: [
          {
            path: 'index.html',
            bytes: rootHtmlBytes,
          },
        ],
        payer_account: settings.walletAccount,
        owner_passport_subject: settings.passportSubject || draft.ownerPassport,
        owner_wallet_account: settings.walletAccount || draft.ownerWallet,
        title: draft.title,
        description: draft.description,
        client_idempotency_key: stableSiteIdempotencyKey(
          'site-prepare',
          draft.siteName,
          rootHtmlBytes,
          draft.title,
        ),
      });
    } catch (_error) {
      return null;
    }
  }, [
    draft.siteName,
    draft.title,
    draft.description,
    draft.ownerPassport,
    draft.ownerWallet,
    rootHtmlBytes,
    settings.walletAccount,
    settings.passportSubject,
  ]);

  const createRequest = useMemo(() => {
    try {
      return normalizeSiteCreateRequest({
        site_name: draft.siteName,
        root_document_cid: rootDocumentCid,
        owner_passport_subject: settings.passportSubject || draft.ownerPassport,
        owner_wallet_account: settings.walletAccount || draft.ownerWallet,
        title: draft.title,
        description: draft.description,
        route_map: mergeRootRoute(draft.routeMapJson, rootDocumentCid),
        asset_map: mergeRootAsset(draft.assetMapJson, rootDocumentCid),
        client_idempotency_key: stableSiteIdempotencyKey(
          'site-create',
          draft.siteName,
          rootDocumentCid,
          draft.title,
        ),
      });
    } catch (_error) {
      return null;
    }
  }, [
    draft.siteName,
    draft.title,
    draft.description,
    draft.ownerPassport,
    draft.ownerWallet,
    draft.routeMapJson,
    draft.assetMapJson,
    rootDocumentCid,
    settings.walletAccount,
    settings.passportSubject,
  ]);

  const amountMinor = extractPrepareAmountMinor(prepareState.data);

  const holdRequest = useMemo(() => {
    if (!amountMinor || !prepareState.data) {
      return null;
    }

    const from = stringValue(
      prepareState.data?.wallet_hold?.payer_account,
      prepareState.data?.wallet_hold_template?.from,
      prepareState.data?.wallet_hold?.from,
      prepareRequest?.payer_account,
      settings.walletAccount,
    );

    const to = stringValue(
      prepareState.data?.wallet_hold?.escrow_account,
      prepareState.data?.wallet_hold_template?.to,
      prepareState.data?.wallet_hold?.to,
      escrowAccount,
    );

    const nonce = Number(holdNonce);
    const safeNonce = Number.isSafeInteger(nonce) && nonce > 0 ? nonce : 1;

    if (!from || !to) {
      return null;
    }

    return {
      from,
      to,
      asset: 'roc',
      amount_minor: amountMinor,
      nonce: safeNonce,
      memo: `CrabLink site launch hold for ${draft.siteName || 'site'}`,
      idempotency_key: stableSiteIdempotencyKey(
        'site-wallet-hold',
        prepareRequest?.client_idempotency_key,
        from,
        to,
        amountMinor,
        safeNonce,
      ),
    };
  }, [amountMinor, prepareState.data, prepareRequest, settings.walletAccount, escrowAccount, holdNonce, draft.siteName]);

  const paidProof = useMemo(() => {
    if (holdState.status !== 'ok') {
      return null;
    }

    try {
      const normalizedHold = normalizeWalletHoldResponse(
        holdState.response?.walletHold || holdState.data || holdState.response?.data || {},
        holdState.request || {},
      );

      return normalizeSitePaidProof({
        ...normalizedHold,
        from: normalizedHold.from || holdState.request?.from,
        to: normalizedHold.to || holdState.request?.to,
        amount_minor: normalizedHold.amount_minor || holdState.request?.amount_minor,
        asset: normalizedHold.asset || holdState.request?.asset,
        idem: normalizedHold.idem || holdState.request?.idempotency_key,
      });
    } catch (_error) {
      return null;
    }
  }, [holdState]);

  const proofIssue = useMemo(() => holdProofIssue(holdState, paidProof), [holdState, paidProof]);
  const rootStoredForCurrentHtml =
    rootStoreState.status === 'ok' &&
    rootStoreState.request?.source_fingerprint === rootHtmlFingerprint &&
    normalizeSiteCid(rootStoreState.request?.returned_root_document_cid) === rootDocumentCid;

  const canStoreRoot =
    holdState.status === 'ok' &&
    Boolean(paidProof) &&
    Boolean(draft.rootHtml) &&
    rootHtmlBytes > 0;

  const canCreate =
    preflight.ready &&
    Boolean(createRequest) &&
    Boolean(paidProof) &&
    Boolean(rootDocumentCid) &&
    (rootStoredForCurrentHtml || Boolean(draft.rootDocumentCid));

  const createdSummary = createState.status === 'ok' ? summarizeSiteCreateData(createState.data) : null;

  useEffect(() => {
    setPrepareState(IDLE);
    setHoldState(IDLE);
    setRootStoreState(IDLE);
    setCreateState(IDLE);
    setStoredRootCid(normalizeSiteCid(draft.rootDocumentCid));
    setHoldNonce(loadNextNonceHint(settings.walletAccount));
  }, [
    draft.siteName,
    rootHtmlFingerprint,
    settings.walletAccount,
    settings.passportSubject,
  ]);

  useEffect(() => {
    const cid = normalizeSiteCid(draft.rootDocumentCid);

    if (cid !== storedRootCid) {
      setStoredRootCid(cid);
    }
  }, [draft.rootDocumentCid]);

  async function sendPrepare() {
    if (!prepareRequest || !preflight.canPrepare) {
      return;
    }

    setPrepareState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: prepareRequest,
    });
    setHoldState(IDLE);
    setRootStoreState(IDLE);
    setCreateState(IDLE);

    try {
      const response = await siteClient.prepareSite(prepareRequest, {
        idempotencyKey: prepareRequest.client_idempotency_key,
      });

      setPrepareState({
        status: 'ok',
        response,
        data: response?.data || null,
        error: null,
        request: prepareRequest,
      });

      app?.notify?.({
        title: 'Site prepare succeeded',
        message: `Gateway correlation: ${response?.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      setPrepareState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: prepareRequest,
      });

      app?.notify?.({
        title: 'Site prepare failed',
        message: error?.message || 'Gateway rejected the prepare request.',
        tone: 'warning',
      });
    }
  }

  async function confirmHold() {
    if (!holdRequest) {
      return;
    }

    if (!app?.clients?.wallet || typeof app.clients.wallet.hold !== 'function') {
      app?.notify?.({
        title: 'Wallet client unavailable',
        message: 'CrabLink could not find the gateway-backed wallet hold helper.',
        tone: 'danger',
      });
      return;
    }

    const confirmed = window.confirm(
      [
        'Confirm ROC hold for site launch?',
        '',
        `Amount: ${formatMinorUnits(holdRequest.amount_minor)} ROC minor units`,
        `From: ${holdRequest.from}`,
        `Escrow: ${holdRequest.to}`,
        `Nonce: ${holdRequest.nonce}`,
        '',
        'This sends a wallet hold through the configured gateway.',
        'If the wallet returns a nonce conflict, CrabLink will retry once with the backend-provided expected nonce.',
        'It does not store root HTML or create the site pointer until you click the next buttons.',
      ].join('\n'),
    );

    if (!confirmed) {
      app?.notify?.({
        title: 'Wallet hold cancelled',
        message: 'No ROC hold was sent.',
        tone: 'info',
      });
      return;
    }

    setHoldState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: holdRequest,
    });
    setRootStoreState(IDLE);
    setCreateState(IDLE);

    try {
      const response = await app.clients.wallet.hold(holdRequest, {
        confirmed: true,
      });

      const normalizedHold = normalizeWalletHoldResponse(
        response?.walletHold || response?.data || response || {},
        response?.request || holdRequest,
      );

      const usedRequest = response?.request || holdRequest;
      const nextNonce = Number(normalizedHold.nonce || usedRequest.nonce || 0) + 1;

      if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
        setHoldNonce(String(nextNonce));
        persistNextNonceHint(usedRequest.from || settings.walletAccount, nextNonce);
      }

      setHoldState({
        status: 'ok',
        response: {
          ...(response || {}),
          walletHold: normalizedHold,
        },
        data: normalizedHold,
        error: null,
        request: usedRequest,
      });

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: response?.nonceRecovery?.recovered ? 'ROC hold created after nonce retry' : 'ROC hold created',
        message: normalizedHold.receipt_hash
          ? response?.nonceRecovery?.recovered
            ? `CrabLink retried automatically with nonce ${response.nonceRecovery.retried_nonce}.`
            : 'Hold proof ready. Store Root HTML is now available.'
          : 'Hold succeeded, but the receipt hash was not found in the response.',
        tone: normalizedHold.receipt_hash ? 'success' : 'warning',
      });
    } catch (error) {
      const expectedNonce = expectedNonceFromWalletError(error);
      if (expectedNonce) {
        setHoldNonce(String(expectedNonce));
        persistNextNonceHint(holdRequest.from || settings.walletAccount, expectedNonce);
      }

      setHoldState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: holdRequest,
      });

      app?.notify?.({
        title: 'ROC hold failed',
        message: expectedNonce
          ? `Wallet suggested nonce ${expectedNonce}; nonce field was updated.`
          : error?.message || 'Wallet hold failed.',
        tone: 'warning',
      });
    }
  }

  async function storeRootHtml() {
    if (!canStoreRoot || !paidProof) {
      app?.notify?.({
        title: 'Root HTML storage blocked',
        message: proofIssue || 'Confirm ROC Hold first, then store the root HTML.',
        tone: 'warning',
      });
      return;
    }

    const confirmed = window.confirm(
      [
        'Store Root HTML?',
        '',
        `Site: crab://${draft.siteName || 'site'}`,
        `Bytes: ${formatBytes(rootHtmlBytes)}`,
        `Paid proof txid: ${paidProof.txid}`,
        '',
        'This sends the root HTML bytes to gateway /paid/o.',
        'The returned b3 CID will auto-fill the Root Document CID field.',
        '',
        'This does NOT create crab://<site_name> yet. You still click Create Site next.',
      ].join('\n'),
    );

    if (!confirmed) {
      app?.notify?.({
        title: 'Root HTML storage cancelled',
        message: 'No root HTML bytes were stored.',
        tone: 'info',
      });
      return;
    }

    const request = {
      route: '/paid/o',
      object_kind: 'site_root_html',
      content_type: 'text/html; charset=utf-8',
      bytes: rootHtmlBytes,
      paid_proof: paidProof,
      source_fingerprint: rootHtmlFingerprint,
    };

    setRootStoreState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request,
    });
    setCreateState(IDLE);

    try {
      const response = await objectClient.uploadSiteRootHtml({
        html: draft.rootHtml,
        paidProof,
      });

      const cid = response.objectCid;

      setStoredRootCid(cid);
      setRootStoreState({
        status: 'ok',
        response,
        data: response?.data || null,
        error: null,
        request: {
          ...request,
          returned_root_document_cid: cid,
        },
      });

      if (typeof updateDraft === 'function') {
        updateDraft('rootDocumentCid', cid);
      }

      app?.notify?.({
        title: 'Root HTML stored',
        message: `${shortCid(cid)} auto-filled. Click Create Site to write crab://${draft.siteName || '<site_name>'}.`,
        tone: 'success',
      });
    } catch (error) {
      setRootStoreState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request,
      });

      app?.notify?.({
        title: 'Root HTML storage failed',
        message: error?.message || 'Gateway rejected the root HTML storage request.',
        tone: 'danger',
      });
    }
  }

  async function createSite() {
    if (!canCreate || !createRequest || !paidProof) {
      app?.notify?.({
        title: 'Site create blocked',
        message: !rootDocumentCid
          ? 'Store Root HTML first so CrabLink has a real root_document_cid.'
          : proofIssue || 'Create requires a valid wallet hold proof and a stored root CID.',
        tone: 'warning',
      });
      return;
    }

    const confirmed = window.confirm(
      [
        'Create CrabLink site?',
        '',
        `Site: crab://${createRequest.site_name}`,
        `Root: ${createRequest.root_document_cid}`,
        `Txid: ${paidProof.txid}`,
        '',
        'This submits POST /sites through the configured gateway.',
        'The backend stores the site manifest and writes the site-name pointer.',
      ].join('\n'),
    );

    if (!confirmed) {
      app?.notify?.({
        title: 'Site create cancelled',
        message: 'No site pointer was created.',
        tone: 'info',
      });
      return;
    }

    setCreateState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: createRequest,
    });

    try {
      const response = await siteClient.createSite(createRequest, {
        confirmed: true,
        paidProof,
        idempotencyKey: createRequest.client_idempotency_key,
      });

      const data = response?.data || {};
      const summary = summarizeSiteCreateData(data);

      setCreateState({
        status: 'ok',
        response,
        data,
        error: null,
        request: createRequest,
      });

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: 'Site created',
        message: summary.crabUrl ? `Opening ${summary.crabUrl}` : 'Site create returned without a crab URL.',
        tone: summary.crabUrl ? 'success' : 'warning',
      });

      if (summary.crabUrl && typeof app?.navigate === 'function') {
        window.setTimeout(() => {
          app.navigate(summary.crabUrl);
        }, 900);
      }
    } catch (error) {
      setCreateState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: createRequest,
      });

      app?.notify?.({
        title: 'Site create failed',
        message: error?.message || 'Gateway rejected the site create request.',
        tone: 'danger',
      });
    }
  }

  function openCreatedSite() {
    const url = createdSummary?.crabUrl;
    if (url && typeof app?.navigate === 'function') {
      app.navigate(url);
    }
  }

  return (
    <Card
      eyebrow="Launch"
      title="Site launch flow"
      className="site-launch-card"
      actions={
        <div className="site-page-actions">
          <Badge tone={preflight.ready ? 'success' : 'warning'}>
            {preflight.ready ? 'ready' : 'needs steps'}
          </Badge>
          <Badge tone="neutral">prepare</Badge>
          <Badge tone="neutral">hold</Badge>
          <Badge tone="neutral">store root</Badge>
          <Badge tone="neutral">create</Badge>
        </div>
      }
    >
      <p className="site-panel-note">
        Store Root HTML only creates a raw b3 root document. The named URL, such as <code>crab://ron5</code>,
        exists only after Create Site successfully writes the site manifest pointer.
      </p>

      <div className="site-launch-preflight">
        <Fact label="Site" value={draft.siteName ? `crab://${draft.siteName}` : 'not set'} />
        <Fact label="Root HTML bytes" value={formatBytes(rootHtmlBytes)} />
        <Fact label="Root document CID" value={rootDocumentCid || 'not stored yet'} monospace />
        <Fact label="Passport" value={settings.passportSubject || draft.ownerPassport || 'missing'} />
        <Fact label="Wallet" value={settings.walletAccount || draft.ownerWallet || 'missing'} />
        <Fact label="Completeness" value={`${draftState?.completeness || 0}%`} />
      </div>

      {!preflight.ready && (
        <div className="site-launch-warning">
          <strong>Launch status</strong>
          <span>{preflight.reason}</span>
        </div>
      )}

      <section className="site-launch-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 1</p>
            <h3>Prepare site launch</h3>
          </div>
          <Badge tone={toneForStatus(prepareState.status)}>{labelForStatus(prepareState.status)}</Badge>
        </header>

        <p>
          Sends strict JSON metadata to <code>/sites/prepare</code>. This estimates the paid action and returns wallet
          hold instructions. It does not create the site pointer.
        </p>

        <div className="site-page-actions">
          <Button variant="primary" disabled={!preflight.canPrepare || !prepareRequest || prepareState.status === 'sending'} onClick={sendPrepare}>
            {prepareState.status === 'sending' ? 'Preparing…' : 'Prepare Site'}
          </Button>
          <CopyButton text={JSON.stringify(prepareRequest || {}, null, 2)} label="Copy prepare JSON" disabled={!prepareRequest} />
        </div>

        <JsonPreview
          label="Prepare request/result"
          data={{
            request: prepareRequest,
            result: summarizeResult(prepareState),
            amount_minor: amountMinor || null,
          }}
          initiallyOpen={prepareState.status === 'error'}
        />
      </section>

      <section className="site-launch-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 2</p>
            <h3>Confirm ROC hold</h3>
          </div>
          <Badge tone={toneForStatus(holdState.status)}>{labelForStatus(holdState.status)}</Badge>
        </header>

        <div className="site-launch-controls">
          <Field label="Escrow account">
            <TextInput value={escrowAccount} onChange={(event) => setEscrowAccount(event.target.value)} />
          </Field>

          <Field label="Nonce hint">
            <TextInput value={holdNonce} onChange={(event) => setHoldNonce(event.target.value)} inputMode="numeric" />
          </Field>
        </div>

        <div className="site-launch-preflight">
          <Fact label="From" value={holdRequest?.from || 'waiting for prepare'} />
          <Fact label="To" value={holdRequest?.to || 'waiting for prepare'} />
          <Fact label="Amount minor" value={holdRequest?.amount_minor || 'waiting for prepare'} />
          <Fact label="Proof" value={paidProof ? 'ready' : holdState.status === 'ok' ? 'missing receipt fields' : 'waiting'} />
          <Fact label="Idempotency" value={holdRequest?.idempotency_key || 'waiting for prepare'} monospace />
        </div>

        {holdState.response?.nonceRecovery?.recovered && (
          <div className="site-launch-warning">
            <strong>Nonce auto-recovered</strong>
            <span>
              Wallet expected nonce {holdState.response.nonceRecovery.retried_nonce}; CrabLink retried once automatically after your confirmation.
            </span>
          </div>
        )}

        {proofIssue && (
          <div className="site-launch-warning">
            <strong>Hold proof incomplete</strong>
            <span>{proofIssue}</span>
          </div>
        )}

        <div className="site-page-actions">
          <Button variant="primary" disabled={!holdRequest || holdState.status === 'sending'} onClick={confirmHold}>
            {holdState.status === 'sending' ? 'Holding…' : 'Confirm ROC Hold'}
          </Button>
          <CopyButton text={JSON.stringify(holdRequest || {}, null, 2)} label="Copy hold JSON" disabled={!holdRequest} />
        </div>

        <JsonPreview
          label="Hold request/result"
          data={{
            request: holdRequest,
            used_request: holdState.request,
            result: summarizeResult(holdState),
            nonce_recovery: holdState.response?.nonceRecovery || null,
            paid_proof_ready: Boolean(paidProof),
            paid_proof: paidProof,
            proof_issue: proofIssue || null,
          }}
          initiallyOpen={holdState.status === 'error' || Boolean(proofIssue)}
        />
      </section>

      <section className="site-launch-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 3</p>
            <h3>Store root HTML</h3>
          </div>
          <Badge tone={toneForStatus(rootStoreState.status)}>{labelForStatus(rootStoreState.status)}</Badge>
        </header>

        <p>
          Sends the root HTML bytes to <code>/paid/o</code> with the wallet hold proof. A successful backend response
          auto-fills <code>root_document_cid</code>. This is not the same as creating <code>crab://{draft.siteName || 'site'}</code>.
        </p>

        <div className="site-page-actions">
          <Button
            variant="primary"
            disabled={!canStoreRoot || rootStoreState.status === 'sending'}
            onClick={storeRootHtml}
          >
            {rootStoreState.status === 'sending' ? 'Storing…' : 'Store Root HTML'}
          </Button>
          <CopyButton text={rootDocumentCid || ''} label="Copy Root CID" disabled={!rootDocumentCid} />
        </div>

        {!canStoreRoot && (
          <div className="site-launch-warning">
            <strong>Store status</strong>
            <span>{proofIssue || 'Confirm ROC Hold first. Then this button will store the local root HTML bytes.'}</span>
          </div>
        )}

        {rootStoreState.status === 'ok' && (
          <div className="site-launch-compact-result">
            <MiniFact label="Root stored" value="complete" />
            <MiniFact label="Root CID" value={rootDocumentCid || 'not returned'} monospace />
            <MiniFact label="Bytes" value={formatBytes(rootHtmlBytes)} />
            <MiniFact label="Next" value="Click Create Site" />
          </div>
        )}

        <JsonPreview
          label="Root storage request/result"
          data={{
            request: rootStoreState.request,
            result: summarizeResult(rootStoreState),
            root_document_cid: rootDocumentCid || null,
            root_stored_for_current_html: rootStoredForCurrentHtml,
          }}
          initiallyOpen={rootStoreState.status === 'error'}
        />
      </section>

      <section className="site-launch-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 4</p>
            <h3>Create site pointer</h3>
          </div>
          <Badge tone={toneForStatus(createState.status)}>{labelForStatus(createState.status)}</Badge>
        </header>

        <p>
          Sends <code>POST /sites</code> with the backend root CID and wallet hold proof. The backend stores the site
          manifest and writes the site-name pointer, which is what makes the named <code>crab://</code> URL resolve.
        </p>

        <div className="site-page-actions">
          <Button
            variant="primary"
            disabled={!canCreate || createState.status === 'sending'}
            onClick={createSite}
          >
            {createState.status === 'sending' ? 'Creating…' : 'Create Site'}
          </Button>
          <Button variant="secondary" disabled={!createdSummary?.crabUrl} onClick={openCreatedSite}>
            Open Site
          </Button>
          <CopyButton text={createdSummary?.crabUrl || ''} label="Copy site URL" disabled={!createdSummary?.crabUrl} />
        </div>

        {!canCreate && (
          <div className="site-launch-warning">
            <strong>Create status</strong>
            <span>
              {!rootDocumentCid
                ? 'Store Root HTML first.'
                : !paidProof
                  ? 'Wallet hold proof is not available. Do not leave the workspace before creating the site.'
                  : !createRequest
                    ? 'Create request is not valid yet.'
                    : 'Store Root HTML for the current root before creating the site.'}
            </span>
          </div>
        )}

        {createState.status === 'ok' && (
          <div className="site-launch-compact-result">
            <MiniFact label="Create" value="complete" />
            <MiniFact label="Site" value={createdSummary?.crabUrl || 'not returned'} monospace />
            <MiniFact label="Manifest" value={createdSummary?.manifestCid || 'not returned'} monospace />
            <MiniFact label="Index" value={createdSummary?.indexPointerStatus || 'not returned'} />
          </div>
        )}

        <JsonPreview
          label="Create request/result"
          data={{
            request: createRequest,
            result: summarizeResult(createState),
            created_summary: createdSummary,
            can_create: canCreate,
          }}
          initiallyOpen={createState.status === 'error'}
        />
      </section>

      <JsonPreview
        label="Local draft manifest"
        data={manifest || null}
        initiallyOpen={draftState?.viewMode === 'developer'}
      />
    </Card>
  );
}

function getPreflight({ draft, rootDocumentCid, rootHtmlBytes, settings, stats }) {
  if (!String(draft?.siteName || '').trim()) {
    return {
      ready: false,
      canPrepare: false,
      reason: 'Choose a safe site name before preparing launch.',
    };
  }

  if (!String(settings?.passportSubject || draft?.ownerPassport || '').trim()) {
    return {
      ready: false,
      canPrepare: false,
      reason: 'Configure a passport subject before preparing launch.',
    };
  }

  if (!String(settings?.walletAccount || draft?.ownerWallet || '').trim()) {
    return {
      ready: false,
      canPrepare: false,
      reason: 'Configure a wallet account before preparing launch.',
    };
  }

  if (!rootHtmlBytes) {
    return {
      ready: false,
      canPrepare: false,
      reason: 'Add root HTML before preparing launch.',
    };
  }

  if (stats?.rootGuard && stats.rootGuard.ok === false) {
    return {
      ready: false,
      canPrepare: false,
      reason: stats.rootGuard.reason || 'Root guard blocked this draft.',
    };
  }

  if (!rootDocumentCid) {
    return {
      ready: false,
      canPrepare: true,
      reason:
        'Prepare and hold are available. Store Root HTML next; the returned b3 CID will auto-fill the final create step.',
    };
  }

  return {
    ready: true,
    canPrepare: true,
    reason: '',
  };
}

function extractPrepareAmountMinor(data = {}) {
  return stringValue(
    data?.wallet_hold?.amount_minor,
    data?.wallet_hold?.amountMinor,
    data?.wallet_hold?.minimum_hold_minor,
    data?.wallet_hold_template?.amount_minor,
    data?.wallet_hold_template?.amountMinor,
    data?.paid_storage?.estimate?.amount_minor,
    data?.paid_storage?.estimate?.amount_minor_units,
    data?.paid_storage?.estimate?.minimum_hold_minor,
    data?.estimate?.amount_minor,
    data?.estimate?.amountMinor,
    data?.amount_minor,
    data?.amountMinor,
    data?.estimate_minor,
  );
}

function mergeRootRoute(routeMapJson, rootDocumentCid) {
  const parsed = parseJsonObject(routeMapJson);
  return {
    ...filterCidMap(parsed),
    '/': rootDocumentCid,
  };
}

function mergeRootAsset(assetMapJson, rootDocumentCid) {
  const parsed = parseJsonObject(assetMapJson);
  return {
    ...filterCidMap(parsed),
    'index.html': rootDocumentCid,
  };
}

function filterCidMap(value) {
  const out = {};

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return out;
  }

  for (const [key, child] of Object.entries(value)) {
    const cid = normalizeSiteCid(child);
    if (cid) {
      out[key] = cid;
    }
  }

  return out;
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function holdProofIssue(holdState, paidProof) {
  if (holdState.status !== 'ok' || paidProof) {
    return '';
  }

  const normalized = normalizeWalletHoldResponse(
    holdState.response?.walletHold || holdState.data || holdState.response?.data || {},
    holdState.request || {},
  );

  const missing = [];
  if (!normalized.txid) missing.push('txid');
  if (!normalized.receipt_hash) missing.push('receipt_hash');
  if (!normalized.from) missing.push('from');
  if (!normalized.to) missing.push('to');
  if (!normalized.amount_minor) missing.push('amount_minor');

  if (!missing.length) {
    return 'Wallet hold succeeded, but CrabLink could not turn it into a paid proof.';
  }

  return `Wallet hold succeeded, but the hold proof is missing: ${missing.join(', ')}. Open “Hold request/result” to inspect the backend response.`;
}

function summarizeResult(state) {
  if (!state || state.status === 'idle') {
    return {
      status: 'idle',
    };
  }

  return {
    status: state.status,
    ok: state.status === 'ok',
    route: state.response?.route || state.error?.route || '',
    http: state.response?.status || state.error?.status || 0,
    correlation_id: state.response?.correlationId || state.error?.correlationId || '',
    object_cid: state.response?.objectCid || '',
    error: state.error
      ? {
          name: state.error.name || 'Error',
          message: state.error.message || String(state.error),
          reason: state.error.reason || '',
          status: state.error.status || 0,
          data: state.error.data || null,
          nonce_recovery: state.error.nonceRecovery || null,
        }
      : null,
    data: state.data || null,
    wallet_hold: state.response?.walletHold || null,
  };
}

function toneForStatus(status) {
  if (status === 'ok') return 'success';
  if (status === 'sending') return 'info';
  if (status === 'error') return 'warning';
  return 'neutral';
}

function labelForStatus(status) {
  if (status === 'ok') return 'ready';
  if (status === 'sending') return 'sending';
  if (status === 'error') return 'failed';
  return 'not sent';
}

function Fact({ label, value, monospace = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}

function MiniFact({ label, value, monospace = false }) {
  return (
    <div className="site-launch-mini-fact">
      <span>{label}</span>
      <strong
        className={monospace ? 'is-monospace' : ''}
        style={{
          display: 'block',
          marginTop: '0.15rem',
          fontSize: monospace ? '0.78rem' : '0.9rem',
          lineHeight: 1.35,
          overflowWrap: 'anywhere',
        }}
      >
        {value || 'n/a'}
      </strong>
    </div>
  );
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

function sourceFingerprint(value) {
  const source = String(value || '');
  const head = source.slice(0, 96);
  const tail = source.slice(-96);
  return `${source.length}:${head}:${tail}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMinorUnits(value) {
  const raw = String(value ?? '').trim();

  if (!/^[0-9]+$/.test(raw)) {
    return raw || '0';
  }

  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function shortCid(value) {
  const cid = String(value || '');
  return cid.length > 18 ? `${cid.slice(0, 12)}…${cid.slice(-8)}` : cid;
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}