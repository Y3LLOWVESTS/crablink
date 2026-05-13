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
  createWalletClient,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  stableIdempotencyKey,
  toWalletHoldApiBody,
} from '../../shared/api/walletClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';
const MAX_SIMPLE_IMAGE_BYTES = 1024 * 1024;

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
  apiRequest: null,
  nonceRecovery: null,
});

export default function ImagePublishFlow({
  app,
  draftState,
  selectedFile,
  fileFacts,
}) {
  const settings = app?.settings || {};
  const gateway = app?.clients?.gateway || null;
  const assetClient = useMemo(() => createAssetClient(gateway), [gateway]);
  const walletClient = useMemo(
    () => app?.clients?.wallet || createWalletClient(gateway),
    [app?.clients?.wallet, gateway],
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
        normalizeTags(draftState?.draft?.tags || '').join(','),
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
    gateway,
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

  const holdApiRequest = useMemo(() => {
    try {
      return holdRequest ? toWalletHoldApiBody(holdRequest) : null;
    } catch (_error) {
      return null;
    }
  }, [holdRequest]);

  const paidProof = useMemo(() => {
    if (holdState.status !== 'ok') {
      return null;
    }

    try {
      const normalizedHold = normalizeWalletHoldResponse(
        firstObject(
          holdState.response?.walletHold,
          holdState.data?.walletHold,
          holdState.data,
          holdState.response?.data,
          holdState.response,
        ),
        holdState.apiRequest || holdState.request || {},
      );

      return normalizePaidProof({
        ...normalizedHold,
        from: normalizedHold.from || holdState.apiRequest?.from || holdState.request?.from,
        to: normalizedHold.to || holdState.apiRequest?.to || holdState.request?.to,
        amount_minor: normalizedHold.amount_minor || holdState.apiRequest?.amount_minor || holdState.request?.amount_minor,
        asset: normalizedHold.asset || holdState.apiRequest?.asset || holdState.request?.asset || 'roc',
        idem: normalizedHold.idem || holdState.apiRequest?.idempotency_key || holdState.request?.idempotency_key,
      });
    } catch (_error) {
      return null;
    }
  }, [holdState]);

  const uploadPayload = firstObject(uploadState.data, uploadState.response?.data, uploadState.response);
  const uploadCrabUrl = extractImageAssetUrl(uploadPayload);
  const uploadAssetCid = extractImageAssetCid(uploadPayload);

  const canPrepare = preflight.ok && Boolean(preparePayload);
  const canHold = prepareState.status === 'ok' && Boolean(holdRequest && holdApiRequest);
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
      apiRequest: preparePayload,
      nonceRecovery: null,
    });
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);

    try {
      const response = await callAssetPrepare(assetClient, preparePayload, {
        idempotencyKey: preparePayload.client_idempotency_key,
      });

      const data = firstObject(response?.data, response);

      setPrepareState({
        status: 'ok',
        response,
        data,
        error: null,
        request: preparePayload,
        apiRequest: preparePayload,
        nonceRecovery: null,
      });

      const template = extractHoldTemplate(data);
      const suggestedNonce = firstString(template.nonce, template.next_nonce, template.nextNonce);

      if (suggestedNonce) {
        setHoldNonce(suggestedNonce);
      }

      app?.notify?.({
        title: 'Image prepare succeeded',
        message: `Gateway correlation: ${response?.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      setPrepareState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: preparePayload,
        apiRequest: preparePayload,
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
        `Amount: ${formatMinorUnits(holdApiRequest.amount_minor)} ROC minor units`,
        `From: ${holdApiRequest.from}`,
        `Escrow: ${holdApiRequest.to}`,
        `Nonce: ${holdApiRequest.nonce}`,
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
      apiRequest: holdApiRequest,
      nonceRecovery: null,
    });
    setUploadState(IDLE_RESULT);

    try {
      const holdResult = await createWalletHoldWithNonceRecovery(holdRequest);

      setHoldState({
        status: 'ok',
        response: holdResult.response,
        data: firstObject(holdResult.response?.data, holdResult.response?.walletHold, holdResult.response),
        error: null,
        request: holdResult.request,
        apiRequest: holdResult.apiRequest || toWalletHoldApiBody(holdResult.request),
        nonceRecovery: holdResult.nonceRecovery,
      });

      const finalRequest = holdResult.apiRequest || toWalletHoldApiBody(holdResult.request);
      const nextNonce = Number(finalRequest?.nonce || 0) + 1;

      if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
        saveLastNonceHint(settings.walletAccount, finalRequest?.nonce);
        setHoldNonce(String(nextNonce));
      }

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: holdResult.nonceRecovery ? 'ROC hold created after nonce retry' : 'ROC hold created',
        message: `Wallet hold returned. Correlation: ${holdResult.response?.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      const suggested = expectedNonceFromProblem(error);

      if (suggested) {
        setHoldNonce(String(suggested));
      }

      setHoldState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: error?.request || holdRequest,
        apiRequest: error?.apiRequest || holdApiRequest,
        nonceRecovery: suggested
          ? {
              retried: false,
              suggested_nonce: suggested,
              reason: 'Backend returned a suggested/expected nonce, but retry did not complete.',
            }
          : error?.nonceRecovery || null,
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
    const firstApiRequest = toWalletHoldApiBody(firstRequest);

    try {
      const firstResponse = await callWalletHold(walletClient, firstApiRequest);

      return {
        response: firstResponse,
        request: firstRequest,
        apiRequest: firstResponse?.apiRequest || firstApiRequest,
        nonceRecovery: firstResponse?.nonceRecovery || null,
      };
    } catch (firstError) {
      const suggested = expectedNonceFromProblem(firstError);

      if (!suggested || String(suggested) === String(firstApiRequest.nonce || '')) {
        firstError.request = firstRequest;
        firstError.apiRequest = firstApiRequest;
        throw firstError;
      }

      const retryRequest = {
        ...firstRequest,
        nonce: Number(suggested),
        idempotency_key: buildWalletHoldIdempotencyKey({
          preparePayload,
          from: firstApiRequest.from,
          to: firstApiRequest.to,
          amountMinor: firstApiRequest.amount_minor,
          nonce: suggested,
        }),
      };
      const retryApiRequest = toWalletHoldApiBody(retryRequest);

      setHoldNonce(String(suggested));
      setHoldState({
        status: 'sending',
        response: null,
        data: firstObject(firstError?.data, firstError?.response?.data),
        error: null,
        request: retryRequest,
        apiRequest: retryApiRequest,
        nonceRecovery: {
          retried: true,
          first_nonce: firstApiRequest.nonce,
          expected_nonce: suggested,
          status: 'retrying',
        },
      });

      const retryResponse = await callWalletHold(walletClient, retryApiRequest);

      return {
        response: retryResponse,
        request: retryRequest,
        apiRequest: retryResponse?.apiRequest || retryApiRequest,
        nonceRecovery: {
          retried: true,
          first_nonce: firstApiRequest.nonce,
          expected_nonce: suggested,
          status: 'ok',
          wallet_client_recovery: retryResponse?.nonceRecovery || null,
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
        file: fileFacts || summarizeFile(selectedFile),
        paidProof,
      },
      apiRequest: null,
      nonceRecovery: null,
    });

    try {
      const response = await callAssetUpload(assetClient, {
        file: selectedFile,
        title: draftState?.draft?.title || selectedFile?.name || '',
        description: draftState?.draft?.description || draftState?.draft?.altText || '',
        tags: normalizeTags(draftState?.draft?.tags || ''),
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          preparePayload?.client_idempotency_key ||
          stableIdempotencyKey('image-upload', selectedFile.name, paidProof.txid),
      });

      const data = firstObject(response?.data, response);
      const crabUrl = extractImageAssetUrl(data);

      setUploadState({
        status: 'ok',
        response,
        data,
        error: null,
        request: {
          route: '/assets/image',
          file: fileFacts || summarizeFile(selectedFile),
          paidProof,
        },
        apiRequest: response?.request || null,
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
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: {
          route: '/assets/image',
          file: fileFacts || summarizeFile(selectedFile),
          paidProof,
        },
        apiRequest: null,
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
        <Fact label="Gateway" value={settings.gatewayUrl || gateway?.baseUrl || 'not configured'} />
        <Fact label="Passport" value={settings.passportSubject || 'not configured'} />
        <Fact label="Wallet" value={settings.walletAccount || 'not configured'} />
        <Fact label="Selected file" value={fileFacts?.name || selectedFile?.name || 'none'} />
        <Fact label="Simple upload cap" value="1 MiB MVP" />
        <Fact label="Current file size" value={selectedFile ? formatBytes(selectedFile.size) : 'n/a'} />
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
            hold_template: extractHoldTemplate(prepareState.data),
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
          Sends an explicit wallet hold to <code>/wallet/hold</code>. The developer preview may show
          route metadata, but the actual API body is strict and only includes wallet DTO fields.
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
          <Fact label="From" value={holdApiRequest?.from || 'waiting for prepare'} />
          <Fact label="To" value={holdApiRequest?.to || 'waiting for prepare'} />
          <Fact label="Amount minor" value={holdApiRequest?.amount_minor || 'waiting for prepare'} />
          <Fact label="Idempotency" value={holdApiRequest?.idempotency_key || 'waiting for prepare'} monospace />
        </div>

        <div className="image-publish-actions">
          <Button variant="primary" disabled={!canHold || holdState.status === 'sending'} onClick={confirmHold}>
            {holdState.status === 'sending' ? 'Holding…' : 'Confirm ROC Hold'}
          </Button>
          <CopyButton
            text={JSON.stringify(holdApiRequest || {}, null, 2)}
            label="Copy strict hold API JSON"
            disabled={!holdApiRequest}
          />
        </div>

        <JsonPreview
          label="Hold request/result"
          data={{
            uiPreviewRequest: holdRequest
              ? {
                  schema: 'crablink.wallet-hold-preview.v1',
                  ...holdRequest,
                }
              : null,
            strictWalletApiRequest: holdApiRequest,
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
          initiallyOpen={uploadState.status === 'error' || uploadState.status === 'ok'}
        />
      </section>
    </Card>
  );
}

async function callAssetPrepare(assetClient, payload, options) {
  if (typeof assetClient?.prepareImageAsset === 'function') {
    return assetClient.prepareImageAsset(payload, options);
  }

  if (typeof assetClient?.prepareImage === 'function') {
    return assetClient.prepareImage(payload, options);
  }

  throw new Error('Asset client is missing prepareImageAsset/prepareImage.');
}

async function callAssetUpload(assetClient, payload) {
  if (typeof assetClient?.uploadImageAsset === 'function') {
    return assetClient.uploadImageAsset(payload);
  }

  if (typeof assetClient?.uploadImage === 'function') {
    return assetClient.uploadImage({
      file: payload.file,
      contentType: payload.file?.type || 'image/png',
      paidProof: payload.paidProof,
      metadata: {
        title: payload.title,
        description: payload.description,
        tags: payload.tags,
      },
      idempotencyKey: payload.idempotencyKey,
    });
  }

  throw new Error('Asset client is missing uploadImageAsset/uploadImage.');
}

async function callWalletHold(walletClient, strictApiRequest) {
  if (typeof walletClient?.hold === 'function') {
    return walletClient.hold(strictApiRequest, {
      confirmed: true,
    });
  }

  if (typeof walletClient?.createWalletHold === 'function') {
    return walletClient.createWalletHold(strictApiRequest, {
      confirmed: true,
      idempotencyKey: strictApiRequest.idempotency_key,
    });
  }

  throw new Error('Wallet client is missing hold/createWalletHold.');
}

function getPreflight({ selectedFile, settings, gateway }) {
  if (!gateway) {
    return {
      ok: false,
      reason: 'Gateway client is not loaded yet.',
    };
  }

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
    description: draft.description || draft.altText || undefined,
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
  const prepare = asObject(prepareData);
  const template = extractHoldTemplate(prepare);
  const from = firstString(
    template.from,
    template.payer,
    template.payer_account,
    template.payerAccount,
    prepare.payer_account,
    prepare.payerAccount,
    preparePayload?.payer_account,
    settings.walletAccount,
  );
  const to = firstString(
    template.to,
    template.escrow,
    template.escrow_account,
    template.escrowAccount,
    escrowAccount,
    DEFAULT_ESCROW_ACCOUNT,
  );
  const templateNonce = firstString(template.nonce, template.next_nonce, template.nextNonce);
  const nonce = Number(firstString(holdNonce, templateNonce, '1'));
  const safeNonce = Number.isSafeInteger(nonce) && nonce > 0 ? nonce : 1;
  const amount = firstString(
    amountMinor,
    template.amount_minor,
    template.amountMinor,
    template.amount,
  );

  if (!from || !to || !/^[0-9]+$/.test(amount) || amount === '0') {
    return null;
  }

  const idemHint = firstString(
    template.idempotency_key_hint,
    template.idempotencyKeyHint,
    template.idempotency_key,
    template.idempotencyKey,
    preparePayload?.client_idempotency_key,
    preparePayload?.idempotency_key,
    selectedFile?.name,
  );

  return {
    from,
    to,
    asset: firstString(template.asset, 'roc').toLowerCase(),
    amount_minor: amount,
    nonce: safeNonce,
    memo: `CrabLink image hold for ${selectedFile?.name || preparePayload?.title || 'image upload'}`.slice(0, 240),
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

function extractPrepareAmountMinor(data) {
  const object = asObject(data);
  const template = extractHoldTemplate(object);
  const paidStorage = asObject(object.paid_storage || object.paidStorage);
  const estimate = asObject(object.estimate || paidStorage.estimate || object.price);
  const nestedPrice = asObject(object.pricing || object.cost);

  return firstString(
    template.amount_minor,
    template.amountMinor,
    template.minimum_hold_minor,
    template.minimumHoldMinor,
    estimate.amount_minor,
    estimate.amountMinor,
    estimate.amount_minor_units,
    estimate.minimum_hold_minor,
    nestedPrice.amount_minor,
    nestedPrice.amountMinor,
    object.amount_minor,
    object.amountMinor,
    object.estimate_minor,
    object.estimateMinor,
    object.price_minor,
    object.priceMinor,
  );
}

function extractHoldTemplate(data) {
  const object = asObject(data);

  return firstObject(
    object.hold_template,
    object.holdTemplate,
    object.wallet_hold_template,
    object.walletHoldTemplate,
    object.wallet_hold,
    object.walletHold,
    object.hold,
    object.paid_hold,
    object.paidHold,
  );
}

function expectedNonceFromProblem(errorOrData = {}) {
  const expected = expectedNonceFromWalletError(errorOrData);

  if (expected) {
    return expected;
  }

  const data = asObject(errorOrData?.data || errorOrData?.response?.data);
  return firstString(
    data.expected_nonce,
    data.expectedNonce,
    data.next_nonce,
    data.nextNonce,
    data.required_nonce,
    data.requiredNonce,
  );
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
    request: state.request || null,
    strictApiRequest: state.apiRequest || null,
    error: state.error
      ? {
          name: state.error.name || 'Error',
          message: state.error.message || String(state.error),
          reason: state.error.reason || '',
          status: state.error.status || 0,
          data: firstObject(state.error.data, state.error.response?.data),
          walletApiRequest: state.error.apiRequest || null,
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

function summarizeFile(file) {
  if (!file) {
    return null;
  }

  return {
    name: file.name || 'selected image',
    size: file.size || 0,
    type: file.type || 'image/png',
  };
}

function stripUndefined(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => child !== undefined && child !== null && child !== ''),
  );
}

function firstString(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
  }

  return {};
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