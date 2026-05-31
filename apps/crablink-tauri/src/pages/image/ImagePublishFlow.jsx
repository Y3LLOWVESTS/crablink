/**
 * RO:WHAT — Compact prepare → confirm ROC → paid image bundle mint flow for crab://image.
 * RO:WHY — Mints the original image and generated renditions through existing gateway-backed image upload routes.
 * RO:INTERACTS — assetClient, walletClient, ImagePage, imageRenditionGenerator, svc-gateway /assets/image/prepare, /wallet/hold, /assets/image.
 * RO:INVARIANTS — no silent ROC spend; backend quote shown before confirm; each minted image must return backend crab URL; no direct storage/index/ledger calls.
 * RO:METRICS — gateway correlation IDs are available in collapsed developer details.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — sends privacy-cleaned image bytes only to configured svc-gateway; no private keys/seed phrases/local ledger truth.
 * RO:TEST — manual crab://image source + generated versions quote/hold/mint smoke from Tauri React shell.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import {
  createAssetClient,
  extractImageAssetCid,
  extractImageAssetUrl,
  hashImageAssetBytes,
  normalizePaidProof,
} from '../../shared/api/assetClient.js';
import {
  compactIdempotencyKey,
  createWalletClient,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  stableIdempotencyKey,
} from '../../shared/api/walletClient.js';
import { generatedRenditionTotalBytes } from './imageRenditionGenerator.js';
import {
  normalizeImageType,
  sanitizeImageForPublish,
  summarizeImagePrivacy,
} from './imageMetadataSanitizer.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';
const MAX_SINGLE_IMAGE_BYTES = 25 * 1024 * 1024;
const NONCE_HINT_PREFIX = 'crablink.wallet.nextNonce.';

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
});

export default function ImagePublishFlow({
  app,
  draftState,
  selectedFile,
  fileFacts,
  localRenditions,
  renditionState,
  onEnsureRenditions,
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
  const [holdReviewOpen, setHoldReviewOpen] = useState(false);
  const [progress, setProgress] = useState(null);
  const [publishPlan, setPublishPlan] = useState(null);

  const draft = draftState?.draft || {};
  const entries = Array.isArray(publishPlan?.renditionEntries)
    ? publishPlan.renditionEntries
    : Array.isArray(localRenditions?.entries)
      ? localRenditions.entries
      : [];
  const originalBytes = Number(publishPlan?.original?.bytes || selectedFile?.size || 0);
  const renditionBytes = Number(publishPlan?.renditionBytes || generatedRenditionTotalBytes(localRenditions));
  const totalBytes = originalBytes + renditionBytes;
  const bundleCount = selectedFile ? 1 + entries.length : 0;

  const workflowKey = useMemo(
    () =>
      [
        selectedFile?.name || '',
        selectedFile?.size || '',
        selectedFile?.type || '',
        selectedFile?.lastModified || '',
        draft.title || '',
        draft.description || '',
        draft.tags || '',
        draft.creatorDisplay || '',
        draft.sourceMode || '',
        draft.rightsMode || '',
        draft.altText || '',
        draft.provenanceNote || '',
        draft.imageRole || '',
        draft.useCaseCsv || '',
        draft.renditionTargetCsv || '',
        settings.walletAccount || '',
        settings.passportSubject || '',
      ].join('|'),
    [
      selectedFile?.name,
      selectedFile?.size,
      selectedFile?.type,
      selectedFile?.lastModified,
      draft.title,
      draft.description,
      draft.tags,
      draft.creatorDisplay,
      draft.sourceMode,
      draft.rightsMode,
      draft.altText,
      draft.provenanceNote,
      draft.imageRole,
      draft.useCaseCsv,
      draft.renditionTargetCsv,
      settings.walletAccount,
      settings.passportSubject,
    ],
  );

  useEffect(() => {
    setPrepareState(IDLE_RESULT);
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);
    setHoldReviewOpen(false);
    setProgress(null);
    setPublishPlan(null);
  }, [workflowKey]);

  const preflight = useMemo(
    () => getPreflight({ selectedFile, settings, gateway }),
    [selectedFile, settings, gateway],
  );

  const prepareData = firstObject(prepareState.data, prepareState.response?.data, prepareState.response) || {};
  const quotedAmount = extractPrepareAmount(prepareData);
  const holdRequest = useMemo(
    () =>
      buildHoldRequest({
        amount: quotedAmount,
        prepareData,
        selectedFile,
        settings,
      }),
    [quotedAmount, prepareData, selectedFile, settings],
  );

  const paidProof = useMemo(() => {
    if (holdState.status !== 'ok') return null;

    try {
      const apiRequest = holdState.request || {};
      const walletHold = normalizeWalletHoldResponse(
        firstObject(
          holdState.response?.walletHold,
          holdState.response?.data,
          holdState.data?.walletHold,
          holdState.data,
          holdState.response,
        ),
        apiRequest,
      );

      return normalizePaidProof({
        ...walletHold,
        from: walletHold.from || apiRequest.from,
        to: walletHold.to || apiRequest.to,
        amount_minor: walletHold.amount_minor || apiRequest.amount_minor,
        asset: walletHold.asset || apiRequest.asset || 'roc',
        idempotency_key: walletHold.idem || apiRequest.idempotency_key,
      });
    } catch (_error) {
      return null;
    }
  }, [holdState]);

  const canPrepare = preflight.ok && Boolean(selectedFile);
  const canHold = prepareState.status === 'ok' && Boolean(holdRequest);
  const canUpload = holdState.status === 'ok' && Boolean(paidProof) && Boolean(selectedFile);

  async function sendPrepare() {
    if (!canPrepare) return;

    setPrepareState({ status: 'sending', response: null, data: null, error: null, request: null });
    setHoldState(IDLE_RESULT);
    setUploadState(IDLE_RESULT);
    setProgress(null);

    try {
      setProgress({ index: 0, total: bundleCount || 1, label: 'Cleaning image metadata…' });
      const plan = await buildImagePublishPlan({
        selectedFile,
        draft,
        fileFacts,
        onEnsureRenditions,
        fallbackRenditions: localRenditions,
      });
      setPublishPlan(plan);

      const preparedEntries = plan.renditionEntries;
      const preparedTotalBytes = plan.totalBytes;

      const request = buildPreparePayload({
        draft,
        selectedFile: plan.original.blob,
        settings,
        totalBytes: preparedTotalBytes,
        bundleCount: 1 + preparedEntries.length,
      });

      const response = await assetClient.prepareImageAsset(request, {
        idempotencyKey: request.client_idempotency_key,
      });

      const data = firstObject(response?.data, response);
      setProgress(null);

      setPrepareState({
        status: 'ok',
        response,
        data,
        error: null,
        request,
      });

      app?.notify?.({
        title: 'Image bundle quote ready',
        message: `${1 + preparedEntries.length} image asset${preparedEntries.length ? 's' : ''} included.`,
        tone: 'success',
      });
    } catch (error) {
      setProgress(null);
      setPrepareState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: null,
      });

      app?.notify?.({
        title: 'Image bundle quote failed',
        message: error?.message || 'Gateway rejected the prepare request.',
        tone: 'warning',
      });
    }
  }

  async function confirmHold() {
    if (!canHold) return;

    if (!holdReviewOpen) {
      setHoldReviewOpen(true);
      return;
    }

    setHoldState({ status: 'sending', response: null, data: null, error: null, request: holdRequest });

    try {
      const response = await createWalletHoldWithNonceRecovery(walletClient, holdRequest);
      setHoldState({
        status: 'ok',
        response,
        data: firstObject(response?.walletHold, response?.data, response),
        error: null,
        request: response?.request || holdRequest,
      });
      setHoldReviewOpen(false);

      app?.notify?.({
        title: 'ROC hold confirmed',
        message: 'You can now mint the privacy-cleaned original and generated versions.',
        tone: 'success',
      });
    } catch (error) {
      setHoldState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: error?.request || holdRequest,
      });

      app?.notify?.({
        title: 'ROC hold failed',
        message: error?.message || 'Wallet rejected the hold.',
        tone: 'warning',
      });
    }
  }

  async function submitBundleUpload() {
    if (!canUpload) return;

    setUploadState({ status: 'sending', response: null, data: null, error: null, request: null });
    setProgress({ index: 0, total: bundleCount || 1, label: 'Preparing generated versions…' });

    try {
      const plan = publishPlan || await buildImagePublishPlan({
        selectedFile,
        draft,
        fileFacts,
        onEnsureRenditions,
        fallbackRenditions: localRenditions,
      });
      setPublishPlan(plan);

      const renditionEntries = plan.renditionEntries;
      const total = 1 + renditionEntries.length;

      setProgress({ index: 0, total, label: 'Predicting b3 rendition group…' });
      const renditionGroup = await buildPredictedRenditionGroup({
        selectedFile: plan.original.blob,
        fileFacts: { ...fileFacts, width: plan.original.width, height: plan.original.height },
        draft,
        renditionEntries,
        privacySummary: plan.privacy,
      });
      const originalPlan = findRenditionPlan(renditionGroup, 'original');

      setProgress({ index: 0, total, label: 'Minting original image…' });

      const originalUpload = await uploadOneImage({
        assetClient,
        blob: plan.original.blob,
        paidProof,
        idempotencyKey: stableIdempotencyKey(
          'image-bundle-original',
          paidProof.txid,
          plan.original.bytes,
          plan.original.contentType,
          draft.title,
        ),
        metadata: {
          title: cleanPublicTitle(draft.title || selectedFile.name || 'Original image'),
          description: buildOriginalDescription({ draft, privacySummary: plan.privacy }),
          tags: addUniqueTags(draft.tags, [
            'original',
            'bundle-original',
            'metadata-stripped',
            sourceTag(draft.sourceMode),
            rightsTag(draft.rightsMode),
          ]),
          altText: cleanPublicDescription(draft.altText, ''),
          renditionGroup,
          renditionRole: 'original',
          renditionLabel: 'Original',
          privacy: plan.privacy,
        },
      });

      const originalCrabUrl = extractImageAssetUrl(originalUpload?.data || originalUpload);
      const originalCid = extractImageAssetCid(originalUpload?.data || originalUpload);
      assertCidMatchesPrediction(originalCid, originalPlan?.cid, 'original image');

      const mintedRenditions = [];

      for (const entry of renditionEntries) {
        setProgress({
          index: 1 + mintedRenditions.length,
          total,
          label: `Minting ${entry.label || entry.role}…`,
        });

        const renditionPlan = findRenditionPlan(renditionGroup, entry.role);
        const renditionLabel = cleanPublicTitle(entry.label || entry.role || 'Rendition');

        const upload = await uploadOneImage({
          assetClient,
          blob: entry.blob,
          paidProof,
          idempotencyKey: stableIdempotencyKey(
            'image-bundle-rendition',
            paidProof.txid,
            originalCid || originalCrabUrl || selectedFile.size,
            entry.role,
            entry.bytes,
          ),
          metadata: {
            title: cleanPublicTitle(`${draft.title || 'Image'} — ${renditionLabel}`),
            description: buildRenditionDescription({
              draft,
              entry,
              privacySummary: plan.privacy,
            }),
            tags: addUniqueTags(draft.tags, [
              'rendition',
              'metadata-stripped',
              `role:${entry.role}`,
              'linked-original',
              sourceTag(draft.sourceMode),
              rightsTag(draft.rightsMode),
            ]),
            altText: cleanPublicDescription(draft.altText, ''),
            renditionGroup,
            renditionRole: entry.role,
            renditionLabel,
            privacy: plan.privacy,
          },
        });

        const renditionCrabUrl = extractImageAssetUrl(upload?.data || upload);
        const renditionCid = extractImageAssetCid(upload?.data || upload);
        assertCidMatchesPrediction(renditionCid, renditionPlan?.cid, entry.label || entry.role || 'rendition');

        mintedRenditions.push({
          role: entry.role,
          label: renditionLabel,
          width: entry.width,
          height: entry.height,
          bytes: entry.bytes,
          contentType: entry.contentType,
          response: upload,
          crabUrl: renditionCrabUrl,
          cid: renditionCid,
          parentCrabUrl: originalCrabUrl || null,
          parentCid: originalCid || null,
          renditionGroup,
        });
      }

      const bundle = {
        schema: 'crablink.image-bundle-result.v1',
        backendVerified: true,
        relationshipDurability: 'display_bundle_map_until_backend_bundle_manifest_route_exists',
        mintedAt: new Date().toISOString(),
        receiptHash: paidProof.receipt_hash || paidProof.receiptHash || '',
        paidProof: redactProof(paidProof),
        renditionGroup,
        original: {
          label: 'Original',
          bytes: plan.original.bytes,
          contentType: plan.original.contentType || 'image/png',
          response: originalUpload,
          crabUrl: originalCrabUrl,
          cid: originalCid,
          renditionGroup,
          privacy: plan.privacy,
        },
        renditions: mintedRenditions,
      };

      setProgress({ index: total, total, label: 'Bundle mint complete.' });
      setUploadState({
        status: 'ok',
        response: bundle,
        data: bundle,
        error: null,
        request: {
          total_assets: total,
          total_bytes: plan.original.bytes + mintedRenditions.reduce((sum, item) => sum + Number(item.bytes || 0), 0),
        },
      });

      app?.refreshWallet?.();
      app?.notify?.({
        title: 'Image bundle minted',
        message: `${total} backend image asset${total === 1 ? '' : 's'} returned.`,
        tone: 'success',
      });
    } catch (error) {
      setUploadState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: null,
      });

      app?.notify?.({
        title: 'Image bundle mint failed',
        message: error?.message || 'Gateway rejected one of the image uploads.',
        tone: 'warning',
      });
    }
  }

  return (
    <Card
      eyebrow="Publish"
      title="Quote, confirm, and mint"
      className="image-publish-card image-publish-card-compact"
      actions={
        <div className="image-publish-badges">
          <Badge tone={prepareState.status === 'ok' ? 'success' : 'neutral'}>Quote</Badge>
          <Badge tone={holdState.status === 'ok' ? 'success' : 'neutral'}>ROC hold</Badge>
          <Badge tone={uploadState.status === 'ok' ? 'success' : 'neutral'}>Mint</Badge>
          <Badge tone={publishPlan?.privacy?.verification?.status === 'passed' ? 'success' : 'info'}>
            Metadata clean
          </Badge>
        </div>
      }
    >
      <div className="image-bundle-summary">
        <div>
          <span>Original</span>
          <strong>{selectedFile ? formatBytes(originalBytes) : 'No file'}</strong>
        </div>
        <div>
          <span>Generated versions</span>
          <strong>{entries.length}</strong>
        </div>
        <div>
          <span>Total upload plan</span>
          <strong>{selectedFile ? `${bundleCount || 1} images · ${formatBytes(totalBytes || originalBytes)}` : 'n/a'}</strong>
        </div>
      </div>

      {!preflight.ok && (
        <div className="image-publish-alert" role="alert">
          <strong>Before minting</strong>
          <span>{preflight.reason}</span>
        </div>
      )}

      <div className="image-publish-steps">
        <section>
          <header>
            <strong>1. Backend quote</strong>
            <span>Strips source metadata, generates selected versions locally, then asks the backend for a quote covering the cleaned original plus generated bytes.</span>
          </header>
          <Button
            variant="primary"
            onClick={sendPrepare}
            disabled={!canPrepare || prepareState.status === 'sending' || renditionState?.status === 'generating'}
          >
            {prepareState.status === 'sending' || renditionState?.status === 'generating'
              ? 'Preparing…'
              : 'Get bundle quote'}
          </Button>
        </section>

        {prepareState.status === 'ok' && (
          <section>
            <header>
              <strong>2. Confirm ROC hold</strong>
              <span>
                Backend quote: <b>{formatRoc(quotedAmount)} ROC</b>. Nothing is spent until you confirm this hold.
              </span>
            </header>

            {holdReviewOpen && (
              <div className="image-publish-review">
                <strong>Review hold</strong>
                <span>
                  This will authorize the image bundle mint for the privacy-cleaned original and generated versions listed above.
                </span>
              </div>
            )}

            <Button
              variant={holdReviewOpen ? 'primary' : 'secondary'}
              onClick={confirmHold}
              disabled={!canHold || holdState.status === 'sending'}
            >
              {holdState.status === 'sending'
                ? 'Confirming…'
                : holdReviewOpen
                  ? 'Confirm ROC & Hold'
                  : 'Review ROC hold'}
            </Button>
          </section>
        )}

        {holdState.status === 'ok' && (
          <section>
            <header>
              <strong>3. Mint original + versions</strong>
              <span>
                The privacy-cleaned original is minted first. Each generated version is then minted with a clean CrabLink rendition map that links it back to the cleaned original.
              </span>
            </header>
            <Button
              variant="primary"
              onClick={submitBundleUpload}
              disabled={!canUpload || uploadState.status === 'sending'}
            >
              {uploadState.status === 'sending' ? 'Minting…' : 'Mint image bundle'}
            </Button>
          </section>
        )}
      </div>

      {progress && (
        <div className="image-bundle-progress" aria-label="Image bundle mint progress">
          <div>
            <strong>{progress.label}</strong>
            <span>
              {progress.index} / {progress.total}
            </span>
          </div>
          <div className="image-bundle-progress-bar">
            <span style={{ width: `${progress.total ? Math.min(100, (progress.index / progress.total) * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {prepareState.status === 'error' && <ErrorBlock title="Quote failed" error={prepareState.error} />}
      {holdState.status === 'error' && <ErrorBlock title="ROC hold failed" error={holdState.error} />}
      {uploadState.status === 'error' && <ErrorBlock title="Mint failed" error={uploadState.error} />}

      {uploadState.status === 'ok' && (
        <ImageBundleResult bundle={uploadState.data} />
      )}

      <details className="image-publish-debug">
        <summary>Developer details</summary>
        <JsonPreview
          label="Image bundle publish state"
          data={{
            prepareState: summarizeState(prepareState),
            holdState: summarizeState(holdState),
            uploadState: summarizeState(uploadState),
            progress,
            publishPlan: publishPlan
              ? {
                  schema: publishPlan.schema,
                  totalBytes: publishPlan.totalBytes,
                  original: summarizeImagePrivacy(publishPlan.original),
                  renditionCount: publishPlan.renditionEntries.length,
                }
              : null,
          }}
        />
      </details>
    </Card>
  );
}

function ImageBundleResult({ bundle }) {
  const original = bundle?.original || {};
  const renditions = Array.isArray(bundle?.renditions) ? bundle.renditions : [];

  return (
    <div className="image-bundle-result">
      <header>
        <div>
          <strong>Image bundle minted</strong>
          <span>Every listed crab URL came from the backend upload response. Published bytes were privacy-cleaned before b3 prediction.</span>
        </div>
        <Badge tone="success">Backend returned</Badge>
      </header>

      <BundleAssetRow
        label="Original"
        role="canonical"
        crabUrl={original.crabUrl}
        cid={original.cid}
        bytes={original.bytes}
        contentType={original.contentType}
        extra={original.privacy?.verification?.status === 'passed' ? 'metadata verified clean' : 'privacy-clean rewrite'}
      />

      {renditions.length > 0 && (
        <div className="image-bundle-rendition-list">
          <h3>Generated versions</h3>
          {renditions.map((item) => (
            <BundleAssetRow
              key={`${item.role}:${item.cid || item.crabUrl}`}
              label={item.label}
              role={item.role}
              crabUrl={item.crabUrl}
              cid={item.cid}
              bytes={item.bytes}
              contentType={item.contentType}
              extra={`${item.width || 0}×${item.height || 0}`}
            />
          ))}
        </div>
      )}

      {bundle?.original?.privacy && (
        <details className="image-publish-debug">
          <summary>Image privacy cleanup</summary>
          <p>
            The source image was rewritten locally before prepare, b3 prediction, and upload. The cleaned blob was rescanned before minting.
          </p>
          <JsonPreview label="Image privacy cleanup" data={bundle.original.privacy} />
        </details>
      )}

      {bundle?.renditionGroup && (
        <details className="image-publish-debug">
          <summary>Manifest rendition group</summary>
          <p>
            This is the structured sibling-link block sent with every image upload. Exact original/rendition CIDs live here instead of cluttering public descriptions.
          </p>
          <JsonPreview label="Rendition group manifest block" data={bundle.renditionGroup} />
        </details>
      )}

      {bundle?.receiptHash && (
        <div className="image-bundle-receipt">
          <span>Receipt</span>
          <code>{bundle.receiptHash}</code>
          <CopyButton text={bundle.receiptHash} label="Copy receipt" />
        </div>
      )}
    </div>
  );
}

function BundleAssetRow({ label, role, crabUrl, cid, bytes, contentType, extra = '' }) {
  return (
    <article className="image-bundle-asset-row">
      <div>
        <span>{label}</span>
        <strong>{crabUrl || 'No crab URL returned'}</strong>
        <small>
          {role}
          {extra ? ` · ${extra}` : ''}
          {bytes ? ` · ${formatBytes(bytes)}` : ''}
          {contentType ? ` · ${contentType}` : ''}
        </small>
        {cid && <code>{cid}</code>}
      </div>

      <div className="image-bundle-row-actions">
        {crabUrl && <CopyButton text={crabUrl} label="Copy URL" />}
        {cid && <CopyButton text={cid} label="Copy CID" />}
      </div>
    </article>
  );
}

function ErrorBlock({ title, error }) {
  return (
    <div className="image-publish-alert" role="alert">
      <strong>{title}</strong>
      <span>{error?.message || String(error || 'Unknown error')}</span>
    </div>
  );
}

async function buildImagePublishPlan({
  selectedFile,
  draft,
  fileFacts,
  onEnsureRenditions,
  fallbackRenditions,
}) {
  const original = await sanitizeImageForPublish(selectedFile, {
    outputType: draft?.privacyOutputType || '',
  });
  const renditions = typeof onEnsureRenditions === 'function'
    ? await onEnsureRenditions(original.blob)
    : fallbackRenditions;
  const renditionEntries = Array.isArray(renditions?.entries) ? renditions.entries : [];
  const renditionBytes = renditionEntries.reduce((sum, item) => sum + Number(item.bytes || 0), 0);
  const privacy = summarizeImagePrivacy(original);

  return {
    schema: 'crablink.image-publish-plan.v1',
    createdAt: new Date().toISOString(),
    original: {
      ...original,
      width: Number(original.width || fileFacts?.width || 0),
      height: Number(original.height || fileFacts?.height || 0),
    },
    privacy,
    renditions,
    renditionEntries,
    renditionBytes,
    totalBytes: Number(original.bytes || 0) + renditionBytes,
  };
}

async function uploadOneImage({ assetClient, blob, paidProof, metadata, idempotencyKey }) {
  return assetClient.uploadImageAsset({
    file: blob,
    contentType: blob?.type || metadata?.contentType || 'image/png',
    paidProof,
    metadata,
    idempotencyKey,
  });
}

async function createWalletHoldWithNonceRecovery(walletClient, request) {
  try {
    const response = await walletClient.createWalletHold(request, { confirmed: true });
    return { ...response, request };
  } catch (error) {
    const expectedNonce = expectedNonceFromWalletError(error);

    if (!expectedNonce || String(expectedNonce) === String(request.nonce || '')) {
      error.request = request;
      throw error;
    }

    persistNextNonceHint(request.from, expectedNonce);

    const retryRequest = {
      ...request,
      nonce: expectedNonce,
      idempotency_key: compactIdempotencyKey(
        stableIdempotencyKey(
          'image-bundle-hold-retry',
          request.from,
          request.to,
          request.amount_minor,
          expectedNonce,
          request.idempotency_key,
        ),
        'wallet-hold',
      ),
    };

    try {
      const retryResponse = await walletClient.createWalletHold(retryRequest, { confirmed: true });
      return { ...retryResponse, request: retryRequest };
    } catch (retryError) {
      retryError.request = retryRequest;
      throw retryError;
    }
  }
}

function getPreflight({ selectedFile, settings, gateway }) {
  if (!gateway) {
    return { ok: false, reason: 'Gateway client is not ready.' };
  }

  if (!settings?.walletAccount) {
    return { ok: false, reason: 'Select a wallet account before minting.' };
  }

  if (!settings?.passportSubject) {
    return { ok: false, reason: 'Select a passport before minting.' };
  }

  if (!selectedFile) {
    return { ok: false, reason: 'Choose an image first.' };
  }

  if (!String(selectedFile.type || '').startsWith('image/')) {
    return { ok: false, reason: 'The selected file must be an image.' };
  }

  const imageType = normalizeImageType(selectedFile.type, selectedFile.name);
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(imageType)) {
    return {
      ok: false,
      reason: 'Privacy-safe image minting currently supports PNG, JPEG, WebP, and AVIF. GIF/SVG are blocked until exact-original and animated/vector policies are added.',
    };
  }

  if (Number(selectedFile.size || 0) > MAX_SINGLE_IMAGE_BYTES) {
    return {
      ok: false,
      reason: `The source image is ${formatBytes(selectedFile.size)}, above the current ${formatBytes(MAX_SINGLE_IMAGE_BYTES)} image upload bridge cap.`,
    };
  }

  return { ok: true, reason: '' };
}

function buildPreparePayload({ draft, selectedFile, settings, totalBytes, bundleCount }) {
  const title = cleanPublicTitle(draft.title || selectedFile?.name || 'Untitled image');
  const description = buildOriginalDescription({
    draft,
    privacySummary: null,
    maxLength: 500,
  });
  const idempotencyKey = compactIdempotencyKey(
    stableIdempotencyKey(
      'image-bundle-prepare',
      settings.walletAccount,
      settings.passportSubject,
      totalBytes,
      bundleCount,
      title,
    ),
    'image-prepare',
  );

  return {
    bytes: Math.max(1, Number(totalBytes || selectedFile?.size || 0)),
    file_bytes: Math.max(1, Number(totalBytes || selectedFile?.size || 0)),
    content_type: selectedFile?.type || 'image/png',
    title,
    description,
    tags: addUniqueTags(draft.tags, ['image-bundle', `bundle-count:${bundleCount || 1}`]),
    payer_account: settings.walletAccount,
    owner_passport_subject: settings.passportSubject,
    client_idempotency_key: idempotencyKey,
  };
}

function buildHoldRequest({ amount, prepareData, selectedFile, settings }) {
  const amountMinor = Number(amount || 0);

  if (!amountMinor || amountMinor < 1) {
    return null;
  }

  const from = String(settings.walletAccount || '').trim();
  const to = String(
    prepareData?.escrow_account ||
      prepareData?.escrowAccount ||
      prepareData?.to ||
      DEFAULT_ESCROW_ACCOUNT,
  ).trim();

  if (!from || !to) {
    return null;
  }

  const nonce = loadNextNonceHint(from);
  const idempotencyKey = compactIdempotencyKey(
    stableIdempotencyKey(
      'image-bundle-wallet-hold',
      from,
      to,
      amountMinor,
      selectedFile?.name || '',
      selectedFile?.size || '',
      nonce,
    ),
    'wallet-hold',
  );

  return {
    from,
    to,
    asset: 'roc',
    amount_minor: amountMinor,
    nonce,
    memo: `CrabLink image bundle mint: ${selectedFile?.name || 'image'}`,
    idempotency_key: idempotencyKey,
  };
}

function extractPrepareAmount(data) {
  const candidates = [
    data?.amount_minor,
    data?.amountMinor,
    data?.estimate_minor,
    data?.estimateMinor,
    data?.estimated_minor,
    data?.estimatedMinor,
    data?.price_minor,
    data?.priceMinor,
    data?.total_minor,
    data?.totalMinor,
    data?.quote?.amount_minor,
    data?.quote?.amountMinor,
    data?.quote?.estimate_minor,
    data?.quote?.estimateMinor,
    data?.wallet_hold?.amount_minor,
    data?.walletHold?.amountMinor,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);

    if (Number.isSafeInteger(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

async function buildPredictedRenditionGroup({
  selectedFile,
  fileFacts,
  draft,
  renditionEntries = [],
  privacySummary = null,
}) {
  const originalHash = await hashImageAssetBytes({
    file: selectedFile,
    contentType: selectedFile?.type || 'image/png',
    role: 'original',
  });

  const creatorIntent = buildStructuredCreatorIntent(draft, privacySummary);

  const original = {
    role: 'original',
    label: 'Original',
    cid: originalHash.cid,
    hash: originalHash.hash,
    crab_url: originalHash.crabUrl,
    mime: selectedFile?.type || originalHash.contentType || 'image/png',
    bytes: Number(selectedFile?.size || originalHash.bytes || 0),
    width: Number(fileFacts?.width || 0),
    height: Number(fileFacts?.height || 0),
    creator_intent: creatorIntent,
    privacy: privacySummary,
  };

  const renditions = [original];

  for (const entry of renditionEntries) {
    const hashed = await hashImageAssetBytes({
      blob: entry.blob,
      contentType: entry.contentType || entry.blob?.type || 'image/png',
      role: entry.role || 'rendition',
    });

    renditions.push({
      role: entry.role || 'rendition',
      label: cleanPublicTitle(entry.label || entry.role || 'Rendition'),
      cid: hashed.cid,
      hash: hashed.hash,
      crab_url: hashed.crabUrl,
      mime: entry.contentType || hashed.contentType || entry.blob?.type || 'image/png',
      bytes: Number(entry.bytes || hashed.bytes || entry.blob?.size || 0),
      width: Number(entry.width || 0),
      height: Number(entry.height || 0),
      target_width: Number(entry.targetWidth || 0),
      target_height: Number(entry.targetHeight || 0),
      fit: entry.fit || '',
      use_case: entry.useCase || '',
      source_privacy: 'generated_from_privacy_cleaned_source',
      creator_intent: creatorIntent,
    });
  }

  return {
    schema: 'crablink.image-rendition-group.v1',
    group_id: original.cid,
    source_cid: original.cid,
    canonical_crab_url: original.crab_url,
    source_role: String(draft?.imageRole || 'standalone_image'),
    generated_at: new Date().toISOString(),
    relationship_truth: 'privacy_cleaned_client_b3_prediction_then_backend_verified_before_display',
    creator_intent: creatorIntent,
    privacy: privacySummary,
    renditions,
  };
}

function findRenditionPlan(group, role) {
  const cleanRole = String(role || '').trim();

  return (Array.isArray(group?.renditions) ? group.renditions : []).find(
    (item) => String(item.role || '').trim() === cleanRole,
  ) || null;
}

function assertCidMatchesPrediction(actualCid, predictedCid, label) {
  const actual = normalizeCidForCompare(actualCid);
  const predicted = normalizeCidForCompare(predictedCid);

  if (!actual || !predicted || actual !== predicted) {
    throw new Error(
      `Backend CID mismatch for ${label}: predicted ${predicted || 'n/a'}, backend returned ${actual || 'n/a'}.`,
    );
  }
}

function normalizeCidForCompare(value) {
  const clean = String(value || '').trim().replace(/^b3:/i, '').toLowerCase();
  return /^[0-9a-f]{64}$/.test(clean) ? `b3:${clean}` : '';
}

function buildOriginalDescription({ draft, privacySummary, maxLength = 500 }) {
  const descriptionText = cleanPublicDescription(
    draft.description,
    draft.title ? `${cleanPublicTitle(draft.title)}.` : 'No creator description provided.',
  );

  const privacyNote = privacySummary?.verification?.status === 'passed'
    ? 'Privacy cleanup verified before minting.'
    : 'Privacy-cleaned before minting.';

  return clampDescription(`Image description: ${descriptionText} ${privacyNote}`, maxLength);
}

function buildRenditionDescription({ draft, entry, privacySummary, maxLength = 500 }) {
  const label = cleanPublicTitle(entry?.label || entry?.role || 'Generated version');
  const dimensions = entry?.width && entry?.height ? ` (${entry.width}×${entry.height})` : '';
  const descriptionText = cleanPublicDescription(
    draft.description,
    draft.title ? `${cleanPublicTitle(draft.title)}.` : 'No creator description provided.',
  );

  const privacyNote = privacySummary?.verification?.status === 'passed'
    ? 'Privacy cleanup verified before minting.'
    : 'Privacy-cleaned before minting.';

  return clampDescription(
    `Image description: ${descriptionText} Rendition: ${label}${dimensions} generated from the privacy-cleaned original image. ${privacyNote}`,
    maxLength,
  );
}

function buildAdvancedManifestLines({ draft, privacySummary }) {
  const lines = [];

  const creatorDisplay = cleanPublicDescription(draft.creatorDisplay, '');
  if (creatorDisplay) {
    lines.push(`Creator display: ${creatorDisplay}`);
  }

  if (draft.sourceMode) {
    lines.push(`Source hint: ${labelFromSnake(draft.sourceMode)}`);
  }

  if (draft.rightsMode) {
    lines.push(`Rights hint: ${labelFromSnake(draft.rightsMode)}`);
  }

  const altText = cleanPublicDescription(draft.altText, '');
  if (altText) {
    lines.push(`Alt text: ${altText}`);
  }

  const provenance = cleanPublicDescription(draft.provenanceNote, '');
  if (provenance) {
    lines.push(`Provenance note: ${provenance}`);
  }

  if (draft.imageRole) {
    lines.push(`Image role: ${labelFromSnake(draft.imageRole)}`);
  }

  const useCases = parseCsv(draft.useCaseCsv || draft.imageRole)
    .map(labelFromSnake)
    .filter(Boolean);

  if (useCases.length) {
    lines.push(`Use cases: ${useCases.join(', ')}`);
  }

  const privacyLine = privacySummary?.verification?.status === 'passed'
    ? 'Privacy cleanup: verified before minting.'
    : 'Privacy cleanup: privacy-cleaned before minting.';

  lines.push(privacyLine);

  return lines;
}

function buildStructuredCreatorIntent(draft, privacySummary) {
  return {
    schema: 'crablink.image-creator-intent.v1',
    title: cleanPublicTitle(draft.title || 'Image'),
    description_label: 'Image description',
    description: cleanPublicDescription(draft.description, ''),
    creator_display: cleanPublicDescription(draft.creatorDisplay, ''),
    source_hint: draft.sourceMode || '',
    source_label: labelFromSnake(draft.sourceMode),
    rights_hint: draft.rightsMode || '',
    rights_label: labelFromSnake(draft.rightsMode),
    alt_text: cleanPublicDescription(draft.altText, ''),
    provenance_note: cleanPublicDescription(draft.provenanceNote, ''),
    image_role: draft.imageRole || 'standalone_image',
    image_role_label: labelFromSnake(draft.imageRole || 'standalone_image'),
    use_cases: parseCsv(draft.useCaseCsv || draft.imageRole),
    use_case_labels: parseCsv(draft.useCaseCsv || draft.imageRole).map(labelFromSnake),
    privacy_cleanup_verified: privacySummary?.verification?.status === 'passed',
    backend_verified_identity_or_rights: false,
    note:
      'Creator display, source, rights, alt text, and provenance are intentional manifest fields. Hidden file metadata was privacy-cleaned before minting.',
  };
}

function joinManifestLines(lines) {
  return lines
    .map((line) => cleanHeaderText(line))
    .filter(Boolean)
    .join(' | ');
}

function cleanPublicTitle(value, fallback = 'Image') {
  const clean = cleanDisplayText(value, fallback)
    .replace(/\s+[—-]\s*$/g, '')
    .slice(0, 140)
    .trim();

  return clean || fallback;
}

function cleanPublicDescription(value, fallback = '') {
  const clean = cleanDisplayText(value, '');

  if (!clean) {
    return cleanDisplayText(fallback, '');
  }

  return clean;
}

function cleanDisplayText(value, fallback = '') {
  return String(value || fallback || '')
    .replace(/\bOriginal image:\s*crab:\/\/\S+/gi, '')
    .replace(/\bOriginal CID:\s*b3:[0-9a-f]{64}/gi, '')
    .replace(/\bcrab:\/\/[a-z0-9._:@-]+/gi, '')
    .replace(/\bb3:[0-9a-f]{64}/gi, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanHeaderText(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clampDescription(value, maxLength = 900) {
  const clean = cleanHeaderText(value);

  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function addUniqueTags(input, extra = []) {
  const tags = String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => cleanTag(tag))
    .filter(Boolean);

  for (const item of extra) {
    const clean = cleanTag(item);

    if (clean && !tags.includes(clean)) {
      tags.push(clean);
    }
  }

  return tags.slice(0, 24);
}

function cleanTag(value) {
  const clean = String(value || '').trim();

  if (!clean) return '';
  if (/^b3:[0-9a-f]{64}$/i.test(clean)) return '';
  if (/^original:b3:[0-9a-f]{64}$/i.test(clean)) return '';
  if (/^crab:\/\//i.test(clean)) return '';
  if (clean.length > 80) return clean.slice(0, 80);

  return clean;
}

function sourceTag(value) {
  const clean = String(value || '').trim();
  return clean ? `source:${clean}` : '';
}

function rightsTag(value) {
  const clean = String(value || '').trim();
  return clean ? `rights:${clean}` : '';
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
}

function labelFromSnake(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function loadNextNonceHint(account) {
  const key = `${NONCE_HINT_PREFIX}${String(account || '').trim()}`;

  if (!key || typeof window === 'undefined') {
    return 1;
  }

  const value = Number(window.localStorage.getItem(key) || '1');
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function persistNextNonceHint(account, nonce) {
  const cleanAccount = String(account || '').trim();
  const value = Number(nonce);

  if (!cleanAccount || !Number.isSafeInteger(value) || value < 1 || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(`${NONCE_HINT_PREFIX}${cleanAccount}`, String(value));
}

function redactProof(proof) {
  if (!proof) {
    return null;
  }

  return {
    op: proof.op || 'hold',
    asset: proof.asset || 'roc',
    amount_minor: proof.amount_minor || proof.amountMinor || '',
    from: proof.from || '',
    to: proof.to || '',
    txid: proof.txid ? `${String(proof.txid).slice(0, 12)}…` : '',
    receipt_hash: proof.receipt_hash ? `${String(proof.receipt_hash).slice(0, 12)}…` : '',
  };
}

function summarizeState(state) {
  return {
    status: state?.status || 'idle',
    data: state?.data || null,
    error: state?.error
      ? {
          name: state.error.name,
          message: state.error.message,
          reason: state.error.reason,
          status: state.error.status,
          correlationId: state.error.correlationId,
        }
      : null,
    request: state?.request || null,
  };
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === 'object') {
      return value;
    }
  }

  return null;
}

function formatRoc(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? String(amount) : '0';
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}