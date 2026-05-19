/**
 * RO:WHAT — Route owner for the React crab://stream creator control room.
 * RO:WHY — Adds the stream descriptor publish lane while keeping live media/session/payment truth backend-owned.
 * RO:INTERACTS — StreamLocalPreview, StreamMediaReadiness, StreamChatPlaceholder, StreamDraft, StreamPricingPanel, StreamSessionPanel, StreamPublishFlow, JsonPreview.
 * RO:INVARIANTS — local preview is not backend live; only backend may return b3 CID, stream URL, receipt, stream_id, live status, or viewer entitlement.
 * RO:METRICS — gateway route calls inside StreamPublishFlow preserve correlation diagnostics.
 * RO:CONFIG — app settings may prefill creator/passport/wallet labels; no spend authority is stored here.
 * RO:SECURITY — explicit media permission; explicit paid hold; no stream keys, local paths, media blobs, or arbitrary crab execution.
 * RO:TEST — npm run build; check-tauri; manual crab://stream camera preview + descriptor publish smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StreamChatPlaceholder from './StreamChatPlaceholder.jsx';
import StreamDraft from './StreamDraft.jsx';
import StreamLocalPreview from './StreamLocalPreview.jsx';
import StreamMediaReadiness from './StreamMediaReadiness.jsx';
import StreamPodcastMode from './StreamPodcastMode.jsx';
import StreamPricingPanel from './StreamPricingPanel.jsx';
import StreamPublishFlow from './StreamPublishFlow.jsx';
import StreamSessionPanel from './StreamSessionPanel.jsx';
import {
  DEFAULT_PREVIEW_STATE,
  DEFAULT_STREAM_DRAFT,
  buildStreamManifest,
  buildStreamStats,
  labelFromSnake,
} from './streamDraftModel.js';
import './stream.css';

export default function StreamPage({ app, route }) {
  const [draft, setDraft] = useState(() => buildInitialDraft(app));
  const [previewState, setPreviewState] = useState(DEFAULT_PREVIEW_STATE);
  const [mediaReport, setMediaReport] = useState(null);
  const [viewMode, setViewMode] = useState('builder');
  const [copyState, setCopyState] = useState('');

  const stats = useMemo(() => buildStreamStats(draft, previewState), [draft, previewState]);
  const manifest = useMemo(
    () => buildStreamManifest(draft, stats, route, previewState),
    [draft, stats, route, previewState],
  );
  const pricing = stats.pricing || {};

  async function copyManifest() {
    const json = JSON.stringify(manifest, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      setCopyState('Copied local stream manifest JSON');
    } catch (_error) {
      setCopyState('Clipboard unavailable in this WebView');
    }

    window.setTimeout(() => setCopyState(''), 2200);
  }

  function clearDraft() {
    setDraft(buildInitialDraft(app));
    setPreviewState(DEFAULT_PREVIEW_STATE);
    setCopyState('Local stream draft cleared');
    window.setTimeout(() => setCopyState(''), 1800);
  }

  function onMediaProbe(webviewProbe) {
    setMediaReport((current) => ({
      ...(current || {
        schema: 'crablink.stream-media-readiness-report.v1',
        generatedAt: new Date().toISOString(),
        safeFallback: 'local_video_file_rehearsal_preview',
      }),
      webviewProbe,
      canAttemptCamera: Boolean(webviewProbe?.apis?.getUserMedia),
      canAttemptScreen: Boolean(webviewProbe?.apis?.getDisplayMedia),
    }));
  }

  return (
    <section className="cl-stream-page" aria-labelledby="cl-stream-title">
      <header className="cl-stream-hero">
        <div>
          <p className="cl-eyebrow">crab://stream</p>
          <h1 id="cl-stream-title">Stream Control Room</h1>
          <p>
            Create the descriptor for a future backend stream, keep local camera preview honest, and
            model manual ROC interval access. The stream URL, b3 CID, receipt, stream ID, live
            status, and viewer unlock must come from the backend.
          </p>
        </div>

        <aside className="cl-stream-route-card" aria-label="Route owner">
          <span>Route owner</span>
          <strong>StreamPage.jsx</strong>
          <small>Tauri-first · descriptor mint lane · backend truth only</small>
        </aside>
      </header>

      <div className="cl-stream-principles" aria-label="Stream invariants">
        <Principle
          title="Descriptor, not live bytes"
          copy="crab://<hash>.stream should identify a backend-confirmed stream descriptor. Live segments are mutable backend session state."
        />
        <Principle
          title="Manual ROC renew"
          copy="Viewer access starts with an explicit backend payment receipt and paid_until window. No hidden recurring spend."
        />
        <Principle
          title="Preview stays local"
          copy="Camera/screen/file preview helps creators compose the stream, but it does not prove b3, live status, viewer count, or paid unlock."
        />
      </div>

      <div className="cl-stream-status-strip" aria-label="Current stream state">
        <StatusChip label="Preview" value={previewState.label || 'No local preview'} />
        <StatusChip label="Policy" value={pricing.summary || 'Manual interval'} />
        <StatusChip label="Backend" value="Descriptor routes required" />
        <StatusChip label="Viewer" value="Receipt-gated later" />
      </div>

      <div className="cl-stream-toolbar">
        <div className="cl-stream-toggle" role="group" aria-label="Stream view mode">
          <button
            type="button"
            className={viewMode === 'builder' ? 'is-active' : ''}
            onClick={() => setViewMode('builder')}
          >
            Builder
          </button>
          <button
            type="button"
            className={viewMode === 'developer' ? 'is-active' : ''}
            onClick={() => setViewMode('developer')}
          >
            Developer
          </button>
        </div>

        <div className="cl-stream-action-row">
          <button type="button" onClick={copyManifest}>
            Copy local manifest
          </button>
          <button type="button" onClick={clearDraft}>
            Clear draft
          </button>
        </div>
      </div>

      <div className="cl-stream-layout">
        <main className="cl-stream-main">
          <StreamLocalPreview
            draft={draft}
            onChange={setDraft}
            onPreviewStateChange={setPreviewState}
            mediaReport={mediaReport}
            onMediaProbe={onMediaProbe}
          />

          <StreamPublishFlow
            app={app}
            draft={draft}
            previewState={previewState}
            pricing={pricing}
            manifest={manifest}
          />

          <StreamDraft draft={draft} onChange={setDraft} stats={stats} />

          {draft.podcastMode !== 'disabled' ? (
            <StreamPodcastMode draft={draft} onChange={setDraft} stats={stats} />
          ) : null}

          {viewMode === 'developer' ? (
            <section className="cl-stream-panel">
              <div className="cl-stream-panel-head">
                <div>
                  <p className="cl-eyebrow">Developer</p>
                  <h2>Local descriptor preview</h2>
                  <p>
                    This is local planning JSON only. Backend must return canonical CID, stream ID,
                    crab URL, receipt, and live status before CrabLink displays them as truth.
                  </p>
                </div>
              </div>
              <JsonPreview value={manifest} />
            </section>
          ) : null}
        </main>

        <aside className="cl-stream-side" aria-label="Stream side panels">
          <StreamPricingPanel draft={draft} onChange={setDraft} pricing={pricing} />

          <StreamSessionPanel draft={draft} previewState={previewState} pricing={pricing} />

          <StreamMediaReadiness report={mediaReport} onReport={setMediaReport} />

          <StreamChatPlaceholder draft={draft} onChange={setDraft} />

          <section className="cl-stream-panel cl-stream-route-debug">
            <p className="cl-eyebrow">Truth boundary</p>
            <h3>Not claimed locally</h3>
            <dl>
              <DebugRow label="b3 CID" value="backend required" />
              <DebugRow label="Stream URL" value="backend required" />
              <DebugRow label="Live status" value="backend required" />
              <DebugRow label="Viewer count" value="backend required" />
              <DebugRow label="Paid unlock" value="backend receipt required" />
              <DebugRow label="Route kind" value={labelFromSnake(route?.kind || 'stream')} />
            </dl>
          </section>
        </aside>
      </div>

      {copyState ? (
        <p className="cl-stream-info" role="status">
          {copyState}
        </p>
      ) : null}
    </section>
  );
}

function Principle({ title, copy }) {
  return (
    <article className="cl-stream-principle">
      <strong>{title}</strong>
      <span>{copy}</span>
    </article>
  );
}

function StatusChip({ label, value }) {
  return (
    <div className="cl-stream-status-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DebugRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function buildInitialDraft(app) {
  const settings = app?.settings || {};
  const passport = settings.passportSubject || settings.passport || '';
  const wallet = settings.walletAccount || '';
  const display = settings.handle || settings.username || passport || '';

  return {
    ...DEFAULT_STREAM_DRAFT,
    hostDisplay: DEFAULT_STREAM_DRAFT.hostDisplay || display,
    channelDisplay: DEFAULT_STREAM_DRAFT.channelDisplay || display,
    creatorWalletAccount: DEFAULT_STREAM_DRAFT.creatorWalletAccount || wallet,
  };
}