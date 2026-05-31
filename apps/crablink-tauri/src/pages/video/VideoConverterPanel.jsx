/**
 * RO:WHAT — Rust-owned video source picker, MP4 planning, and staged-output prepare panel for crab://video.
 * RO:WHY — Lets creators pick once for Rust authority, then run bounded local conversion without React owning media bytes.
 * RO:INTERACTS — videoConverterClient, VideoDraft.jsx, VideoLocalPlaybackPreview.jsx, src-tauri commands::media.
 * RO:INVARIANTS — no full video bytes; no private paths; no fake CIDs; no fake receipts; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — uses local selected-file facts, playback metadata, and Rust redacted source registrations.
 * RO:SECURITY — Rust returns redacted source/staged handles only; React never receives private paths or native command strings.
 * RO:TEST — npm run build; manual crab://video → choose source + build plan → start local prepare job.
 */

import { useEffect, useMemo, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import { createVideoConverterClient } from '../../shared/api/videoConverterClient.js';

const LATEST_JOB_STORAGE_KEY = 'crablink.video.latestPrepareJob.v1';

const IDLE_STATE = Object.freeze({
  status: 'idle',
  source: null,
  probe: null,
  plan: null,
  job: null,
  error: null,
});

const ACTIVE_JOB_STATUSES = new Set(['queued', 'running']);
const BUSY_STATUSES = new Set([
  'picking_source',
  'registering_source',
  'planning',
  'starting_job',
  'cancelling_job',
  'clearing_source',
]);

export default function VideoConverterPanel({ selectedFileFacts, playbackMeta, draft }) {
  const client = useMemo(() => createVideoConverterClient(), []);
  const [state, setState] = useState(IDLE_STATE);
  const [nativePathDraft, setNativePathDraft] = useState('');

  const previewSourceFacts = useMemo(
    () => buildSourceFacts({ selectedFileFacts, playbackMeta, draft }),
    [selectedFileFacts, playbackMeta, draft],
  );

  const nativeSourceFacts = useMemo(
    () => (state.source ? buildFactsFromRegisteredSource(state.source, previewSourceFacts) : null),
    [state.source, previewSourceFacts],
  );

  const effectiveSourceFacts = nativeSourceFacts || previewSourceFacts;
  const canPlan = Boolean(effectiveSourceFacts.fileName && effectiveSourceFacts.bytes);
  const hasRegisteredSource = Boolean(state.source?.sourceHandle && state.source?.nativeFileAuthority);
  const canStartJob = Boolean(hasRegisteredSource && state.probe && state.plan?.entries?.length);
  const isBusy = BUSY_STATUSES.has(state.status);

  useEffect(() => {
    const jobId = state.job?.jobId;
    const jobStatus = state.job?.status;

    if (!jobId || !ACTIVE_JOB_STATUSES.has(jobStatus)) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const nextJob = await client.getVideoJobStatus(jobId);

        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          job: nextJob,
          status: nextJob.status || current.status,
          error: nextJob.error?.message ? nextJob.error.message : null,
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          error: errorMessage(error),
        }));
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [client, state.job?.jobId, state.job?.status]);

  useEffect(() => {
    if (!state.job?.jobId) {
      return;
    }

    const safeJob = {
      ...state.job,
      truthBoundary: {
        ...(state.job.truthBoundary || {}),
        returnsPrivatePath: false,
        returnsVideoBytes: false,
      },
    };

    try {
      globalThis.localStorage?.setItem?.(LATEST_JOB_STORAGE_KEY, JSON.stringify(safeJob));
    } catch (_error) {
      // Display cache only. Losing this cache must not affect backend truth.
    }

    try {
      window.dispatchEvent(
        new CustomEvent('crablink:video-prepare-job-updated', {
          detail: {
            job: safeJob,
          },
        }),
      );
    } catch (_error) {
      // Optional UI sync event only.
    }
  }, [state.job]);

  async function handleChooseNativeSourceAndPlan() {
    if (!client.available) {
      setState((current) => ({
        ...current,
        error: 'Tauri Rust native file picker is unavailable in this runtime.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'picking_source',
      error: null,
      source: null,
      probe: null,
      plan: null,
      job: null,
    }));

    try {
      const source = await client.chooseVideoSource(previewSourceFacts);
      const facts = buildFactsFromRegisteredSource(source, previewSourceFacts);

      setState((current) => ({
        ...current,
        status: 'planning',
        source,
        probe: null,
        plan: null,
        job: null,
        error: null,
      }));

      const { probe, plan } = await buildPlanForFacts(client, facts);

      setState((current) => ({
        ...current,
        status: 'planned',
        source,
        probe,
        plan,
        job: null,
        error: null,
      }));
      setNativePathDraft('');
    } catch (error) {
      const message = errorMessage(error);
      const cancelled = message.toLowerCase().includes('cancel');

      setState((current) => ({
        ...current,
        status: cancelled ? 'idle' : 'error',
        error: cancelled ? null : message,
      }));
    }
  }

  async function handleRegisterNativeSource(event) {
    event?.preventDefault?.();

    const path = nativePathDraft.trim();

    if (!path) {
      setState((current) => ({
        ...current,
        error: 'Paste a native file path or use Choose video source + build plan.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'registering_source',
      error: null,
      source: null,
      probe: null,
      plan: null,
      job: null,
    }));

    try {
      const source = await client.registerVideoSource({
        ...previewSourceFacts,
        path,
        source: 'manual_path_developer_fallback',
      });
      const facts = buildFactsFromRegisteredSource(source, previewSourceFacts);
      const { probe, plan } = await buildPlanForFacts(client, facts);

      setState((current) => ({
        ...current,
        status: 'planned',
        source,
        probe,
        plan,
        job: null,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
    }
  }

  async function handleClearSource() {
    const sourceHandle = state.source?.sourceHandle;

    if (!sourceHandle) {
      setState((current) => ({
        ...current,
        source: null,
        probe: null,
        plan: null,
        job: null,
        error: null,
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'clearing_source',
      error: null,
    }));

    try {
      await client.clearVideoSource(sourceHandle);

      setState((current) => ({
        ...current,
        status: 'idle',
        source: null,
        probe: null,
        plan: null,
        job: null,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
    }
  }

  async function handleBuildPlan() {
    if (!canPlan) {
      setState((current) => ({
        ...current,
        error: 'Choose a native source or select a local preview video before building a plan.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'planning',
      error: null,
      probe: null,
      plan: null,
      job: null,
    }));

    try {
      const { probe, plan } = await buildPlanForFacts(client, effectiveSourceFacts);

      setState((current) => ({
        ...current,
        status: 'planned',
        probe,
        plan,
        job: null,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
    }
  }

  async function handleStartJob() {
    if (!hasRegisteredSource) {
      setState((current) => ({
        ...current,
        error: 'Choose a native source first. Rust needs a redacted source handle before it can stage local MP4 outputs.',
      }));
      return;
    }

    if (!state.probe || !state.plan?.entries?.length) {
      setState((current) => ({
        ...current,
        error: 'Build an MP4 plan before starting the local prepare job.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'starting_job',
      error: null,
    }));

    try {
      const job = await client.prepareVideoBundle({
        probe: state.probe,
        plan: state.plan,
        sourceHandle: state.source.sourceHandle,
        sourceLabel: 'native_handle',
        requestedBy: 'crablink_video_page',
      });

      setState((current) => ({
        ...current,
        status: job.status || 'queued',
        job,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
    }
  }

  async function handleCancelJob() {
    const jobId = state.job?.jobId;

    if (!jobId) {
      return;
    }

    setState((current) => ({
      ...current,
      status: 'cancelling_job',
      error: null,
    }));

    try {
      const job = await client.cancelVideoJob(jobId);

      setState((current) => ({
        ...current,
        status: job.status || 'cancelled',
        job,
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
    }
  }

  return (
    <Card
      className="video-converter-card video-converter-card-compact"
      eyebrow="Prepare"
      title="MP4 versions"
      actions={
        <div className="video-converter-badges">
          <Badge tone={client.available ? 'success' : 'warning'}>
            {client.available ? 'Tauri ready' : 'Tauri unavailable'}
          </Badge>
          <Badge tone={hasRegisteredSource ? 'success' : 'neutral'}>
            {hasRegisteredSource ? 'source ready' : 'choose source'}
          </Badge>
        </div>
      }
    >
      <section className="video-prepare-compact-head" aria-label="Prepare video source">
        <div>
          <h3>Choose source and build versions</h3>
          <p>
            Use the native picker once. Rust keeps the private path, stages MP4/JPEG outputs locally,
            and the mint flow below uploads only after explicit ROC confirmation.
          </p>
        </div>

        <div className="video-prepare-compact-actions">
          <Button
            type="button"
            onClick={handleChooseNativeSourceAndPlan}
            disabled={!client.available || isBusy}
          >
            Choose video source + build plan
          </Button>
          <Button type="button" variant="secondary" onClick={handleBuildPlan} disabled={!canPlan || isBusy}>
            Refresh plan
          </Button>
        </div>
      </section>

      {state.error ? (
        <div className="video-job-note" role="alert">
          {state.error}
        </div>
      ) : null}

      <section className="video-prepare-summary-grid" aria-label="Selected source facts">
        <StatChip label="Source" value={nativeSourceFacts ? 'Rust native handle' : 'local preview facts'} />
        <StatChip label="File" value={truncateMiddle(effectiveSourceFacts.fileName || 'No video selected', 38)} />
        <StatChip label="Size" value={formatBytes(effectiveSourceFacts.bytes)} />
        <StatChip
          label="Resolution"
          value={effectiveSourceFacts.width && effectiveSourceFacts.height ? `${effectiveSourceFacts.width}×${effectiveSourceFacts.height}` : '—'}
        />
      </section>

      <div className="video-prepare-action-row">
        <Button type="button" onClick={handleStartJob} disabled={!canStartJob || isBusy}>
          Start local MP4 prepare job
        </Button>
        {ACTIVE_JOB_STATUSES.has(state.job?.status) ? (
          <Button type="button" variant="danger" onClick={handleCancelJob} disabled={isBusy}>
            Cancel job
          </Button>
        ) : null}
        <span>{statusLabel(state.status, hasRegisteredSource)}</span>
      </div>

      {state.plan?.entries?.length ? (
        <section className="video-prepare-output-section" aria-label="Planned outputs">
          <div className="video-prepare-section-head">
            <div>
              <p className="cl-eyebrow">Plan</p>
              <h3>Versions to stage</h3>
            </div>
            <Badge tone="info">{state.plan.entries.length} planned</Badge>
          </div>

          <div className="video-prepare-output-grid">
            {state.plan.entries.map((entry) => (
              <article className="video-prepare-output-card" key={entry.role || entry.label}>
                <strong>{entry.label || humanizePhase(entry.role)}</strong>
                <span>{entry.assetKind === 'image' ? 'image' : 'video'} · {entry.targetMime || 'video/mp4'}</span>
                <small>{entry.width && entry.height ? `${entry.width}×${entry.height}` : 'metadata derived'}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {state.job ? (
        <section className="video-prepare-job-card" aria-label="Prepare job">
          <div className="video-prepare-section-head">
            <div>
              <p className="cl-eyebrow">Prepare job</p>
              <h3>{humanizePhase(state.job.phase) || 'Local staging'}</h3>
            </div>
            <Badge tone={jobTone(state.job.status)}>{state.job.status || 'queued'}</Badge>
          </div>

          <div className="video-job-progress" aria-label={`Prepare progress ${state.job.progressPercent || 0}%`}>
            <span style={{ width: `${Math.max(0, Math.min(100, Number(state.job.progressPercent || 0)))}%` }} />
          </div>

          <section className="video-prepare-summary-grid" aria-label="Prepare job summary">
            <StatChip label="Progress" value={`${Math.round(Number(state.job.progressPercent || 0))}%`} />
            <StatChip label="Outputs" value={`${state.job.outputs?.length || 0}`} />
            <StatChip label="Transcode" value={state.job.truthBoundary?.runsTranscode ? 'real local job' : 'descriptor only'} />
            <StatChip label="Receipt" value="none yet" />
          </section>

          {state.job.error?.message ? (
            <p className="video-job-note" role="alert">
              {state.job.error.message}
            </p>
          ) : null}

          {state.job.outputs?.length ? (
            <div className="video-prepare-output-grid">
              {state.job.outputs.map((output) => (
                <article className="video-prepare-output-card" key={output.stagedHandle || output.role}>
                  <strong>{output.label || humanizePhase(output.role)}</strong>
                  <span>{output.assetKind || 'video'} · {output.targetMime || 'video/mp4'}</span>
                  <small>
                    {output.width && output.height ? `${output.width}×${output.height}` : 'staged output'} · {formatBytes(output.bytes)}
                  </small>
                  <Badge tone={output.readyForMint ? 'success' : 'neutral'} uppercase={false}>
                    {output.readyForMint ? 'ready to mint' : 'not ready'}
                  </Badge>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <details className="video-dev-details">
        <summary>
          <span>
            <strong>Developer converter details</strong>
            <small>Manual path fallback, probe, plan, job, and redacted staged handles.</small>
          </span>
        </summary>

        <div className="video-dev-details-body">
          <form className="video-native-source-form" onSubmit={handleRegisterNativeSource}>
            <input
              className="video-native-source-input"
              type="text"
              value={nativePathDraft}
              onChange={(event) => setNativePathDraft(event.target.value)}
              placeholder="/Users/mymac/Desktop/example.mov"
              autoComplete="off"
              spellCheck="false"
            />
            <Button type="submit" variant="secondary" disabled={isBusy || !nativePathDraft.trim()}>
              Register path + build plan
            </Button>
          </form>

          {state.source ? (
            <div className="video-native-source-actions">
              <Button type="button" variant="secondary" onClick={handleClearSource} disabled={isBusy}>
                Clear source handle
              </Button>
              <span>Clearing removes the Rust-side source registration for this app session.</span>
            </div>
          ) : null}

          <JsonPreview
            label="Video converter developer details"
            initiallyOpen={false}
            data={{
              previewSourceFacts,
              effectiveSourceFacts,
              nativeSource: state.source,
              probe: state.probe,
              plan: state.plan,
              job: state.job,
              status: state.status,
              latestJobDisplayCacheKey: LATEST_JOB_STORAGE_KEY,
              truthBoundary: {
                reactReceivesPrivatePath: false,
                reactReceivesVideoBytes: false,
                pickerCreatesB3: false,
                pickerCreatesReceipt: false,
                pickerMutatesWallet: false,
                prepareJobRunsTranscode: Boolean(state.job?.truthBoundary?.runsTranscode),
                prepareJobWritesRealOutputs: Boolean(state.job?.truthBoundary?.writesOutputFiles),
                stagedOutputsAreBackendTruth: false,
              },
            }}
          />
        </div>
      </details>
    </Card>
  );
}

async function buildPlanForFacts(client, facts) {
  const probe = await client.probeVideo(facts);
  const plan = await client.planVideoRenditions({ probe });

  return { probe, plan };
}

function buildSourceFacts({ selectedFileFacts, playbackMeta, draft }) {
  const selected = selectedFileFacts || {};
  const meta = playbackMeta || {};
  const local = draft?.localFile || draft?.source || {};

  const fileName = stringValue(
    selected.fileName,
    selected.name,
    selected.safeDisplayName,
    local.fileName,
    local.name,
    draft?.title,
  );

  return stripEmpty({
    fileName,
    contentType: stringValue(selected.contentType, selected.type, local.contentType, local.type),
    bytes: positiveInteger(selected.bytes, selected.size, local.bytes, local.size),
    durationSeconds: positiveNumber(
      selected.durationSeconds,
      selected.duration_seconds,
      meta.durationSeconds,
      meta.duration,
      local.durationSeconds,
    ),
    width: positiveInteger(selected.width, meta.width, local.width),
    height: positiveInteger(selected.height, meta.height, local.height),
    frameRate: stringValue(selected.frameRate, selected.frame_rate, meta.frameRate, local.frameRate),
    source: 'local_preview_metadata',
  });
}

function buildFactsFromRegisteredSource(source, fallback = {}) {
  return stripEmpty({
    fileName: stringValue(source?.safeDisplayName, fallback.fileName),
    contentType: stringValue(source?.contentType, fallback.contentType),
    bytes: positiveInteger(source?.bytes, fallback.bytes),
    durationSeconds: positiveNumber(source?.durationSeconds, fallback.durationSeconds),
    width: positiveInteger(source?.width, fallback.width),
    height: positiveInteger(source?.height, fallback.height),
    frameRate: stringValue(source?.frameRate, fallback.frameRate),
    source: source?.nativeFileAuthority ? 'native_registered_source' : 'registered_source',
  });
}

function statusLabel(status, hasRegisteredSource) {
  switch (status) {
    case 'idle':
      return 'Choose one native video source to build the MP4 plan.';
    case 'picking_source':
      return 'Opening native file picker…';
    case 'registering_source':
      return 'Registering native source and building plan…';
    case 'source_registered':
      return 'Native source handle is ready.';
    case 'planning':
      return 'Building MP4 rendition plan…';
    case 'planned':
      return hasRegisteredSource
        ? 'Plan ready. Start the local prepare job when ready.'
        : 'Preview plan ready. Choose a native source before real staging.';
    case 'starting_job':
      return 'Starting local prepare job…';
    case 'queued':
      return 'Prepare job queued…';
    case 'running':
      return 'Prepare job running…';
    case 'completed':
      return 'Prepare job completed.';
    case 'failed':
      return 'Prepare job failed.';
    case 'cancelled':
      return 'Prepare job cancelled.';
    case 'error':
      return 'Check the error message.';
    default:
      return status ? humanizePhase(status) : 'Ready.';
  }
}

function jobTone(status) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'warning';
    case 'running':
    case 'queued':
      return 'info';
    default:
      return 'neutral';
  }
}

function sourceAuthorityLabel(source) {
  if (!source) return '—';
  if (source.nativeFileAuthority) return 'native handle';
  if (source.sourceKind) return humanizePhase(source.sourceKind);
  return 'display only';
}

function errorMessage(error) {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'Video converter command failed.';
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return '—';
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

function formatDuration(seconds) {
  const total = Math.round(Number(seconds || 0));

  if (!Number.isFinite(total) || total <= 0) {
    return '—';
  }

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

function positiveInteger(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) {
      return Math.floor(n);
    }
  }

  return undefined;
}

function positiveNumber(...values) {
  for (const value of values) {
    const n = Number(value);

    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return undefined;
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

function stripEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      if (Array.isArray(child) && child.length === 0) return false;
      return true;
    }),
  );
}

function humanizePhase(value) {
  const safe = String(value || '').trim();

  if (!safe || safe === '—') {
    return safe || '—';
  }

  return safe
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function shortId(value) {
  const raw = String(value || '').trim();

  if (!raw || raw === '—') {
    return raw || '—';
  }

  if (raw.length <= 24) {
    return raw;
  }

  return `${raw.slice(0, 14)}…${raw.slice(-7)}`;
}

function shortStagedHandle(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  const prefix = 'staged://video-job/';

  if (raw.startsWith(prefix)) {
    const rest = raw.slice(prefix.length);
    const [jobId, fileName] = rest.split('/');

    if (jobId && fileName) {
      return `staged://${shortId(jobId)}/${fileName}`;
    }
  }

  return truncateMiddle(raw, 68);
}

function truncateMiddle(value, maxLength = 48) {
  const raw = String(value || '').trim();

  if (raw.length <= maxLength) {
    return raw;
  }

  const safeMax = Math.max(12, maxLength);
  const head = Math.ceil((safeMax - 1) * 0.58);
  const tail = Math.floor((safeMax - 1) * 0.42);

  return `${raw.slice(0, head)}…${raw.slice(-tail)}`;
}