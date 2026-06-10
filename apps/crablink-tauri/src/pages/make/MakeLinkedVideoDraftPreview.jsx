/**
 * RO:WHAT — Paid linked-video preview controller for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts quote/pay/fetch preview state from MakePage.jsx.
 * RO:INTERACTS — MakePage.jsx, makeLinkedVideoPreviewRoutes.js, makeLinkedVideoPreviewFetch.js, content_view gateway client.
 * RO:INVARIANTS — preview access only; no reuse license; no payout split truth; no export authority; no wallet mutation from UI.
 * RO:METRICS — display-only preview transport facts.
 * RO:CONFIG — selected linked-video draft window and configured gateway/wallet session.
 * RO:SECURITY — React never receives spend authority; payment/receipt facts must come from backend content_view/wallet path.
 * RO:TEST — npm run build; manual linked video quote/pay/load preview smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { createContentViewClient } from '../../shared/api/contentViewClient.js';
import {
  linkedVideoPreviewPayload,
  linkedVideoPreviewRangeLabel,
  linkedVideoPreviewSeconds,
  linkedVideoPreviewTarget,
} from './makeLinkedVideoPreviewRoutes.js';
import {
  fetchLinkedVideoPreviewBlob,
  linkedVideoPreviewCanFetch,
  linkedVideoPreviewDisplayAmount,
  linkedVideoPreviewErrorMessage,
  linkedVideoPreviewReceiptFacts,
} from './makeLinkedVideoPreviewFetch.js';
import MakeLinkedVideoPreviewFrame from './MakeLinkedVideoPreviewFrame.jsx';
import MakeLinkedVideoPreviewProofPanel from './MakeLinkedVideoPreviewProofPanel.jsx';

export default function LinkedVideoDraftPreview({ item, app, onClose, onPreviewReady }) {
  const videoRef = useRef(null);
  const gateway = app?.clients?.gateway || app?.gateway || null;
  const contentViewClient = useMemo(() => createContentViewClient(gateway), [gateway]);
  const target = useMemo(() => linkedVideoPreviewTarget(item), [item]);
  const payerAccount = String(app?.settings?.walletAccount || gateway?.walletAccount || '').trim();
  const passportSubject = String(app?.settings?.passportSubject || gateway?.passportSubject || '').trim();
  const [access, setAccess] = useState({
    status: 'locked',
    quote: null,
    payment: null,
    error: null,
  });
  const [preview, setPreview] = useState({
    status: 'locked',
    objectUrl: '',
    source: null,
    error: null,
  });
  const previewObjectUrlRef = useRef('');
  const startSeconds = linkedVideoPreviewSeconds(item?.sourceStartMs, 0);
  const endSeconds = item?.useEntireSource
    ? 0
    : linkedVideoPreviewSeconds(item?.sourceEndMs, 0);
  const hasBoundedWindow = endSeconds > startSeconds;
  const isBusy = access.status === 'quoting' || access.status === 'paying' || preview.status === 'fetching';
  const canFetchPreview = linkedVideoPreviewCanFetch(access.status);
  const receiptFacts = linkedVideoPreviewReceiptFacts(access.payment);

  useEffect(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }

    setAccess({
      status: 'locked',
      quote: null,
      payment: null,
      error: null,
    });
    setPreview({
      status: 'locked',
      objectUrl: '',
      source: null,
      error: null,
    });
  }, [item?.id, item?.url, item?.sourceStartMs, item?.sourceEndMs, item?.useEntireSource]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = '';
    }
  }, []);

  const quotePreview = async () => {
    if (!target.assetCrabUrl || !target.cid) {
      const error = new Error('Linked video preview requires a canonical crab://<hash>.video URL.');
      setAccess((current) => ({
        ...current,
        status: 'error',
        error,
      }));
      return null;
    }

    if (!payerAccount) {
      const error = new Error('Configure a wallet account before quoting paid video preview.');
      setAccess((current) => ({
        ...current,
        status: 'error',
        error,
      }));
      return null;
    }

    if (!contentViewClient.ready) {
      const error = new Error('Gateway content_view quote/pay client is not ready.');
      setAccess((current) => ({
        ...current,
        status: 'error',
        error,
      }));
      return null;
    }

    setAccess((current) => ({
      ...current,
      status: 'quoting',
      error: null,
    }));

    try {
      const quote = await contentViewClient.quote(
        target,
        linkedVideoPreviewPayload({
          payerAccount,
          passportSubject,
        }),
        {
          idempotencyKey: `make-preview-quote:${target.hash?.slice(0, 16) || 'video'}:${payerAccount}`,
        },
      );

      setAccess({
        status: 'quoted',
        quote,
        payment: null,
        error: null,
      });

      return quote;
    } catch (error) {
      setAccess((current) => ({
        ...current,
        status: 'error',
        error,
      }));
      return null;
    }
  };

  const fetchPaidPreview = async (paymentOverride = null) => {
    const paymentForFetch = paymentOverride?.summary ? paymentOverride : access.payment;

    setPreview((current) => ({
      ...current,
      status: 'fetching',
      error: null,
    }));

    try {
      const result = await fetchLinkedVideoPreviewBlob({
        item,
        app,
        gateway,
        payment: paymentForFetch,
        payerAccount,
        passportSubject,
        target,
      });
      const objectUrl = URL.createObjectURL(result.blob);

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      previewObjectUrlRef.current = objectUrl;
      const sourceFacts = {
        route: result.route,
        label: result.label,
        status: result.status,
        bytes: result.blob.size,
        contentType: result.blob.type || '',
        correlationId: result.correlationId || '',
        attempts: result.attempts || [],
        transport: result.transport || '',
      };

      setPreview({
        status: 'ready',
        objectUrl,
        source: sourceFacts,
        error: null,
      });

      onPreviewReady?.({
        blob: result.blob,
        objectUrl,
        source: sourceFacts,
        payment: paymentForFetch,
      });
    } catch (error) {
      setPreview((current) => ({
        ...current,
        status: 'error',
        source: {
          ...(current.source || {}),
          attempts: Array.isArray(error?.attempts) ? error.attempts : current.source?.attempts || [],
        },
        error,
      }));
    }
  };

  const payPreview = async () => {
    const quote = access.quote?.summary ? access.quote : await quotePreview();

    if (!quote?.summary) {
      return;
    }

    const displayAmount = linkedVideoPreviewDisplayAmount(quote);
    const confirmed = window.confirm(
      `Pay ${displayAmount} to preview this source video?\n\nThis unlocks viewing only. It does not grant remix, export, ownership, or payout rights.`,
    );

    if (!confirmed) {
      return;
    }

    setAccess((current) => ({
      ...current,
      status: 'paying',
      error: null,
    }));

    try {
      const payment = await contentViewClient.pay(
        target,
        quote,
        linkedVideoPreviewPayload({
          payerAccount,
          passportSubject,
        }),
        {
          confirmed: true,
          idempotencyKey: `make-preview-pay:${target.hash?.slice(0, 16) || 'video'}:${payerAccount}`,
        },
      );

      setAccess({
        status: 'paid',
        quote,
        payment,
        error: null,
      });

      if (typeof app?.refreshWallet === 'function') {
        void app.refreshWallet(payerAccount);
      }

      app?.notify?.({
        tone: 'success',
        title: 'Preview payment confirmed',
        message: `${linkedVideoPreviewDisplayAmount(payment)} paid for source preview only. Reuse/export rights are still unverified.`,
      });

      await fetchPaidPreview(payment);
    } catch (error) {
      setAccess((current) => ({
        ...current,
        status: 'error',
        error,
      }));

      app?.notify?.({
        tone: 'warning',
        title: 'Preview payment failed',
        message: linkedVideoPreviewErrorMessage(error),
      });
    }
  };

  const seekToStart = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    try {
      if (Number.isFinite(startSeconds) && startSeconds > 0) {
        video.currentTime = startSeconds;
      }
    } catch (_error) {
      // Best-effort preview seeking only.
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;

    if (!video || !hasBoundedWindow) {
      return;
    }

    if (video.currentTime >= endSeconds) {
      video.pause();

      try {
        video.currentTime = startSeconds;
      } catch (_error) {
        // Best-effort preview seeking only.
      }
    }
  };

  if (!item) {
    return null;
  }

  return (
    <section className={`make-linked-video-preview-card is-${access.status}`} aria-label="Linked video paid preview">
      <div className="make-linked-video-preview-head">
        <div>
          <span>Paid source preview</span>
          <strong>{item.displayName || 'Linked video'}</strong>
          <small>{linkedVideoPreviewRangeLabel(item)}</small>
        </div>
        <button type="button" onClick={onClose} aria-label="Close linked video preview">
          ×
        </button>
      </div>

      <MakeLinkedVideoPreviewFrame
        access={access}
        canFetchPreview={canFetchPreview}
        handleTimeUpdate={handleTimeUpdate}
        isBusy={isBusy}
        item={item}
        onLoadPaidPreview={() => fetchPaidPreview(access.payment)}
        onPayPreview={payPreview}
        onQuotePreview={quotePreview}
        preview={preview}
        seekToStart={seekToStart}
        videoRef={videoRef}
      />

      <div className="make-linked-video-preview-facts">
        <span>{item.url}</span>
        <em>Preview only</em>
        <em>Rights unverified</em>
        <em>Not exported</em>
        {access.status === 'paid' && <em>Paid view receipt</em>}
      </div>

      <MakeLinkedVideoPreviewProofPanel
        access={access}
        preview={preview}
        receiptFacts={receiptFacts}
      />
    </section>
  );
}

