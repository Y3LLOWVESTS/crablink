/**
 * RO:WHAT — Receipt-gated stream-lite segment viewer for .stream asset pages.
 * RO:WHY — Lets Visitor B fetch the backend latest stream segment after content_view payment.
 * RO:INTERACTS — AssetHydratedView, streamSessionClient, svc-gateway /streams/{stream_id}/segments/latest.
 * RO:INVARIANTS — no fake stream playback; no local camera reuse; requires backend receipt metadata and stream_id.
 * RO:METRICS — displays gateway route/status/correlation data returned by GatewayClient.
 * RO:CONFIG — uses configured gateway client from app/assetClient.
 * RO:SECURITY — no autoplay spend; no direct wallet/ledger/storage/index calls; receipt cache alone does not unlock.
 * RO:TEST — pay .stream content_view, then load latest segment after creator publishes a backend snapshot.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import { loadLatestPaidStreamSegment } from '../../shared/api/streamSessionClient.js';

const DESCRIPTOR_IDLE = Object.freeze({
  status: 'idle',
  response: null,
  raw: '',
  parsed: null,
  error: null,
});

const SEGMENT_IDLE = Object.freeze({
  status: 'idle',
  response: null,
  data: null,
  segment: null,
  access: null,
  error: null,
});

const POLL_INTERVAL_OPTIONS = Object.freeze([
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
]);

const POLL_IDLE = Object.freeze({
  running: false,
  status: 'idle',
  intervalMs: 2000,
  inFlight: false,
  checkedCount: 0,
  unchangedCount: 0,
  changedCount: 0,
  errorCount: 0,
  droppedPolls: 0,
  lastSeq: '',
  lastCheckedAt: '',
  lastLatencyMs: 0,
  error: '',
});

export default function StreamPaidSegmentViewer({
  app,
  assetClient,
  summary,
  contentViewAccess,
}) {
  const gateway = app?.clients?.gateway || app?.gateway || assetClient?.gateway || null;
  const contentFetchCid = summary?.contentCid || summary?.cid || '';
  const [descriptorState, setDescriptorState] = useState(DESCRIPTOR_IDLE);
  const [segmentState, setSegmentState] = useState(SEGMENT_IDLE);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(2000);
  const [pollState, setPollState] = useState(POLL_IDLE);
  const lastAutoLoadKey = useRef('');
  const lastSegmentSeqRef = useRef('');
  const pollTimerRef = useRef(0);
  const pollRunningRef = useRef(false);
  const pollInFlightRef = useRef(false);

  const descriptor = descriptorState.parsed || {};
  const streamId = useMemo(
    () => extractStreamId(summary, descriptor, contentViewAccess),
    [summary, descriptor, contentViewAccess],
  );

  const receiptProof = useMemo(
    () => buildReceiptProof({ app, summary, contentViewAccess }),
    [app, summary, contentViewAccess],
  );

  const canLoadSegment = Boolean(
    contentViewAccess?.canView &&
      gateway?.request &&
      streamId &&
      receiptProof.txid &&
      receiptProof.receiptHash,
  );

  const loadKey = [
    streamId,
    receiptProof.txid,
    receiptProof.receiptHash,
    receiptProof.payerAccount,
    receiptProof.recipientAccount,
    receiptProof.amountMinor,
  ]
    .filter(Boolean)
    .join('|');

  useEffect(() => () => {
    stopPolling('Component unmounted', { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!contentFetchCid || !gateway?.request) {
        setDescriptorState(DESCRIPTOR_IDLE);
        return;
      }

      setDescriptorState({
        status: 'loading',
        response: null,
        raw: '',
        parsed: null,
        error: null,
      });

      try {
        const response = await gateway.request(`/o/${encodeURIComponent(contentFetchCid)}`, {
          label: 'Stream descriptor object',
          parseAs: 'text',
          headers: {
            Accept: 'application/json,text/plain,*/*',
          },
        });

        if (!alive) {
          return;
        }

        const normalized = normalizeDescriptorResponse(response?.data);

        setDescriptorState({
          status: 'resolved',
          response,
          raw: normalized.raw,
          parsed: normalized.parsed,
          error: null,
        });
      } catch (error) {
        if (!alive) {
          return;
        }

        setDescriptorState({
          status: 'error',
          response: null,
          raw: '',
          parsed: null,
          error,
        });
      }
    }

    void run();

    return () => {
      alive = false;
    };
  }, [contentFetchCid, gateway]);

  useEffect(() => {
    stopPolling('Stream descriptor changed', { silent: true });
    setSegmentState(SEGMENT_IDLE);
    setPollState(POLL_IDLE);
    lastAutoLoadKey.current = '';
    lastSegmentSeqRef.current = '';
  }, [summary?.crabUrl, summary?.hash, streamId]);

  useEffect(() => {
    if (!canLoadSegment || !loadKey || lastAutoLoadKey.current === loadKey) {
      return;
    }

    lastAutoLoadKey.current = loadKey;
    void loadLatestSegment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadSegment, loadKey]);

  useEffect(() => {
    const seq = cleanString(segmentState.segment?.seq || segmentState.segment?.sequence);
    if (seq) {
      lastSegmentSeqRef.current = seq;
    }
  }, [segmentState.segment]);

  async function requestLatestSegment() {
    if (!gateway?.request) {
      throw new Error('Gateway client is not ready.');
    }

    if (!streamId) {
      throw new Error('Paid receipt returned, but backend did not return stream_id. Cannot request stream segment.');
    }

    if (!receiptProof.txid || !receiptProof.receiptHash) {
      throw new Error('Latest stream segment requires backend wallet txid and receipt hash.');
    }

    const response = await loadLatestPaidStreamSegment(gateway, {
      streamId,
      assetCrabUrl: summary?.crabUrl,
      payerAccount: receiptProof.payerAccount,
      recipientAccount: receiptProof.recipientAccount,
      txid: receiptProof.txid,
      receiptHash: receiptProof.receiptHash,
      amountMinor: receiptProof.amountMinor,
    });

    const data = response?.data || response || {};
    const segment = objectValue(data.segment || data.latest_segment || data.latestSegment);
    const access = objectValue(data.access);

    return {
      response,
      data,
      segment: Object.keys(segment).length ? segment : null,
      access,
    };
  }

  function applySegmentResult(result, { force = false } = {}) {
    const nextSeq = cleanString(result.segment?.seq || result.segment?.sequence);
    const previousSeq = lastSegmentSeqRef.current;
    const changed = Boolean(force || !nextSeq || nextSeq !== previousSeq);

    if (changed) {
      setSegmentState({
        status: 'resolved',
        response: result.response,
        data: result.data,
        segment: result.segment,
        access: result.access,
        error: null,
      });

      if (nextSeq) {
        lastSegmentSeqRef.current = nextSeq;
      }
    }

    return {
      changed,
      seq: nextSeq || previousSeq,
    };
  }

  async function loadLatestSegment() {
    setPollState((current) => ({
      ...current,
      error: '',
    }));

    try {
      setSegmentState({
        status: 'loading',
        response: null,
        data: null,
        segment: segmentState.segment,
        access: segmentState.access,
        error: null,
      });

      const result = await requestLatestSegment();
      applySegmentResult(result, { force: true });
      setPollState((current) => ({
        ...current,
        lastSeq: cleanString(result.segment?.seq || result.segment?.sequence) || current.lastSeq,
        lastCheckedAt: new Date().toISOString(),
        error: '',
      }));
    } catch (error) {
      setSegmentState({
        status: 'error',
        response: null,
        data: null,
        segment: segmentState.segment,
        access: segmentState.access,
        error,
      });
    }
  }

  function onPollIntervalChange(event) {
    const next = normalizePollIntervalMs(event.target.value, pollIntervalMs);
    setPollIntervalMs(next);
    setPollState((current) => ({
      ...current,
      intervalMs: next,
    }));
  }

  function onStartPolling() {
    if (!canLoadSegment) {
      setPollState((current) => ({
        ...current,
        running: false,
        status: 'error',
        error: 'Auto-refresh requires paid backend receipt metadata and a stream_id.',
      }));
      return;
    }

    pollRunningRef.current = true;
    pollInFlightRef.current = false;
    setPollState({
      ...POLL_IDLE,
      running: true,
      status: 'starting',
      intervalMs: pollIntervalMs,
      lastSeq: lastSegmentSeqRef.current,
    });
    scheduleNextPoll(0);
  }

  function onStopPolling() {
    stopPolling('Paused by viewer');
  }

  function stopPolling(reason = 'Stopped', { silent = false } = {}) {
    pollRunningRef.current = false;
    pollInFlightRef.current = false;

    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = 0;
    }

    if (silent) {
      return;
    }

    setPollState((current) => ({
      ...current,
      running: false,
      inFlight: false,
      status: current.status === 'idle' ? 'idle' : 'paused',
      error: '',
      stopReason: reason,
    }));
  }

  function scheduleNextPoll(delayMs = pollIntervalMs) {
    if (!pollRunningRef.current) {
      return;
    }

    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }

    const safeDelay = Math.max(500, Number(delayMs || pollIntervalMs || 2000));
    pollTimerRef.current = window.setTimeout(() => {
      void pollLatestSegmentTick();
    }, safeDelay);
  }

  async function pollLatestSegmentTick() {
    if (!pollRunningRef.current) {
      return;
    }

    if (pollInFlightRef.current) {
      setPollState((current) => ({
        ...current,
        droppedPolls: current.droppedPolls + 1,
        status: 'backpressure',
      }));
      scheduleNextPoll(pollIntervalMs);
      return;
    }

    if (!canLoadSegment) {
      stopPolling('Receipt metadata unavailable');
      setPollState((current) => ({
        ...current,
        status: 'error',
        error: 'Auto-refresh stopped because paid receipt metadata is unavailable.',
      }));
      return;
    }

    pollInFlightRef.current = true;
    let hadError = false;
    const started = performance.now();

    setPollState((current) => ({
      ...current,
      running: true,
      inFlight: true,
      status: 'checking',
      error: '',
    }));

    try {
      const result = await requestLatestSegment();
      const latencyMs = Math.round(performance.now() - started);
      const applied = applySegmentResult(result, { force: false });

      setPollState((current) => ({
        ...current,
        running: true,
        inFlight: false,
        status: applied.changed ? 'updated' : 'watching',
        checkedCount: current.checkedCount + 1,
        changedCount: current.changedCount + (applied.changed ? 1 : 0),
        unchangedCount: current.unchangedCount + (applied.changed ? 0 : 1),
        lastSeq: applied.seq || current.lastSeq,
        lastCheckedAt: new Date().toISOString(),
        lastLatencyMs: latencyMs,
        error: '',
      }));
    } catch (error) {
      hadError = true;
      setPollState((current) => ({
        ...current,
        running: true,
        inFlight: false,
        status: isStreamSessionMissing(error) ? 'offline' : 'error',
        errorCount: current.errorCount + 1,
        lastCheckedAt: new Date().toISOString(),
        error: errorMessage(error),
      }));
    } finally {
      pollInFlightRef.current = false;

      if (pollRunningRef.current) {
        const backoff = hadError ? Math.min(8000, pollIntervalMs * 2) : pollIntervalMs;
        scheduleNextPoll(backoff);
      }
    }
  }

  const segment = segmentState.segment || {};
  const mediaType = cleanString(segment.media_type || segment.mediaType);
  const dataUrl = cleanString(segment.data_url || segment.dataUrl);
  const text = cleanString(segment.text);
  const isImageSegment = Boolean(dataUrl && mediaType.startsWith('image/'));
  const pollActive = Boolean(pollState.running);
  const pollLabel = pollStatusLabel(pollState);

  return (
    <Card
      eyebrow="Stream viewer"
      title={contentViewAccess?.canView ? 'Stream access receipt returned' : 'Paid stream watch gate'}
      className="asset-preview-card asset-stream-viewer-card"
      actions={
        <div className="asset-copy-actions">
          <Button
            variant="primary"
            onClick={loadLatestSegment}
            disabled={!canLoadSegment || segmentState.status === 'loading'}
          >
            {segmentState.status === 'loading' ? 'Loading segment…' : 'Load latest paid segment'}
          </Button>
          <Button variant="secondary" onClick={() => setDeveloperOpen((open) => !open)}>
            {developerOpen ? 'Hide JSON' : 'Developer JSON'}
          </Button>
        </div>
      }
    >
      <div className="asset-preview-empty asset-stream-lite-status">
        <strong>
          {contentViewAccess?.canView
            ? 'Backend payment receipt accepted for this stream descriptor.'
            : 'Pay to view this stream through the backend wallet path.'}
        </strong>
        <span>
          {contentViewAccess?.canView
            ? 'CrabLink will now request the latest stream-lite segment from the backend using the wallet receipt metadata. It will not reuse the creator camera preview.'
            : 'This page waits for backend content_view receipt truth before it requests any stream segment.'}
        </span>
      </div>

      <div className="asset-stream-poll-card" aria-label="Paid stream auto-refresh controls">
        <div>
          <span>Auto-refresh latest segment</span>
          <strong>{pollActive ? 'Polling backend latest segment' : 'Paused'}</strong>
          <small>
            Polling reuses the existing backend receipt metadata. It never pays again, never creates a
            receipt from cache, and only updates the player when the backend seq changes.
          </small>
        </div>

        <label className="asset-stream-poll-select">
          <span>Refresh interval</span>
          <select value={pollIntervalMs} onChange={onPollIntervalChange} disabled={pollActive}>
            {POLL_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="asset-copy-actions">
          <Button variant="primary" onClick={onStartPolling} disabled={!canLoadSegment || pollActive}>
            {pollState.status === 'starting' ? 'Starting…' : 'Start auto-refresh'}
          </Button>
          <Button variant="secondary" onClick={onStopPolling} disabled={!pollActive}>
            Pause refresh
          </Button>
        </div>

        <div className="asset-stream-poll-stats">
          <Fact label="Refresh" value={pollLabel} />
          <Fact label="Last seq" value={pollState.lastSeq || 'n/a'} monospace />
          <Fact label="Checked" value={pollState.checkedCount || '0'} />
          <Fact label="Unchanged" value={pollState.unchangedCount || '0'} />
          <Fact label="Errors" value={pollState.errorCount || '0'} />
          <Fact label="Latency" value={pollState.lastLatencyMs ? `${pollState.lastLatencyMs} ms` : 'n/a'} />
        </div>

        {pollState.error ? (
          <div className="asset-stream-lite-warning" role="alert">
            <strong>{pollState.status === 'offline' ? 'Stream session appears offline' : 'Auto-refresh warning'}</strong>
            <span>{pollState.error}</span>
          </div>
        ) : null}
      </div>

      <div className="asset-fact-grid">
        <Fact label="Stream ID" value={streamId || 'Not returned'} monospace />
        <Fact
          label="Descriptor status"
          value={stringValue(descriptor.status, summary?.raw?.status, 'descriptor resolved')}
        />
        <Fact
          label="Descriptor fetch"
          value={descriptorState.status === 'resolved' ? 'descriptor object parsed' : descriptorState.status}
        />
        <Fact
          label="Playback route"
          value={stringValue(
            descriptor.live_delivery?.segment_route,
            descriptor.liveDelivery?.segmentRoute,
            descriptor.links?.latest_segment,
            streamId ? `/streams/${streamId}/segments/latest` : 'stream_id required',
          )}
          monospace
        />
        <Fact label="Refresh" value={pollLabel} />
        <Fact label="Last checked" value={pollState.lastCheckedAt || 'n/a'} monospace />
        <Fact label="Receipt txid" value={receiptProof.txid || 'Not returned'} monospace />
        <Fact label="Receipt hash" value={receiptProof.receiptHash || 'Not returned'} monospace />
        <Fact label="Payer" value={receiptProof.payerAccount || 'Not returned'} monospace />
        <Fact label="Recipient" value={receiptProof.recipientAccount || 'Not returned'} monospace />
      </div>

      {!contentViewAccess?.canView ? (
        <TruthBoundary
          tone="warning"
          title="No fake stream playback"
          copy="The descriptor is real, but live playback requires backend receipt proof and a backend-published segment. Local receipt memory and local camera preview cannot unlock this view."
        />
      ) : null}

      {contentViewAccess?.canView && !streamId ? (
        <TruthBoundary
          tone="warning"
          title="Paid receipt returned, but stream_id is missing"
          copy="CrabLink fetched the asset page, but could not find stream_id in the resolved asset or descriptor object. The viewer cannot call /streams/{stream_id}/segments/latest until the backend descriptor exposes it."
        />
      ) : null}

      {descriptorState.status === 'error' ? (
        <div className="asset-stream-lite-warning" role="alert">
          <strong>Descriptor object was not readable</strong>
          <span>{errorMessage(descriptorState.error)}</span>
        </div>
      ) : null}

      {segmentState.status === 'error' ? (
        <div className="asset-stream-lite-warning" role="alert">
          <strong>Latest segment was not returned</strong>
          <span>{errorMessage(segmentState.error)}</span>
        </div>
      ) : null}

      {segmentState.status === 'resolved' && !segmentState.segment ? (
        <div className="asset-stream-lite-warning">
          <strong>Backend returned no latest segment yet</strong>
          <span>
            Keep the creator tab open, start the backend stream session, then publish a current
            preview snapshot or text heartbeat.
          </span>
        </div>
      ) : null}

      {segmentState.status === 'resolved' && segmentState.segment ? (
        <div className="asset-stream-lite-player">
          <div className="asset-stream-lite-player-head">
            <div>
              <span>Backend latest segment</span>
              <strong>
                {segment.seq ? `segment #${segment.seq}` : 'segment returned'} ·{' '}
                {segmentState.access?.status || 'receipt checked'}
              </strong>
            </div>
            <small>{mediaType || 'unknown media type'}</small>
          </div>

          {isImageSegment ? (
            <img src={dataUrl} alt="Latest backend stream-lite segment" />
          ) : null}

          {!isImageSegment && dataUrl ? (
            <div className="asset-stream-lite-warning">
              <strong>Segment data URL returned</strong>
              <span>
                Media type <code>{mediaType || 'unknown'}</code> is not rendered by this proof
                viewer yet.
              </span>
            </div>
          ) : null}

          {text ? (
            <pre className="asset-stream-lite-text">{text}</pre>
          ) : null}

          {!dataUrl && !text ? (
            <div className="asset-stream-lite-warning">
              <strong>Segment had no renderable data</strong>
              <span>The backend responded, but no text or data_url was present.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <TruthBoundary
        tone={contentViewAccess?.canView ? 'success' : 'warning'}
        title={contentViewAccess?.canView ? 'Receipt is backend-derived' : 'Receipt required'}
        copy={
          contentViewAccess?.canView
            ? 'The stream viewer requests mutable latest-segment state only after the backend wallet receipt is returned. This is still stream-lite: one bounded latest segment, not full live video transport.'
            : 'Paying is explicit. CrabLink does not create receipts, invent balances, silently spend ROC, or unlock stream media from cache alone.'
        }
      />

      {developerOpen ? (
        <details className="asset-content-view-json" open>
          <summary>Developer stream-lite JSON</summary>
          <JsonPreview
            label="stream-lite viewer"
            data={{
              stream_id: streamId,
              descriptor_state: descriptorState.status,
              descriptor,
              receipt_proof: {
                ...receiptProof,
                raw: undefined,
              },
              segment_state: segmentState.status,
              poll_state: pollState,
              latest_response: segmentState.data,
              error: serializeError(segmentState.error || descriptorState.error),
              truth_boundary:
                'Display-only diagnostics. Backend stream session and wallet receipt verification remain the authority.',
            }}
          />
        </details>
      ) : null}
    </Card>
  );
}

function normalizePollIntervalMs(value, fallback = 2000) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (POLL_INTERVAL_OPTIONS.some((option) => option.value === parsed)) {
    return parsed;
  }

  return POLL_INTERVAL_OPTIONS.some((option) => option.value === fallback) ? fallback : 2000;
}

function pollStatusLabel(pollState) {
  switch (pollState.status) {
    case 'starting':
      return 'Starting';
    case 'checking':
      return 'Checking';
    case 'updated':
      return 'Updated';
    case 'watching':
      return 'Watching';
    case 'backpressure':
      return 'Backpressure';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Error';
    case 'paused':
      return 'Paused';
    default:
      return 'Off';
  }
}

function isStreamSessionMissing(error) {
  const text = `${error?.message || ''} ${error?.reason || ''} ${error?.code || ''}`.toLowerCase();
  return text.includes('stream_session_not_found') || text.includes('stream_not_found') || text.includes('session was not found');
}

function buildReceiptProof({ app, summary, contentViewAccess }) {
  const paymentSummary = objectValue(contentViewAccess?.payment?.summary);
  const quoteSummary = objectValue(contentViewAccess?.quote?.summary);
  const receipt = objectValue(contentViewAccess?.receipt);
  const receiptRaw = objectValue(receipt.raw);
  const paymentRaw = objectValue(contentViewAccess?.payment?.data || contentViewAccess?.payment?.response?.data);
  const walletReceipt = objectValue(
    paymentRaw.wallet_receipt ||
      paymentRaw.walletReceipt ||
      paymentRaw.payment?.wallet_receipt ||
      paymentRaw.payment?.walletReceipt,
  );

  return {
    assetCrabUrl: stringValue(paymentSummary.assetCrabUrl, quoteSummary.assetCrabUrl, summary?.crabUrl),
    payerAccount: stringValue(
      paymentSummary.payerAccount,
      quoteSummary.payerAccount,
      receipt.payerAccount,
      walletReceipt.from,
      app?.settings?.walletAccount,
    ),
    recipientAccount: stringValue(
      paymentSummary.recipientAccount,
      quoteSummary.recipientAccount,
      receipt.recipientAccount,
      walletReceipt.to,
      summary?.payout,
    ),
    txid: stringValue(paymentSummary.txid, receipt.txid, walletReceipt.txid, receiptRaw.payment_summary?.txid),
    receiptHash: stringValue(
      paymentSummary.receiptHash,
      receipt.receiptHash,
      walletReceipt.receipt_hash,
      walletReceipt.receiptHash,
      receiptRaw.payment_summary?.receiptHash,
    ),
    amountMinor: stringValue(
      paymentSummary.amountMinor,
      quoteSummary.amountMinor,
      receipt.amountMinor,
      walletReceipt.amount_minor,
      walletReceipt.amountMinor,
      receiptRaw.payment_summary?.amountMinor,
    ),
    raw: {
      paymentSummary,
      quoteSummary,
      receipt,
      walletReceipt,
    },
  };
}

function extractStreamId(summary = {}, descriptor = {}, contentViewAccess = {}) {
  const raw = objectValue(summary.raw);
  const manifest = objectValue(raw.manifest || raw.asset_manifest || raw.assetManifest);
  const descriptorFromRaw = objectValue(raw.descriptor);
  const paymentSummary = objectValue(contentViewAccess?.payment?.summary);
  const quoteSummary = objectValue(contentViewAccess?.quote?.summary);

  return stringValue(
    raw.stream_id,
    raw.streamId,
    raw.stream?.id,
    raw.stream?.stream_id,
    raw.stream?.streamId,
    descriptorFromRaw.stream_id,
    descriptorFromRaw.streamId,
    manifest.stream_id,
    manifest.streamId,
    descriptor.stream_id,
    descriptor.streamId,
    descriptor.stream?.id,
    descriptor.stream?.stream_id,
    descriptor.stream?.streamId,
    descriptor.manifest?.stream_id,
    descriptor.manifest?.streamId,
    paymentSummary.streamId,
    paymentSummary.stream_id,
    quoteSummary.streamId,
    quoteSummary.stream_id,
  );
}

function normalizeDescriptorResponse(data) {
  if (typeof data === 'string') {
    const raw = data.trim();
    return {
      raw,
      parsed: parseJsonObject(raw),
    };
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const candidate =
      data.raw_content ||
      data.rawContent ||
      data.content ||
      data.object ||
      data.asset ||
      data.data ||
      data;

    if (typeof candidate === 'string') {
      const raw = candidate.trim();
      return {
        raw,
        parsed: parseJsonObject(raw),
      };
    }

    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return {
        raw: safeJson(candidate),
        parsed: candidate,
      };
    }
  }

  return {
    raw: '',
    parsed: {},
  };
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || ''));

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    // Descriptor should be JSON; return empty object for clear diagnostics.
  }

  return {};
}

function Fact({ label, value, monospace = false }) {
  const clean = value === null || value === undefined || value === '' ? 'n/a' : String(value);

  return (
    <div className="asset-fact">
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''} title={clean}>
        {clean}
      </strong>
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
    status: Number(error.status || 0),
    reason: error.reason || error.code || '',
    correlationId: error.correlationId || '',
    data: error.data || null,
  };
}

function errorMessage(error) {
  return String(error?.message || error || 'Unknown error.');
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function stringValue(...values) {
  for (const value of values) {
    const clean = cleanString(value);

    if (clean) {
      return clean;
    }
  }

  return '';
}

function safeJson(value) {
  try {
    return JSON.stringify(value || null, null, 2);
  } catch (_error) {
    return String(value ?? '');
  }
}