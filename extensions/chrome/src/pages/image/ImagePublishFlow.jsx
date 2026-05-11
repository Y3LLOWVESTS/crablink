/**
 * RO:WHAT — Explicit React prepare → wallet hold → paid image upload flow for crab://image.
 * RO:WHY — Moves proven paid image publishing toward React parity without touching the protected legacy lane.
 * RO:INTERACTS — assetClient, walletClient, ImagePage, app.refreshWallet, svc-gateway /assets/image/prepare, /wallet/hold, /assets/image.
 * RO:INVARIANTS — no silent ROC spend; hold requires click/confirm; upload requires backend hold proof; no direct storage/index/ledger calls.
 * RO:METRICS — gateway correlation IDs returned by GatewayClient are displayed in diagnostics.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — sends raw image bytes only to configured svc-gateway; no private keys/seed phrases/local ledger truth.
 * RO:TEST — manual crab://image prepare/hold/upload smoke from chrome-extension:// origin.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import Field from '../../shared/components/Field.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  createAssetClient,
  extractImageAssetCid,
  extractImageAssetUrl,
  normalizePaidProof,
} from '../../shared/api/assetClient.js';
import {
  compactIdempotencyKey,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  stableIdempotencyKey,
} from '../../shared/api/walletClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';
const MAX_SIMPLE_IMAGE_BYTES = 1024 * 1024;

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
  nonceRecovery: null,
});

export default function ImagePublishFlow({
  app,
  draftState,
  selectedFile,
  fileFacts,
}) {
  const settings = app?.settings || {};
  const assetClient = useMemo(
    () => createAssetClient(app?.clients?.gateway),
    [app?.clients?.gateway],
  );

  const [prepareState, setPrepareState] = useState(IDLE_RESULT);
  const [holdState, setHoldState] = useState(IDLE_RESULT);
  const [uploadState, setUploadState] = useState(IDLE_RESULT);
  const [escrowAccount, setEscrowAccount] = useState(DEFAULT_ESCROW_ACCOUNT);
  const [holdNonce, setHoldNonce] = useState(() => loadNextNonceHint(settings.walletAccount));
  const autoOpenTimer = useRef(0);

  const workflowKey = useMemo(
    () =>
      [
        selectedFile?.name || '',
        selectedFile?.size || '',
        selectedFile?.type || '',
        draftState?.draft?.title || '',
        draftState?.draft?.description || '',
        draftState?.draft?.tags || '',
        settings.passportSubject || '',
        settings.walletAccount || '',
      ].join('|'),
    [selectedFile, draftState?.draft, settings.passportSubject, settings.walletAccount],
  );

  useEffect(() => {
    setPrepareState(IDLE_RESULT);
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);
  }, [workflowKey]);

  useEffect(() => {
    setHoldNonce(loadNextNonceHint(settings.walletAccount));
  }, [settings.walletAccount]);

  useEffect(() => {
    return () => {
      if (autoOpenTimer.current) {
        window.clearTimeout(autoOpenTimer.current);
        autoOpenTimer.current = 0;
      }
    };
  }, []);

  const preflight = getPreflight({
    selectedFile,
    settings,
  });

  const preparePayload = useMemo(
    () =>
      selectedFile
        ? buildPreparePayload({
            draft: draftState?.draft || {},
            selectedFile,
            settings,
          })
        : null,
    [draftState?.draft, selectedFile, settings],
  );

  const amountMinor = extractPrepareAmountMinor(prepareState.data);
  const holdRequest = useMemo(
    () =>
      buildHoldRequest({
        amountMinor,
        escrowAccount,
        holdNonce,
        prepareData: prepareState.data,
        preparePayload,
        settings,
        selectedFile,
      }),
    [amountMinor, escrowAccount, holdNonce, prepareState.data, preparePayload, settings, selectedFile],
  );

  const paidProof = useMemo(() => {
    if (holdState.status !== 'ok') {
      return null;
    }

    try {
      const normalizedHold = normalizeWalletHoldResponse(
        holdState.response?.walletHold || holdState.data || {},
        holdState.request || {},
      );

      return normalizePaidProof({
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

  const uploadCrabUrl = extractImageAssetUrl(uploadState.data);
  const uploadAssetCid = extractImageAssetCid(uploadState.data);

  const canPrepare = preflight.ok && Boolean(preparePayload);
  const canHold = prepareState.status === 'ok' && Boolean(holdRequest);
  const canUpload = holdState.status === 'ok' && Boolean(paidProof) && Boolean(selectedFile);

  async function sendPrepare() {
    if (!canPrepare) {
      return;
    }

    setPrepareState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: preparePayload,
      nonceRecovery: null,
    });
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);

    try {
      const response = await assetClient.prepareImageAsset(preparePayload, {
        idempotencyKey: preparePayload.client_idempotency_key,
      });

      setPrepareState({
        status: 'ok',
        response,
        data: response.data,
        error: null,
        request: preparePayload,
        nonceRecovery: null,
      });

      app?.notify?.({
        title: 'Image prepare succeeded',
        message: `Gateway correlation: ${response.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      setPrepareState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: preparePayload,
        nonceRecovery: null,
      });

      app?.notify?.({
        title: 'Image prepare failed',
        message: error?.message || 'Gateway rejected the prepare request.',
        tone: 'warning',
      });
    }
  }

  async function confirmHold() {
    if (!canHold) {
      return;
    }

    const confirmed = window.confirm(
      [
        'Confirm ROC hold?',
        '',
        `Amount: ${formatMinorUnits(holdRequest.amount_minor)} ROC minor units`,
        `From: ${holdRequest.from}`,
        `Escrow: ${holdRequest.to}`,
        `Nonce: ${holdRequest.nonce}`,
        '',
        'This creates a wallet hold through the configured gateway.',
        'It does not upload image bytes until you click Submit Image Upload.',
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
      nonceRecovery: null,
    });
    setUploadState(IDLE_RESULT);

    try {
      const holdResult = await createWalletHoldWithNonceRecovery(holdRequest);

      setHoldState({
        status: 'ok',
        response: holdResult.response,
        data: holdResult.response?.data || null,
        error: null,
        request: holdResult.request,
        nonceRecovery: holdResult.nonceRecovery,
      });

      const nextNonce = Number(holdResult.request?.nonce || 0) + 1;
      if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
        saveLastNonceHint(settings.walletAccount, holdResult.request?.nonce);
        setHoldNonce(String(nextNonce));
      }

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: holdResult.nonceRecovery ? 'ROC hold created after nonce retry' : 'ROC hold created',
        message: `Wallet hold returned. Correlation: ${holdResult.response?.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      const suggested = expectedNonceFromProblem(error, error?.message);

      if (suggested) {
        setHoldNonce(String(suggested));
      }

      setHoldState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: holdRequest,
        nonceRecovery: suggested
          ? {
              retried: false,
              suggested_nonce: suggested,
              reason: 'Backend returned a suggested/expected nonce, but retry did not complete.',
            }
          : null,
      });

      app?.notify?.({
        title: 'ROC hold failed',
        message: suggested
          ? `Wallet suggested nonce ${suggested}; the nonce field was updated.`
          : error?.message || 'Wallet hold failed.',
        tone: 'warning',
      });
    }
  }

  async function createWalletHoldWithNonceRecovery(firstRequest) {
    try {
      const firstResponse = await app?.clients?.wallet?.hold?.(firstRequest, {
        confirmed: true,
      });

      return {
        response: firstResponse,
        request: firstRequest,
        nonceRecovery: null,
      };
    } catch (firstError) {
      const suggested = expectedNonceFromProblem(firstError, firstError?.message);

      if (!suggested || suggested === Number(firstRequest.nonce || 0)) {
        throw firstError;
      }

      const retryRequest = {
        ...firstRequest,
        nonce: suggested,
        idempotency_key: buildWalletHoldIdempotencyKey({
          preparePayload,
          from: firstRequest.from,
          to: firstRequest.to,
          amountMinor: firstRequest.amount_minor,
          nonce: suggested,
        }),
      };

      setHoldNonce(String(suggested));
      setHoldState({
        status: 'sending',
        response: null,
        data: firstError?.data || null,
        error: null,
        request: retryRequest,
        nonceRecovery: {
          retried: true,
          first_nonce: firstRequest.nonce,
          expected_nonce: suggested,
          status: 'retrying',
        },
      });

      const retryResponse = await app?.clients?.wallet?.hold?.(retryRequest, {
        confirmed: true,
      });

      return {
        response: retryResponse,
        request: retryRequest,
        nonceRecovery: {
          retried: true,
          first_nonce: firstRequest.nonce,
          expected_nonce: suggested,
          status: 'ok',
        },
      };
    }
  }

  async function submitUpload() {
    if (!canUpload) {
      return;
    }

    const confirmed = window.confirm(
      [
        'Submit image upload?',
        '',
        `File: ${selectedFile.name || 'selected image'}`,
        `Bytes: ${selectedFile.size}`,
        `Content-Type: ${selectedFile.type || 'image/png'}`,
        `Paid proof txid: ${paidProof.txid}`,
        '',
        'This sends raw image bytes to svc-gateway /assets/image.',
        'The backend coordinates paid storage, manifest creation, and index pointer writing.',
      ].join('\n'),
    );

    if (!confirmed) {
      app?.notify?.({
        title: 'Image upload cancelled',
        message: 'No image bytes were uploaded.',
        tone: 'info',
      });
      return;
    }

    setUploadState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: {
        route: '/assets/image',
        file: fileFacts,
        paidProof,
      },
      nonceRecovery: null,
    });

    try {
      const response = await assetClient.uploadImageAsset({
        file: selectedFile,
        title: draftState?.draft?.title || '',
        description: draftState?.draft?.description || '',
        tags: normalizeTags(draftState?.draft?.tags || ''),
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          preparePayload?.client_idempotency_key ||
          stableIdempotencyKey('image-upload', selectedFile.name, paidProof.txid),
      });

      const data = response.data || {};
      const crabUrl = extractImageAssetUrl(data);

      setUploadState({
        status: 'ok',
        response,
        data,
        error: null,
        request: {
          route: '/assets/image',
          file: fileFacts,
          paidProof,
        },
        nonceRecovery: null,
      });

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: 'Image upload complete',
        message: crabUrl ? `Opening ${crabUrl}` : 'Upload returned without a crab URL.',
        tone: crabUrl ? 'success' : 'warning',
      });

      if (crabUrl && typeof app?.navigate === 'function') {
        if (autoOpenTimer.current) {
          window.clearTimeout(autoOpenTimer.current);
        }

        autoOpenTimer.current = window.setTimeout(() => {
          app.navigate(crabUrl);
        }, 900);
      }
    } catch (error) {
      setUploadState({
        status: 'error',
        response: null,
        data: error?.data || null,
        error,
        request: {
          route: '/assets/image',
          file: fileFacts,
          paidProof,
        },
        nonceRecovery: null,
      });

      app?.notify?.({
        title: 'Image upload failed',
        message: error?.message || 'Gateway rejected the upload request.',
        tone: 'danger',
      });
    }
  }

  function openReturnedAsset() {
    if (uploadCrabUrl && typeof app?.navigate === 'function') {
      app.navigate(uploadCrabUrl);
    }
  }

  return (
    <Card
      eyebrow="Publish"
      title="React image publish flow"
      className="image-publish-card"
      actions={
        <div className="image-publish-badges">
          <Badge tone={preflight.ok ? 'success' : 'warning'}>
            {preflight.ok ? 'ready' : 'needs setup'}
          </Badge>
          <Badge tone="neutral">prepare</Badge>
          <Badge tone="neutral">hold</Badge>
          <Badge tone="neutral">upload</Badge>
        </div>
      }
    >
      <p className="image-section-copy">
        This is the React parity path for the proven image workflow. Prepare is a preflight call.
        The ROC hold and byte upload are separate explicit clicks.
      </p>

      <section className="image-publish-grid" aria-label="Image publish prerequisites">
        <Fact label="Gateway" value={settings.gatewayUrl || 'not configured'} />
        <Fact label="Passport" value={settings.passportSubject || 'not configured'} />
        <Fact label="Wallet" value={settings.walletAccount || 'not configured'} />
        <Fact label="Selected file" value={fileFacts?.name || 'none'} />
        <Fact label="Simple upload cap" value="1 MiB MVP" />
        <Fact label="Current file size" value={fileFacts ? formatBytes(fileFacts.size) : 'n/a'} />
      </section>

      {!preflight.ok && (
        <div className="image-publish-warning">
          <strong>Publish flow blocked</strong>
          <span>{preflight.reason}</span>
        </div>
      )}

      <section className="image-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 1</p>
            <h3>Prepare image upload</h3>
          </div>
          <Badge tone={toneForStatus(prepareState.status)}>{labelForStatus(prepareState.status)}</Badge>
        </header>

        <p>
          Sends strict JSON metadata to <code>/assets/image/prepare</code>. It does not upload image bytes
          and does not mutate the wallet.
        </p>

        <div className="image-publish-actions">
          <Button variant="primary" disabled={!canPrepare || prepareState.status === 'sending'} onClick={sendPrepare}>
            {prepareState.status === 'sending' ? 'Preparing…' : 'Send Prepare Request'}
          </Button>
          <CopyButton
            text={JSON.stringify(preparePayload || {}, null, 2)}
            label="Copy prepare JSON"
            disabled={!preparePayload}
          />
        </div>

        <JsonPreview
          label="Prepare request/result"
          data={{
            request: preparePayload,
            result: summarizeResult(prepareState),
            amount_minor: amountMinor || null,
          }}
        />
      </section>

      <section className="image-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 2</p>
            <h3>Confirm ROC hold</h3>
          </div>
          <Badge tone={toneForStatus(holdState.status)}>{labelForStatus(holdState.status)}</Badge>
        </header>

        <p>
          Sends an explicit wallet hold to <code>/wallet/hold</code>. This requires a visible confirmation
          and does not upload image bytes. The nonce box is a local convenience hint only; the backend remains
          the source of truth and may return an expected nonce if the hint is stale.
        </p>

        <div className="image-publish-controls">
          <Field label="Escrow account">
            <TextInput value={escrowAccount} onChange={(event) => setEscrowAccount(event.target.value)} />
          </Field>

          <Field label="Nonce">
            <TextInput value={holdNonce} onChange={(event) => setHoldNonce(event.target.value)} inputMode="numeric" />
          </Field>
        </div>

        <div className="image-publish-grid">
          <Fact label="From" value={holdRequest?.from || 'waiting for prepare'} />
          <Fact label="To" value={holdRequest?.to || 'waiting for prepare'} />
          <Fact label="Amount minor" value={holdRequest?.amount_minor || 'waiting for prepare'} />
          <Fact label="Idempotency" value={holdRequest?.idempotency_key || 'waiting for prepare'} monospace />
        </div>

        <div className="image-publish-actions">
          <Button variant="primary" disabled={!canHold || holdState.status === 'sending'} onClick={confirmHold}>
            {holdState.status === 'sending' ? 'Holding…' : 'Confirm ROC Hold'}
          </Button>
          <CopyButton
            text={JSON.stringify(holdRequest || {}, null, 2)}
            label="Copy hold JSON"
            disabled={!holdRequest}
          />
        </div>

        <JsonPreview
          label="Hold request/result"
          data={{
            request: holdRequest,
            result: summarizeResult(holdState),
            nonce_recovery: holdState.nonceRecovery || null,
            paid_proof_ready: Boolean(paidProof),
            paid_proof: paidProof,
          }}
          initiallyOpen={holdState.status === 'error'}
        />
      </section>

      <section className="image-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 3</p>
            <h3>Submit image upload</h3>
          </div>
          <Badge tone={toneForStatus(uploadState.status)}>{labelForStatus(uploadState.status)}</Badge>
        </header>

        <p>
          Sends the selected image bytes as the raw request body to <code>/assets/image</code> with the
          wallet hold proof headers required by the gateway contract.
        </p>

        <div className="image-publish-actions">
          <Button variant="primary" disabled={!canUpload || uploadState.status === 'sending'} onClick={submitUpload}>
            {uploadState.status === 'sending' ? 'Uploading…' : 'Submit Image Upload'}
          </Button>
          <Button variant="secondary" disabled={!uploadCrabUrl} onClick={openReturnedAsset}>
            Open Asset Page
          </Button>
          <CopyButton text={uploadCrabUrl} label="Copy crab URL" disabled={!uploadCrabUrl} />
        </div>

        {uploadState.status === 'ok' && (
          <div className="image-upload-success">
            <StatChip label="Upload" value="complete" tone="success" />
            <StatChip label="Crab URL" value={uploadCrabUrl || 'not returned'} help={uploadCrabUrl} tone={uploadCrabUrl ? 'success' : 'warning'} />
            <StatChip label="Asset CID" value={uploadAssetCid || 'not returned'} help={uploadAssetCid} />
            <StatChip label="HTTP" value={String(uploadState.response?.status || 'n/a')} />
          </div>
        )}

        <JsonPreview
          label="Upload result"
          data={{
            request: uploadState.request,
            result: summarizeResult(uploadState),
            returned_crab_url: uploadCrabUrl || null,
            returned_asset_cid: uploadAssetCid || null,
          }}
          initiallyOpen={uploadState.status === 'error'}
        />
      </section>
    </Card>
  );
}

function getPreflight({ selectedFile, settings }) {
  if (!selectedFile) {
    return {
      ok: false,
      reason: 'Choose an image file before preparing a paid upload.',
    };
  }

  if (Number(selectedFile.size || 0) > MAX_SIMPLE_IMAGE_BYTES) {
    return {
      ok: false,
      reason: 'This MVP upload path is capped at 1 MiB. Use a smaller test image or future rendition/streaming flow.',
    };
  }

  if (!String(settings?.walletAccount || '').trim()) {
    return {
      ok: false,
      reason: 'Configure a wallet account label before preparing an image upload.',
    };
  }

  if (!String(settings?.passportSubject || '').trim()) {
    return {
      ok: false,
      reason: 'Configure a passport subject before preparing an image upload.',
    };
  }

  return {
    ok: true,
    reason: '',
  };
}

function buildPreparePayload({ draft, selectedFile, settings }) {
  const contentType = selectedFile.type || draft.expectedMimeType || 'image/png';

  return stripUndefined({
    bytes: selectedFile.size,
    payer_account: settings.walletAccount || undefined,
    owner_passport_subject: settings.passportSubject || undefined,
    content_type: contentType,
    title: draft.title || selectedFile.name || undefined,
    description: draft.description || undefined,
    tags: normalizeTags(draft.tags),
    client_idempotency_key: stableIdempotencyKey(
      'image-prepare',
      selectedFile.name || 'image',
      selectedFile.size,
      contentType,
      settings.walletAccount,
    ),
  });
}

function buildHoldRequest({
  amountMinor,
  escrowAccount,
  holdNonce,
  prepareData,
  preparePayload,
  settings,
  selectedFile,
}) {
  const from = stringValue(
    prepareData?.wallet_hold?.payer_account,
    prepareData?.payer_account,
    preparePayload?.payer_account,
    settings.walletAccount,
  );
  const to = String(escrowAccount || DEFAULT_ESCROW_ACCOUNT).trim();
  const nonce = Number(holdNonce);
  const safeNonce = Number.isSafeInteger(nonce) && nonce > 0 ? nonce : 1;
  const amount = String(amountMinor || '').trim();

  if (!from || !to || !/^[0-9]+$/.test(amount) || amount === '0') {
    return null;
  }

  const idemHint = stringValue(
    prepareData?.wallet_hold?.idempotency_key_hint,
    prepareData?.wallet_hold?.idempotencyKeyHint,
    preparePayload?.client_idempotency_key,
    preparePayload?.idempotency_key,
    selectedFile?.name,
  );

  return {
    from,
    to,
    asset: 'roc',
    amount_minor: amount,
    nonce: safeNonce,
    memo: `CrabLink image hold for ${selectedFile?.name || preparePayload?.title || 'image upload'}`,
    idempotency_key: buildWalletHoldIdempotencyKey({
      preparePayload: {
        ...(preparePayload || {}),
        client_idempotency_key: idemHint || preparePayload?.client_idempotency_key,
      },
      from,
      to,
      amountMinor: amount,
      nonce: safeNonce,
    }),
  };
}

function buildWalletHoldIdempotencyKey({ preparePayload, from, to, amountMinor, nonce }) {
  return compactIdempotencyKey(
    stableIdempotencyKey(
      'wallet-hold',
      preparePayload?.client_idempotency_key || 'image-prepare',
      from,
      to,
      amountMinor,
      nonce,
    ),
    'wallet-hold',
  );
}

function extractPrepareAmountMinor(data = {}) {
  return stringValue(
    data?.wallet_hold?.amount_minor,
    data?.wallet_hold?.amountMinor,
    data?.wallet_hold?.minimum_hold_minor,
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

function expectedNonceFromProblem(errorOrData = {}, message = '') {
  return expectedNonceFromWalletError(errorOrData, message);
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
    nonce_recovery: state.nonceRecovery || null,
    error: state.error
      ? {
          name: state.error.name || 'Error',
          message: state.error.message || String(state.error),
          reason: state.error.reason || '',
          status: state.error.status || 0,
          data: state.error.data || null,
        }
      : null,
    data: state.data || null,
  };
}

function Fact({ label, value, monospace = false }) {
  return (
    <div className="image-publish-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
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

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 24);
  }

  return String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => child !== undefined && child !== null && child !== ''),
  );
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

function nonceStorageKey(account) {
  const safeAccount = String(account || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, '-')
    .slice(0, 80) || 'default';

  return `crablink.react.walletHold.lastNonce.${safeAccount}`;
}

function loadNextNonceHint(account) {
  try {
    const raw = globalThis.localStorage?.getItem?.(nonceStorageKey(account));
    const last = Number(raw || 0);

    if (Number.isSafeInteger(last) && last > 0) {
      return String(last + 1);
    }
  } catch (_error) {
    // Local nonce hints are optional UI convenience only, never backend truth.
  }

  return '1';
}

function saveLastNonceHint(account, nonce) {
  const value = Number(nonce || 0);

  if (!Number.isSafeInteger(value) || value < 1) {
    return;
  }

  try {
    globalThis.localStorage?.setItem?.(nonceStorageKey(account), String(value));
  } catch (_error) {
    // Local nonce hints are optional UI convenience only, never backend truth.
  }
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