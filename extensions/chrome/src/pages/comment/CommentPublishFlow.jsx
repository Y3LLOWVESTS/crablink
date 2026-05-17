/**
 * RO:WHAT — Explicit React prepare → wallet hold → comment publish flow for crab://comment.
 * RO:WHY — Adds the comment asset publishing lane after post while staying honest when /assets/comment routes are not wired yet.
 * RO:INTERACTS — commentAssetClient, walletClient, CommentPage, app.refreshWallet, svc-gateway /assets/comment/prepare, /wallet/hold, /assets/comment.
 * RO:INVARIANTS — no silent ROC spend; hold requires click/confirm; publish requires backend hold proof; no direct storage/index/ledger calls.
 * RO:METRICS — gateway correlation IDs returned by GatewayClient are displayed in diagnostics.
 * RO:CONFIG — uses app settings for gateway URL, passport subject, wallet account, and bearer token.
 * RO:SECURITY — sends comment JSON only to configured svc-gateway; no private keys/seed phrases/local ledger truth.
 * RO:TEST — manual crab://comment prepare/hold/publish smoke from chrome-extension:// origin after backend comment routes exist.
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
import { normalizePaidProof } from '../../shared/api/assetClient.js';
import {
  createCommentAssetClient,
  extractCommentAssetCid,
  extractCommentAssetUrl,
  measureJsonBytes,
} from '../../shared/api/commentAssetClient.js';
import {
  compactIdempotencyKey,
  createWalletClient,
  expectedNonceFromWalletError,
  normalizeWalletHoldResponse,
  stableIdempotencyKey,
  toWalletHoldApiBody,
} from '../../shared/api/walletClient.js';

const DEFAULT_ESCROW_ACCOUNT = 'escrow_paid_write';
const MAX_SIMPLE_COMMENT_BYTES = 64 * 1024;

const IDLE_RESULT = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  error: null,
  request: null,
  apiRequest: null,
  nonceRecovery: null,
});

export default function CommentPublishFlow({ app, draftState }) {
  const settings = app?.settings || {};
  const gateway = app?.clients?.gateway || null;
  const commentClient = useMemo(() => createCommentAssetClient(gateway), [gateway]);
  const walletClient = useMemo(
    () => app?.clients?.wallet || createWalletClient(gateway),
    [app?.clients?.wallet, gateway],
  );

  const [prepareState, setPrepareState] = useState(IDLE_RESULT);
  const [holdState, setHoldState] = useState(IDLE_RESULT);
  const [publishState, setPublishState] = useState(IDLE_RESULT);
  const [escrowAccount, setEscrowAccount] = useState(DEFAULT_ESCROW_ACCOUNT);
  const [holdNonce, setHoldNonce] = useState(() => loadNextNonceHint(settings.walletAccount));
  const autoOpenTimer = useRef(0);

  const draft = draftState?.draft || {};
  const manifest = draftState?.manifest || null;

  const siteUrl = attachedCrabUrl(manifest?.site_connection) || draft.siteContextCrabUrl || '';
  const targetUrl = attachedCrabUrl(manifest?.reference_graph?.parent) || draft.parentCrabUrl || '';
  const threadUrl = attachedCrabUrl(manifest?.reference_graph?.thread) || draft.threadContextCrabUrl || '';

  const contentEnvelope = useMemo(
    () => buildCommentContentEnvelope({ draft, siteUrl, targetUrl, threadUrl }),
    [draft, siteUrl, targetUrl, threadUrl],
  );
  const commentBytes = useMemo(() => measureJsonBytes(contentEnvelope), [contentEnvelope]);

  const workflowKey = useMemo(
    () =>
      [
        draft.title || '',
        draft.body || '',
        siteUrl,
        targetUrl,
        threadUrl,
        draft.tags || '',
        settings.passportSubject || '',
        settings.walletAccount || '',
      ].join('|'),
    [draft, siteUrl, targetUrl, threadUrl, settings.passportSubject, settings.walletAccount],
  );

  useEffect(() => {
    setPrepareState(IDLE_RESULT);
    setHoldState(IDLE_RESULT);
    setPublishState(IDLE_RESULT);
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

  const preflight = getPreflight({ draft, settings, gateway, siteUrl, targetUrl, commentBytes });

  const preparePayload = useMemo(
    () => buildPreparePayload({ draft, manifest, settings, siteUrl, targetUrl, threadUrl, commentBytes }),
    [draft, manifest, settings, siteUrl, targetUrl, threadUrl, commentBytes],
  );

  const publishPayload = useMemo(
    () =>
      buildPublishPayload({
        draft,
        manifest,
        settings,
        siteUrl,
        targetUrl,
        threadUrl,
        contentEnvelope,
        commentBytes,
        preparePayload,
      }),
    [draft, manifest, settings, siteUrl, targetUrl, threadUrl, contentEnvelope, commentBytes, preparePayload],
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
        title: draft.title,
      }),
    [amountMinor, escrowAccount, holdNonce, prepareState.data, preparePayload, settings, draft.title],
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

  const publishPayloadData = firstObject(publishState.data, publishState.response?.data, publishState.response);
  const publishCrabUrl = extractCommentAssetUrl(publishPayloadData);
  const publishAssetCid = extractCommentAssetCid(publishPayloadData);

  const canPrepare = preflight.ok && Boolean(preparePayload);
  const canHold = prepareState.status === 'ok' && Boolean(holdRequest && holdApiRequest);
  const canPublish = holdState.status === 'ok' && Boolean(paidProof) && Boolean(publishPayload);

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
    setPublishState(IDLE_RESULT);

    try {
      const response = await commentClient.prepareComment(preparePayload);
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
        title: 'Comment prepare succeeded',
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
        title: 'Comment prepare failed',
        message:
          error?.status === 404
            ? 'The gateway is reachable, but /assets/comment/prepare is not backend-wired yet.'
            : error?.message || 'Gateway rejected the prepare request.',
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
        'Confirm ROC hold for comment publish?',
        '',
        `Amount: ${formatRocUnits(holdApiRequest.amount_minor)} ROC`,
        `From: ${holdApiRequest.from}`,
        `Escrow: ${holdApiRequest.to}`,
        `Nonce: ${holdApiRequest.nonce}`,
        '',
        'This creates a wallet hold through the configured gateway.',
        'It does not publish the comment until you click Submit Comment Publish.',
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
    setPublishState(IDLE_RESULT);

    try {
      const response = await walletClient.hold(holdApiRequest, { confirmed: true });
      const apiRequest = response?.apiRequest || holdApiRequest;
      const nextNonce = Number(apiRequest?.nonce || 0) + 1;

      setHoldState({
        status: 'ok',
        response,
        data: firstObject(response?.data, response?.walletHold, response),
        error: null,
        request: response?.request || holdRequest,
        apiRequest,
        nonceRecovery: response?.nonceRecovery || null,
      });

      if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
        saveLastNonceHint(settings.walletAccount, apiRequest?.nonce);
        setHoldNonce(String(nextNonce));
      }

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: response?.nonceRecovery ? 'ROC hold created after nonce retry' : 'ROC hold created',
        message: `Wallet hold returned. Correlation: ${response?.correlationId || 'n/a'}`,
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
              suggested_nonce: suggested,
              reason: 'Backend returned a suggested/expected nonce.',
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

  async function submitPublish() {
    if (!canPublish) {
      return;
    }

    const confirmed = window.confirm(
      [
        'Submit comment publish?',
        '',
        `Title: ${draft.title || 'Untitled comment'}`,
        `Site: ${siteUrl}`,
        `Target: ${targetUrl}`,
        `Bytes: ${commentBytes}`,
        `Paid proof txid: ${paidProof.txid}`,
        '',
        'This sends the comment JSON to svc-gateway /assets/comment.',
        'The backend must create the b3 content ID, manifest, receipt, and index pointer.',
      ].join('\n'),
    );

    if (!confirmed) {
      app?.notify?.({
        title: 'Comment publish cancelled',
        message: 'No comment JSON was sent.',
        tone: 'info',
      });
      return;
    }

    setPublishState({
      status: 'sending',
      response: null,
      data: null,
      error: null,
      request: {
        route: '/assets/comment',
        publishPayload,
        paidProof,
      },
      apiRequest: null,
      nonceRecovery: null,
    });

    try {
      const response = await commentClient.publishComment({
        request: publishPayload,
        paidProof,
        idempotencyKey:
          paidProof.idem ||
          preparePayload?.client_idempotency_key ||
          stableIdempotencyKey('comment-publish', draft.title, paidProof.txid),
      });

      const data = firstObject(response?.data, response);
      const crabUrl = extractCommentAssetUrl(data);

      setPublishState({
        status: 'ok',
        response,
        data,
        error: null,
        request: {
          route: '/assets/comment',
          publishPayload,
          paidProof,
        },
        apiRequest: response?.request || null,
        nonceRecovery: null,
      });

      await app?.refreshWallet?.(settings.walletAccount);

      app?.notify?.({
        title: 'Comment publish complete',
        message: crabUrl ? `Opening ${crabUrl}` : 'Publish returned without a crab URL.',
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
      setPublishState({
        status: 'error',
        response: null,
        data: firstObject(error?.data, error?.response?.data),
        error,
        request: {
          route: '/assets/comment',
          publishPayload,
          paidProof,
        },
        apiRequest: null,
        nonceRecovery: null,
      });

      app?.notify?.({
        title: 'Comment publish failed',
        message:
          error?.status === 404
            ? 'The gateway is reachable, but /assets/comment is not backend-wired yet.'
            : error?.message || 'Gateway rejected the publish request.',
        tone: 'danger',
      });
    }
  }

  function openReturnedAsset() {
    if (publishCrabUrl && typeof app?.navigate === 'function') {
      app.navigate(publishCrabUrl);
    }
  }

  return (
    <Card
      eyebrow="Publish"
      title="Comment publish flow"
      className="comment-publish-card"
      actions={
        <div className="comment-publish-badges">
          <Badge tone={preflight.ok ? 'success' : 'warning'}>
            {preflight.ok ? 'ready' : 'needs setup'}
          </Badge>
          <Badge tone="neutral">prepare</Badge>
          <Badge tone="neutral">hold</Badge>
          <Badge tone="neutral">publish</Badge>
        </div>
      }
    >
      <p className="comment-section-copy">
        This is the gateway-wired lane for the future comment primitive. It can call the expected
        <code> /assets/comment/prepare</code> and <code> /assets/comment</code> routes, but it only shows
        backend truth when those routes return real CIDs/receipts.
      </p>

      <section className="comment-publish-grid" aria-label="Comment publish prerequisites">
        <Fact label="Gateway" value={settings.gatewayUrl || gateway?.baseUrl || 'not configured'} />
        <Fact label="Passport" value={settings.passportSubject || 'not configured'} />
        <Fact label="Wallet" value={settings.walletAccount || 'not configured'} />
        <Fact label="Site context" value={siteUrl || 'missing'} />
        <Fact label="Parent target" value={targetUrl || 'missing'} />
        <Fact label="Comment bytes" value={formatBytes(commentBytes)} />
      </section>

      {!preflight.ok && (
        <div className="comment-publish-warning">
          <strong>Publish flow blocked</strong>
          <span>{preflight.reason}</span>
        </div>
      )}

      <section className="comment-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 1</p>
            <h3>Prepare comment publish</h3>
          </div>
          <Badge tone={toneForStatus(prepareState.status)}>{labelForStatus(prepareState.status)}</Badge>
        </header>

        <p>
          Sends strict JSON metadata to <code>/assets/comment/prepare</code>. It should not create CIDs,
          store bytes, write index pointers, or mutate the wallet.
        </p>

        <div className="comment-publish-actions">
          <Button variant="primary" disabled={!canPrepare || prepareState.status === 'sending'} onClick={sendPrepare}>
            {prepareState.status === 'sending' ? 'Preparing…' : 'Send Prepare Request'}
          </Button>
          <CopyButton text={JSON.stringify(preparePayload || {}, null, 2)} label="Copy prepare JSON" disabled={!preparePayload} />
        </div>

        <JsonPreview
          label="Prepare request/result"
          data={{
            request: preparePayload,
            result: summarizeResult(prepareState),
            amount_minor: amountMinor || null,
            hold_template: extractHoldTemplate(prepareState.data),
          }}
          initiallyOpen={prepareState.status === 'error'}
        />
      </section>

      <section className="comment-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 2</p>
            <h3>Confirm ROC hold</h3>
          </div>
          <Badge tone={toneForStatus(holdState.status)}>{labelForStatus(holdState.status)}</Badge>
        </header>

        <p>
          Sends an explicit wallet hold to <code>/wallet/hold</code>. The actual API body remains
          strict and only includes wallet DTO fields.
        </p>

        <div className="comment-publish-controls">
          <Field label="Escrow account">
            <TextInput value={escrowAccount} onChange={(event) => setEscrowAccount(event.target.value)} />
          </Field>

          <Field label="Nonce">
            <TextInput value={holdNonce} onChange={(event) => setHoldNonce(event.target.value)} inputMode="numeric" />
          </Field>
        </div>

        <div className="comment-publish-grid">
          <Fact label="From" value={holdApiRequest?.from || 'waiting for prepare'} />
          <Fact label="To" value={holdApiRequest?.to || 'waiting for prepare'} />
          <Fact label="Amount minor" value={holdApiRequest?.amount_minor || 'waiting for prepare'} />
          <Fact label="Idempotency" value={holdApiRequest?.idempotency_key || 'waiting for prepare'} monospace />
        </div>

        <div className="comment-publish-actions">
          <Button variant="primary" disabled={!canHold || holdState.status === 'sending'} onClick={confirmHold}>
            {holdState.status === 'sending' ? 'Holding…' : 'Confirm ROC Hold'}
          </Button>
          <CopyButton text={JSON.stringify(holdApiRequest || {}, null, 2)} label="Copy strict hold API JSON" disabled={!holdApiRequest} />
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

      <section className="comment-publish-step">
        <header>
          <div>
            <p className="cl-eyebrow">Step 3</p>
            <h3>Submit comment publish</h3>
          </div>
          <Badge tone={toneForStatus(publishState.status)}>{labelForStatus(publishState.status)}</Badge>
        </header>

        <p>
          Sends comment JSON to <code>/assets/comment</code> with the wallet hold proof headers required
          by the gateway contract. The backend must return the real <code>crab://&lt;hash&gt;.comment</code>.
        </p>

        <div className="comment-publish-actions">
          <Button variant="primary" disabled={!canPublish || publishState.status === 'sending'} onClick={submitPublish}>
            {publishState.status === 'sending' ? 'Publishing…' : 'Submit Comment Publish'}
          </Button>
          <Button variant="secondary" disabled={!publishCrabUrl} onClick={openReturnedAsset}>
            Open Comment Asset
          </Button>
          <CopyButton text={publishCrabUrl} label="Copy crab URL" disabled={!publishCrabUrl} />
        </div>

        {publishState.status === 'ok' && (
          <div className="comment-publish-success">
            <StatChip label="Publish" value="complete" tone="success" />
            <StatChip label="Crab URL" value={publishCrabUrl || 'not returned'} help={publishCrabUrl} tone={publishCrabUrl ? 'success' : 'warning'} />
            <StatChip label="Asset CID" value={publishAssetCid || 'not returned'} help={publishAssetCid} />
            <StatChip label="HTTP" value={String(publishState.response?.status || 'n/a')} />
          </div>
        )}

        <JsonPreview
          label="Publish result"
          data={{
            request: publishState.request,
            result: summarizeResult(publishState),
            returned_crab_url: publishCrabUrl || null,
            returned_asset_cid: publishAssetCid || null,
          }}
          initiallyOpen={publishState.status === 'error' || publishState.status === 'ok'}
        />
      </section>
    </Card>
  );
}

function getPreflight({ draft, settings, gateway, siteUrl, targetUrl, commentBytes }) {
  if (!gateway) {
    return { ok: false, reason: 'Gateway client is not loaded yet.' };
  }

  if (!String(settings?.walletAccount || '').trim()) {
    return { ok: false, reason: 'Configure a wallet account label before preparing a comment publish.' };
  }

  if (!String(settings?.passportSubject || '').trim()) {
    return { ok: false, reason: 'Configure a passport subject before preparing a comment publish.' };
  }

  if (!String(draft?.body || '').trim()) {
    return { ok: false, reason: 'Write a comment body before preparing a comment publish.' };
  }

  if (!String(siteUrl || '').trim()) {
    return { ok: false, reason: 'Comments must declare the crab:// site context they belong to before publish.' };
  }

  if (!String(targetUrl || '').trim()) {
    return { ok: false, reason: 'Comments must declare a parent post/comment target before publish.' };
  }

  if (Number(commentBytes || 0) > MAX_SIMPLE_COMMENT_BYTES) {
    return { ok: false, reason: 'This MVP comment path is capped at 64 KiB. Shorten the comment or wait for chunked text support.' };
  }

  return { ok: true, reason: '' };
}

function buildPreparePayload({ draft, settings, siteUrl, targetUrl, threadUrl, commentBytes }) {
  return stripUndefined({
    title: draft.title || undefined,
    body: draft.body || undefined,
    bytes: commentBytes,
    payer_account: settings.walletAccount || undefined,
    owner_passport_subject: settings.passportSubject || undefined,
    content_type: 'application/json; charset=utf-8',
    tags: normalizeTags(draft.tags),
    language: draft.language || 'en',
    comment_kind: draft.commentKind || 'reply',
    content_warning: draft.contentWarning || undefined,
    site_context_crab_url: siteUrl || undefined,
    target_crab_url: targetUrl || undefined,
    parent_crab_url: targetUrl || undefined,
    thread_context_crab_url: threadUrl || undefined,
    client_idempotency_key: stableIdempotencyKey(
      'comment-prepare',
      settings.walletAccount,
      settings.passportSubject,
      draft.title,
      siteUrl,
      targetUrl,
      commentBytes,
    ),
  });
}

function buildPublishPayload({ draft, manifest, settings, siteUrl, targetUrl, threadUrl, contentEnvelope, commentBytes, preparePayload }) {
  return stripUndefined({
    schema: 'crablink.comment-publish-request.v1',
    asset_kind: 'comment',
    title: draft.title || undefined,
    body: draft.body || undefined,
    bytes: commentBytes,
    payer_account: settings.walletAccount || undefined,
    owner_passport_subject: settings.passportSubject || undefined,
    content_type: 'application/json; charset=utf-8',
    tags: normalizeTags(draft.tags),
    language: draft.language || 'en',
    comment_kind: draft.commentKind || 'reply',
    content_warning: draft.contentWarning || undefined,
    site_context_crab_url: siteUrl || undefined,
    target_crab_url: targetUrl || undefined,
    parent_crab_url: targetUrl || undefined,
    thread_context_crab_url: threadUrl || undefined,
    relations: stripUndefined({
      site: siteUrl || undefined,
      target: targetUrl || undefined,
      parent: targetUrl || undefined,
      thread: threadUrl || undefined,
    }),
    content: contentEnvelope,
    manifest_hint: manifest || undefined,
    client_idempotency_key: preparePayload?.client_idempotency_key || stableIdempotencyKey('comment-publish', draft.title, commentBytes),
  });
}

function buildCommentContentEnvelope({ draft, siteUrl, targetUrl, threadUrl }) {
  return stripUndefined({
    schema: 'ron.text-asset.v1',
    kind: 'comment',
    format: 'text/plain; charset=utf-8',
    title: draft?.title || 'Untitled comment',
    body: draft?.body || '',
    metadata: stripUndefined({
      comment_kind: draft?.commentKind || 'reply',
      language: draft?.language || 'en',
      content_warning: draft?.contentWarning || undefined,
      tags: normalizeTags(draft?.tags),
    }),
    relations: stripUndefined({
      site: siteUrl || undefined,
      target: targetUrl || undefined,
      parent: targetUrl || undefined,
      thread: threadUrl || undefined,
    }),
  });
}

function buildHoldRequest({ amountMinor, escrowAccount, holdNonce, prepareData, preparePayload, settings, title }) {
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
    title,
  );

  return {
    from,
    to,
    asset: firstString(template.asset, 'roc').toLowerCase(),
    amount_minor: amount,
    nonce: safeNonce,
    memo: `CrabLink comment hold for ${title || 'comment publish'}`.slice(0, 240),
    idempotency_key: compactIdempotencyKey(
      stableIdempotencyKey('wallet-hold', idemHint || 'comment-prepare', from, to, amount, safeNonce),
      'wallet-hold',
    ),
  };
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
    <div className="comment-publish-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'n/a'}</strong>
    </div>
  );
}

function attachedCrabUrl(connection) {
  if (!connection || typeof connection !== 'object') {
    return '';
  }

  return firstString(
    connection.normalized_crab_url,
    connection.normalizedCrabUrl,
    connection.crab_url,
    connection.crabUrl,
    connection.url,
    connection.value,
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
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null || child === '') return false;
      if (Array.isArray(child) && child.length === 0) return false;
      return true;
    }),
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