/**
 * RO:WHAT — Explicit React prepare → wallet hold → stream descriptor publish flow for crab://stream.
 * RO:WHY — Adds stream descriptor minting without claiming live ingest, viewer playback, or backend stream status exists.
 * RO:INTERACTS — streamAssetClient, walletClient, StreamPage, svc-gateway /assets/stream/prepare, /wallet/hold, /assets/stream.
 * RO:INVARIANTS — no silent ROC spend; hold requires explicit review/send; publish requires backend hold proof; no fake CIDs or live status.
 * RO:METRICS — gateway correlation IDs returned by GatewayClient are displayed in diagnostics.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — sends descriptor JSON only; no stream keys, ingest secrets, media blobs, local paths, or spend authority.
 * RO:TEST — manual crab://stream prepare/hold/publish smoke after backend stream routes exist.
 */

import { useEffect, useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import {
  buildStreamPublishRequest,
  createStreamAssetClient,
  extractStreamAssetCid,
  extractStreamAssetUrl,
  extractStreamId,
  normalizePaidProof,
  stableIdempotencyKey,
} from '../../shared/api/streamAssetClient.js';
import {
  compactIdempotencyKey,
  createWalletClient,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  toWalletHoldApiBody,
} from '../../shared/api/walletClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
  apiRequest: null,
  nonceRecovery: null,
});

