/**
 * RO:WHAT — Local Podcast Studio for file upload, mic capture, recording, and bounded voice processing.
 * RO:WHY — Makes crab://podcast feel like a real creator tool while proving the mixer knobs affect the recorded audio path.
 * RO:INTERACTS — PodcastPage.jsx, podcast.css, browser MediaDevices, MediaRecorder, Web Audio API.
 * RO:INVARIANTS — local capture only; processed mic stream feeds recorder; no fake b3 CID; no fake receipt; no wallet mutation.
 * RO:METRICS — local-only raw/input/processed RMS and peak meter; no backend telemetry.
 * RO:CONFIG — local preamp/gain/gate/leveler/monitor controls only.
 * RO:SECURITY — no local filesystem path is exposed; object URLs are revoked; mic starts only by explicit user action.
 * RO:TEST — npm run build; manual crab://podcast start mic → move knobs → record → stop → preview → paid mint smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const MAX_LOCAL_AUDIO_BYTES = 300 * 1024 * 1024;

const DEFAULT_CONTROLS = Object.freeze({
  preampDb: 6,
  inputGain: 100,
  noiseGateEnabled: true,
  noiseGateThresholdDb: -46,
  noiseGateReduction: 82,
  voiceLevelerEnabled: true,
  monitorEnabled: false,
  monitorVolume: 0,
});

const DEFAULT_METER = Object.freeze({
  rawRms: 0,
  rawPeak: 0,
  inputRms: 0,
  inputPeak: 0,
  processedRms: 0,
  processedPeak: 0,
  gateOpen: false,
  gateEnvelope: 1,
  gateRms: 0,
  clipping: false,
});

const ACCEPTED_AUDIO_TYPES = Object.freeze([
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/webm',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-wav',
]);

export default function PodcastStudio({
  draft,
  onAudioFileChange,
  onStudioStateChange,
  onDraftPatch,
}) {
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const graphRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const recordingMimeRef = useRef('');
  const animationRef = useRef(0);
  const gateParamsRef = useRef({
    enabled: DEFAULT_CONTROLS.noiseGateEnabled,
    thresholdDb: DEFAULT_CONTROLS.noiseGateThresholdDb,
    reduction: DEFAULT_CONTROLS.noiseGateReduction,
  });
  const gateDiagnosticsRef = useRef({
    rms: 0,
    open: false,
    envelope: 1,
    targetGain: 1,
  });
  const activeFileRef = useRef(null);
  const activeObjectUrlRef = useRef('');

  const [controls, setControls] = useState({ ...DEFAULT_CONTROLS });
  const [micState, setMicState] = useState('idle');
  const [recordingState, setRecordingState] = useState('idle');
  const [problem, setProblem] = useState('');
  const [playbackProblem, setPlaybackProblem] = useState('');
  const [activeObjectUrl, setActiveObjectUrl] = useState('');
  const [activeAudioMeta, setActiveAudioMeta] = useState(null);
  const [meter, setMeter] = useState({ ...DEFAULT_METER });

  const onAir = recordingState === 'recording';
  const micReady = micState === 'ready';

  const recorderMimeDisplay =
    recordingMimeRef.current ||
    activeAudioMeta?.recorderMimeType ||
    activeAudioMeta?.type ||
    'not recording';

  const inputPercent = levelToPercent(meter.inputRms);
  const processedPercent = levelToPercent(meter.processedRms);
  const peakPercent = Math.min(100, Math.round(meter.processedPeak * 100));

  const studioSnapshot = useMemo(
    () => ({
      micState,
      recordingState,
      onAir,
      activeAudioMeta,
      meter,
      controls,
      diagnostics: {
        inputDb: formatDbFromLinear(meter.inputRms),
        processedDb: formatDbFromLinear(meter.processedRms),
        peakPercent,
        gateState: controls.noiseGateEnabled ? (meter.gateOpen ? 'open' : 'closed') : 'bypassed',
        recorderMimeType: recorderMimeDisplay,
        clipping: Boolean(meter.clipping),
      },
      localOnly: true,
      backendStreamConfirmed: false,
      backendPublicationConfirmed: false,
    }),
    [micState, recordingState, onAir, activeAudioMeta, meter, controls, peakPercent, recorderMimeDisplay],
  );

  const waveformBars = useMemo(() => {
    const base = Math.max(0.03, meter.processedRms || meter.inputRms || 0);
    const peak = Math.max(base, meter.processedPeak || 0);
    const gateFactor = controls.noiseGateEnabled && !meter.gateOpen ? 0.42 : 1;
    const liveBoost = onAir ? 1.18 : activeAudioMeta ? 0.72 : 0.36;

    return Array.from({ length: 42 }, (_, index) => {
      const phase = Math.sin(index * 0.92 + peak * 9);
      const ripple = (phase + 1) / 2;
      const alternating = index % 5 === 0 ? 1.18 : index % 3 === 0 ? 0.82 : 1;
      const height = clamp(10 + (base * 210 + ripple * 44) * gateFactor * liveBoost * alternating, 8, 92);

      return Math.round(height);
    });
  }, [activeAudioMeta, controls.noiseGateEnabled, meter.gateOpen, meter.inputRms, meter.processedPeak, meter.processedRms, onAir]);

  useEffect(() => {
    if (typeof onStudioStateChange === 'function') {
      onStudioStateChange(studioSnapshot);
    }
  }, [onStudioStateChange, studioSnapshot]);

  useEffect(() => {
    gateParamsRef.current = {
      enabled: controls.noiseGateEnabled,
      thresholdDb: controls.noiseGateThresholdDb,
      reduction: controls.noiseGateReduction,
    };

    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    graph.preampGain.gain.value = dbToLinear(controls.preampDb);
    graph.inputGain.gain.value = Math.max(0, Number(controls.inputGain || 0)) / 100;
    graph.monitorGain.gain.value = controls.monitorEnabled
      ? Math.max(0, Number(controls.monitorVolume || 0)) / 100
      : 0;

    if (controls.voiceLevelerEnabled) {
      graph.compressor.threshold.value = -24;
      graph.compressor.knee.value = 24;
      graph.compressor.ratio.value = 4.5;
      graph.compressor.attack.value = 0.004;
      graph.compressor.release.value = 0.23;
    } else {
      graph.compressor.threshold.value = 0;
      graph.compressor.knee.value = 0;
      graph.compressor.ratio.value = 1;
      graph.compressor.attack.value = 0.003;
      graph.compressor.release.value = 0.25;
    }
  }, [controls]);

  useEffect(() => {
    return () => {
      stopMeter();
      stopMicGraph();
      clearObjectUrl();
    };
  }, []);

  async function startMic() {
    setProblem('');
    setPlaybackProblem('');

    if (graphRef.current && streamRef.current) {
      return graphRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setProblem('Microphone capture is unavailable in this WebView.');
      setMicState('blocked');
      return null;
    }

    setMicState('starting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextCtor) {
        stopMediaStream(stream);
        setProblem('Web Audio is unavailable in this WebView.');
        setMicState('blocked');
        return null;
      }

      const context = new AudioContextCtor();
      await context.resume();

      const source = context.createMediaStreamSource(stream);
      const rawAnalyser = context.createAnalyser();
      const preampGain = context.createGain();
      const inputGain = context.createGain();
      const preGateAnalyser = context.createAnalyser();
      const noiseGate = createNoiseGateProcessor(context, gateParamsRef, gateDiagnosticsRef);
      const compressor = context.createDynamicsCompressor();
      const outputGain = context.createGain();
      const processedAnalyser = context.createAnalyser();
      const monitorGain = context.createGain();
      const recorderDestination = context.createMediaStreamDestination();

      [rawAnalyser, preGateAnalyser, processedAnalyser].forEach((analyser) => {
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.72;
      });

      preampGain.gain.value = dbToLinear(controls.preampDb);
      inputGain.gain.value = Math.max(0, Number(controls.inputGain || 0)) / 100;
      outputGain.gain.value = 1;
      monitorGain.gain.value = controls.monitorEnabled
        ? Math.max(0, Number(controls.monitorVolume || 0)) / 100
        : 0;

      if (controls.voiceLevelerEnabled) {
        compressor.threshold.value = -24;
        compressor.knee.value = 24;
        compressor.ratio.value = 4.5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.23;
      } else {
        compressor.threshold.value = 0;
        compressor.knee.value = 0;
        compressor.ratio.value = 1;
      }

      source.connect(rawAnalyser);
      source.connect(preampGain);
      preampGain.connect(inputGain);
      inputGain.connect(preGateAnalyser);
      preGateAnalyser.connect(noiseGate);
      noiseGate.connect(compressor);
      compressor.connect(outputGain);
      outputGain.connect(recorderDestination);
      outputGain.connect(processedAnalyser);
      outputGain.connect(monitorGain);
      monitorGain.connect(context.destination);

      const graph = {
        context,
        source,
        rawAnalyser,
        preampGain,
        inputGain,
        preGateAnalyser,
        noiseGate,
        compressor,
        outputGain,
        processedAnalyser,
        monitorGain,
        recorderDestination,
      };

      streamRef.current = stream;
      audioContextRef.current = context;
      graphRef.current = graph;

      setMicState('ready');
      startMeter(graph);

      return graph;
    } catch (error) {
      setProblem(`Microphone permission or setup failed: ${safeErrorMessage(error)}`);
      setMicState('blocked');
      return null;
    }
  }

  function stopMic() {
    if (recordingState === 'recording') {
      stopRecording();
    }

    stopMicGraph();
    setMicState('idle');
    setMeter({ ...DEFAULT_METER });
  }

  async function startRecording() {
    setProblem('');
    setPlaybackProblem('');

    let graph = graphRef.current;

    if (!graph) {
      graph = await startMic();
    }

    if (!graph?.recorderDestination?.stream) {
      setProblem('Microphone graph is not ready yet.');
      return;
    }

    if (!window.MediaRecorder) {
      setProblem('MediaRecorder is unavailable in this WebView.');
      return;
    }

    recordingChunksRef.current = [];
    recordingStartedAtRef.current = Date.now();

    const mimeChoice = chooseRecorderMimeType();
    const mimeType = mimeChoice.mimeType;

    try {
      const recorder = new MediaRecorder(
        graph.recorderDestination.stream,
        mimeType ? { mimeType } : undefined,
      );

      recordingMimeRef.current = recorder.mimeType || mimeType || '';

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        setProblem(`Recording failed: ${safeErrorMessage(event?.error || event)}`);
        setRecordingState('error');
      };

      recorder.onstop = () => {
        finishRecording(
          recorder.mimeType ||
            recordingMimeRef.current ||
            mimeType ||
            'application/octet-stream',
          mimeChoice,
        );
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setRecordingState('recording');

      patchDraft({
        sourceMode: 'live_stream_capture_future',
      });
    } catch (error) {
      recordingMimeRef.current = '';
      setProblem(`Recording could not start: ${safeErrorMessage(error)}`);
      setRecordingState('error');
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state === 'inactive') {
      setRecordingState('idle');
      return;
    }

    setRecordingState('stopping');

    try {
      recorder.requestData?.();
    } catch (_error) {
      // Some engines do not allow requestData near stop. Stop still flushes.
    }

    recorder.stop();
  }

  function finishRecording(mimeType, mimeChoice = null) {
    const chunks = recordingChunksRef.current;
    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - Number(recordingStartedAtRef.current || Date.now())) / 1000),
    );

    recordingChunksRef.current = [];
    mediaRecorderRef.current = null;

    if (!chunks.length) {
      recordingMimeRef.current = '';
      setProblem('Recording stopped without audio data.');
      setRecordingState('idle');
      return;
    }

    const safeMimeType = normalizeRecordedMimeType(mimeType);
    const blob = new Blob(chunks, { type: safeMimeType });
    const extension = mimeTypeToExtension(blob.type || safeMimeType);
    const fileName = `crablink-podcast-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
    const file = new File([blob], fileName, {
      type: blob.type || safeMimeType,
      lastModified: Date.now(),
    });

    recordingMimeRef.current = '';
    setRecordingState('recorded');
    setActiveAudioFile(file, {
      source: 'recording',
      durationSeconds,
      durationLabel: formatDurationLabel(durationSeconds),
      recordedAt: new Date().toISOString(),
      recorderMimeType: safeMimeType,
      recorderPlaybackHint: mimeChoice?.playbackHint || playbackHintForMime(safeMimeType),
    });

    patchDraft({
      sourceMode: 'post_stream_publish_future',
      duration: formatDurationLabel(durationSeconds),
    });
  }

  function chooseLocalFile(event) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      return;
    }

    const validation = validateAudioFile(file);

    if (!validation.ok) {
      setProblem(validation.message);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    setProblem('');
    setPlaybackProblem('');
    setRecordingState('file_selected');
    setActiveAudioFile(file, {
      source: 'file',
      durationSeconds: 0,
      durationLabel: '',
      recordedAt: '',
      recorderMimeType: '',
      recorderPlaybackHint: playbackHintForMime(file.type || inferAudioType(file.name)),
    });
  }

  function setActiveAudioFile(file, extra = {}) {
    clearObjectUrl();

    if (!file) {
      activeFileRef.current = null;
      setActiveAudioMeta(null);
      notifyAudioFile(null, null);
      return;
    }

    activeFileRef.current = file;

    const objectUrl = URL.createObjectURL(file);
    activeObjectUrlRef.current = objectUrl;
    setActiveObjectUrl(objectUrl);
    setPlaybackProblem('');

    const meta = {
      name: file.name || 'podcast audio',
      type: file.type || inferAudioType(file.name),
      size: file.size || 0,
      sizeLabel: formatBytes(file.size || 0),
      durationSeconds: extra.durationSeconds || 0,
      durationLabel: extra.durationLabel || '',
      source: extra.source || 'file',
      recordedAt: extra.recordedAt || '',
      recorderMimeType: extra.recorderMimeType || '',
      recorderPlaybackHint: extra.recorderPlaybackHint || playbackHintForMime(file.type || inferAudioType(file.name)),
      localOnly: true,
      backendUploaded: false,
    };

    setActiveAudioMeta(meta);
    notifyAudioFile(file, meta);

    window.setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.load();
      }
    }, 0);
  }

  function onLoadedMetadata(event) {
    const audio = event.currentTarget;
    const duration = Number(audio.duration);
    const durationSeconds = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;

    if (!durationSeconds) {
      return;
    }

    const nextMeta = {
      ...(activeAudioMeta || {}),
      durationSeconds,
      durationLabel: formatDurationLabel(durationSeconds),
    };

    setActiveAudioMeta(nextMeta);
    notifyAudioFile(activeFileRef.current, nextMeta);

    if (!draft?.duration || String(draft.duration).trim() === '48:00') {
      patchDraft({
        duration: nextMeta.durationLabel,
      });
    }
  }

  function onAudioCanPlay() {
    setPlaybackProblem('');
  }

  function onAudioError(event) {
    const file = activeFileRef.current;
    const audio = event.currentTarget;
    const mediaError = audio?.error;
    const code = mediaError?.code ? `code ${mediaError.code}` : 'unknown code';
    const type = file?.type || activeAudioMeta?.type || 'unknown type';

    setPlaybackProblem(
      `Local preview could not play this recording in the Tauri WebView (${code}, ${type}). The audio file is still selected for podcast minting; try recording again, or choose an MP3/M4A/WAV file for local preview.`,
    );
  }

  function clearAudio() {
    clearObjectUrl();
    activeFileRef.current = null;
    setActiveAudioMeta(null);
    setRecordingState('idle');
    setPlaybackProblem('');
    notifyAudioFile(null, null);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function updateControl(name, value) {
    setControls((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetControls() {
    setControls({ ...DEFAULT_CONTROLS });
  }

  function patchDraft(patch) {
    if (typeof onDraftPatch === 'function') {
      onDraftPatch(patch);
    }
  }

  function notifyAudioFile(file, meta) {
    if (typeof onAudioFileChange === 'function') {
      onAudioFileChange(file, meta);
    }
  }

  function clearObjectUrl() {
    const current = activeObjectUrlRef.current;

    if (current) {
      URL.revokeObjectURL(current);
    }

    activeObjectUrlRef.current = '';
    setActiveObjectUrl('');
  }

  function stopMicGraph() {
    stopMeter();

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (_error) {
        // Best-effort cleanup only.
      }
    }

    mediaRecorderRef.current = null;
    recordingMimeRef.current = '';

    const graph = graphRef.current;

    if (graph) {
      [
        graph.source,
        graph.rawAnalyser,
        graph.preampGain,
        graph.inputGain,
        graph.preGateAnalyser,
        graph.noiseGate,
        graph.compressor,
        graph.outputGain,
        graph.processedAnalyser,
        graph.monitorGain,
      ].forEach((node) => {
        try {
          node.disconnect();
        } catch (_error) {
          // Already disconnected.
        }
      });
    }

    graphRef.current = null;

    const stream = streamRef.current;

    if (stream) {
      stopMediaStream(stream);
    }

    streamRef.current = null;

    const context = audioContextRef.current;

    if (context && context.state !== 'closed') {
      context.close().catch(() => {});
    }

    audioContextRef.current = null;
    gateDiagnosticsRef.current = {
      rms: 0,
      open: false,
      envelope: 1,
      targetGain: 1,
    };
  }

  function startMeter(graph) {
    stopMeter();

    const rawData = new Uint8Array(graph.rawAnalyser.fftSize);
    const inputData = new Uint8Array(graph.preGateAnalyser.fftSize);
    const processedData = new Uint8Array(graph.processedAnalyser.fftSize);
    let lastUpdate = 0;

    const tick = (time) => {
      graph.rawAnalyser.getByteTimeDomainData(rawData);
      graph.preGateAnalyser.getByteTimeDomainData(inputData);
      graph.processedAnalyser.getByteTimeDomainData(processedData);

      if (time - lastUpdate > 80) {
        lastUpdate = time;

        const raw = readSignal(rawData);
        const input = readSignal(inputData);
        const processed = readSignal(processedData);
        const gate = gateDiagnosticsRef.current || {};

        setMeter({
          rawRms: raw.rms,
          rawPeak: raw.peak,
          inputRms: input.rms,
          inputPeak: input.peak,
          processedRms: processed.rms,
          processedPeak: processed.peak,
          gateOpen: Boolean(gate.open),
          gateEnvelope: Number.isFinite(gate.envelope) ? gate.envelope : 1,
          gateRms: Number.isFinite(gate.rms) ? gate.rms : input.rms,
          clipping: processed.peak > 0.94,
        });
      }

      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
  }

  function stopMeter() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  }

  const statusText = onAir
    ? 'ON AIR'
    : activeAudioMeta
      ? activeAudioMeta.source === 'recording'
        ? 'RECORDED'
        : 'FILE READY'
      : micReady
        ? 'MIC READY'
        : 'READY';

  const statusDetail = onAir
    ? 'Recording processed mic chain'
    : activeAudioMeta
      ? 'Episode audio staged for mint'
      : micReady
        ? 'Move knobs and record'
        : 'Start mic or choose file';

  return (
    <section className="cl-podcast-studio" aria-label="Podcast recording studio">
      <div className="cl-podcast-studio-shell">
        <section className={`cl-podcast-studio-stage ${onAir ? 'is-on-air' : ''}`}>
          <div className="cl-podcast-stage-glow" aria-hidden="true" />

          <div className="cl-podcast-stage-top">
            <div>
              <p className="cl-eyebrow">Podcast Studio</p>
              <h2>Creator control room</h2>
              <p>
                Record through a live local voice chain, confirm the processing, then hand the
                resulting file to the explicit paid podcast mint flow.
              </p>
            </div>

            <div className={`cl-podcast-onair ${onAir ? 'is-on-air' : activeAudioMeta ? 'is-recorded' : ''}`} aria-live="polite">
              <span className="cl-podcast-status-orb" aria-hidden="true" />
              <span>{statusText}</span>
              <strong>{statusDetail}</strong>
            </div>
          </div>

          <div className="cl-podcast-waveform" aria-label="Processed waveform meter">
            {waveformBars.map((height, index) => (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="cl-podcast-wavebar"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          <div className="cl-podcast-meter-grid" aria-label="Podcast mixer diagnostics">
            <LevelCard
              label="Input"
              value={formatDbFromLinear(meter.inputRms)}
              percent={inputPercent}
              help="After preamp + input gain, before gate"
            />
            <LevelCard
              label="Processed"
              value={formatDbFromLinear(meter.processedRms)}
              percent={processedPercent}
              help="Recorder feed after gate + leveler"
              danger={meter.clipping}
            />
            <LevelCard
              label="Peak"
              value={meter.clipping ? 'clip' : `${peakPercent}%`}
              percent={peakPercent}
              help="Output headroom"
              danger={meter.clipping}
            />
          </div>

          <div className="cl-podcast-diagnostic-strip">
            <Diagnostic label="Gate" value={controls.noiseGateEnabled ? (meter.gateOpen ? 'Open' : 'Closed') : 'Bypassed'} />
            <Diagnostic label="Gate env" value={`${Math.round(clamp(meter.gateEnvelope, 0, 1) * 100)}%`} />
            <Diagnostic label="Recorder" value={recorderMimeDisplay} />
            <Diagnostic label="Clipping" value={meter.clipping ? 'Yes' : 'No'} danger={meter.clipping} />
          </div>

          <div className="cl-podcast-transport">
            <button
              type="button"
              className="cl-podcast-primary-button"
              onClick={startMic}
              disabled={micState === 'starting' || micReady || onAir}
            >
              {micState === 'starting' ? 'Starting mic…' : micReady ? 'Mic ready' : 'Start mic'}
            </button>

            {!onAir ? (
              <button type="button" className="cl-podcast-record-button" onClick={startRecording}>
                Record
              </button>
            ) : (
              <button type="button" className="cl-podcast-danger-button" onClick={stopRecording}>
                Stop recording
              </button>
            )}

            <button type="button" onClick={stopMic} disabled={!micReady && micState !== 'blocked'}>
              Stop mic
            </button>

            <button type="button" onClick={clearAudio} disabled={!activeAudioMeta}>
              Clear audio
            </button>
          </div>

          <div className="cl-podcast-file-row">
            <label className="cl-podcast-file-button">
              <input ref={inputRef} type="file" accept={ACCEPTED_AUDIO_TYPES.join(',')} onChange={chooseLocalFile} />
              <span>Choose audio file</span>
            </label>
            <button type="button" onClick={resetControls}>
              Reset voice chain
            </button>
          </div>

          {problem ? (
            <div className="cl-podcast-studio-problem" role="alert">
              <strong>Studio problem</strong>
              <span>{problem}</span>
            </div>
          ) : null}

          {playbackProblem ? (
            <div className="cl-podcast-studio-problem" role="alert">
              <strong>Playback problem</strong>
              <span>{playbackProblem}</span>
            </div>
          ) : null}

          {activeObjectUrl ? (
            <div className="cl-podcast-audio-frame">
              <audio
                ref={audioRef}
                key={activeObjectUrl}
                src={activeObjectUrl}
                controls
                preload="metadata"
                onLoadedMetadata={onLoadedMetadata}
                onCanPlay={onAudioCanPlay}
                onError={onAudioError}
              >
                Your WebView cannot play this local podcast audio file.
              </audio>
            </div>
          ) : (
            <div className="cl-podcast-audio-empty">
              <strong>No podcast audio loaded</strong>
              <span>Choose a file or record a mic take. Cover art remains a crab:// image reference.</span>
            </div>
          )}

          <div className="cl-podcast-audio-facts">
            <Fact label="File" value={activeAudioMeta?.name || 'not selected'} />
            <Fact label="Type" value={activeAudioMeta?.type || 'not selected'} />
            <Fact label="Size" value={activeAudioMeta?.sizeLabel || 'not selected'} />
            <Fact label="Duration" value={activeAudioMeta?.durationLabel || 'not inspected'} />
          </div>

          {activeAudioMeta?.recorderPlaybackHint ? (
            <div className="cl-podcast-studio-boundary">
              <strong>Recorder format</strong>
              <span>{activeAudioMeta.recorderPlaybackHint}</span>
            </div>
          ) : null}
        </section>

        <aside className="cl-podcast-studio-card cl-podcast-mixer">
          <div className="cl-podcast-studio-card-head">
            <div>
              <p className="cl-eyebrow">Voice chain</p>
              <h3>Live mixer</h3>
              <p>
                These controls shape the Web Audio graph that feeds the recorder. Monitor only
                changes local listening volume.
              </p>
            </div>
            <span className="cl-podcast-pill">{controls.noiseGateEnabled ? 'gate active' : 'gate bypassed'}</span>
          </div>

          <div className="cl-podcast-mixer-grid">
            <Knob
              label="Preamp"
              value={controls.preampDb}
              min={-12}
              max={18}
              step={1}
              suffix=" dB"
              help="First gain stage before the gate. Raise quiet mics; lower hot mics."
              onChange={(value) => updateControl('preampDb', value)}
            />

            <Knob
              label="Input gain"
              value={controls.inputGain}
              min={0}
              max={180}
              step={1}
              suffix="%"
              help="Second gain stage before the gate. Watch the Input meter."
              onChange={(value) => updateControl('inputGain', value)}
            />

            <ToggleControl
              label="Noise gate"
              checked={controls.noiseGateEnabled}
              help="Reduces room tone below threshold before the leveler."
              onChange={(checked) => updateControl('noiseGateEnabled', checked)}
            />

            <Knob
              label="Gate threshold"
              value={controls.noiseGateThresholdDb}
              min={-70}
              max={-20}
              step={1}
              suffix=" dB"
              disabled={!controls.noiseGateEnabled}
              help="Higher closes sooner; lower keeps more room tone."
              onChange={(value) => updateControl('noiseGateThresholdDb', value)}
            />

            <Knob
              label="Gate reduction"
              value={controls.noiseGateReduction}
              min={20}
              max={96}
              step={1}
              suffix="%"
              disabled={!controls.noiseGateEnabled}
              help="How quiet the background becomes while the gate is closed."
              onChange={(value) => updateControl('noiseGateReduction', value)}
            />

            <ToggleControl
              label="Voice leveler"
              checked={controls.voiceLevelerEnabled}
              help="Gentle compression for smoother speech level."
              onChange={(checked) => updateControl('voiceLevelerEnabled', checked)}
            />

            <ToggleControl
              label="Monitor"
              checked={controls.monitorEnabled}
              help="Listen to processed mic audio locally. Use headphones."
              onChange={(checked) => updateControl('monitorEnabled', checked)}
            />

            <Knob
              label="Monitor volume"
              value={controls.monitorVolume}
              min={0}
              max={100}
              step={1}
              suffix="%"
              disabled={!controls.monitorEnabled}
              help="Local playback only. It does not change the recorded file."
              onChange={(value) => updateControl('monitorVolume', value)}
            />
          </div>

          <div className="cl-podcast-mixer-status">
            <strong>Knob proof</strong>
            <span>Preamp and input gain move the Input meter. Gate threshold toggles Gate Open/Closed. Leveler changes the Processed meter. Recording uses the Processed feed.</span>
          </div>
        </aside>
      </div>

      <div className="cl-podcast-studio-boundary">
        <strong>Studio truth boundary</strong>
        <span>
          This is a local capture and preview tool. It does not create a b3 hash, backend receipt,
          paid unlock, stream session, wallet event, index pointer, or ownership proof.
        </span>
      </div>
    </section>
  );
}

function LevelCard({ label, value, percent, help, danger = false }) {
  return (
    <div className={danger ? 'cl-podcast-level-card is-danger' : 'cl-podcast-level-card'}>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="cl-podcast-level-bar">
        <span style={{ width: `${clamp(percent, 0, 100)}%` }} />
      </div>
      <small>{help}</small>
    </div>
  );
}

function Diagnostic({ label, value, danger = false }) {
  return (
    <div className={danger ? 'cl-podcast-diagnostic is-danger' : 'cl-podcast-diagnostic'}>
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}

function Knob({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  help = '',
  disabled = false,
  onChange,
}) {
  const numeric = Number(value || 0);
  const percent = ((numeric - min) / Math.max(1, max - min)) * 100;
  const degrees = -135 + clamp(percent, 0, 100) * 2.7;

  return (
    <label
      className={disabled ? 'cl-podcast-knob is-disabled' : 'cl-podcast-knob'}
      style={{
        '--cl-podcast-knob-pct': `${clamp(percent, 0, 100)}%`,
        '--cl-podcast-knob-deg': `${degrees}deg`,
      }}
    >
      <span className="cl-podcast-knob-top">
        <strong>{label}</strong>
        <em>{numeric}{suffix}</em>
      </span>
      <span className="cl-podcast-knob-body" aria-hidden="true">
        <i className="cl-podcast-knob-face">
          <b />
        </i>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numeric}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>{help}</small>
    </label>
  );
}

function ToggleControl({ label, checked, help, onChange }) {
  return (
    <label className={checked ? 'cl-podcast-toggle-control is-checked' : 'cl-podcast-toggle-control'}>
      <span>
        <strong>{label}</strong>
        <small>{help}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(Boolean(event.target.checked))}
      />
    </label>
  );
}

function Fact({ label, value }) {
  return (
    <div className="cl-podcast-fact">
      <span>{label}</span>
      <strong title={String(value || '')}>{value || 'n/a'}</strong>
    </div>
  );
}

function createNoiseGateProcessor(context, gateParamsRef, gateDiagnosticsRef) {
  const processor = context.createScriptProcessor(1024, 2, 2);
  let envelope = 1;

  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer;
    const output = event.outputBuffer;
    const samples = input.getChannelData(0);
    let sum = 0;

    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sum / Math.max(1, samples.length));
    const params = gateParamsRef.current || {};
    const enabled = Boolean(params.enabled);
    const threshold = dbToLinear(Number(params.thresholdDb ?? -46));
    const reduction = clamp(Number(params.reduction ?? 82), 0, 98);
    const closedGain = clamp((100 - reduction) / 100, 0.015, 1);
    const targetGain = !enabled || rms >= threshold ? 1 : closedGain;

    envelope += (targetGain - envelope) * (targetGain > envelope ? 0.24 : 0.06);

    gateDiagnosticsRef.current = {
      rms,
      open: !enabled || rms >= threshold,
      envelope,
      targetGain,
    };

    for (let channel = 0; channel < output.numberOfChannels; channel += 1) {
      const inputChannel = Math.min(channel, input.numberOfChannels - 1);
      const source = input.getChannelData(inputChannel);
      const destination = output.getChannelData(channel);

      for (let i = 0; i < destination.length; i += 1) {
        destination[i] = source[i] * envelope;
      }
    }
  };

  return processor;
}

function chooseRecorderMimeType() {
  const recorderSupported = (type) => Boolean(window.MediaRecorder?.isTypeSupported?.(type));
  const playbackSupported = (type) => {
    const baseType = String(type || '').split(';')[0].trim();

    if (!baseType) {
      return false;
    }

    const audio = document.createElement('audio');
    return Boolean(audio.canPlayType(baseType));
  };

  const candidates = [
    {
      mimeType: 'audio/mp4;codecs=mp4a.40.2',
      playbackHint: 'Recording as M4A/AAC. This is the preferred Tauri local preview format.',
    },
    {
      mimeType: 'audio/mp4',
      playbackHint: 'Recording as MP4 audio. This is usually playable in the local Tauri WebView.',
    },
    {
      mimeType: 'audio/aac',
      playbackHint: 'Recording as AAC. This is usually playable in the local Tauri WebView.',
    },
    {
      mimeType: 'audio/webm;codecs=opus',
      playbackHint: 'Recording as WebM/Opus. Upload can still work, but some macOS WebViews cannot preview it locally.',
    },
    {
      mimeType: 'audio/webm',
      playbackHint: 'Recording as WebM. Upload can still work, but some macOS WebViews cannot preview it locally.',
    },
    {
      mimeType: 'audio/ogg;codecs=opus',
      playbackHint: 'Recording as Ogg/Opus. Upload can still work, but some macOS WebViews cannot preview it locally.',
    },
    {
      mimeType: 'audio/ogg',
      playbackHint: 'Recording as Ogg. Upload can still work, but some macOS WebViews cannot preview it locally.',
    },
  ];

  const recordAndPlay = candidates.find(
    (candidate) => recorderSupported(candidate.mimeType) && playbackSupported(candidate.mimeType),
  );

  if (recordAndPlay) {
    return recordAndPlay;
  }

  const recordOnly = candidates.find((candidate) => recorderSupported(candidate.mimeType));

  if (recordOnly) {
    return {
      ...recordOnly,
      playbackHint: `${recordOnly.playbackHint} This Tauri WebView did not report local playback support for the recorder format.`,
    };
  }

  return {
    mimeType: '',
    playbackHint:
      'Using the WebView default recorder format. If local preview fails, the selected recording may still be usable for upload.',
  };
}

function normalizeRecordedMimeType(value) {
  const clean = String(value || '').trim();

  if (!clean || clean === 'application/octet-stream') {
    return 'audio/webm';
  }

  return clean;
}

function validateAudioFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  const size = Number(file?.size || 0);

  if (!file) {
    return {
      ok: false,
      message: 'No audio file was selected.',
    };
  }

  if (size <= 0) {
    return {
      ok: false,
      message: 'The selected podcast file is empty or unavailable.',
    };
  }

  if (size > MAX_LOCAL_AUDIO_BYTES) {
    return {
      ok: false,
      message: `Local podcast preview is capped at ${formatBytes(MAX_LOCAL_AUDIO_BYTES)}. Larger episodes need the future range/segment media path.`,
    };
  }

  const extensionOk = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|webm)$/i.test(name);
  const typeOk = ACCEPTED_AUDIO_TYPES.includes(type) || type.startsWith('audio/');

  if (!typeOk && !extensionOk) {
    return {
      ok: false,
      message: 'Choose a podcast audio file: MP3, WAV, FLAC, M4A, AAC, OGG, OPUS, or WebM.',
    };
  }

  return {
    ok: true,
    message: '',
  };
}

function readSignal(data) {
  let sum = 0;
  let peak = 0;

  for (let i = 0; i < data.length; i += 1) {
    const sample = (data[i] - 128) / 128;
    const abs = Math.abs(sample);
    sum += sample * sample;

    if (abs > peak) {
      peak = abs;
    }
  }

  return {
    rms: Math.sqrt(sum / Math.max(1, data.length)),
    peak,
  };
}

function safeErrorMessage(error) {
  return String(error?.message || error || 'unknown error').slice(0, 240);
}

function inferAudioType(name) {
  const lowerName = String(name || '').toLowerCase();

  if (lowerName.endsWith('.mp3')) return 'audio/mpeg';
  if (lowerName.endsWith('.wav')) return 'audio/wav';
  if (lowerName.endsWith('.flac')) return 'audio/flac';
  if (lowerName.endsWith('.m4a')) return 'audio/mp4';
  if (lowerName.endsWith('.aac')) return 'audio/aac';
  if (lowerName.endsWith('.ogg') || lowerName.endsWith('.oga')) return 'audio/ogg';
  if (lowerName.endsWith('.opus')) return 'audio/opus';
  if (lowerName.endsWith('.webm')) return 'audio/webm';

  return 'audio/mpeg';
}

function playbackHintForMime(type) {
  const clean = String(type || '').toLowerCase();

  if (clean.includes('mp4') || clean.includes('aac') || clean.includes('mpeg') || clean.includes('wav')) {
    return 'This format is usually playable in the local Tauri WebView.';
  }

  if (clean.includes('webm') || clean.includes('ogg') || clean.includes('opus')) {
    return 'This format can be uploaded, but some macOS/Tauri WebViews may reject local preview playback.';
  }

  return '';
}

function mimeTypeToExtension(type) {
  const clean = String(type || '').toLowerCase();

  if (clean.includes('mp4')) return 'm4a';
  if (clean.includes('aac')) return 'aac';
  if (clean.includes('ogg')) return 'ogg';
  if (clean.includes('mpeg')) return 'mp3';
  if (clean.includes('wav')) return 'wav';
  if (clean.includes('webm')) return 'webm';

  return 'webm';
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch (_error) {
      // Best-effort cleanup only.
    }
  });
}

function dbToLinear(db) {
  return Math.pow(10, Number(db || 0) / 20);
}

function linearToDb(value) {
  const safe = Math.max(0.000001, Number(value || 0));
  return 20 * Math.log10(safe);
}

function formatDbFromLinear(value) {
  const db = linearToDb(value);

  if (!Number.isFinite(db)) {
    return '-∞ dB';
  }

  return `${Math.round(db)} dB`;
}

function levelToPercent(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value || 0) * 185)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '0 B';
  }

  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
}

function formatDurationLabel(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return [hours, minutes, secs]
      .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
      .join(':');
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}