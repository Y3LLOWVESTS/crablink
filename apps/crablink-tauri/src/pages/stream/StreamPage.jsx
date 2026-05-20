/**
 * RO:WHAT — Route owner for the React crab://stream Creator Studio.
 * RO:WHY — Keeps the stream page focused on actual studio work: preview, saved scenes, local look controls, access, publish, and session controls.
 * RO:INTERACTS — StreamLocalPreview, StreamLookPanel, StreamGoLivePanel, StreamMediaReadiness, StreamChatPlaceholder, StreamDraft, StreamPricingPanel, StreamSessionPanel, StreamPublishFlow, JsonPreview, streamStudioModel.
 * RO:INVARIANTS — local studio/look state is display/capture UX only; backend owns b3 CID, stream URL, receipt, stream_id, live status, and viewer entitlement.
 * RO:METRICS — gateway route calls inside StreamPublishFlow/StreamSessionPanel preserve correlation diagnostics.
 * RO:CONFIG — app settings may prefill creator/passport/wallet labels; saved scenes/look settings are local preferences only.
 * RO:SECURITY — explicit media permission; explicit paid hold; no stream keys, local paths, media blobs, arbitrary crab execution, fake receipts, or silent spend.
 * RO:TEST — npm run build; check:rust:mac-media; manual crab://stream camera preview → background/green-screen controls → save/apply scene → publish descriptor → backend proof → Visitor B paid latest segment smoke.
 */

import { useMemo, useState } from 'react';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StreamChatPlaceholder from './StreamChatPlaceholder.jsx';
import StreamDraft from './StreamDraft.jsx';
import StreamGoLivePanel from './StreamGoLivePanel.jsx';
import StreamLocalPreview from './StreamLocalPreview.jsx';
import StreamLookPanel from './StreamLookPanel.jsx';
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
} from './streamDraftModel.js';
import {
  BUILTIN_STUDIO_SCENES,
  applyStudioPresetToDraft,
  createStudioPresetFromDraft,
  deleteSavedStudioPreset,
  isLocalStudioPreset,
  readSavedStudioPresets,
  upsertSavedStudioPreset,
} from './streamStudioModel.js';
import './stream.css';

