/**
 * RO:WHAT — Stream session status panel for the local stream control room.
 * RO:WHY — Wires descriptor-confirmed stream IDs to bounded backend stream-lite start/status/snapshot/stop controls.
 * RO:INTERACTS — StreamPage, StreamLocalPreview, StreamPricingPanel, streamSessionClient, gateway /streams routes.
 * RO:INVARIANTS — no fake backend live status; no fake viewer count; no fake revenue; no receipt; no wallet mutation.
 * RO:METRICS — gateway requests preserve correlation diagnostics through GatewayClient.
 * RO:CONFIG — uses configured gateway client plus local draft and preview state.
 * RO:SECURITY — no ingest token, stream key, capability, or receipt data is displayed or invented; latest segment is bounded.
 * RO:TEST — npm run build; crab://stream publish → auto backend start → auto first segment → Visitor B paid latest segment smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildBackendLaunchRequestPreview,
  captureCurrentStreamPreviewFrame,
  getBackendStreamStatus,
  getLocalStreamSession,
  startBackendStreamSession,
  startLocalStreamSession,
  stopBackendStreamSession,
  stopLocalStreamSession,
} from '../../shared/api/streamSessionClient.js';
import { labelFromSnake } from './streamDraftModel.js';

const AUTO_PROOF_IDLE = Object.freeze({
  status: 'idle',
  started: false,
  segmentPublished: false,
  mode: '',
  error: null,
  key: '',
});

const LIVE_FRAME_INTERVAL_OPTIONS = Object.freeze([
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
]);

const LIVE_LOOP_IDLE = Object.freeze({
  running: false,
  status: 'idle',
  intervalMs: 2000,
  inFlight: false,
  droppedFrames: 0,
  publishedFrames: 0,
  lastSeq: '',
  lastLatencyMs: 0,
  lastPublishedAt: '',
  startedAt: '',
  stoppedAt: '',
  error: '',
});

export default function StreamSessionPanel({ app, draft, previewState, pricing, publishedStream }) {
  const gateway = app?.clients?.gateway || app?.gateway || null;
  const streamInfo = useMemo(() => normalizePublishedStream(publishedStream), [publishedStream]);
  const autoProofKeysRef = useRef(new Set());
  const backendLiveRef = useRef(false);
  const liveLoopTimerRef = useRef(0);
  const liveLoopRunningRef = useRef(false);
  const liveLoopInFlightRef = useRef(false);

  const [localSession, setLocalSession] = useState(null);
  const [backendSession, setBackendSession] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);
  const [latestSegment, setLatestSegment] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [problem, setProblem] = useState('');
  const [copyState, setCopyState] = useState('');
  const [autoProof, setAutoProof] = useState(AUTO_PROOF_IDLE);
  const [liveFrameIntervalMs, setLiveFrameIntervalMs] = useState(2000);
  const [liveLoop, setLiveLoop] = useState(LIVE_LOOP_IDLE);

  const previewActive = previewState.status === 'previewing';
  const gatewayReady = Boolean(gateway?.request);
  const backendLive = cleanString(backendSession?.status || backendStatus?.session?.status) === 'live';
  const lockedCreatorAccount = creatorAccountForStream(streamInfo, draft, app, gateway);
  const activeWalletAccount = activeWalletForApp(app, gateway);
  const creatorWalletMismatch = Boolean(
    streamInfo.streamId &&
      lockedCreatorAccount &&
      activeWalletAccount &&
      lockedCreatorAccount !== activeWalletAccount,
  );
  const canUseBackend = Boolean(gatewayReady && streamInfo.streamId && streamInfo.streamUrl);
  const canPublishSegments = Boolean(canUseBackend && lockedCreatorAccount);
  const autoProofKey = `${streamInfo.streamId || ''}|${streamInfo.streamUrl || ''}`;

  const launchPreview = useMemo(
    () => buildBackendLaunchRequestPreview({ draft, previewState, pricing }),
    [draft, previewState, pricing],
  );

  useEffect(() => {
    backendLiveRef.current = backendLive;
  }, [backendLive]);

  useEffect(() => () => {
    stopLiveFrameLoop('Component unmounted', { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    getLocalStreamSession()
      .then((session) => {
        if (!cancelled) {
          setLocalSession(session || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLocalSession(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    stopLiveFrameLoop('Stream descriptor changed', { silent: true });
    setLiveLoop(LIVE_LOOP_IDLE);
    setBackendSession(null);
    setBackendStatus(null);
    setLatestSegment(null);
    setProblem('');
    setCopyState('');
    setAutoProof({
      ...AUTO_PROOF_IDLE,
      key: autoProofKey,
    });
  }, [streamInfo.streamId, streamInfo.streamUrl, autoProofKey]);

  useEffect(() => {
    if (!canUseBackend || !autoProofKey || autoProofKeysRef.current.has(autoProofKey)) {
      return;
    }

    autoProofKeysRef.current.add(autoProofKey);

    let cancelled = false;

    async function run() {
      setBusyAction('auto-proof');
      setProblem('');
      setCopyState('');
      setAutoProof({
        status: 'starting',
        started: false,
        segmentPublished: false,
        mode: '',
        error: null,
        key: autoProofKey,
      });

      try {
        const startResult = await startBackendSessionForCurrentStream();

        if (cancelled) {
          return;
        }

        setBackendSession(startResult.session);
        setBackendStatus(startResult.data);
        setAutoProof({
          status: 'session-live',
          started: true,
          segmentPublished: false,
          mode: '',
          error: null,
          key: autoProofKey,
        });

        const segmentResult = await publishInitialAutoSegment();

        if (cancelled) {
          return;
        }

        setBackendSession(segmentResult.session || startResult.session);
        setBackendStatus(segmentResult.data);
        setLatestSegment(segmentResult.segment);
        setCopyState(
          `Auto-published ${segmentResult.mode}${segmentResult.segment?.seq ? ` #${segmentResult.segment.seq}` : ''}.`,
        );
        setAutoProof({
          status: 'ready',
          started: true,
          segmentPublished: true,
          mode: segmentResult.mode,
          error: null,
          key: autoProofKey,
        });

        if (typeof app?.notify === 'function') {
          app.notify({
            title: 'Stream backend proof ready',
            message: `Stream-lite session ${streamInfo.streamId} is live with a first segment.`,
            tone: 'success',
          });
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = normalizeError(error, 'Unable to auto-start backend stream proof.');

        setProblem(message);
        setAutoProof({
          status: 'error',
          started: false,
          segmentPublished: false,
          mode: '',
          error: message,
          key: autoProofKey,
        });
      } finally {
        if (!cancelled) {
          setBusyAction('');
          window.setTimeout(() => setCopyState(''), 2600);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // Intentionally keyed by backend descriptor identity. Draft edits after publish should not
    // repeatedly create new backend sessions for the same stream_id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseBackend, autoProofKey]);

  async function onStartLocalRoom() {
    setBusyAction('local-start');
    setProblem('');
    setCopyState('');

    try {
      const session = await startLocalStreamSession({ draft, previewState, pricing });
      setLocalSession(session);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error || 'Unable to launch local stream room.'));
    } finally {
      setBusyAction('');
    }
  }

  async function onStopLocalRoom() {
    setBusyAction('local-stop');
    setProblem('');
    setCopyState('');

    try {
      await stopLocalStreamSession('Stopped by creator from StreamSessionPanel');
      setLocalSession(null);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error || 'Unable to stop local stream room.'));
    } finally {
      setBusyAction('');
    }
  }

  async function onStartBackendSession() {
    setBusyAction('backend-start');
    setProblem('');
    setCopyState('');

    try {
      const result = await startBackendSessionForCurrentStream();

      setBackendSession(result.session);
      setBackendStatus(result.data);
      setAutoProof((current) => ({
        ...current,
        status: current.segmentPublished ? current.status : 'session-live',
        started: true,
        error: null,
        key: autoProofKey,
      }));

      if (typeof app?.notify === 'function') {
        app.notify({
          title: 'Backend stream session started',
          message: `Stream-lite session ${streamInfo.streamId} is live.`,
          tone: 'success',
        });
      }
    } catch (error) {
      setProblem(normalizeError(error, 'Unable to start backend stream session.'));
    } finally {
      setBusyAction('');
    }
  }

  async function onRetryAutoProof() {
    autoProofKeysRef.current.delete(autoProofKey);

    if (!canUseBackend || !autoProofKey) {
      setProblem('Backend stream controls require a stream_id and crab:// stream URL.');
      return;
    }

    setBusyAction('auto-proof');
    setProblem('');
    setCopyState('');

    try {
      const startResult = await startBackendSessionForCurrentStream();
      setBackendSession(startResult.session);
      setBackendStatus(startResult.data);

      const segmentResult = await publishInitialAutoSegment();
      setBackendSession(segmentResult.session || startResult.session);
      setBackendStatus(segmentResult.data);
      setLatestSegment(segmentResult.segment);
      setCopyState(
        `Auto-published ${segmentResult.mode}${segmentResult.segment?.seq ? ` #${segmentResult.segment.seq}` : ''}.`,
      );
      setAutoProof({
        status: 'ready',
        started: true,
        segmentPublished: true,
        mode: segmentResult.mode,
        error: null,
        key: autoProofKey,
      });
      autoProofKeysRef.current.add(autoProofKey);
    } catch (error) {
      const message = normalizeError(error, 'Unable to retry backend stream proof.');
      setProblem(message);
      setAutoProof({
        status: 'error',
        started: false,
        segmentPublished: false,
        mode: '',
        error: message,
        key: autoProofKey,
      });
    } finally {
      setBusyAction('');
      window.setTimeout(() => setCopyState(''), 2600);
    }
  }

  async function onCheckBackendStatus() {
    setBusyAction('backend-status');
    setProblem('');
    setCopyState('');

    try {
      requireBackendStreamInfo(streamInfo, gatewayReady);

      const response = await getBackendStreamStatus(gateway, streamInfo.streamId);
      const data = response?.data || response || {};
      const session = normalizeBackendSession(data);

      setBackendSession(session);
      setBackendStatus(data);

      const segment = objectValue(session.latest_segment || session.latestSegment);
      if (Object.keys(segment).length) {
        setLatestSegment(segment);
      }
    } catch (error) {
      setProblem(normalizeError(error, 'Unable to read backend stream status.'));
    } finally {
      setBusyAction('');
    }
  }

  async function onPublishSnapshot() {
    setBusyAction('snapshot');
    setProblem('');
    setCopyState('');

    try {
      requireBackendStreamInfo(streamInfo, gatewayReady);

      if (!backendLive) {
        const startResult = await startBackendSessionForCurrentStream();
        setBackendSession(startResult.session);
        setBackendStatus(startResult.data);
      }

      const result = await publishCurrentPreviewSnapshotSegment();

      setBackendSession(result.session);
      setBackendStatus(result.data);
      setLatestSegment(result.segment);
      setCopyState(`Published latest segment${result.segment.seq ? ` #${result.segment.seq}` : ''}.`);
      setAutoProof((current) => ({
        ...current,
        started: true,
        segmentPublished: true,
        mode: 'snapshot',
        status: 'ready',
        error: null,
        key: autoProofKey,
      }));

      if (typeof app?.notify === 'function') {
        app.notify({
          title: 'Stream snapshot published',
          message: 'The backend accepted the current preview frame as the latest stream-lite segment.',
          tone: 'success',
        });
      }
    } catch (error) {
      setProblem(normalizeError(error, 'Unable to publish current preview snapshot.'));
    } finally {
      setBusyAction('');
      window.setTimeout(() => setCopyState(''), 2600);
    }
  }

  async function onPublishTextHeartbeat() {
    setBusyAction('text-segment');
    setProblem('');
    setCopyState('');

    try {
      requireBackendStreamInfo(streamInfo, gatewayReady);

      if (!backendLive) {
        const startResult = await startBackendSessionForCurrentStream();
        setBackendSession(startResult.session);
        setBackendStatus(startResult.data);
      }

      const result = await publishTextHeartbeatSegment('crablink_tauri_creator_heartbeat');

      setBackendSession(result.session);
      setBackendStatus(result.data);
      setLatestSegment(result.segment);
      setCopyState(`Published text heartbeat${result.segment.seq ? ` #${result.segment.seq}` : ''}.`);
      setAutoProof((current) => ({
        ...current,
        started: true,
        segmentPublished: true,
        mode: 'text heartbeat',
        status: 'ready',
        error: null,
        key: autoProofKey,
      }));
    } catch (error) {
      setProblem(normalizeError(error, 'Unable to publish text heartbeat.'));
    } finally {
      setBusyAction('');
      window.setTimeout(() => setCopyState(''), 2600);
    }
  }


  function onLiveFrameIntervalChange(event) {
    const next = normalizeIntervalMs(event.target.value, liveFrameIntervalMs);
    setLiveFrameIntervalMs(next);
    setLiveLoop((current) => ({
      ...current,
      intervalMs: next,
    }));
  }

  async function onStartLiveFrameLoop() {
    setProblem('');
    setCopyState('');

    if (!canPublishSegments) {
      setProblem(
        creatorWalletMismatch
          ? 'Active wallet differs from the stream creator wallet. Switch back to the creator wallet before publishing live frames.'
          : 'Live frame loop requires a published stream descriptor and configured gateway.',
      );
      return;
    }

    if (!previewActive) {
      setProblem('Start the local camera/screen/file preview before starting the live frame loop.');
      return;
    }

    liveLoopRunningRef.current = true;
    liveLoopInFlightRef.current = false;

    setLiveLoop({
      ...LIVE_LOOP_IDLE,
      running: true,
      status: 'starting',
      intervalMs: liveFrameIntervalMs,
      startedAt: new Date().toISOString(),
    });

    try {
      requireBackendStreamInfo(streamInfo, gatewayReady);

      if (!backendLiveRef.current) {
        const startResult = await startBackendSessionForCurrentStream();
        setBackendSession(startResult.session);
        setBackendStatus(startResult.data);
        backendLiveRef.current = cleanString(startResult.session?.status) === 'live';
      }

      setLiveLoop((current) => ({
        ...current,
        running: true,
        status: 'live',
        error: '',
      }));

      scheduleNextLiveFrame(0);
    } catch (error) {
      liveLoopRunningRef.current = false;
      liveLoopInFlightRef.current = false;
      setLiveLoop((current) => ({
        ...current,
        running: false,
        inFlight: false,
        status: 'error',
        error: normalizeError(error, 'Unable to start live frame loop.'),
        stoppedAt: new Date().toISOString(),
      }));
      setProblem(normalizeError(error, 'Unable to start live frame loop.'));
    }
  }

  function onStopLiveFrameLoop() {
    stopLiveFrameLoop('Stopped by creator');
  }

  function stopLiveFrameLoop(reason = 'Stopped', { silent = false } = {}) {
    liveLoopRunningRef.current = false;
    liveLoopInFlightRef.current = false;

    if (liveLoopTimerRef.current) {
      window.clearTimeout(liveLoopTimerRef.current);
      liveLoopTimerRef.current = 0;
    }

    if (silent) {
      return;
    }

    setLiveLoop((current) => ({
      ...current,
      running: false,
      inFlight: false,
      status: current.status === 'idle' ? 'idle' : 'stopped',
      stoppedAt: new Date().toISOString(),
      error: '',
      stopReason: reason,
    }));
  }

  function scheduleNextLiveFrame(delayMs = liveFrameIntervalMs) {
    if (!liveLoopRunningRef.current) {
      return;
    }

    if (liveLoopTimerRef.current) {
      window.clearTimeout(liveLoopTimerRef.current);
    }

    const safeDelay = Math.max(500, Number(delayMs || liveFrameIntervalMs || 2000));
    liveLoopTimerRef.current = window.setTimeout(() => {
      void publishLiveFrameTick();
    }, safeDelay);
  }

  async function publishLiveFrameTick() {
    if (!liveLoopRunningRef.current) {
      return;
    }

    if (liveLoopInFlightRef.current) {
      setLiveLoop((current) => ({
        ...current,
        droppedFrames: current.droppedFrames + 1,
        status: 'backpressure',
      }));
      scheduleNextLiveFrame(liveFrameIntervalMs);
      return;
    }

    if (!previewActive) {
      stopLiveFrameLoop('Preview stopped');
      setProblem('Live frame loop stopped because the local preview is no longer active.');
      return;
    }

    if (!canPublishSegments) {
      stopLiveFrameLoop('Backend controls unavailable');
      setProblem('Live frame loop stopped because backend stream controls are unavailable.');
      return;
    }

    liveLoopInFlightRef.current = true;
    let hadPublishError = false;
    const started = performance.now();

    setLiveLoop((current) => ({
      ...current,
      running: true,
      inFlight: true,
      status: 'publishing',
      error: '',
    }));

    try {
      if (!backendLiveRef.current) {
        const startResult = await startBackendSessionForCurrentStream();
        setBackendSession(startResult.session);
        setBackendStatus(startResult.data);
        backendLiveRef.current = cleanString(startResult.session?.status) === 'live';
      }

      const result = await publishCurrentPreviewSnapshotSegment('crablink_tauri_creator_frame_loop');
      const latencyMs = Math.round(performance.now() - started);
      const seq = cleanString(result.segment?.seq || result.data?.seq || result.session?.latest_seq || result.session?.latestSeq);

      setBackendSession(result.session);
      setBackendStatus(result.data);
      setLatestSegment(result.segment);
      setAutoProof((current) => ({
        ...current,
        started: true,
        segmentPublished: true,
        mode: 'live frame loop',
        status: 'ready',
        error: null,
        key: autoProofKey,
      }));
      setLiveLoop((current) => ({
        ...current,
        running: true,
        inFlight: false,
        status: 'live',
        publishedFrames: current.publishedFrames + 1,
        lastSeq: seq || current.lastSeq,
        lastLatencyMs: latencyMs,
        lastPublishedAt: new Date().toISOString(),
        error: '',
      }));
    } catch (error) {
      hadPublishError = true;
      const message = normalizeError(error, 'Unable to publish live stream frame.');
      setLiveLoop((current) => ({
        ...current,
        running: true,
        inFlight: false,
        status: 'error',
        error: message,
      }));
      setProblem(message);
    } finally {
      liveLoopInFlightRef.current = false;

      if (liveLoopRunningRef.current) {
        const backoff = hadPublishError ? Math.min(5000, liveFrameIntervalMs * 2) : liveFrameIntervalMs;
        scheduleNextLiveFrame(backoff);
      }
    }
  }

  async function onStopBackendSession() {
    stopLiveFrameLoop('Backend stream stopped');
    setBusyAction('backend-stop');
    setProblem('');
    setCopyState('');

    try {
      requireBackendStreamInfo(streamInfo, gatewayReady);

      const response = await stopBackendStreamSession(
        gateway,
        streamInfo.streamId,
        'Stopped by creator from CrabLink StreamSessionPanel',
      );
      const data = response?.data || response || {};
      const session = normalizeBackendSession(data);

      setBackendSession(session);
      setBackendStatus(data);
      setAutoProof((current) => ({
        ...current,
        status: 'stopped',
        error: null,
      }));
    } catch (error) {
      setProblem(normalizeError(error, 'Unable to stop backend stream session.'));
    } finally {
      setBusyAction('');
    }
  }

  async function copyBackendLaunchPreview() {
    const creatorAccount = creatorAccountForStream(streamInfo, draft, app, gateway);
    const creatorPassport = creatorPassportForStream(streamInfo, app, gateway);

    const value = canUseBackend
      ? {
          schema: 'crablink.backend-stream-start-request-preview.v1',
          route: `/streams/${streamInfo.streamId}/start`,
          headers: {
            'x-ron-wallet-account': creatorAccount,
            'x-ron-passport': creatorPassport,
          },
          body: {
            stream_id: streamInfo.streamId,
            asset_crab_url: streamInfo.streamUrl,
            asset_cid: streamInfo.streamCid,
            manifest_cid: streamInfo.manifestCid,
            title: streamInfo.title || draft.title,
            creator_account: creatorAccount,
            creator_passport: creatorPassport,
          },
          truth_boundary:
            'Preview only. The real backend stream session must be started through GatewayClient and Omnigate stream-lite routes.',
        }
      : launchPreview;

    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopyState(canUseBackend ? 'Copied backend start request' : 'Copied backend launch request preview');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this WebView');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  async function startBackendSessionForCurrentStream() {
    requireBackendStreamInfo(streamInfo, gatewayReady);

    const creatorAccount = creatorAccountForStream(streamInfo, draft, app, gateway);
    const creatorPassport = creatorPassportForStream(streamInfo, app, gateway);

    const response = await startBackendStreamSession(gateway, {
      streamId: streamInfo.streamId,
      assetCrabUrl: streamInfo.streamUrl,
      assetCid: streamInfo.streamCid,
      manifestCid: streamInfo.manifestCid,
      title: streamInfo.title || draft.title,
      creatorAccount,
      creatorPassport,
    });

    const data = response?.data || response || {};
    const session = normalizeBackendSession(data);

    return {
      response,
      data,
      session,
    };
  }

  async function publishInitialAutoSegment() {
    if (previewActive) {
      try {
        const result = await publishCurrentPreviewSnapshotSegment('crablink_tauri_auto_initial_snapshot');
        return {
          ...result,
          mode: 'initial snapshot',
        };
      } catch (_snapshotError) {
        // Fall through to text heartbeat. The first proof should still create a backend latest segment
        // even when the local video element is not ready for canvas capture yet.
      }
    }

    const heartbeat = await publishTextHeartbeatSegment('crablink_tauri_auto_initial_heartbeat');

    return {
      ...heartbeat,
      mode: 'initial text heartbeat',
    };
  }

  async function publishCurrentPreviewSnapshotSegment(source = 'crablink_tauri_creator_snapshot') {
    const frame = captureCurrentStreamPreviewFrame({
      selector: '.cl-stream-stage-video',
      maxWidth: 640,
      quality: 0.72,
    });

    return publishCreatorSegment({
      mediaType: frame.mediaType,
      dataUrl: frame.dataUrl,
      source,
    });
  }

  async function publishTextHeartbeatSegment(source = 'crablink_tauri_creator_heartbeat') {
    return publishCreatorSegment({
      mediaType: 'text/plain',
      text: `stream-lite heartbeat from ${draft.title || 'CrabLink creator'} at ${new Date().toISOString()}`,
      source,
    });
  }

  async function publishCreatorSegment({ mediaType, dataUrl = '', text = '', source }) {
    requireBackendStreamInfo(streamInfo, gatewayReady);

    const creatorAccount = creatorAccountForStream(streamInfo, draft, app, gateway);
    const creatorPassport = creatorPassportForStream(streamInfo, app, gateway);

    if (!creatorAccount) {
      throw new Error('Stream segment publish requires the creator wallet account.');
    }

    const response = await gateway.request(`/streams/${encodeURIComponent(streamInfo.streamId)}/segments`, {
      method: 'POST',
      label: 'Publish stream-lite latest segment',
      mutation: true,
      headers: dropEmpty({
        'x-ron-wallet-account': creatorAccount,
        'x-ron-passport': creatorPassport,
      }),
      body: dropEmpty({
        asset_crab_url: streamInfo.streamUrl,
        media_type: mediaType || 'image/jpeg',
        data_url: dataUrl,
        text,
        source: source || 'crablink_tauri_creator_snapshot',
      }),
    });

    const data = response?.data || response || {};
    const session = normalizeBackendSession(data);
    const segment = objectValue(data.segment || data.latest_segment || data.latestSegment || session.latest_segment || session.latestSegment);

    return {
      response,
      data,
      session,
      segment,
    };
  }

  const localActive = Boolean(localSession);
  const busy = Boolean(busyAction);
  const autoProofLabel = autoProofStatusLabel(autoProof);
  const latestMediaType = cleanString(latestSegment?.media_type || latestSegment?.mediaType);
  const latestDataUrl = cleanString(latestSegment?.data_url || latestSegment?.dataUrl);
  const latestText = cleanString(latestSegment?.text);
  const liveLoopLabel = liveLoopStatusLabel(liveLoop);
  const liveLoopActive = Boolean(liveLoop.running);

  return (
    <section className="cl-stream-panel cl-stream-session-panel" aria-label="Stream session status">
      <p className="cl-eyebrow">Session control</p>
      <h2>
        {backendLive
          ? 'Backend stream-lite session live'
          : localActive
            ? 'Local room launched'
            : canUseBackend
              ? 'Backend stream proof ready to start'
              : 'Ready to launch local room'}
      </h2>
      <p>
        After descriptor publish, CrabLink now auto-starts the backend stream-lite session and sends
        one first bounded segment. Manual snapshot/heartbeat controls stay available for debugging
        and for refreshing the latest segment.
      </p>

      <div className="cl-stream-session-status">
        <Status
          label="Local preview"
          value={previewActive ? previewState.label : 'Off'}
          tone={previewActive ? 'good' : 'idle'}
        />
        <Status
          label="Local room"
          value={localActive ? 'Active' : 'Not launched'}
          tone={localActive ? 'good' : 'idle'}
        />
        <Status
          label="Backend session"
          value={backendLive ? 'Live' : streamInfo.streamId ? 'Descriptor ready' : 'Needs stream_id'}
          tone={backendLive ? 'good' : streamInfo.streamId ? 'warn' : 'idle'}
        />
        <Status
          label="Auto proof"
          value={autoProofLabel}
          tone={autoProof.status === 'ready' ? 'good' : autoProof.status === 'error' ? 'bad' : autoProof.status === 'idle' ? 'idle' : 'warn'}
        />
        <Status
          label="Latest segment"
          value={latestSegment?.seq ? `#${latestSegment.seq}` : 'Not published'}
          tone={latestSegment?.seq ? 'good' : 'idle'}
        />
        <Status
          label="Live frame loop"
          value={liveLoopLabel}
          tone={liveLoop.running ? 'good' : liveLoop.status === 'error' ? 'bad' : liveLoop.status === 'backpressure' ? 'warn' : 'idle'}
        />
      </div>

      <div className="cl-stream-session-card">
        <span>Draft access policy</span>
        <strong>{pricing.summary}</strong>
        <small>
          {labelFromSnake(draft.accessMode)} · manual renewal · recipient:{' '}
          {draft.creatorWalletAccount.trim() || streamInfo.creatorAccount || 'not set'}
        </small>
      </div>

      {localSession ? (
        <div className="cl-stream-session-result" aria-label="Local stream room result">
          <span>Local session id</span>
          <strong>{localSession.sessionId}</strong>
          <small>{localSession.status}</small>
        </div>
      ) : null}

      {streamInfo.streamId || streamInfo.streamUrl ? (
        <div className="cl-stream-session-result" aria-label="Backend stream descriptor result">
          <span>Published descriptor</span>
          <strong>{streamInfo.streamId || 'stream_id not returned'}</strong>
          <small>{streamInfo.streamUrl || 'crab:// stream URL not returned'}</small>
        </div>
      ) : (
        <div className="cl-stream-truth-box">
          <strong>Publish descriptor first</strong>
          <p>
            Backend stream controls stay disabled until the descriptor publish response returns a
            real stream ID and crab://&lt;hash&gt;.stream URL.
          </p>
        </div>
      )}

      {creatorWalletMismatch ? (
        <div className="cl-stream-truth-box is-warning" role="alert">
          <strong>Creator wallet mismatch</strong>
          <p>
            This stream was minted for <code>{streamInfo.creatorAccount}</code>, but the active
            wallet appears to be <code>{activeWalletAccount}</code>. Switch back before publishing
            live frames so Visitor B cannot accidentally become the segment producer.
          </p>
        </div>
      ) : null}

      {creatorWalletMismatch ? (
        <div className="cl-stream-truth-box is-warning" role="status">
          <strong>Creator account locked</strong>
          <p>
            Active wallet appears to be <code>{activeWalletAccount}</code>, but this stream publishes
            segments as the descriptor creator <code>{lockedCreatorAccount}</code>. The creator loop still publishes with the descriptor creator account; Visitor B only pays/views.
          </p>
        </div>
      ) : null}

      {autoProof.status !== 'idle' ? (
        <div className="cl-stream-truth-box">
          <strong>Automatic backend proof</strong>
          <p>
            {autoProof.status === 'ready'
              ? `Backend session is live and the first ${autoProof.mode || 'segment'} was published. Visitor B can now pay and load the latest paid segment.`
              : autoProof.status === 'error'
                ? `Automatic proof failed: ${autoProof.error || 'unknown error'}`
                : 'CrabLink is starting the backend stream session and publishing the first bounded segment.'}
          </p>
          {autoProof.status === 'error' ? (
            <button type="button" onClick={onRetryAutoProof} disabled={busy || !canPublishSegments}>
              Retry automatic proof
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="cl-stream-session-actions">
        <button
          type="button"
          className="cl-stream-primary"
          onClick={onStartLocalRoom}
          disabled={busy || localActive}
        >
          {busyAction === 'local-start' ? 'Launching…' : 'Launch local stream room'}
        </button>
        <button type="button" onClick={onStopLocalRoom} disabled={busy || !localActive}>
          {busyAction === 'local-stop' ? 'Stopping…' : 'Stop local stream room'}
        </button>
        <button type="button" onClick={copyBackendLaunchPreview}>
          Copy backend launch request
        </button>
      </div>

      <div className="cl-stream-session-actions">
        <button type="button" onClick={onStartBackendSession} disabled={busy || !canPublishSegments || backendLive}>
          {busyAction === 'backend-start' ? 'Starting…' : 'Start backend stream session'}
        </button>
        <button type="button" onClick={onCheckBackendStatus} disabled={busy || !canPublishSegments}>
          {busyAction === 'backend-status' ? 'Checking…' : 'Check backend status'}
        </button>
        <button type="button" onClick={onRetryAutoProof} disabled={busy || !canPublishSegments}>
          {busyAction === 'auto-proof' ? 'Auto proofing…' : 'Auto start + first segment'}
        </button>
      </div>

      <div className="cl-stream-session-actions">
        <button type="button" onClick={onPublishSnapshot} disabled={busy || !canPublishSegments || !previewActive}>
          {busyAction === 'snapshot' ? 'Publishing…' : backendLive ? 'Publish current preview snapshot' : 'Start + publish preview snapshot'}
        </button>
        <button type="button" onClick={onPublishTextHeartbeat} disabled={busy || !canPublishSegments}>
          {busyAction === 'text-segment' ? 'Publishing…' : backendLive ? 'Publish text heartbeat' : 'Start + publish text heartbeat'}
        </button>
        <button type="button" onClick={onStopBackendSession} disabled={busy || !canPublishSegments || !backendLive}>
          {busyAction === 'backend-stop' ? 'Stopping…' : 'Stop backend stream'}
        </button>
      </div>


      <div className="cl-stream-live-loop-card" aria-label="Live frame publish loop controls">
        <div>
          <span>Live frame loop</span>
          <strong>{liveLoopActive ? 'Publishing backend snapshots' : 'Manual start required'}</strong>
          <small>
            Captures the local preview every {Math.round(liveFrameIntervalMs / 1000)}s and posts one
            bounded image/jpeg segment to the backend. It does not create receipts, balances, viewer
            counts, stream keys, or any paid unlock state.
          </small>
        </div>

        <label className="cl-stream-live-loop-select">
          <span>Frame interval</span>
          <select value={liveFrameIntervalMs} onChange={onLiveFrameIntervalChange} disabled={liveLoopActive}>
            {LIVE_FRAME_INTERVAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="cl-stream-session-actions">
          <button
            type="button"
            className="cl-stream-primary"
            onClick={onStartLiveFrameLoop}
            disabled={liveLoopActive || busy || !canPublishSegments || !previewActive}
          >
            {liveLoop.status === 'starting' ? 'Starting loop…' : 'Start live frame loop'}
          </button>
          <button type="button" onClick={onStopLiveFrameLoop} disabled={!liveLoopActive}>
            Stop live frame loop
          </button>
        </div>

        <div className="cl-stream-live-loop-stats">
          <Status label="Loop" value={liveLoopLabel} tone={liveLoop.running ? 'good' : liveLoop.status === 'error' ? 'bad' : 'idle'} />
          <Status label="Published" value={String(liveLoop.publishedFrames || 0)} tone={liveLoop.publishedFrames ? 'good' : 'idle'} />
          <Status label="Dropped" value={String(liveLoop.droppedFrames || 0)} tone={liveLoop.droppedFrames ? 'warn' : 'idle'} />
          <Status label="Last seq" value={liveLoop.lastSeq || 'n/a'} tone={liveLoop.lastSeq ? 'good' : 'idle'} />
          <Status label="Latency" value={liveLoop.lastLatencyMs ? `${liveLoop.lastLatencyMs} ms` : 'n/a'} tone={liveLoop.lastLatencyMs ? 'good' : 'idle'} />
        </div>

        {liveLoop.error ? <p className="cl-stream-error" role="alert">{liveLoop.error}</p> : null}
      </div>

      {problem ? <p className="cl-stream-error" role="alert">{problem}</p> : null}
      {copyState ? <p className="cl-stream-info" role="status">{copyState}</p> : null}

      {latestDataUrl || latestText ? (
        <div className="cl-stream-session-segment" aria-label="Latest stream-lite segment">
          <span>Latest backend segment</span>
          {latestDataUrl && latestMediaType.startsWith('image/') ? (
            <img src={latestDataUrl} alt="Latest stream-lite snapshot accepted by backend" />
          ) : null}
          {latestText ? <p>{latestText}</p> : null}
          <small>
            seq {latestSegment.seq || 'n/a'} · {latestMediaType || 'unknown media'} ·{' '}
            {latestSegment.source || 'unknown source'} · producer{' '}
            {latestSegment.producer_account || latestSegment.producerAccount || 'not returned'}
          </small>
        </div>
      ) : null}

      <div className="cl-stream-truth-box">
        <strong>Proof target for this batch</strong>
        <p>
          Creator flow is now: mint descriptor, auto-start backend session, auto-publish one bounded
          segment, then optionally start the explicit live frame loop. Visitor B can pay once
          for the current proof and poll the backend latest segment without any automatic re-spend.
        </p>
      </div>
    </section>
  );
}

function Status({ label, value, tone }) {
  return (
    <div className={`cl-stream-session-status-item is-${tone || 'idle'}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function requireBackendStreamInfo(streamInfo, gatewayReady) {
  if (!gatewayReady) {
    throw new Error('Gateway client is not ready.');
  }

  if (!streamInfo.streamId) {
    throw new Error('Backend stream controls require a stream_id from the descriptor publish response.');
  }

  if (!streamInfo.streamUrl) {
    throw new Error('Backend stream controls require a crab://<hash>.stream URL from the descriptor publish response.');
  }
}

function normalizeBackendSession(response) {
  const root = objectValue(response?.data || response);
  return objectValue(root.session || root.stream_session || root.streamSession || root);
}

function normalizePublishedStream(value) {
  const root = objectValue(value);
  const raw = objectValue(root.raw);
  const descriptor = objectValue(raw.descriptor || root.descriptor);
  const manifest = objectValue(raw.manifest || root.manifest);
  const owner = objectValue(raw.owner || root.owner);
  const creator = objectValue(descriptor.creator || raw.creator || root.creator);
  const payout = objectValue(raw.payout || root.payout);

  return {
    streamId: cleanString(
      root.streamId ||
        root.stream_id ||
        raw.stream_id ||
        raw.streamId ||
        descriptor.stream_id ||
        descriptor.streamId ||
        manifest.stream_id ||
        manifest.streamId,
    ),
    streamUrl: cleanString(
      root.streamUrl ||
        root.stream_url ||
        raw.crab_url ||
        raw.crabUrl ||
        raw.stream_url ||
        raw.streamUrl ||
        raw.asset_url ||
        raw.assetUrl ||
        descriptor.crab_url ||
        descriptor.crabUrl,
    ),
    streamCid: cleanCid(root.streamCid || root.stream_cid || raw.asset_cid || raw.assetCid || raw.cid),
    manifestCid: cleanCid(
      root.manifestCid ||
        root.manifest_cid ||
        manifest.manifest_cid ||
        manifest.manifestCid ||
        raw.manifest_cid ||
        raw.manifestCid,
    ),
    title: cleanString(root.title || raw.title || descriptor.metadata?.title || descriptor.title),
    creatorAccount: cleanString(
      root.creatorAccount ||
        root.creator_account ||
        creator.wallet_account ||
        creator.walletAccount ||
        owner.wallet_account ||
        owner.walletAccount ||
        payout.recipient_account ||
        payout.recipientAccount,
    ),
    creatorPassport: cleanString(
      root.creatorPassport ||
        root.creator_passport ||
        creator.passport_subject ||
        creator.passportSubject ||
        owner.passport_subject ||
        owner.passportSubject,
    ),
    raw: value || null,
  };
}

function creatorAccountForStream(streamInfo, draft, app, gateway) {
  return cleanString(
    streamInfo.creatorAccount ||
      draft?.creatorWalletAccount ||
      app?.settings?.streamCreatorWalletAccount ||
      app?.settings?.creatorWalletAccount ||
      gateway?.walletAccount ||
      app?.settings?.walletAccount,
  );
}

function creatorPassportForStream(streamInfo, app, gateway) {
  return cleanString(
    streamInfo.creatorPassport ||
      app?.settings?.streamCreatorPassportSubject ||
      app?.settings?.creatorPassportSubject ||
      gateway?.passportSubject ||
      app?.settings?.passportSubject,
  );
}

function normalizeIntervalMs(value, fallback = 2000) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (LIVE_FRAME_INTERVAL_OPTIONS.some((option) => option.value === parsed)) {
    return parsed;
  }

  return LIVE_FRAME_INTERVAL_OPTIONS.some((option) => option.value === fallback) ? fallback : 2000;
}

function activeWalletForApp(app, gateway) {
  return cleanString(gateway?.walletAccount || app?.settings?.walletAccount);
}

function liveLoopStatusLabel(loop) {
  switch (loop.status) {
    case 'starting':
      return 'Starting';
    case 'publishing':
      return 'Publishing';
    case 'live':
      return 'Live';
    case 'backpressure':
      return 'Dropping slow frame';
    case 'error':
      return 'Error';
    case 'stopped':
      return 'Stopped';
    default:
      return 'Off';
  }
}

function autoProofStatusLabel(autoProof) {
  switch (autoProof.status) {
    case 'starting':
      return 'Starting session';
    case 'session-live':
      return 'Session live';
    case 'ready':
      return autoProof.mode ? `Ready · ${autoProof.mode}` : 'Ready';
    case 'error':
      return 'Failed';
    case 'stopped':
      return 'Stopped';
    default:
      return 'Waiting for descriptor';
  }
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

function dropEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      if (Array.isArray(child) && child.length === 0) return false;
      return true;
    }),
  );
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function cleanString(value) {
  return String(value ?? '').trim();
}