export default function StreamPublishFlow({ app, draft, previewState, pricing, manifest, onPublishedStream }) {
  const settings = app?.settings || {};
  const gateway = app?.clients?.gateway || null;
  const streamClient = useMemo(() => createStreamAssetClient(gateway), [gateway]);
  const walletClient = useMemo(
    () => app?.clients?.wallet || createWalletClient(gateway),
    [app?.clients?.wallet, gateway],
  );

  const [prepareState, setPrepareState] = useState(IDLE_RESULT);
  const [holdState, setHoldState] = useState(IDLE_RESULT);
  const [publishState, setPublishState] = useState(IDLE_RESULT);
  const [escrowAccount, setEscrowAccount] = useState(DEFAULT_ESCROW_ACCOUNT);
  const [holdNonce, setHoldNonce] = useState(() => loadNextNonceHint(settings.walletAccount));
  const [holdReviewOpen, setHoldReviewOpen] = useState(false);
  const [publishReviewOpen, setPublishReviewOpen] = useState(false);

  const publishRequest = useMemo(
    () =>
      buildStreamPublishRequest({
        draft,
        previewState,
        pricing,
        manifest,
        settings,
      }),
    [draft, previewState, pricing, manifest, settings],
  );

  const workflowKey = useMemo(
    () =>
      [
        publishRequest.title,
        publishRequest.stream_kind,
        publishRequest.access_policy?.price_roc,
        publishRequest.access_policy?.interval_seconds,
        publishRequest.creator?.passport_subject,
        publishRequest.creator?.wallet_account,
      ].join('|'),
    [publishRequest],
  );

  useEffect(() => {
    setPrepareState(IDLE_RESULT);
    setHoldState(IDLE_RESULT);
    setPublishState(IDLE_RESULT);
    setHoldReviewOpen(false);
    setPublishReviewOpen(false);

    if (typeof onPublishedStream === 'function') {
      onPublishedStream(null);
    }
  }, [workflowKey, onPublishedStream]);

  useEffect(() => {
    setHoldNonce(loadNextNonceHint(settings.walletAccount));
  }, [settings.walletAccount]);

  const preparedData = prepareState.data || prepareState.response || null;
  const holdData = holdState.data || holdState.response || null;
  const publishData = publishState.data || publishState.response || null;

  const preparedHold = useMemo(() => normalizePrepareHold(preparedData), [preparedData]);
  const normalizedHold = useMemo(() => {
    try {
      return holdData ? normalizeWalletHoldResponse(holdData) : null;
    } catch (_error) {
      return holdData || null;
    }
  }, [holdData]);

  const paidProof = useMemo(() => {
    if (!normalizedHold) return null;

    try {
      return normalizePaidProof({
        ...normalizedHold,
        amount_minor: preparedHold.amountMinor,
        from: settings.walletAccount,
        to: escrowAccount,
      });
    } catch (_error) {
      return null;
    }
  }, [normalizedHold, preparedHold.amountMinor, settings.walletAccount, escrowAccount]);

  const streamUrl = extractStreamAssetUrl(publishData || {});
  const streamCid = extractStreamAssetCid(publishData || {});
  const streamId = extractStreamId(publishData || {});
  const canPrepare = Boolean(streamClient.ready && settings.walletAccount && settings.passportSubject);
  const canHold = Boolean(preparedHold.amountMinor && settings.walletAccount && escrowAccount);
  const canPublish = Boolean(paidProof && preparedData);

  async function onPrepare() {
    setPrepareState({ ...IDLE_RESULT, status: 'loading', request: publishRequest });
    setHoldState(IDLE_RESULT);
    setPublishState(IDLE_RESULT);
    setHoldReviewOpen(false);
    setPublishReviewOpen(false);

    const idempotencyKey = stableIdempotencyKey(
      'stream-prepare',
      publishRequest.title,
      settings.passportSubject,
      settings.walletAccount,
      publishRequest.access_policy?.price_roc,
      publishRequest.access_policy?.interval_seconds,
    );

    try {
      const response = await streamClient.prepareStream(publishRequest, { idempotencyKey });
      setPrepareState({
        status: 'success',
        response,
        data: response?.data || response,
        error: null,
        request: publishRequest,
        apiRequest: {
          route: '/assets/stream/prepare',
          idempotencyKey,
        },
        nonceRecovery: null,
      });
      setHoldReviewOpen(true);
    } catch (error) {
      setPrepareState({
        ...IDLE_RESULT,
        status: 'error',
        request: publishRequest,
        error: normalizeError(error, 'Stream prepare failed. Backend route may not exist yet.'),
      });
    }
  }

  async function onSendHold() {
    const amountMinor = preparedHold.amountMinor;

    if (!amountMinor) {
      setHoldState({
        ...IDLE_RESULT,
        status: 'error',
        error: 'Prepare the stream first so the backend can quote the hold amount.',
      });
      return;
    }

    const holdIdempotencyKey = stableIdempotencyKey(
      'stream-hold',
      publishRequest.client_idempotency_key,
      settings.walletAccount,
      escrowAccount,
      amountMinor,
      holdNonce,
    );

    const holdRequest = {
      from: settings.walletAccount,
      to: escrowAccount,
      asset: 'roc',
      amount_minor: amountMinor,
      nonce: holdNonce,
      memo: `stream descriptor publish: ${publishRequest.title}`,
      client_idempotency_key: holdIdempotencyKey,
    };

    const apiRequest = toWalletHoldApiBody
      ? toWalletHoldApiBody(holdRequest)
      : {
          from: holdRequest.from,
          to: holdRequest.to,
          asset: holdRequest.asset,
          amount_minor: holdRequest.amount_minor,
          nonce: holdRequest.nonce,
          memo: holdRequest.memo,
          client_idempotency_key: holdRequest.client_idempotency_key,
        };

    setHoldState({
      ...IDLE_RESULT,
      status: 'loading',
      request: holdRequest,
      apiRequest,
    });

    try {
      const response = await submitWalletHold(walletClient, apiRequest, holdIdempotencyKey);
      const normalized = normalizeWalletHoldResponse(response?.data || response);

      rememberNextNonceHint(settings.walletAccount, holdNonce);

      setHoldState({
        status: 'success',
        response,
        data: normalized,
        error: null,
        request: holdRequest,
        apiRequest,
        nonceRecovery: null,
      });
      setHoldReviewOpen(false);
      setPublishReviewOpen(true);
    } catch (error) {
      const nonceRecovery = expectedNonceFromWalletError(error);
      const message = normalizeError(error, 'Wallet hold failed.');

      setHoldState({
        status: 'error',
        response: null,
        data: null,
        error: message,
        request: holdRequest,
        apiRequest,
        nonceRecovery,
      });

      if (nonceRecovery) {
        setHoldNonce(String(nonceRecovery));
      }
    }
  }

  async function onPublish() {
    if (!paidProof) {
      setPublishState({
        ...IDLE_RESULT,
        status: 'error',
        error: 'Send the ROC hold first. Stream descriptor publish requires backend wallet proof.',
      });
      return;
    }

    const idempotencyKey = stableIdempotencyKey(
      'stream-publish',
      paidProof.txid,
      paidProof.receipt_hash,
      publishRequest.client_idempotency_key,
    );

    setPublishState({
      ...IDLE_RESULT,
      status: 'loading',
      request: publishRequest,
      apiRequest: {
        route: '/assets/stream',
        idempotencyKey,
        paidProof: {
          ...paidProof,
          raw: undefined,
        },
      },
    });

    try {
      const response = await streamClient.publishStream({
        request: publishRequest,
        paidProof,
        idempotencyKey,
      });
      const data = response?.data || response;
      const nextStreamUrl = extractStreamAssetUrl(data || {});
      const nextStreamCid = extractStreamAssetCid(data || {});
      const nextStreamId = extractStreamId(data || {});

      setPublishState({
        status: 'success',
        response,
        data,
        error: null,
        request: publishRequest,
        apiRequest: {
          route: '/assets/stream',
          idempotencyKey,
        },
        nonceRecovery: null,
      });
      setPublishReviewOpen(false);

      if (typeof onPublishedStream === 'function') {
        onPublishedStream(
          summarizePublishedStream({
            data,
            streamUrl: nextStreamUrl,
            streamCid: nextStreamCid,
            streamId: nextStreamId,
            publishRequest,
            settings,
          }),
        );
      }

      if (nextStreamUrl || nextStreamCid) {
        writeCatalogEntrySafe({
          crabUrl: nextStreamUrl,
          cid: nextStreamCid,
          streamId: nextStreamId,
          title: publishRequest.title,
          description: publishRequest.description,
          tags: publishRequest.tags,
          raw: data,
        });
      }

      app?.refreshWallet?.();
    } catch (error) {
      setPublishState({
        ...IDLE_RESULT,
        status: 'error',
        request: publishRequest,
        error: normalizeError(error, 'Stream descriptor publish failed. Backend route may not exist yet.'),
      });
    }
  }

  function applyRecoveredNonce() {
    const next = holdState.nonceRecovery;

    if (next) {
      setHoldNonce(String(next));
    }
  }

  async function copyJson(value, label) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value || {}, null, 2));
      setPublishState((current) => ({
        ...current,
        copyState: `${label} copied`,
      }));
    } catch (_error) {
      setPublishState((current) => ({
        ...current,
        copyState: 'Clipboard unavailable in this WebView',
      }));
    }
  }

  return (
    <section className="cl-stream-panel cl-stream-publish-flow" aria-label="Stream descriptor publish">
      <div className="cl-stream-panel-head">
        <div>
          <p className="cl-eyebrow">Backend descriptor mint</p>
          <h2>Publish stream descriptor</h2>
          <p>
            This prepares a stream manifest, asks you to explicitly hold ROC, then submits the
            descriptor to the backend. It does not send live media chunks yet and never creates a
            stream URL locally.
          </p>
        </div>

        <div className="cl-stream-publish-badges" aria-label="Stream publish status">
          <span className={prepareState.status === 'success' ? 'is-good' : ''}>prepare</span>
          <span className={holdState.status === 'success' ? 'is-good' : ''}>hold</span>
          <span className={publishState.status === 'success' ? 'is-good' : ''}>publish</span>
        </div>
      </div>

      <div className="cl-stream-publish-grid">
        <Fact label="Creator wallet" value={settings.walletAccount || 'Missing wallet'} />
        <Fact label="Passport" value={settings.passportSubject || 'Missing passport'} />
        <Fact label="Price" value={`${publishRequest.access_policy.price_roc} ROC`} />
        <Fact label="Interval" value={`${publishRequest.access_policy.interval_seconds}s`} />
      </div>

      <div className="cl-stream-truth-box">
        <strong>Descriptor boundary</strong>
        <p>
          The backend must return the real CID, stream ID, receipt, and crab:// URL. Local preview,
          local JSON, and receipt cache cannot unlock paid stream viewing.
        </p>
      </div>

      <div className="cl-stream-two">
        <label className="cl-stream-field">
          <span>Escrow account</span>
          <input
            value={escrowAccount}
            onChange={(event) => setEscrowAccount(event.target.value)}
            maxLength={120}
          />
        </label>

        <label className="cl-stream-field">
          <span>Hold nonce</span>
          <input
            value={holdNonce}
            onChange={(event) => setHoldNonce(event.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            maxLength={24}
          />
        </label>
      </div>

      <div className="cl-stream-publish-actions">
        <button type="button" onClick={onPrepare} disabled={!canPrepare || prepareState.status === 'loading'}>
          {prepareState.status === 'loading' ? 'Preparing...' : '1. Prepare stream'}
        </button>

        <button
          type="button"
          onClick={() => setHoldReviewOpen((open) => !open)}
          disabled={!canHold || holdState.status === 'loading'}
        >
          2. Review ROC hold
        </button>

        <button
          type="button"
          onClick={() => setPublishReviewOpen((open) => !open)}
          disabled={!canPublish || publishState.status === 'loading'}
        >
          3. Review publish
        </button>
      </div>

      {!canPrepare ? (
        <p className="cl-stream-error" role="alert">
          Select a wallet/passport in CrabLink settings before preparing a paid stream descriptor.
        </p>
      ) : null}

      {prepareState.error ? <p className="cl-stream-error" role="alert">{prepareState.error}</p> : null}
      {holdState.error ? <p className="cl-stream-error" role="alert">{holdState.error}</p> : null}
      {publishState.error ? <p className="cl-stream-error" role="alert">{publishState.error}</p> : null}

      {holdState.nonceRecovery ? (
        <div className="cl-stream-review-box">
          <strong>Wallet nonce recovery available</strong>
          <p>The backend suggested nonce {holdState.nonceRecovery}. Apply it, then send the hold again.</p>
          <button type="button" onClick={applyRecoveredNonce}>
            Use nonce {holdState.nonceRecovery}
          </button>
        </div>
      ) : null}

      {holdReviewOpen ? (
        <div className="cl-stream-review-box">
          <h3>Review ROC hold</h3>
          <p>
            Send an explicit hold of <strong>{preparedHold.amountMinor || 'backend-quoted'} ROC</strong>{' '}
            from <strong>{settings.walletAccount || 'missing wallet'}</strong> to{' '}
            <strong>{escrowAccount}</strong>. This is required before backend descriptor publish.
          </p>
          <div className="cl-stream-action-row">
            <button type="button" onClick={onSendHold} disabled={!canHold || holdState.status === 'loading'}>
              {holdState.status === 'loading' ? 'Sending hold...' : 'Send ROC hold'}
            </button>
            <button type="button" onClick={() => copyJson(prepareState.data, 'Prepare response')}>
              Copy prepare JSON
            </button>
          </div>
        </div>
      ) : null}

      {publishReviewOpen ? (
        <div className="cl-stream-review-box">
          <h3>Review backend publish</h3>
          <p>
            Publish the stream descriptor using the wallet hold proof. The backend must mint the real
            `crab://&lt;hash&gt;.stream` URL; this UI will not invent one.
          </p>
          <div className="cl-stream-action-row">
            <button type="button" onClick={onPublish} disabled={!canPublish || publishState.status === 'loading'}>
              {publishState.status === 'loading' ? 'Publishing...' : 'Publish stream descriptor'}
            </button>
            <button type="button" onClick={() => copyJson(publishRequest, 'Publish request')}>
              Copy request JSON
            </button>
          </div>
        </div>
      ) : null}

      {streamUrl || streamCid || streamId ? (
        <div className="cl-stream-publish-success">
          <p className="cl-eyebrow">Backend confirmed</p>
          <h3>Stream descriptor minted</h3>
          <p>
            Stay on this control room to keep local camera preview alive. Opening the viewer
            route in this same window will unmount the creator preview and stop local tracks
            until backend live ingest is added.
          </p>

          <div className="cl-stream-result-grid">
            <Fact label="Stream URL" value={streamUrl || 'Not returned'} />
            <Fact label="CID" value={streamCid || 'Not returned'} />
            <Fact label="Stream ID" value={streamId || 'Not returned'} />
          </div>

          <div className="cl-stream-action-row">
            {streamUrl ? (
              <>
                <button type="button" onClick={() => navigator.clipboard?.writeText(streamUrl)}>
                  Copy stream URL
                </button>
                <button type="button" onClick={() => app?.navigate?.(streamUrl)}>
                  Open viewer page in this window
                </button>
              </>
            ) : null}
            <button type="button" onClick={() => copyJson(publishData, 'Publish response')}>
              Copy response JSON
            </button>
          </div>
        </div>
      ) : null}

      <details className="cl-stream-details">
        <summary>Developer request preview</summary>
        <JsonPreview value={publishRequest} />
      </details>

      {preparedData ? (
        <details className="cl-stream-details">
          <summary>Prepare response</summary>
          <JsonPreview value={preparedData} />
        </details>
      ) : null}

      {holdData ? (
        <details className="cl-stream-details">
          <summary>Wallet hold response</summary>
          <JsonPreview value={holdData} />
        </details>
      ) : null}

      {publishData ? (
        <details className="cl-stream-details">
          <summary>Publish response</summary>
          <JsonPreview value={publishData} />
        </details>
      ) : null}
    </section>
  );
}

function Fact({ label, value }) {
  return (
    <div className="cl-stream-fact">
      <span>{label}</span>
      <strong>{String(value || '—')}</strong>
    </div>
  );
}

async function submitWalletHold(walletClient, apiRequest, idempotencyKey) {
  if (!walletClient) {
    throw new Error('Wallet client is not ready.');
  }

  const options = {
    confirmed: true,
    idempotencyKey,
  };

  if (typeof walletClient.hold === 'function') {
    return walletClient.hold(apiRequest, options);
  }

  if (typeof walletClient.createWalletHold === 'function') {
    return walletClient.createWalletHold(apiRequest, options);
  }

  if (typeof walletClient.createHold === 'function') {
    return walletClient.createHold(apiRequest, options);
  }

  if (typeof walletClient.sendHold === 'function') {
    return walletClient.sendHold(apiRequest, options);
  }

  throw new Error('Wallet client does not expose a hold/createWalletHold method.');
}

function normalizePrepareHold(data) {
  const root = objectValue(data);
  const hold =
    objectValue(root.wallet_hold) ||
    objectValue(root.walletHold) ||
    objectValue(root.hold) ||
    objectValue(root.quote?.wallet_hold);

  const amountMinor = cleanString(
    hold.amount_minor ||
      hold.amountMinor ||
      hold.estimate_minor ||
      hold.estimateMinor ||
      root.amount_minor ||
      root.amountMinor ||
      root.estimate_minor ||
      root.estimateMinor,
  );

  return {
    raw: hold,
    amountMinor,
    escrowAccount: cleanString(hold.to || hold.to_account || hold.escrow_account),
  };
}

function writeCatalogEntrySafe({ crabUrl, cid, streamId, title, description, tags, raw }) {
  try {
    writeLocalCatalogEntry({
      schema: 'crablink.local-catalog-entry.v1',
      kind: 'stream',
      crabUrl,
      title: title || 'Stream descriptor',
      status: 'backend-confirmed display cache',
      detail: streamId ? `stream_id: ${streamId}` : 'stream descriptor',
      cid,
      createdAt: new Date().toISOString(),
      tags: Array.isArray(tags) ? tags : [],
      description,
      raw,
    });
  } catch (_error) {
    // Catalog is display-only convenience. Never block a backend-confirmed publish on it.
  }
}

function summarizePublishedStream({ data, streamUrl, streamCid, streamId, publishRequest, settings }) {
  const root = objectValue(data);
  const manifest = objectValue(root.manifest);
  const descriptor = objectValue(root.descriptor);
  const creator = objectValue(publishRequest?.creator);
  const owner = objectValue(root.owner);
  const payout = objectValue(root.payout);

  return {
    schema: 'crablink.stream-published-control-room.v1',
    streamUrl: streamUrl || extractStreamAssetUrl(root),
    streamCid: streamCid || extractStreamAssetCid(root),
    streamId:
      streamId ||
      extractStreamId(root) ||
      cleanString(descriptor.stream_id || descriptor.streamId || manifest.stream_id || manifest.streamId),
    manifestCid: cleanCid(
      manifest.manifest_cid ||
        manifest.manifestCid ||
        root.manifest_cid ||
        root.manifestCid ||
        root.asset_manifest_cid ||
        root.assetManifestCid,
    ),
    title: cleanString(root.title || descriptor.metadata?.title || publishRequest?.title),
    creatorAccount: cleanString(
      creator.wallet_account ||
        owner.wallet_account ||
        owner.walletAccount ||
        payout.recipient_account ||
        payout.recipientAccount ||
        settings?.walletAccount,
    ),
    creatorPassport: cleanString(
      creator.passport_subject ||
        owner.passport_subject ||
        owner.passportSubject ||
        settings?.passportSubject,
    ),
    status: cleanString(root.status || descriptor.status || 'descriptor_published'),
    raw: root,
    publishedAt: new Date().toISOString(),
    truth_boundary:
      'This is a React display copy of a backend-confirmed stream descriptor publish response. Backend stream session state still must be started through /streams/{stream_id}/start.',
  };
}

function cleanCid(value) {
  const clean = cleanString(value).toLowerCase();

  if (/^b3:[0-9a-f]{64}$/.test(clean)) {
    return clean;
  }

  if (/^[0-9a-f]{64}$/.test(clean)) {
    return `b3:${clean}`;
  }

  return '';
}

function normalizeError(error, fallback) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.reason) return `${fallback} (${error.reason})`;
  return fallback;
}

function loadNextNonceHint(walletAccount) {
  const key = nonceKey(walletAccount);

  try {
    return window.localStorage.getItem(key) || '1';
  } catch (_error) {
    return '1';
  }
}

function rememberNextNonceHint(walletAccount, nonce) {
  const current = Number.parseInt(String(nonce || '1'), 10);
  const next = Number.isFinite(current) ? String(current + 1) : '1';

  try {
    window.localStorage.setItem(nonceKey(walletAccount), next);
  } catch (_error) {
    // Local nonce hint is convenience only.
  }
}

function nonceKey(walletAccount) {
  return `crablink.stream.nextHoldNonce.${cleanString(walletAccount) || 'default'}`;
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}