export default function StreamPage({ app, route }) {
  const [draft, setDraft] = useState(() => buildInitialDraft(app));
  const [previewState, setPreviewState] = useState(DEFAULT_PREVIEW_STATE);
  const [mediaReport, setMediaReport] = useState(null);
  const [publishedStream, setPublishedStream] = useState(null);
  const [viewMode, setViewMode] = useState('studio');
  const [studioSceneId, setStudioSceneId] = useState('camera');
  const [savedScenes, setSavedScenes] = useState(() => readSavedStudioPresets());
  const [presetName, setPresetName] = useState('');
  const [copyState, setCopyState] = useState('');
  const [presetState, setPresetState] = useState('');
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);

  const allStudioScenes = useMemo(
    () => [...BUILTIN_STUDIO_SCENES, ...savedScenes],
    [savedScenes],
  );

  const selectedScene =
    allStudioScenes.find((scene) => scene.id === studioSceneId) ||
    BUILTIN_STUDIO_SCENES[0];

  const selectedSceneIsSaved = isLocalStudioPreset(selectedScene);

  const stats = useMemo(() => buildStreamStats(draft, previewState), [draft, previewState]);
  const manifest = useMemo(
    () => buildStreamManifest(draft, stats, route, previewState),
    [draft, stats, route, previewState],
  );

  const pricing = stats.pricing || {};
  const previewActive = previewState.status === 'previewing';

  function scrollToSelector(selector) {
    window.requestAnimationFrame(() => {
      const node = document.querySelector(selector);
      node?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    });
  }

  function showPreview() {
    setViewMode('studio');
    scrollToSelector('.cl-stream-local-preview, .cl-stream-preview-card, .cl-stream-stage');
  }

  function openPublishControls() {
    setViewMode('studio');
    setAdvancedControlsOpen(true);
    scrollToSelector('[data-stream-publish-controls="true"]');
  }

  function openSessionControls() {
    setViewMode('studio');
    setAdvancedControlsOpen(true);
    scrollToSelector('[data-stream-session-controls="true"]');
  }

  function openSetup() {
    setViewMode('setup');
    scrollToSelector('.cl-stream-setup-stack');
  }

  function openDeveloper() {
    setViewMode('developer');
    scrollToSelector('.cl-stream-developer-grid');
  }

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
    setPublishedStream(null);
    setStudioSceneId('camera');
    setPresetName('');
    setAdvancedControlsOpen(false);
    setCopyState('Local stream draft cleared');
    window.setTimeout(() => setCopyState(''), 1800);
  }

  function applyStudioScene(scene) {
    setStudioSceneId(scene.id);
    setDraft((current) => applyStudioPresetToDraft(current, scene));
  }

  function saveCurrentScene() {
    const preset = createStudioPresetFromDraft({
      name: presetName || selectedScene?.title || 'Saved scene',
      draft,
      basePreset: selectedScene,
    });

    const next = upsertSavedStudioPreset(preset);
    setSavedScenes(next);
    setStudioSceneId(preset.id);
    setPresetName('');

    const warning = preset.storageWarning ? ` ${preset.storageWarning}` : '';
    setPresetState(`Saved scene preset: ${preset.name}.${warning}`);
    window.setTimeout(() => setPresetState(''), warning ? 5200 : 2400);
  }

  function deleteSelectedScene() {
    if (!selectedSceneIsSaved) {
      setPresetState('Built-in scenes cannot be deleted.');
      window.setTimeout(() => setPresetState(''), 2000);
      return;
    }

    const next = deleteSavedStudioPreset(selectedScene.id);
    setSavedScenes(next);
    setStudioSceneId('camera');
    setPresetState(`Deleted saved scene: ${selectedScene.name}`);
    window.setTimeout(() => setPresetState(''), 2400);
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
    <section className="cl-stream-page cl-stream-studio-page cl-stream-studio-page-minimal">
      <div className="cl-stream-toolbar cl-stream-studio-toolbar cl-stream-studio-toolbar-minimal">
        <div className="cl-stream-toggle" role="group" aria-label="Stream view mode">
          <button
            type="button"
            className={viewMode === 'studio' ? 'is-active' : ''}
            onClick={() => setViewMode('studio')}
          >
            Studio
          </button>
          <button
            type="button"
            className={viewMode === 'setup' ? 'is-active' : ''}
            onClick={() => setViewMode('setup')}
          >
            Setup
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

      <div className="cl-stream-control-room cl-stream-studio-shell">
        <main className="cl-stream-studio-main">
          <StreamLocalPreview
            draft={draft}
            onChange={setDraft}
            onPreviewStateChange={setPreviewState}
            mediaReport={mediaReport}
            onMediaProbe={onMediaProbe}
          />

          <section className="cl-stream-scene-dock" aria-label="Scene and source picker">
            <div className="cl-stream-scene-grid">
              {allStudioScenes.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className={`cl-stream-scene-card ${studioSceneId === scene.id ? 'is-active' : ''} ${
                    scene.origin === 'local' ? 'is-saved' : ''
                  }`}
                  onClick={() => applyStudioScene(scene)}
                >
                  <span>{scene.origin === 'local' ? 'Saved' : scene.name}</span>
                  <strong>{scene.title}</strong>
                  <small>{scene.short}</small>
                </button>
              ))}
            </div>

            <div className="cl-stream-preset-manager">
              <label>
                <span>Save local scene</span>
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder={selectedScene?.title || 'My stream scene'}
                  maxLength={48}
                />
              </label>

              <button type="button" onClick={saveCurrentScene}>
                Save scene
              </button>

              <button type="button" onClick={deleteSelectedScene} disabled={!selectedSceneIsSaved}>
                Delete saved
              </button>

              <small>
                Local preference only. No stream key, wallet secret, receipt, entitlement, or live
                backend session is saved.
              </small>
            </div>

            {presetState ? (
              <p className="cl-stream-info" role="status">
                {presetState}
              </p>
            ) : null}
          </section>

          {viewMode === 'setup' ? (
            <div className="cl-stream-setup-stack">
              <StreamDraft draft={draft} onChange={setDraft} stats={stats} />

              {draft.podcastMode !== 'disabled' ? (
                <StreamPodcastMode draft={draft} onChange={setDraft} stats={stats} />
              ) : null}

              <StreamChatPlaceholder draft={draft} onChange={setDraft} />
            </div>
          ) : null}

          {viewMode === 'developer' ? (
            <div className="cl-stream-developer-grid">
              <section className="cl-stream-panel">
                <div className="cl-stream-panel-head">
                  <div>
                    <p className="cl-eyebrow">Developer</p>
                    <h2>Local descriptor preview</h2>
                    <p>
                      Local planning JSON only. Backend must return canonical CID, stream ID, crab
                      URL, receipt, and live status before CrabLink displays them as truth.
                    </p>
                  </div>
                </div>
                <JsonPreview value={manifest} />
              </section>

              <StreamMediaReadiness report={mediaReport} onReport={setMediaReport} />

              <section className="cl-stream-panel cl-stream-route-debug">
                <p className="cl-eyebrow">Truth boundary</p>
                <h3>Not claimed locally</h3>
                <dl>
                  <DebugRow label="b3 CID" value="backend required" />
                  <DebugRow label="Stream URL" value="backend required" />
                  <DebugRow label="Live status" value="backend required" />
                  <DebugRow label="Viewer count" value="backend required" />
                  <DebugRow label="Paid unlock" value="backend receipt required" />
                </dl>
              </section>
            </div>
          ) : null}
        </main>

        <aside className="cl-stream-studio-side" aria-label="Creator controls">
          <StreamGoLivePanel
            draft={draft}
            pricing={pricing}
            previewState={previewState}
            publishedStream={publishedStream}
            onShowPreview={showPreview}
            onOpenPublishControls={openPublishControls}
            onOpenSessionControls={openSessionControls}
            onOpenSetup={openSetup}
            onOpenDeveloper={openDeveloper}
          />

          <StreamLookPanel draft={draft} onChange={setDraft} />

          <StreamPricingPanel draft={draft} onChange={setDraft} pricing={pricing} />

          <details
            className="cl-stream-advanced-live-controls"
            open={advancedControlsOpen}
            onToggle={(event) => setAdvancedControlsOpen(event.currentTarget.open)}
          >
            <summary>
              <span>Explicit publish and backend controls</span>
              <small>
                Prepare, ROC hold, descriptor publish, backend session, and frame loop remain visible
                here for auditability.
              </small>
            </summary>

            <div className="cl-stream-advanced-live-stack">
              <div data-stream-publish-controls="true">
                <StreamPublishFlow
                  app={app}
                  draft={draft}
                  previewState={previewState}
                  pricing={pricing}
                  manifest={manifest}
                  onPublishedStream={setPublishedStream}
                />
              </div>

              <div data-stream-session-controls="true">
                <StreamSessionPanel
                  app={app}
                  draft={draft}
                  previewState={previewState}
                  pricing={pricing}
                  publishedStream={publishedStream}
                />
              </div>
            </div>
          </details>

          {!advancedControlsOpen && publishedStream ? (
            <p className="cl-stream-info">
              Descriptor published. Open Go Live controls to start the backend stream-lite session
              and frame loop.
            </p>
          ) : null}

          {!advancedControlsOpen && !publishedStream ? (
            <p className="cl-stream-info">
              Publish controls are collapsed to keep the Studio clean. Open them when you are ready
              for explicit ROC hold and descriptor publishing.
            </p>
          ) : null}
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
    backgroundMode: DEFAULT_STREAM_DRAFT.backgroundMode || 'none',
    backgroundSolidColor: DEFAULT_STREAM_DRAFT.backgroundSolidColor || '#111111',
    greenScreenEnabled: DEFAULT_STREAM_DRAFT.greenScreenEnabled || false,
    greenScreenKeyColor: DEFAULT_STREAM_DRAFT.greenScreenKeyColor || '#00ff00',
    greenScreenTolerance: DEFAULT_STREAM_DRAFT.greenScreenTolerance || 34,
    greenScreenFeather: DEFAULT_STREAM_DRAFT.greenScreenFeather || 8,
    greenScreenSpillReduction: DEFAULT_STREAM_DRAFT.greenScreenSpillReduction || 10,
  };
}