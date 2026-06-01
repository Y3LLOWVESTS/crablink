/**
 * RO:WHAT — Route-owned local creator studio for crab://make recording and clip assembly.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; makes Make feel like the CrabLink centerpiece without making UI backend authority.
 * RO:INTERACTS — makeDraftModel, shared creator components, browser MediaDevices/MediaRecorder, future crab://video handoff.
 * RO:INVARIANTS — local clips only; no fake CIDs; no fake receipts; no wallet mutation; no paid unlock from cache.
 * RO:METRICS — none.
 * RO:CONFIG — local draft settings, MediaRecorder MIME support, browser capture permissions.
 * RO:SECURITY — no private paths, secrets, capabilities, tokens, balances, or receipt truth are stored in React state.
 * RO:TEST — npm run build; manual crab://make camera/screen/PiP record-stop-download smoke.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import Field from '../../shared/components/Field.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  MAKE_MODES,
  MAKE_OUTPUT_PRESETS,
  MAKE_SCENE_PRESETS,
  MAKE_SCENES,
  applyMakePreset,
  buildMakeSessionPlan,
  clearStoredMakeDraft,
  createMakeDraft,
  deriveMakeReadiness,
  findMakeMode,
  findOutputPreset,
  formatBytes,
  formatDurationMs,
  readStoredMakeDraft,
  selectRecorderMimeType,
  writeLatestMakeSessionPlan,
  writeStoredMakeDraft,
} from './makeDraftModel.js';
import './make.css';

const EMPTY_INPUT_STATE = Object.freeze({
  status: 'idle',
  cameraStream: null,
  screenStream: null,
  micStream: null,
  error: null,
  warning: null,
  startedAt: null,
});

const EMPTY_RECORDER_STATE = Object.freeze({
  status: 'idle',
  error: null,
  mimeType: '',
  startedAtMs: 0,
  activeName: '',
});

const MODE_ICONS = Object.freeze({
  camera: '●',
  screen: '▣',
  screen_pip: '◰',
  camera_background: '◆',
  audio_only: '≋',
});

export default function MakePage({ app }) {
  const canvasRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const streamsRef = useRef(EMPTY_INPUT_STATE);
  const clipsRef = useRef([]);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recorderStreamRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const countdownTokenRef = useRef(0);

  const [draft, setDraft] = useState(() => readStoredMakeDraft());
  const [inputState, setInputState] = useState(EMPTY_INPUT_STATE);
  const [recorderState, setRecorderState] = useState(EMPTY_RECORDER_STATE);
  const [clips, setClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState('');
  const [deviceState, setDeviceState] = useState({
    status: 'idle',
    cameras: 0,
    microphones: 0,
    error: null,
  });
  const [showDeveloperPlan, setShowDeveloperPlan] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [prompterRunning, setPrompterRunning] = useState(false);

  const selectedMode = useMemo(() => findMakeMode(draft.selectedMode), [draft.selectedMode]);
  const outputPreset = useMemo(() => findOutputPreset(draft.outputPreset), [draft.outputPreset]);
  const recorderMimeType = useMemo(() => selectRecorderMimeType(), []);
  const inputReady = inputState.status === 'ready';
  const isRecording = recorderState.status === 'recording';
  const isCountingDown = countdown > 0;
  const hasPrompterScript = Boolean(draft.scriptText.trim());
  const canUseMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
  const canRecord =
    inputReady &&
    !isRecording &&
    !isCountingDown &&
    typeof window.MediaRecorder === 'function' &&
    Boolean(canvasRef.current?.captureStream);
  const selectedClip = useMemo(
    () => clips.find((clip) => clip.id === selectedClipId) || clips[clips.length - 1] || null,
    [clips, selectedClipId],
  );
  const latestClip = clips[clips.length - 1] || null;
  const totalDurationMs = useMemo(
    () => clips.reduce((sum, clip) => sum + Number(clip.durationMs || 0), 0),
    [clips],
  );
  const recordingElapsedMs = useMemo(() => {
    if (!isRecording || !recorderState.startedAtMs) {
      return 0;
    }

    return Date.now() - recorderState.startedAtMs + clockTick * 0;
  }, [clockTick, isRecording, recorderState.startedAtMs]);

  const readiness = useMemo(
    () => deriveMakeReadiness({
      draft,
      clips,
      inputStatus: inputState.status,
      recorderStatus: recorderState.status,
    }),
    [clips, draft, inputState.status, recorderState.status],
  );

  const sessionPlan = useMemo(
    () => buildMakeSessionPlan({
      draft,
      clips,
      inputStatus: inputState.status,
      recorderStatus: recorderState.status,
    }),
    [clips, draft, inputState.status, recorderState.status],
  );

  const updateDraft = useCallback((patch) => {
    setDraft((current) =>
      createMakeDraft({
        ...current,
        ...patch,
      }),
    );
  }, []);

  const togglePrompterRun = useCallback(() => {
    if (!draft.teleprompterEnabled || !draft.scriptText.trim()) {
      setPrompterRunning(false);
      return;
    }

    setPrompterRunning((value) => !value);
  }, [draft.scriptText, draft.teleprompterEnabled]);

  const applyPreset = useCallback((presetValue) => {
    if (inputReady || isRecording || isCountingDown) {
      app?.notify?.({
        tone: 'info',
        title: 'Stop preview first',
        copy: 'Presets restart the capture recipe. Stop preview before changing the studio template.',
      });
      return;
    }

    setDraft((current) => applyMakePreset(current, presetValue));
  }, [app, inputReady, isCountingDown, isRecording]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceState({
        status: 'unsupported',
        cameras: 0,
        microphones: 0,
        error: 'Device enumeration is unavailable in this WebView.',
      });
      return;
    }

    setDeviceState((current) => ({ ...current, status: 'loading', error: null }));

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      setDeviceState({
        status: 'ready',
        cameras: devices.filter((device) => device.kind === 'videoinput').length,
        microphones: devices.filter((device) => device.kind === 'audioinput').length,
        error: null,
      });
    } catch (error) {
      setDeviceState({
        status: 'error',
        cameras: 0,
        microphones: 0,
        error: errorMessage(error),
      });
    }
  }, []);

  const cancelCountdown = useCallback(() => {
    countdownTokenRef.current += 1;

    if (countdownTimerRef.current) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setCountdown(0);
  }, []);

  const stopInputs = useCallback(() => {
    cancelCountdown();
    stopAllStreams(streamsRef.current);
    setInputState(EMPTY_INPUT_STATE);
  }, [cancelCountdown]);

  const startInputs = useCallback(async () => {
    stopAllStreams(streamsRef.current);

    if (!canUseMedia) {
      const nextState = {
        ...EMPTY_INPUT_STATE,
        status: 'error',
        error: 'This WebView does not expose navigator.mediaDevices.',
      };
      streamsRef.current = nextState;
      setInputState(nextState);
      return null;
    }

    const mode = findMakeMode(draft.selectedMode);
    setInputState({ ...EMPTY_INPUT_STATE, status: 'starting' });

    let cameraStream = null;
    let screenStream = null;
    let micStream = null;
    let warning = null;

    try {
      if (mode.needsCamera) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: outputPreset.width },
            height: { ideal: outputPreset.height },
            frameRate: { ideal: draft.targetFps },
          },
          audio: false,
        });
      }

      if (mode.needsScreen) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: outputPreset.width },
            height: { ideal: outputPreset.height },
            frameRate: { ideal: draft.targetFps },
          },
          audio: false,
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        if (screenTrack) {
          screenTrack.onended = () => {
            setInputState((current) => ({
              ...current,
              status: current.cameraStream || current.micStream ? 'ready' : 'idle',
              screenStream: null,
              warning: 'Screen sharing ended from the system picker.',
            }));
          };
        }
      }

      if (draft.includeMic) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: draft.echoCancellation,
              noiseSuppression: draft.noiseSuppression,
              autoGainControl: draft.autoGainControl,
            },
          });
        } catch (error) {
          warning = `Microphone unavailable: ${errorMessage(error)}`;
        }
      }

      const nextState = {
        status: 'ready',
        cameraStream,
        screenStream,
        micStream,
        error: null,
        warning,
        startedAt: new Date().toISOString(),
      };

      streamsRef.current = nextState;
      setInputState(nextState);
      refreshDevices();
      return nextState;
    } catch (error) {
      stopAllStreams({ cameraStream, screenStream, micStream });

      const nextState = {
        ...EMPTY_INPUT_STATE,
        status: 'error',
        error: errorMessage(error),
      };

      streamsRef.current = nextState;
      setInputState(nextState);
      return null;
    }
  }, [canUseMedia, draft, outputPreset, refreshDevices]);

  const startRecordingNow = useCallback(() => {
    if (!canvasRef.current || !inputReady || isRecording) {
      return;
    }

    if (typeof window.MediaRecorder !== 'function') {
      setRecorderState({
        ...EMPTY_RECORDER_STATE,
        status: 'error',
        error: 'MediaRecorder is unavailable in this WebView.',
      });
      return;
    }

    if (typeof canvasRef.current.captureStream !== 'function') {
      setRecorderState({
        ...EMPTY_RECORDER_STATE,
        status: 'error',
        error: 'Canvas captureStream is unavailable in this WebView.',
      });
      return;
    }

    try {
      const fps = clamp(Number(draft.targetFps), 12, 60, 30);
      const canvasStream = canvasRef.current.captureStream(fps);
      const audioTracks = audioTracksFrom(inputState.micStream);

      for (const track of audioTracks) {
        canvasStream.addTrack(track);
      }

      const mimeType = recorderMimeType || undefined;
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new window.MediaRecorder(canvasStream, options);
      const startedAtMs = Date.now();
      const clipName = buildClipName({ draft, index: clips.length + 1, mimeType });

      chunksRef.current = [];
      recorderStreamRef.current = canvasStream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        setRecorderState((current) => ({
          ...current,
          status: 'error',
          error: errorMessage(event?.error || event),
        }));
      };

      recorder.onstop = () => {
        const chunks = chunksRef.current;
        const fallbackType = chunks[0]?.type || mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: fallbackType });
        const objectUrl = URL.createObjectURL(blob);
        const durationMs = Date.now() - startedAtMs;
        const createdAt = new Date().toISOString();
        const id = createId('make-clip');

        stopRecorderStream(recorderStreamRef.current);
        recorderStreamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];

        setClips((current) => [
          ...current,
          {
            id,
            name: clipName,
            mimeType: blob.type || fallbackType,
            sizeBytes: blob.size,
            durationMs,
            createdAt,
            objectUrl,
            localOnly: true,
          },
        ]);
        setSelectedClipId(id);

        setRecorderState({
          status: 'idle',
          error: null,
          mimeType: blob.type || fallbackType,
          startedAtMs: 0,
          activeName: '',
        });
      };

      recorder.start(1000);
      setRecorderState({
        status: 'recording',
        error: null,
        mimeType: mimeType || 'browser-default',
        startedAtMs,
        activeName: clipName,
      });
    } catch (error) {
      stopRecorderStream(recorderStreamRef.current);
      recorderStreamRef.current = null;
      recorderRef.current = null;
      chunksRef.current = [];
      setRecorderState({
        ...EMPTY_RECORDER_STATE,
        status: 'error',
        error: errorMessage(error),
      });
    }
  }, [
    clips.length,
    draft,
    inputReady,
    inputState.micStream,
    isRecording,
    recorderMimeType,
  ]);

  const beginRecordingCountdown = useCallback(() => {
    if (!inputReady || isRecording || isCountingDown || !canvasRef.current) {
      return;
    }

    const token = countdownTokenRef.current + 1;
    countdownTokenRef.current = token;
    setCountdown(3);

    const tick = (value) => {
      countdownTimerRef.current = window.setTimeout(() => {
        if (countdownTokenRef.current !== token) {
          return;
        }

        if (value <= 1) {
          countdownTimerRef.current = null;
          setCountdown(0);
          startRecordingNow();
          return;
        }

        setCountdown(value - 1);
        tick(value - 1);
      }, 900);
    };

    tick(3);
  }, [inputReady, isCountingDown, isRecording, startRecordingNow]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const removeClip = useCallback((clipId) => {
    setClips((current) => {
      const clip = current.find((item) => item.id === clipId);
      revokeClipUrls(clip ? [clip] : []);

      if (clipId === selectedClipId) {
        setSelectedClipId('');
      }

      return current.filter((item) => item.id !== clipId);
    });
  }, [selectedClipId]);

  const retakeLastClip = useCallback(() => {
    setClips((current) => {
      const next = [...current];
      const clip = next.pop();

      if (clip) {
        revokeClipUrls([clip]);
      }

      setSelectedClipId(next[next.length - 1]?.id || '');
      return next;
    });
  }, []);

  const clearClips = useCallback(() => {
    revokeClipUrls(clips);
    setClips([]);
    setSelectedClipId('');
  }, [clips]);

  const copyPlan = useCallback(async () => {
    const plan = writeLatestMakeSessionPlan(sessionPlan);

    try {
      await navigator.clipboard.writeText(JSON.stringify(plan, null, 2));
      app?.notify?.({
        tone: 'success',
        title: 'Make plan copied',
        copy: 'Session plan copied to clipboard.',
      });
    } catch (_error) {
      app?.notify?.({
        tone: 'info',
        title: 'Make plan stored',
        copy: 'Session plan was stored in sessionStorage.',
      });
    }
  }, [app, sessionPlan]);

  const openVideoPage = useCallback(() => {
    writeLatestMakeSessionPlan(sessionPlan);
    app?.navigate?.('crab://video');
  }, [app, sessionPlan]);

  const resetDraft = useCallback(() => {
    clearStoredMakeDraft();
    setDraft(createMakeDraft());
  }, []);

  useEffect(() => {
    writeStoredMakeDraft(draft);
  }, [draft]);

  useEffect(() => {
    streamsRef.current = inputState;
  }, [inputState]);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    attachStream(cameraVideoRef.current, inputState.cameraStream);
  }, [inputState.cameraStream]);

  useEffect(() => {
    attachStream(screenVideoRef.current, inputState.screenStream);
  }, [inputState.screenStream]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(
    () =>
      drawPreviewLoop({
        canvas: canvasRef.current,
        cameraVideo: cameraVideoRef.current,
        screenVideo: screenVideoRef.current,
        draft,
        inputState,
        outputPreset,
      }),
    [draft, inputState, outputPreset],
  );

  useEffect(() => {
    if (!inputReady && isCountingDown) {
      cancelCountdown();
    }
  }, [cancelCountdown, inputReady, isCountingDown]);

  useEffect(() => {
    if (!draft.teleprompterEnabled || !hasPrompterScript) {
      setPrompterRunning(false);
    }
  }, [draft.teleprompterEnabled, hasPrompterScript]);

  useEffect(() => {
    if (clips.length === 0) {
      return undefined;
    }

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [clips.length]);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = window.setInterval(() => setClockTick((value) => value + 1), 500);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(
    () => () => {
      countdownTokenRef.current += 1;

      if (countdownTimerRef.current) {
        window.clearTimeout(countdownTimerRef.current);
      }

      stopAllStreams(streamsRef.current);
      stopRecorderStream(recorderStreamRef.current);
      revokeClipUrls(clipsRef.current);
    },
    [],
  );

  const side = (
    <MakeSidePanel
      clips={clips}
      deviceState={deviceState}
      inputState={inputState}
      onCopyPlan={copyPlan}
      onRefreshDevices={refreshDevices}
      onToggleDeveloperPlan={() => setShowDeveloperPlan((value) => !value)}
      readiness={readiness}
      recorderMimeType={recorderMimeType}
      sessionPlan={sessionPlan}
      showDeveloperPlan={showDeveloperPlan}
      totalDurationMs={totalDurationMs}
    />
  );

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://make"
      title="Make Studio"
      copy="A polished local studio for recording clips, composing scenes, capturing your screen, reviewing a timeline, and handing the final media into the existing CrabLink video mint pipeline."
      className="make-page"
      badges={[
        { label: 'local studio', tone: 'success' },
        { label: 'record clips', tone: 'info' },
        { label: 'video handoff', tone: 'neutral' },
      ]}
      principles={[
        {
          eyebrow: 'Flow',
          title: 'Segmented clips first',
          copy: 'Record one part, stop, record the next, review the strip, then export the clip you want to publish.',
        },
        {
          eyebrow: 'Studio',
          title: 'Screen and camera together',
          copy: 'Camera, screen, PiP, audio card, and scene modes live in one creator-first workspace.',
        },
        {
          eyebrow: 'Truth',
          title: 'Video pipeline owns publishing',
          copy: 'Make creates local media. crab://video still owns conversion, paid confirmation, backend receipts, and published manifests.',
        },
      ]}
      side={side}
    >
      <section className="make-shell" aria-label="Make Studio">
        <MakeCommandDeck
          canRecord={canRecord}
          clips={clips}
          countdown={countdown}
          draft={draft}
          inputReady={inputReady}
          inputState={inputState}
          isRecording={isRecording}
          onCancelCountdown={cancelCountdown}
          onOpenVideo={openVideoPage}
          onStartInputs={startInputs}
          onStartRecording={beginRecordingCountdown}
          onStopInputs={stopInputs}
          onStopRecording={stopRecording}
          outputPreset={outputPreset}
          recorderState={recorderState}
          recordingElapsedMs={recordingElapsedMs}
          totalDurationMs={totalDurationMs}
        />

        <Card
          eyebrow="Studio preview"
          title="Compose and record"
          className="make-preview-card make-flagship-card"
          actions={
            <Badge tone={inputReady ? 'success' : inputState.status === 'error' ? 'danger' : 'neutral'}>
              {inputState.status}
            </Badge>
          }
        >
          <div className="make-preview-shell">
            <canvas
              ref={canvasRef}
              className="make-preview-canvas"
              width={outputPreset.width}
              height={outputPreset.height}
              aria-label="Make Studio composited preview canvas"
            />
            <video ref={cameraVideoRef} className="make-hidden-video" muted playsInline />
            <video ref={screenVideoRef} className="make-hidden-video" muted playsInline />

            <div className="make-preview-topbar">
              <span>{selectedMode.label}</span>
              <span>{outputPreset.width}×{outputPreset.height}</span>
              <span>{draft.targetFps}fps</span>
            </div>

            {isRecording && (
              <div className="make-recording-badge" role="status">
                <span /> Recording {formatDurationMs(recordingElapsedMs)}
              </div>
            )}

            {countdown > 0 && (
              <div className="make-countdown-overlay" role="status" aria-live="assertive">
                <strong>{countdown}</strong>
                <span>Recording starts now</span>
              </div>
            )}

            <MakePrompterOverlay draft={draft} running={prompterRunning} />
            <MakePrompterControls
              draft={draft}
              hasPrompterScript={hasPrompterScript}
              onToggleRun={togglePrompterRun}
              running={prompterRunning}
            />
          </div>

          <MakePresetDeck
            activePreset={draft.scenePreset}
            disabled={inputReady || isRecording || isCountingDown}
            onApply={applyPreset}
          />

          <MakeModeDeck
            activeMode={draft.selectedMode}
            disabled={inputReady || isRecording || isCountingDown}
            onChange={(selectedModeValue) => updateDraft({ selectedMode: selectedModeValue, scenePreset: '' })}
          />

          {inputState.error && <p className="make-alert make-alert-danger">{inputState.error}</p>}
          {inputState.warning && <p className="make-alert make-alert-warning">{inputState.warning}</p>}
          {!recorderMimeType && (
            <p className="make-alert make-alert-warning">
              MediaRecorder did not report a preferred MIME type. Recording may still work through the browser default, but final MP4 should still go through the video page.
            </p>
          )}

          {recorderState.error && <p className="make-alert make-alert-danger">{recorderState.error}</p>}
        </Card>

        <MakeTimelineCard
          canRecord={canRecord}
          clips={clips}
          isRecording={isRecording}
          latestClip={latestClip}
          onClear={clearClips}
          onDownload={downloadClip}
          onRemove={removeClip}
          onRecordNext={beginRecordingCountdown}
          onRetakeLast={retakeLastClip}
          onSelect={setSelectedClipId}
          selectedClip={selectedClip}
          selectedClipId={selectedClipId}
          totalDurationMs={totalDurationMs}
        />

        <MakeProjectCard
          draft={draft}
          hasPrompterScript={hasPrompterScript}
          onReset={resetDraft}
          onTogglePrompterRun={togglePrompterRun}
          onUpdate={updateDraft}
          outputPreset={outputPreset}
          prompterRunning={prompterRunning}
        />

        <MakeHandoffCard
          clips={clips}
          onCopyPlan={copyPlan}
          onDownload={downloadClip}
          onOpenVideo={openVideoPage}
          selectedClip={selectedClip}
          sessionPlan={sessionPlan}
        />
      </section>
    </CreatorWorkspaceLayout>
  );
}

function MakePrompterOverlay({ draft, running }) {
  const script = draft.scriptText.trim();

  if (!draft.teleprompterEnabled || !script) {
    return null;
  }

  const durationSeconds = Math.max(18, 110 - Number(draft.teleprompterSpeed || 38));
  const anchorClass = draft.teleprompterAnchor === 'top' ? 'make-prompter-top' : 'make-prompter-bottom';

  return (
    <div
      className={`make-prompter-overlay ${anchorClass} ${running ? 'is-running' : ''}`}
      style={{ '--make-prompter-duration': `${durationSeconds}s` }}
      aria-hidden={!draft.teleprompterEnabled}
    >
      <div className="make-prompter-window">
        <pre key={`${running ? 'run' : 'pause'}-${script.length}-${draft.teleprompterSpeed}`}>{script}</pre>
      </div>
      <span>Teleprompter preview only · not recorded</span>
    </div>
  );
}

function MakePrompterControls({ draft, hasPrompterScript, onToggleRun, running }) {
  if (!draft.teleprompterEnabled || !hasPrompterScript) {
    return null;
  }

  return (
    <div className="make-prompter-controls">
      <span>Prompt visible to creator only</span>
      <button type="button" onClick={onToggleRun}>
        {running ? 'Pause' : 'Run'}
      </button>
    </div>
  );
}

function MakeCommandDeck({
  canRecord,
  clips,
  countdown,
  draft,
  inputReady,
  inputState,
  isRecording,
  onCancelCountdown,
  onOpenVideo,
  onStartInputs,
  onStartRecording,
  onStopInputs,
  onStopRecording,
  outputPreset,
  recorderState,
  recordingElapsedMs,
  totalDurationMs,
}) {
  return (
    <section className="make-command-deck" aria-label="Make Studio command center">
      <div className="make-command-main">
        <div className="make-orb" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="cl-eyebrow">Creator command center</p>
          <h2>{draft.title || 'Untitled Make project'}</h2>
          <p>
            {inputReady
              ? `${findMakeMode(draft.selectedMode).label} is ready. Record a segment whenever you are set.`
              : 'Start a preview, record segments, then review the timeline before video handoff.'}
          </p>
        </div>
      </div>

      <div className="make-command-stats">
        <StatPill label="Mode" value={findMakeMode(draft.selectedMode).shortLabel} />
        <StatPill label="Canvas" value={`${outputPreset.width}×${outputPreset.height}`} />
        <StatPill label="Clips" value={String(clips.length)} />
        <StatPill label="Total" value={formatDurationMs(totalDurationMs)} />
      </div>

      <div className="make-command-actions">
        {!inputReady ? (
          <Button onClick={onStartInputs} disabled={inputState.status === 'starting'}>
            {inputState.status === 'starting' ? 'Starting…' : 'Start preview'}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onStopInputs} disabled={isRecording}>
            Stop preview
          </Button>
        )}

        {countdown > 0 ? (
          <Button variant="secondary" onClick={onCancelCountdown}>
            Cancel {countdown}
          </Button>
        ) : !isRecording ? (
          <Button onClick={onStartRecording} disabled={!canRecord}>
            Record clip
          </Button>
        ) : (
          <Button variant="secondary" onClick={onStopRecording}>
            Stop {formatDurationMs(recordingElapsedMs)}
          </Button>
        )}

        <Button variant="secondary" onClick={onOpenVideo} disabled={clips.length === 0 || isRecording}>
          Video handoff
        </Button>
      </div>

      {recorderState.activeName && (
        <div className="make-now-recording">
          <span />
          {recorderState.activeName}
        </div>
      )}
    </section>
  );
}

function MakePresetDeck({ activePreset, disabled, onApply }) {
  return (
    <section className="make-preset-deck" aria-label="Make scene presets">
      <div className="make-section-kicker">
        <div>
          <p className="cl-eyebrow">Scene presets</p>
          <h3>Start with a creator template</h3>
        </div>
        {disabled && <small>Stop preview to switch templates.</small>}
      </div>

      <div className="make-preset-grid">
        {MAKE_SCENE_PRESETS.map((preset) => {
          const active = preset.value === activePreset;

          return (
            <button
              className={`make-preset-card ${active ? 'is-active' : ''}`}
              key={preset.value}
              type="button"
              onClick={() => onApply(preset.value)}
              disabled={disabled}
            >
              <span className="make-preset-eye">{preset.eyebrow}</span>
              <strong>{preset.label}</strong>
              <small>{preset.copy}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MakeModeDeck({ activeMode, disabled, onChange }) {
  return (
    <div className="make-mode-deck" aria-label="Make source modes">
      {MAKE_MODES.map((mode) => {
        const active = mode.value === activeMode;

        return (
          <button
            className={`make-mode-card ${active ? 'is-active' : ''}`}
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            disabled={disabled}
          >
            <span className="make-mode-icon">{MODE_ICONS[mode.value] || '●'}</span>
            <span className="make-mode-text">
              <strong>{mode.shortLabel}</strong>
              <small>{mode.copy}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MakeTimelineCard({
  canRecord,
  clips,
  isRecording,
  latestClip,
  onClear,
  onDownload,
  onRemove,
  onRecordNext,
  onRetakeLast,
  onSelect,
  selectedClip,
  selectedClipId,
  totalDurationMs,
}) {
  return (
    <Card
      eyebrow="Timeline"
      title="Review recorded segments"
      className="make-timeline-card"
      actions={
        clips.length ? (
          <div className="make-card-actions">
            <Button variant="secondary" size="sm" onClick={onRetakeLast}>Retake last</Button>
            <Button variant="secondary" size="sm" onClick={onClear}>Clear</Button>
          </div>
        ) : null
      }
    >
      <div className="make-timeline-summary">
        <StatPill label="Segments" value={String(clips.length)} />
        <StatPill label="Duration" value={formatDurationMs(totalDurationMs)} />
        <StatPill label="Storage" value={formatBytes(clips.reduce((sum, clip) => sum + Number(clip.sizeBytes || 0), 0))} />
      </div>

      {clips.length === 0 ? (
        <div className="make-empty-timeline">
          <div className="make-empty-timeline-art">
            <span />
            <span />
            <span />
          </div>
          <strong>No clips recorded yet.</strong>
          <p>Start preview, record a segment, stop, then repeat. Your clip strip will appear here.</p>
        </div>
      ) : (
        <div className="make-timeline-layout">
          <div className="make-clip-strip" role="list" aria-label="Recorded clip strip">
            {clips.map((clip, index) => (
              <button
                className={`make-strip-item ${clip.id === selectedClipId || (!selectedClipId && clip.id === selectedClip?.id) ? 'is-selected' : ''}`}
                key={clip.id}
                type="button"
                onClick={() => onSelect(clip.id)}
              >
                <span className="make-strip-number">{index + 1}</span>
                <span className="make-strip-name">{clip.name}</span>
                <span className="make-strip-meta">{formatDurationMs(clip.durationMs)} · {formatBytes(clip.sizeBytes)}</span>
              </button>
            ))}
          </div>

          {selectedClip && (
            <article className="make-selected-clip">
              <video src={selectedClip.objectUrl} controls preload="metadata" />
              <div className="make-selected-clip-body">
                <p className="cl-eyebrow">Selected local clip</p>
                <h3>{selectedClip.name}</h3>
                <div className="make-clip-stats">
                  <Badge tone="neutral" uppercase={false}>{selectedClip.mimeType || 'browser blob'}</Badge>
                  <Badge tone="info" uppercase={false}>{formatBytes(selectedClip.sizeBytes)}</Badge>
                  <Badge tone="success" uppercase={false}>{formatDurationMs(selectedClip.durationMs)}</Badge>
                </div>
                <p>
                  This is a local preview blob. Download it before closing the app if you want to keep it.
                </p>
                {latestClip?.id === selectedClip.id && (
                  <div className="make-latest-decision">
                    <strong>Latest clip saved.</strong>
                    <span>Keep it, record the next segment, or retake it before moving on.</span>
                  </div>
                )}
                <div className="make-button-row">
                  {latestClip?.id === selectedClip.id && (
                    <Button variant="secondary" size="sm" onClick={onRecordNext} disabled={!canRecord || isRecording}>
                      Keep + record next
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onDownload(selectedClip)}>
                    Download
                  </Button>
                  {latestClip?.id === selectedClip.id ? (
                    <Button variant="secondary" size="sm" onClick={onRetakeLast}>
                      Retake
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => onRemove(selectedClip.id)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </Card>
  );
}

function MakeProjectCard({ draft, hasPrompterScript, onReset, onTogglePrompterRun, onUpdate, outputPreset, prompterRunning }) {
  return (
    <Card
      eyebrow="Project"
      title="Name and shape the finished video"
      className="make-project-card"
      actions={<Button variant="secondary" size="sm" onClick={onReset}>Reset</Button>}
    >
      <div className="make-project-prime">
        <Field label="Title" help="Local draft title. Backend title is created later through the video publish flow.">
          <TextInput
            value={draft.title}
            maxLength={90}
            placeholder="Example: CrabLink creator studio demo"
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </Field>

        <Field label="Access price" help="Integer ROC display hint for the later video mint flow.">
          <TextInput
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft.accessPriceRoc}
            onChange={(event) => onUpdate({ accessPriceRoc: event.target.value })}
          />
        </Field>
      </div>

      <details className="make-disclosure">
        <summary>
          <span>Advanced project details</span>
          <small>description, tags, scene, canvas, audio, prompter, PiP, notes</small>
        </summary>

        <div className="make-disclosure-body">
          <Field label="Description">
            <TextArea
              rows={4}
              value={draft.description}
              placeholder="What will viewers get from this finished video?"
              onChange={(event) => onUpdate({ description: event.target.value })}
            />
          </Field>

          <MakePrompterEditor
            draft={draft}
            hasPrompterScript={hasPrompterScript}
            onToggleRun={onTogglePrompterRun}
            onUpdate={onUpdate}
            running={prompterRunning}
          />

          <div className="make-form-grid">
            <Field label="Tags" help="Comma-separated local draft tags.">
              <TextInput
                value={draft.tagsText}
                placeholder="tutorial, behind-the-scenes, music"
                onChange={(event) => onUpdate({ tagsText: event.target.value })}
              />
            </Field>

            <Field label="Canvas preset" help={`${outputPreset.width}×${outputPreset.height}`}>
              <select
                className="cl-input"
                value={draft.outputPreset}
                onChange={(event) => onUpdate({ outputPreset: event.target.value })}
              >
                {MAKE_OUTPUT_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="make-form-grid">
            <Field label="Scene">
              <select
                className="cl-input"
                value={draft.selectedScene}
                onChange={(event) => onUpdate({ selectedScene: event.target.value })}
              >
                {MAKE_SCENES.map((scene) => (
                  <option key={scene.value} value={scene.value}>{scene.label}</option>
                ))}
              </select>
            </Field>

            <Field label="FPS">
              <select
                className="cl-input"
                value={draft.targetFps}
                onChange={(event) => onUpdate({ targetFps: event.target.value })}
              >
                {[24, 30, 48, 60].map((fps) => (
                  <option key={fps} value={fps}>{fps}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="make-toggle-grid" aria-label="Make audio controls">
            <CheckToggle
              checked={draft.includeMic}
              label="Microphone"
              onChange={(includeMic) => onUpdate({ includeMic })}
            />
            <CheckToggle
              checked={draft.echoCancellation}
              label="Echo cancel"
              onChange={(echoCancellation) => onUpdate({ echoCancellation })}
            />
            <CheckToggle
              checked={draft.noiseSuppression}
              label="Noise suppress"
              onChange={(noiseSuppression) => onUpdate({ noiseSuppression })}
            />
            <CheckToggle
              checked={draft.autoGainControl}
              label="Auto gain"
              onChange={(autoGainControl) => onUpdate({ autoGainControl })}
            />
          </div>

          <div className="make-form-grid">
            <Field label="PiP corner">
              <select
                className="cl-input"
                value={draft.pipCorner}
                onChange={(event) => onUpdate({ pipCorner: event.target.value })}
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </Field>

            <Field label="PiP size" help="Percent of canvas width.">
              <input
                className="cl-input"
                type="range"
                min="18"
                max="42"
                value={draft.pipSize}
                onChange={(event) => onUpdate({ pipSize: event.target.value })}
              />
            </Field>
          </div>

          <Field label="Creator notes" help="Private local notes; not included in backend truth until a future explicit publish path exists.">
            <TextArea
              rows={3}
              value={draft.creatorNotes}
              placeholder="Shot list, talking points, edit reminders..."
              onChange={(event) => onUpdate({ creatorNotes: event.target.value })}
            />
          </Field>
        </div>
      </details>
    </Card>
  );
}

function MakePrompterEditor({ draft, hasPrompterScript, onToggleRun, onUpdate, running }) {
  return (
    <section className="make-prompter-editor" aria-label="Teleprompter">
      <div className="make-prompter-editor-head">
        <div>
          <p className="cl-eyebrow">Teleprompter</p>
          <h3>Preview-only script runner</h3>
          <span>
            This overlay sits above the preview for the creator. It is not drawn into the recorded canvas.
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleRun}
          disabled={!draft.teleprompterEnabled || !hasPrompterScript}
        >
          {running ? 'Pause prompt' : 'Run prompt'}
        </Button>
      </div>

      <div className="make-toggle-grid make-prompter-toggle-row">
        <CheckToggle
          checked={draft.teleprompterEnabled}
          label="Show prompt"
          onChange={(teleprompterEnabled) => onUpdate({ teleprompterEnabled })}
        />

        <Field label="Position">
          <select
            className="cl-input"
            value={draft.teleprompterAnchor}
            onChange={(event) => onUpdate({ teleprompterAnchor: event.target.value })}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
          </select>
        </Field>

        <Field label="Scroll speed" help={`${draft.teleprompterSpeed}/90`}>
          <input
            className="cl-input"
            type="range"
            min="10"
            max="90"
            value={draft.teleprompterSpeed}
            onChange={(event) => onUpdate({ teleprompterSpeed: event.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Script"
        help="Local draft text only. Keep secrets out of scripts you plan to copy or share."
      >
        <TextArea
          rows={7}
          value={draft.scriptText}
          placeholder="Paste a script, bullet points, or talking beats here..."
          onChange={(event) => onUpdate({ scriptText: event.target.value })}
        />
      </Field>
    </section>
  );
}

function MakeHandoffCard({ clips, onCopyPlan, onDownload, onOpenVideo, selectedClip }) {
  const hasClips = clips.length > 0;

  return (
    <Card eyebrow="Finish" title="Export locally, then publish through video" className="make-handoff-card">
      <div className="make-handoff">
        <div className="make-finish-hero">
          <strong>{hasClips ? 'Ready for local export' : 'Record a clip first'}</strong>
          <p>
            Make does not publish by itself yet. Download the selected clip, then open Video to convert, stage versions, confirm ROC access, and mint through backend truth.
          </p>
        </div>

        <div className="make-handoff-steps" aria-label="Make to video handoff steps">
          {[
            'Download/export the clip you want to publish',
            'Open crab://video',
            'Run Rust/FFmpeg prepare and rendition staging',
            'Confirm the paid backend wallet flow',
            'Display backend-derived receipts and manifests',
          ].map((step, index) => (
            <div className="make-handoff-step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="make-handoff-actions">
          <Button variant="secondary" onClick={() => selectedClip && onDownload(selectedClip)} disabled={!selectedClip}>
            Download selected clip
          </Button>
          <Button variant="secondary" onClick={onCopyPlan}>
            Copy session plan
          </Button>
          <Button onClick={onOpenVideo} disabled={!hasClips}>
            Open video page
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MakeSidePanel({
  clips,
  deviceState,
  inputState,
  onCopyPlan,
  onRefreshDevices,
  onToggleDeveloperPlan,
  readiness,
  recorderMimeType,
  sessionPlan,
  showDeveloperPlan,
  totalDurationMs,
}) {
  return (
    <div className="make-side-stack">
      <Card eyebrow="Studio status" title="Ready check" className="make-side-card make-ready-card">
        <div className="make-side-hero-stat">
          <strong>{readiness.summary === 'ready_to_export_draft' ? 'Ready' : 'Drafting'}</strong>
          <span>{clips.length} clips · {formatDurationMs(totalDurationMs)}</span>
        </div>

        <div className="make-compact-status-list">
          {readiness.cards.map((card) => (
            <div className={`make-compact-status make-tone-${card.tone || 'neutral'}`} key={card.key}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.help}</small>
            </div>
          ))}
        </div>
      </Card>

      <Card
        eyebrow="Devices"
        title="Capture inventory"
        className="make-side-card"
        actions={<Button variant="secondary" size="sm" onClick={onRefreshDevices}>Refresh</Button>}
      >
        <div className="make-stat-grid make-stat-grid-two">
          <StatChip label="Cameras" value={String(deviceState.cameras)} help={deviceState.status} tone="neutral" size="sm" />
          <StatChip label="Mics" value={String(deviceState.microphones)} help={deviceState.status} tone="neutral" size="sm" />
        </div>
        {deviceState.error && <p className="make-alert make-alert-warning">{deviceState.error}</p>}
      </Card>

      <Card eyebrow="Local media path" title="Recorder details" className="make-side-card">
        <div className="make-pipeline-list">
          <span>Canvas preview</span>
          <span>MediaRecorder</span>
          <span>Local clip blob</span>
          <span>Manual video-page handoff</span>
        </div>
        <p className="make-side-copy">
          Preferred MIME: <strong>{recorderMimeType || 'browser default / unavailable'}</strong>
        </p>
        <p className="make-side-copy">
          Current input: <strong>{inputState.status}</strong>. Clips in memory: <strong>{clips.length}</strong>.
        </p>
        <div className="make-button-row">
          <Button variant="secondary" size="sm" onClick={onCopyPlan}>Copy plan</Button>
          <Button variant="secondary" size="sm" onClick={onToggleDeveloperPlan}>
            {showDeveloperPlan ? 'Hide JSON' : 'Show JSON'}
          </Button>
        </div>
      </Card>

      <Card eyebrow="Truth boundary" title="What Make does not do" className="make-side-card">
        <ul className="make-boundary-list">
          <li>No wallet mutation.</li>
          <li>No ledger mutation.</li>
          <li>No fake receipt or fake balance.</li>
          <li>No local cache paid unlock.</li>
          <li>No creator-supplied executable player.</li>
        </ul>
      </Card>

      {showDeveloperPlan && <JsonPreview data={sessionPlan} label="Make session plan" initiallyOpen />}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <span className="make-stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function CheckToggle({ checked, label, onChange }) {
  return (
    <label className="make-check-toggle">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function attachStream(video, stream) {
  if (!video) {
    return;
  }

  if (video.srcObject !== stream) {
    video.srcObject = stream || null;
  }

  if (stream) {
    const playResult = video.play?.();

    if (playResult?.catch) {
      playResult.catch(() => {});
    }
  }
}

function drawPreviewLoop({ canvas, cameraVideo, screenVideo, draft, inputState, outputPreset }) {
  if (!canvas) {
    return () => {};
  }

  const context = canvas.getContext('2d');

  if (!context) {
    return () => {};
  }

  let raf = 0;
  let disposed = false;

  const tick = () => {
    if (disposed) {
      return;
    }

    drawPreviewFrame({
      context,
      canvas,
      cameraVideo,
      screenVideo,
      draft,
      inputState,
      outputPreset,
    });
    raf = window.requestAnimationFrame(tick);
  };

  tick();

  return () => {
    disposed = true;
    window.cancelAnimationFrame(raf);
  };
}

function drawPreviewFrame({ context, canvas, cameraVideo, screenVideo, draft, inputState, outputPreset }) {
  const width = canvas.width;
  const height = canvas.height;
  const mode = draft.selectedMode;

  drawSceneBackground(context, width, height, draft.selectedScene);

  if ((mode === 'screen' || mode === 'screen_pip') && isVideoReady(screenVideo)) {
    drawCoverVideo(context, screenVideo, 0, 0, width, height);
  }

  if (mode === 'camera' && isVideoReady(cameraVideo)) {
    drawCoverVideo(context, cameraVideo, 0, 0, width, height);
  }

  if (mode === 'camera_background' && isVideoReady(cameraVideo)) {
    drawContainVideo(context, cameraVideo, width * 0.12, height * 0.08, width * 0.76, height * 0.82);
    drawGlassLabel(context, 'Scene background mode', width * 0.055, height * 0.08);
  }

  if (mode === 'screen_pip' && isVideoReady(cameraVideo)) {
    const pip = pipRect(width, height, draft.pipCorner, draft.pipSize);
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = 24;
    context.fillStyle = 'rgba(5, 5, 8, 0.82)';
    roundRect(context, pip.x - 8, pip.y - 8, pip.w + 16, pip.h + 16, 22);
    context.fill();
    context.restore();
    drawCoverVideo(context, cameraVideo, pip.x, pip.y, pip.w, pip.h, 18);
  }

  if (mode === 'audio_only') {
    drawAudioCard(context, width, height, draft);
  }

  if (inputState.status !== 'ready') {
    drawIdleOverlay(context, width, height, inputState.status, draft, outputPreset);
  }

  drawFooterHud(context, width, height, draft, outputPreset);
}

function drawSceneBackground(context, width, height, scene) {
  const gradient = context.createLinearGradient(0, 0, width, height);

  if (scene === 'ocean') {
    gradient.addColorStop(0, '#06283d');
    gradient.addColorStop(0.5, '#136f8f');
    gradient.addColorStop(1, '#0ef0b8');
  } else if (scene === 'ember') {
    gradient.addColorStop(0, '#22092c');
    gradient.addColorStop(0.55, '#872341');
    gradient.addColorStop(1, '#f05941');
  } else if (scene === 'paper') {
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(0.55, '#e2e8f0');
    gradient.addColorStop(1, '#cbd5e1');
  } else {
    gradient.addColorStop(0, '#070711');
    gradient.addColorStop(0.58, '#15172a');
    gradient.addColorStop(1, '#0f766e');
  }

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.28;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(width * 0.78, height * 0.18, Math.min(width, height) * 0.25, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.16;
  context.beginPath();
  context.arc(width * 0.16, height * 0.82, Math.min(width, height) * 0.32, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawAudioCard(context, width, height, draft) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.38)';
  roundRect(context, width * 0.12, height * 0.18, width * 0.76, height * 0.58, 42);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `${Math.max(34, Math.round(width * 0.043))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'center';
  context.fillText(draft.title || 'Audio card', width * 0.5, height * 0.38);
  context.font = `${Math.max(18, Math.round(width * 0.018))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.globalAlpha = 0.82;
  context.fillText('CrabLink Make Studio', width * 0.5, height * 0.49);

  for (let i = 0; i < 36; i += 1) {
    const barHeight = (Math.sin(i * 0.86) + 1.5) * height * 0.035;
    const x = width * 0.27 + i * width * 0.013;
    context.globalAlpha = 0.36 + (i % 5) * 0.08;
    roundRect(context, x, height * 0.62 - barHeight / 2, width * 0.006, barHeight, 99);
    context.fill();
  }

  context.restore();
}

function drawIdleOverlay(context, width, height, status, draft, outputPreset) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.48)';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = `${Math.max(28, Math.round(width * 0.035))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.fillText(draft.title || 'Make Studio preview', width / 2, height * 0.43);
  context.font = `${Math.max(15, Math.round(width * 0.014))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.globalAlpha = 0.84;
  context.fillText(`Click Start preview • ${outputPreset.width}×${outputPreset.height} • ${status}`, width / 2, height * 0.51);
  context.restore();
}

function drawFooterHud(context, width, height, draft, outputPreset) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.46)';
  roundRect(context, width * 0.035, height - 68, width * 0.93, 42, 18);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = `${Math.max(14, Math.round(width * 0.012))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'left';
  context.globalAlpha = 0.88;
  context.fillText(
    `${draft.title || 'Untitled clip'}  •  ${outputPreset.label}  •  ${draft.targetFps}fps  •  crab://make`,
    width * 0.055,
    height - 42,
  );
  context.restore();
}

function drawGlassLabel(context, text, x, y) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.42)';
  roundRect(context, x, y, 260, 42, 999);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '700 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  context.fillText(text, x + 20, y + 27);
  context.restore();
}

function drawCoverVideo(context, video, x, y, width, height, radius = 0) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;

  context.save();
  if (radius > 0) {
    roundRect(context, x, y, width, height, radius);
    context.clip();
  }
  context.drawImage(video, dx, dy, drawWidth, drawHeight);
  context.restore();
}

function drawContainVideo(context, video, x, y, width, height) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;

  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 30;
  context.drawImage(video, dx, dy, drawWidth, drawHeight);
  context.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function pipRect(width, height, corner, sizePercent) {
  const pipWidth = width * (Number(sizePercent || 28) / 100);
  const pipHeight = pipWidth * (9 / 16);
  const margin = width * 0.035;
  const top = corner.startsWith('top');
  const left = corner.endsWith('left');

  return {
    x: left ? margin : width - margin - pipWidth,
    y: top ? margin : height - margin - pipHeight - 48,
    w: pipWidth,
    h: pipHeight,
  };
}

function isVideoReady(video) {
  return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0);
}

function audioTracksFrom(stream) {
  return stream?.getAudioTracks?.().filter((track) => track.readyState === 'live') || [];
}

function stopAllStreams(state) {
  const streams = [state?.cameraStream, state?.screenStream, state?.micStream].filter(Boolean);

  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_error) {
        // Best-effort browser media cleanup.
      }
    }
  }
}

function stopRecorderStream(stream) {
  if (!stream?.getVideoTracks) {
    return;
  }

  for (const track of stream.getVideoTracks()) {
    try {
      track.stop();
    } catch (_error) {
      // Best-effort canvas capture cleanup.
    }
  }
}

function downloadClip(clip) {
  if (!clip?.objectUrl) {
    return;
  }

  const link = document.createElement('a');
  link.href = clip.objectUrl;
  link.download = clip.name || 'crablink-make-clip.webm';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function revokeClipUrls(clips) {
  for (const clip of clips || []) {
    if (clip?.objectUrl) {
      try {
        URL.revokeObjectURL(clip.objectUrl);
      } catch (_error) {
        // Ignore object URL cleanup failure.
      }
    }
  }
}

function buildClipName({ draft, index, mimeType }) {
  const base = String(draft.title || 'crablink-make-clip')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'crablink-make-clip';
  const ext = String(mimeType || '').includes('mp4') ? 'mp4' : 'webm';

  return `${base}-${String(index).padStart(2, '0')}.${ext}`;
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function errorMessage(error) {
  if (!error) {
    return 'Unknown error';
  }

  return error.message || error.name || String(error);
}