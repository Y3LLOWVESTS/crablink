/**
 * RO:WHAT — Explicit React prepare → wallet hold → paid podcast upload flow for crab://podcast.
 * RO:WHY — Brings the proven music paid mint loop to podcast episodes with guest/voice rights gating.
 * RO:INTERACTS — podcastAssetClient, walletClient, PodcastPage, svc-gateway /assets/podcast/prepare, /wallet/hold, /assets/podcast.
 * RO:INVARIANTS — no silent ROC spend; no fake CIDs; no fake receipts; cover art is crab URL reference only.
 * RO:METRICS — gateway and command correlation IDs are shown in diagnostics.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — sends bounded audio bytes only to configured svc-gateway; no file path or cover-art bytes are sent.
 * RO:TEST — npm run build; manual crab://podcast prepare/hold/upload smoke from Tauri React shell.
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
import { writeLocalCatalogEntry } from '../../shared/catalog/localCatalog.js';
import {
  createPodcastAssetClient,
  extractPodcastAssetCid,
  extractPodcastAssetUrl,
  normalizePaidProof,
} from '../../shared/api/podcastAssetClient.js';
import {
  compactIdempotencyKey,
  createWalletClient,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  stableIdempotencyKey,
  toWalletHoldApiBody,
} from '../../shared/api/walletClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';
const MAX_SIMPLE_PODCAST_BYTES = 25 * 1024 * 1024;

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
  apiRequest: null,
  nonceRecovery: null,
});

export default function PodcastPublishFlow({
  app,
  draft,
  selectedFile,
  fileFacts,
  attestationReady,
  legalAttestation,
}) {
  const settings = app?.settings || {};
  const gateway = app?.clients?.gateway || null;
  const podcastClient = useMemo(() => createPodcastAssetClient(gateway), [gateway]);
  const walletClient = useMemo(
    () => app?.clients?.wallet || createWalletClient(gateway),
    [app?.clients?.wallet, gateway],
  );

  const [prepareState, setPrepareState] = useState(IDLE_RESULT);
  const [holdState, setHoldState] = useState(IDLE_RESULT);
  const [uploadState, setUploadState] = useState(IDLE_RESULT);
  const [escrowAccount, setEscrowAccount] = useState(DEFAULT_ESCROW_ACCOUNT);
  const [holdNonce, setHoldNonce] = useState(() => loadNextNonceHint(settings.walletAccount));
  const [holdReviewOpen, setHoldReviewOpen] = useState(false);
  const [uploadReviewOpen, setUploadReviewOpen] = useState(false);
  const autoOpenTimer = useRef(0);

  const workflowKey = useMemo(
    () =>
      [
        selectedFile?.name || '',
        selectedFile?.size || '',
        selectedFile?.type || '',
        draft.title || '',
        draft.showTitle || '',
        draft.hostDisplay || '',
        normalizeTags(draft.tags || '').join(','),
        attestationReady ? 'rights-ok' : 'rights-missing',
        settings.passportSubject || '',
        settings.walletAccount || '',
      ].join('|'),
    [selectedFile, draft, attestationReady, settings.passportSubject, settings.walletAccount],
  );

  useEffect(() => {
    setPrepareState(IDLE_RESULT);
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);
    setHoldReviewOpen(false);
    setUploadReviewOpen(false);
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
    attestationReady,
  });

  const preparePayload = useMemo(
    () =>
      selectedFile
        ? buildPreparePayload({
            draft,
            selectedFile,
            settings,
            attestationReady,
          })
        : null,
    [draft, selectedFile, settings, attestationReady],
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
        amount_minor:
          normalizedHold.amount_minor ||
          holdState.apiRequest?.amount_minor ||
          holdState.request?.amount_minor,
        asset: normalizedHold.asset || holdState.apiRequest?.asset || holdState.request?.asset || 'roc',
        idem:
          normalizedHold.idem ||
          holdState.apiRequest?.idempotency_key ||
          holdState.request?.idempotency_key,
      });
    } catch (_error) {
      return null;
    }
  }, [holdState]);

  const uploadPayload = firstObject(uploadState.data, uploadState.response?.data, uploadState.response);
  const uploadCrabUrl = extractPodcastAssetUrl(uploadPayload);
  const uploadAssetCid = extractPodcastAssetCid(uploadPayload);

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
    setHoldReviewOpen(false);
    setUploadReviewOpen(false);

    try {
      const response = await podcastClient.preparePodcastAsset(preparePayload, {
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
        title: 'Podcast prepare succeeded',
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
        title: 'Podcast prepare failed',
        message: error?.message || 'Gateway rejected the podcast prepare request.',
        tone: 'warning',
      });
    }
  }

  async function confirmHold() {
    if (!canHold) {
      return;
    }

    if (!holdReviewOpen) {
      setHoldReviewOpen(true);
      setUploadReviewOpen(false);
      app?.notify?.({
        title: 'Review ROC hold',
        message: 'Review the hold request, then click Send ROC Hold. No ROC has been sent yet.',
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

      setHoldReviewOpen(false);
      const finalRequest = holdResult.apiRequest || toWalletHoldApiBody(holdResult.request);
      saveLastNonceHint(settings.walletAccount, finalRequest.nonce);
      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: holdResult.nonceRecovery ? 'ROC hold created after nonce retry' : 'ROC hold created',
        message: `Wallet hold returned. Correlation: ${holdResult.response?.correlationId || 'n/a'}`,
        tone: 'success',
      });
    } catch (error) {
      const suggested = expectedNonceFromProblem(error);

      if (suggested) {
        setHoldNonce(suggested);
      }

      setHoldState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: error?.request || holdRequest,
        apiRequest: error?.apiRequest || holdApiRequest,
        nonceRecovery: error?.nonceRecovery || null,
      });

      app?.notify?.({
        title: 'ROC hold failed',
        message: suggested
          ? `Wallet expected nonce ${suggested}. The nonce field was updated; review and try again.`
          : error?.message || 'Wallet hold failed.',
        tone: 'danger',
      });
    }
  }

  async function createWalletHoldWithNonceRecovery(firstRequest) {
    const firstApiRequest = toWalletHoldApiBody(firstRequest);

    try {
      const response = await callWalletHold(walletClient, firstApiRequest);
      return {
        response,
        request: firstRequest,
        apiRequest: response?.apiRequest || firstApiRequest,
        nonceRecovery: null,
      };
    } catch (error) {
      const suggested = expectedNonceFromProblem(error);

      if (!suggested || String(suggested) === String(firstApiRequest.nonce)) {
        error.request = firstRequest;
        error.apiRequest = firstApiRequest;
        throw error;
      }

      const retryRequest = buildHoldRequest({
        amountMinor,
        escrowAccount,
        holdNonce: suggested,
        prepareData: prepareState.data,
        preparePayload,
        settings,
        selectedFile,
      });
      const retryApiRequest = toWalletHoldApiBody(retryRequest);

      try {
        const retryResponse = await callWalletHold(walletClient, retryApiRequest);
        setHoldNonce(String(suggested));
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
      } catch (retryError) {
        retryError.request = retryRequest;
        retryError.apiRequest = retryApiRequest;
        retryError.nonceRecovery = {
          retried: true,
          first_nonce: firstApiRequest.nonce,
          expected_nonce: suggested,
          status: 'failed',
        };
        throw retryError;
      }
    }
  }

  async function submitUpload() {
    if (!canUpload) {
      return;
    }

    if (!uploadReviewOpen) {
      setUploadReviewOpen(true);
      setHoldReviewOpen(false);
      app?.notify?.({
        title: 'Review podcast upload request',
        message: 'Review the podcast upload request, then click Send Podcast Upload. No audio bytes have been uploaded yet.',
        tone: 'info',
      });
      return;
    }

    const pendingRequest = {
      route: '/assets/podcast',
      file: fileFacts || summarizeFile(selectedFile),
      paidProof,
      coverArtUpload: false,
      coverImageCrabUrl: draft.coverImageCrabUrl || '',
      rightsAttestation: Boolean(attestationReady),
    };

    setUploadState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: pendingRequest,
      apiRequest: null,
      nonceRecovery: null,
    });

    try {
      const response = await podcastClient.uploadPodcastAsset({
        file: selectedFile,
        contentType: selectedFile?.type || inferAudioContentType(selectedFile?.name),
        metadata: {
          title: draft.title || selectedFile?.name || '',
          showTitle: draft.showTitle || '',
          hostDisplay: draft.hostDisplay || '',
          guestDisplay: draft.cohosts || '',
          description: draft.description || '',
          tags: normalizeTags(draft.tags || ''),
          duration: draft.duration || fileFacts?.durationLabel || '',
          category: draft.category || '',
          language: draft.language || 'en',
          explicitRating: draft.explicitRating || '',
          seasonNumber: draft.season || '',
          episodeNumber: draft.episodeNumber || '',
          coverImageCrabUrl: draft.coverImageCrabUrl || '',
          transcriptCrabUrl: draft.transcriptCrabUrl || '',
          showPageCrabUrl: draft.siteContextCrabUrl || '',
          rightsMode: draft.rightsMode || '',
          licenseMode: draft.licenseMode || '',
          legalAttestationAccepted: attestationReady ? 'true' : '',
          guestPermissionAttested: attestationReady ? 'true' : '',
          legalAttestation: legalAttestation || null,
        },
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          preparePayload?.client_idempotency_key ||
          stableIdempotencyKey('podcast-upload', selectedFile.name, paidProof.txid),
      });

      const data = firstObject(response?.data, response);
      const crabUrl = extractPodcastAssetUrl(data);
      const assetCid = extractPodcastAssetCid(data);

      setUploadReviewOpen(false);
      setUploadState({
        status: 'ok',
        response,
        data,
        error: null,
        request: pendingRequest,
        apiRequest: response?.request || null,
        nonceRecovery: null,
      });

      if (crabUrl) {
        writeLocalCatalogEntry({
          schema: 'crablink.local-catalog-entry.v1',
          type: 'asset',
          kind: 'podcast',
          crabUrl,
          title: draft.title || selectedFile?.name || 'Podcast episode',
          detail: `${formatBytes(selectedFile?.size || 0)} · backend-confirmed podcast asset`,
          cid: assetCid,
          status: 'backend-confirmed display cache',
          source: 'podcast_upload_success',
          createdAt: new Date().toISOString(),
        });
      }

      await app?.refreshWallet?.(settings.walletAccount);
      app?.notify?.({
        title: 'Podcast upload complete',
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
        request: pendingRequest,
        apiRequest: null,
        nonceRecovery: null,
      });

      app?.notify?.({
        title: 'Podcast upload failed',
        message: error?.message || 'Gateway rejected the podcast upload request.',
        tone: 'danger',
      });
    }
  }

  async function callWalletHold(wallet, strictApiRequest) {
    if (typeof wallet?.hold === 'function') {
      return wallet.hold(strictApiRequest, {
        confirmed: true,
      });
    }

    if (typeof wallet?.createWalletHold === 'function') {
      return wallet.createWalletHold(strictApiRequest, {
        confirmed: true,
        idempotencyKey: strictApiRequest.idempotency_key,
      });
    }

    throw new Error('Wallet client is missing hold/createWalletHold.');
  }

  function openReturnedAsset() {
    if (uploadCrabUrl && typeof app?.navigate === 'function') {
      app.navigate(uploadCrabUrl);
    }
  }

  return (
    <Card
      eyebrow="Mint"
      title="Paid podcast mint flow"
      className="cl-podcast-publish-card"
      actions={
        <div className="cl-podcast-publish-badges">
          <Badge tone={preflight.ok ? 'success' : 'warning'}>
            {preflight.ok ? 'ready' : 'needs setup'}
          </Badge>
          <Badge tone="neutral">prepare</Badge>
          <Badge tone="neutral">hold</Badge>
          <Badge tone="neutral">upload</Badge>
        </div>
      }
    >
      <p className="cl-podcast-publish-copy">
        Prepare checks pricing and policy. ROC hold and audio byte upload are separate explicit
        clicks. Cover art remains a crab:// image reference; this page never uploads cover-art bytes.
      </p>

      <section className="cl-podcast-publish-grid" aria-label="Podcast publish prerequisites">
        <Fact label="Gateway" value={settings.gatewayUrl || gateway?.baseUrl || 'not configured'} />
        <Fact label="Passport" value={settings.passportSubject || 'not configured'} />
        <Fact label="Wallet" value={settings.walletAccount || 'not configured'} />
        <Fact label="Selected audio" value={fileFacts?.name || selectedFile?.name || 'none'} />
        <Fact label="Podcast-lite cap" value={formatBytes(MAX_SIMPLE_PODCAST_BYTES)} />
        <Fact label="Current file size" value={selectedFile ? formatBytes(selectedFile.size) : 'n/a'} />
        <Fact label="Cover art" value={draft.coverImageCrabUrl || 'reference optional'} />
        <Fact label="Rights gate" value={attestationReady ? 'attested' : 'required'} />
      </section>

      {!preflight.ok && (
        <div className="cl-podcast-publish-warning">
          <strong>Mint flow blocked</strong>
          <span>{preflight.reason}</span>
        </div>
      )}

      <section className="cl-podcast-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 1</p>
            <h3>Prepare podcast upload</h3>
          </div>
          <Badge tone={toneForStatus(prepareState.status)}>{labelForStatus(prepareState.status)}</Badge>
        </header>

        <p>
          Sends strict JSON metadata to <code>/assets/podcast/prepare</code>. It does not upload
          audio bytes and does not mutate the wallet.
        </p>

        <div className="cl-podcast-publish-actions">
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
            amount_roc: amountMinor || null,
            hold_template: extractHoldTemplate(prepareState.data),
          }}
        />
      </section>

      <section className="cl-podcast-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 2</p>
            <h3>Review and send ROC hold</h3>
          </div>
          <Badge tone={toneForStatus(holdState.status)}>{labelForStatus(holdState.status)}</Badge>
        </header>

        <p>
          Sends an explicit wallet hold to <code>/wallet/hold</code>. Backend wallet truth supplies
          the paid proof used for upload.
        </p>

        <div className="cl-podcast-publish-controls">
          <Field label="Escrow account">
            <TextInput value={escrowAccount} onChange={(event) => setEscrowAccount(event.target.value)} />
          </Field>

          <Field label="Nonce">
            <TextInput value={holdNonce} onChange={(event) => setHoldNonce(event.target.value)} inputMode="numeric" />
          </Field>
        </div>

        <div className="cl-podcast-publish-grid">
          <Fact label="From" value={holdApiRequest?.from || 'waiting for prepare'} />
          <Fact label="To" value={holdApiRequest?.to || 'waiting for prepare'} />
          <Fact
            label="ROC amount"
            value={holdApiRequest?.amount_minor ? `${formatRocUnits(holdApiRequest.amount_minor)} ROC` : 'waiting for prepare'}
          />
          <Fact label="Idempotency" value={holdApiRequest?.idempotency_key || 'waiting for prepare'} monospace />
        </div>

        {holdReviewOpen && holdApiRequest && (
          <div className="cl-podcast-publish-warning" role="status" aria-live="polite">
            <strong>Review ROC hold for podcast upload</strong>
            <span>
              Amount: {formatRocUnits(holdApiRequest.amount_minor)} ROC · From: {holdApiRequest.from} · Escrow:{' '}
              {holdApiRequest.to} · Nonce: {holdApiRequest.nonce}
            </span>
            <span>No ROC has been sent yet. Click <strong>Send ROC Hold</strong> to submit this wallet request.</span>
          </div>
        )}

        <div className="cl-podcast-publish-actions">
          <Button variant={holdReviewOpen ? 'primary' : 'secondary'} disabled={!canHold || holdState.status === 'sending'} onClick={confirmHold}>
            {holdState.status === 'sending' ? 'Holding…' : holdReviewOpen ? 'Send ROC Hold' : 'Review ROC Hold'}
          </Button>
          {holdReviewOpen && (
            <Button variant="secondary" disabled={holdState.status === 'sending'} onClick={() => setHoldReviewOpen(false)}>
              Cancel Review
            </Button>
          )}
          <CopyButton
            text={JSON.stringify(holdApiRequest || {}, null, 2)}
            label="Copy strict hold JSON"
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
          initiallyOpen={holdReviewOpen || holdState.status === 'error'}
        />
      </section>

      <section className="cl-podcast-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 3</p>
            <h3>Review and submit podcast upload</h3>
          </div>
          <Badge tone={toneForStatus(uploadState.status)}>{labelForStatus(uploadState.status)}</Badge>
        </header>

        <p>
          Sends the selected or recorded audio bytes to <code>/assets/podcast</code> with wallet hold
          proof headers. Cover art remains a crab:// image reference.
        </p>

        {uploadReviewOpen && (
          <div className="cl-podcast-publish-warning" role="status" aria-live="polite">
            <strong>Review podcast upload request</strong>
            <span>
              File: {selectedFile?.name || 'selected audio'} · Bytes: {selectedFile?.size || 0} · Content-Type:{' '}
              {selectedFile?.type || inferAudioContentType(selectedFile?.name)}
            </span>
            <span>
              No audio bytes have been uploaded yet. Click <strong>Send Podcast Upload</strong> to submit the raw bytes and paid proof.
            </span>
          </div>
        )}

        <div className="cl-podcast-publish-actions">
          <Button variant={uploadReviewOpen ? 'primary' : 'secondary'} disabled={!canUpload || uploadState.status === 'sending'} onClick={submitUpload}>
            {uploadState.status === 'sending' ? 'Uploading…' : uploadReviewOpen ? 'Send Podcast Upload' : 'Review Podcast Upload'}
          </Button>
          {uploadReviewOpen && (
            <Button variant="secondary" disabled={uploadState.status === 'sending'} onClick={() => setUploadReviewOpen(false)}>
              Cancel Review
            </Button>
          )}
          <Button variant="secondary" disabled={!uploadCrabUrl} onClick={openReturnedAsset}>
            Open Asset Page
          </Button>
          <CopyButton text={uploadCrabUrl} label="Copy crab URL" disabled={!uploadCrabUrl} />
        </div>

        {uploadState.status === 'ok' && (
          <div className="cl-podcast-upload-success">
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
            pendingRequest: uploadReviewOpen
              ? {
                  route: '/assets/podcast',
                  file: fileFacts || summarizeFile(selectedFile),
                  paidProof,
                  coverImageCrabUrl: draft.coverImageCrabUrl || null,
                  coverArtUpload: false,
                }
              : null,
            result: summarizeResult(uploadState),
            returned_crab_url: uploadCrabUrl || null,
            returned_asset_cid: uploadAssetCid || null,
          }}
          initiallyOpen={uploadReviewOpen || uploadState.status === 'error' || uploadState.status === 'ok'}
        />
      </section>
    </Card>
  );
}

function getPreflight({ selectedFile, settings, gateway, attestationReady }) {
  if (!gateway) {
    return { ok: false, reason: 'Gateway client is not loaded yet.' };
  }

  if (!selectedFile) {
    return { ok: false, reason: 'Choose or record podcast audio before preparing a paid upload.' };
  }

  if (!isAudioFile(selectedFile)) {
    return { ok: false, reason: 'Choose a valid audio file for the podcast-lite mint path.' };
  }

  if (Number(selectedFile.size || 0) > MAX_SIMPLE_PODCAST_BYTES) {
    return {
      ok: false,
      reason: `This podcast-lite upload path is capped at ${formatBytes(MAX_SIMPLE_PODCAST_BYTES)}. Larger episodes need the future bounded range/segment path.`,
    };
  }

  if (!attestationReady) {
    return { ok: false, reason: 'Complete the podcast rights and guest-permission attestation before minting.' };
  }

  if (!String(settings?.walletAccount || '').trim()) {
    return { ok: false, reason: 'Configure a wallet account label before preparing a podcast upload.' };
  }

  if (!String(settings?.passportSubject || '').trim()) {
    return { ok: false, reason: 'Configure a passport subject before preparing a podcast upload.' };
  }

  return { ok: true, reason: '' };
}

function buildPreparePayload({ draft, selectedFile, settings, attestationReady }) {
  const contentType = selectedFile.type || inferAudioContentType(selectedFile.name);

  return stripUndefined({
    bytes: selectedFile.size,
    payer_account: settings.walletAccount || undefined,
    owner_passport_subject: settings.passportSubject || undefined,
    content_type: contentType,
    file_name: selectedFile.name || undefined,
    title: draft.title || selectedFile.name || undefined,
    show_title: draft.showTitle || undefined,
    host_display: draft.hostDisplay || undefined,
    guest_display: draft.cohosts || undefined,
    description: draft.description || undefined,
    tags: normalizeTags(draft.tags),
    duration: draft.duration || undefined,
    season_number: draft.season || undefined,
    episode_number: draft.episodeNumber || undefined,
    category: draft.category || undefined,
    language: draft.language || 'en',
    explicit_rating: draft.explicitRating || undefined,
    cover_image_crab_url: draft.coverImageCrabUrl || undefined,
    transcript_crab_url: draft.transcriptCrabUrl || undefined,
    show_page_crab_url: draft.siteContextCrabUrl || undefined,
    rights_mode: draft.rightsMode || undefined,
    license_mode: draft.licenseMode || undefined,
    legal_attestation_accepted: Boolean(attestationReady),
    guest_permission_attested: Boolean(attestationReady),
    client_idempotency_key: stableIdempotencyKey(
      'podcast-prepare',
      selectedFile.name || 'podcast',
      selectedFile.size,
      contentType,
      settings.walletAccount,
    ),
  });
}

function buildHoldRequest({ amountMinor, escrowAccount, holdNonce, prepareData, preparePayload, settings, selectedFile }) {
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
  const amount = firstString(amountMinor, template.amount_minor, template.amountMinor, template.amount);

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
    memo: `CrabLink podcast hold for ${selectedFile?.name || preparePayload?.title || 'podcast upload'}`.slice(0, 240),
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
      preparePayload?.client_idempotency_key || 'podcast-prepare',
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
    return { status: 'idle' };
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
    <div className="cl-podcast-publish-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={String(value || '')}>
        {value || 'n/a'}
      </strong>
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
    name: file.name || 'selected audio',
    size: file.size || 0,
    type: file.type || inferAudioContentType(file.name),
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
  const safeAccount =
    String(account || 'default')
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

function formatRocUnits(value) {
  const raw = String(value ?? '').trim();

  if (!/^[0-9]+$/.test(raw)) {
    return raw || '0';
  }

  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function inferAudioContentType(fileName = '') {
  const name = String(fileName || '').toLowerCase();

  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.flac')) return 'audio/flac';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.aac')) return 'audio/aac';
  if (name.endsWith('.ogg') || name.endsWith('.oga')) return 'audio/ogg';
  if (name.endsWith('.opus')) return 'audio/opus';
  if (name.endsWith('.webm')) return 'audio/webm';

  return 'audio/mpeg';
}

function isAudioFile(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();

  return type.startsWith('audio/') || /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|webm)$/i.test(name);
}