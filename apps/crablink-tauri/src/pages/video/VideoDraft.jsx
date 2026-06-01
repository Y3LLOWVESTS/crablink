/**
 * RO:WHAT — Simple video mint form for the React-owned crab://video route.
 * RO:WHY — Mirrors the clean image Simple Mint flow while keeping video prepare/mint truth explicit.
 * RO:INTERACTS — VideoPage.jsx, videoDraftModel.js, VideoConverterPanel, VideoPublishFlow.
 * RO:INVARIANTS — local preview only; no fake b3 CID; no fake manifest CID; no upload/stream claim; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport/wallet display labels from app settings.
 * RO:SECURITY — trusted UI only; crab URLs remain inert strings; no direct internal-service calls.
 * RO:TEST — npm run build; manual crab://video source → prepare → hold → staged upload smoke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import ManifestPreviewPanel from '../../shared/components/ManifestPreviewPanel.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import VideoConverterPanel from './VideoConverterPanel.jsx';
import VideoPublishFlow from './VideoPublishFlow.jsx';
import {
  VIDEO_ACCESS_OPTIONS,
  VIDEO_CATEGORY_OPTIONS,
  VIDEO_KIND_OPTIONS,
  VIDEO_LINKED_ASSET_FIELDS,
  VIDEO_MODERATION_OPTIONS,
  VIDEO_PAYOUT_OPTIONS,
  VIDEO_RENDITION_FIELDS,
  VIDEO_RIGHTS_OPTIONS,
} from './videoDraftModel.js';

const MAX_LOCAL_PREVIEW_BYTES = 750 * 1024 * 1024;

export default function VideoDraft({ app, draftState }) {
  const {
    draft,
    updateDraft,
    clearDraft,
    manifest,
  } = draftState;

  const inputRef = useRef(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedVideoFacts, setSelectedVideoFacts] = useState(null);
  const [selectedPlaybackMeta, setSelectedPlaybackMeta] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewProblem, setPreviewProblem] = useState('');

  useEffect(() => {
    if (!selectedVideoFile) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedVideoFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedVideoFile]);

  const publishFileFacts = useMemo(() => {
    if (!selectedVideoFacts && !selectedPlaybackMeta) {
      return null;
    }

    return {
      ...(selectedVideoFacts || {}),
      durationSeconds: selectedPlaybackMeta?.durationSeconds || selectedVideoFacts?.durationSeconds || 0,
      durationLabel: selectedPlaybackMeta?.durationLabel || selectedVideoFacts?.durationLabel || '',
      width: selectedPlaybackMeta?.width || selectedVideoFacts?.width || 0,
      height: selectedPlaybackMeta?.height || selectedVideoFacts?.height || 0,
      resolution: selectedPlaybackMeta?.resolution || selectedVideoFacts?.resolution || '',
      aspectRatio: selectedPlaybackMeta?.aspectRatio || selectedVideoFacts?.aspectRatio || '',
    };
  }, [selectedPlaybackMeta, selectedVideoFacts]);

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setPreviewProblem('');
    setSelectedPlaybackMeta(null);

    if (!file) {
      clearSelectedFile();
      return;
    }

    if (file.size > MAX_LOCAL_PREVIEW_BYTES) {
      setPreviewProblem(`Local preview is capped at ${formatBytes(MAX_LOCAL_PREVIEW_BYTES)}. Use the Rust native source picker below for large-source preparation.`);
      setSelectedVideoFile(null);
      setSelectedVideoFacts({
        name: file.name || 'selected video',
        fileName: file.name || 'selected video',
        type: file.type || 'video/mp4',
        contentType: file.type || 'video/mp4',
        size: file.size || 0,
        bytes: file.size || 0,
        lastModified: file.lastModified || 0,
      });
      return;
    }

    setSelectedVideoFile(file);
    setSelectedVideoFacts({
      name: file.name || 'selected video',
      fileName: file.name || 'selected video',
      type: file.type || 'video/mp4',
      contentType: file.type || 'video/mp4',
      size: file.size || 0,
      bytes: file.size || 0,
      lastModified: file.lastModified || 0,
    });
  }

  function clearSelectedFile() {
    setSelectedVideoFile(null);
    setSelectedVideoFacts(null);
    setSelectedPlaybackMeta(null);
    setPreviewProblem('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function handleLoadedMetadata(event) {
    const video = event.currentTarget;
    const duration = Number(video.duration);
    const width = Number(video.videoWidth);
    const height = Number(video.videoHeight);
    const durationLabel = Number.isFinite(duration) && duration > 0 ? formatDurationLabel(duration) : '';
    const resolution = width > 0 && height > 0 ? `${Math.round(width)}x${Math.round(height)}` : '';
    const aspectRatio = width > 0 && height > 0 ? aspectRatioFor(width, height) : '';

    const nextMeta = {
      durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
      durationLabel,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : 0,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : 0,
      resolution,
      aspectRatio,
    };

    setSelectedPlaybackMeta(nextMeta);

    if (durationLabel && !draft.duration) {
      updateDraft('duration', durationLabel);
    }

    if (resolution && !draft.resolution) {
      updateDraft('resolution', resolution);
    }

    if (aspectRatio && !draft.aspectRatio) {
      updateDraft('aspectRatio', aspectRatio);
    }
  }

  return (
    <section className="video-one-card-shell" aria-label="Simple video mint">
      <Card
        eyebrow="Simple Mint"
        title="Video bundle"
        className="video-simple-mint-card"
        actions={
          <div className="video-simple-card-actions">
            <Badge tone={selectedVideoFacts ? 'success' : 'neutral'}>
              {selectedVideoFacts ? 'Source selected' : 'No source'}
            </Badge>
            <Badge tone="warning">Local until mint</Badge>
          </div>
        }
      >
        <section
          className={previewUrl ? 'video-drop-preview has-video' : 'video-drop-preview'}
          aria-label="Select video preview"
        >
          {previewUrl ? (
            <video src={previewUrl} controls preload="metadata" playsInline onLoadedMetadata={handleLoadedMetadata}>
              Your browser/WebView cannot play this local video file.
            </video>
          ) : (
            <div className="video-drop-empty">
              <strong>No video selected</strong>
              <span>Choose a video to preview it before preparing MP4 versions.</span>
            </div>
          )}

          <div className="video-drop-overlay">
            <label className="video-hover-select">
              {previewUrl ? 'Change video' : 'Choose video'}
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,.mp4,.webm,.ogv,.ogg,.mov,.m4v"
                onChange={handleFileChange}
              />
            </label>

            {selectedVideoFacts && (
              <Button variant="secondary" onClick={clearSelectedFile}>
                Clear
              </Button>
            )}
          </div>
        </section>

        {previewProblem ? (
          <div className="video-preview-problem" role="alert">
            {previewProblem}
          </div>
        ) : null}

        <div className="video-file-line">
          <span>{publishFileFacts?.name || 'No local file selected'}</span>
          <strong>{publishFileFacts?.size ? formatBytes(publishFileFacts.size) : 'Choose video'}</strong>
        </div>

        <section className="video-under-preview-form" aria-label="Video mint details">
          <div className="video-form-grid video-simple-fields">
            <Field label="Title" help="Shown on the video card and manifest preview.">
              <TextInput
                value={draft.title}
                onChange={updateField('title')}
                placeholder="Example: My first CrabLink video"
                maxLength={140}
              />
            </Field>

            <Field label="Description" help="Short creator-facing description.">
              <TextArea
                value={draft.description}
                onChange={updateField('description')}
                rows={3}
                placeholder="Describe the video and what viewers should know..."
                maxLength={1000}
              />
            </Field>
          </div>

          <details className="video-inline-advanced video-inline-advanced-slim">
            <summary>
              <span>
                <strong>Advanced fields</strong>
                <small>Tags, creator display, kind, rights, access, and metadata hints</small>
              </span>
            </summary>

            <div className="video-inline-advanced-body">
              <div className="video-form-grid">
                <Field label="Tags" help="Comma-separated local tags.">
                  <TextInput value={draft.tags} onChange={updateField('tags')} placeholder="video, demo, creator" />
                </Field>

                <Field label="Creator display" help="Display label only. Backend identity truth comes from gateway/passport services.">
                  <TextInput
                    value={draft.creatorDisplay}
                    onChange={updateField('creatorDisplay')}
                    placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
                    maxLength={90}
                  />
                </Field>

                <Field label="Video kind" help="Planning field only.">
                  <select value={draft.videoKind} onChange={updateField('videoKind')}>
                    {VIDEO_KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Category" help="Future discovery/category intent only.">
                  <select value={draft.category} onChange={updateField('category')}>
                    {VIDEO_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Language" help="Short language tag for future manifest metadata.">
                  <TextInput value={draft.language} onChange={updateField('language')} placeholder="en" spellCheck={false} />
                </Field>

                <Field label="Duration" help="Use seconds, mm:ss, or hh:mm:ss. Parsed locally for preview only.">
                  <TextInput value={draft.duration} onChange={updateField('duration')} placeholder="03:45" spellCheck={false} />
                </Field>

                <Field label="Resolution" help="Future rendition metadata.">
                  <TextInput value={draft.resolution} onChange={updateField('resolution')} placeholder="1920x1080" spellCheck={false} />
                </Field>

                <Field label="Aspect ratio" help="Future playback/card hint only.">
                  <TextInput value={draft.aspectRatio} onChange={updateField('aspectRatio')} placeholder="16:9" spellCheck={false} />
                </Field>

                <Field label="Rights mode" help="Planning field only; backend policy is not enforced here.">
                  <select value={draft.rightsMode} onChange={updateField('rightsMode')}>
                    {VIDEO_RIGHTS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Access mode" help="Planning field only; paid playback gates are backend-derived.">
                  <select value={draft.accessMode} onChange={updateField('accessMode')}>
                    {VIDEO_ACCESS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Payout mode" help="Planning field only; no ROC payout route is active here.">
                  <select value={draft.payoutMode} onChange={updateField('payoutMode')}>
                    {VIDEO_PAYOUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Moderation mode" help="Planning field only; backend moderation is not active here.">
                  <select value={draft.moderationMode} onChange={updateField('moderationMode')}>
                    {VIDEO_MODERATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </details>
        </section>

        <div className="video-simple-footer-actions">
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
          <span>
            Backend truth starts after prepare, ROC confirmation, and gateway mint response.
          </span>
        </div>
      </Card>

      <details className="video-advanced-drawer video-advanced-drawer-quiet">
        <summary>
          <span>
            <strong>Prepare MP4 versions</strong>
            <small>Use Rust to stage the master, device versions, poster, and thumbnail before minting.</small>
          </span>
        </summary>

        <div className="video-advanced-stack">
          <VideoConverterPanel
            selectedFileFacts={publishFileFacts}
            playbackMeta={selectedPlaybackMeta}
            draft={draft}
          />
        </div>
      </details>

      <VideoPublishFlow
        app={app}
        draftState={draftState}
        selectedFile={selectedVideoFile}
        fileFacts={publishFileFacts}
      />

      <details className="video-advanced-drawer video-advanced-drawer-quiet">
        <summary>
          <span>
            <strong>Advanced video options</strong>
            <small>Manual rendition references, linked assets, manifest preview, and route truth</small>
          </span>
        </summary>

        <div className="video-advanced-stack">
          <section className="video-advanced-mini-section">
            <div className="video-form-section-head">
              <div>
                <p className="cl-eyebrow">Manual references</p>
                <h3>Renditions and linked assets</h3>
              </div>
              <Badge tone="neutral">Optional</Badge>
            </div>

            <div className="video-reference-grid">
              {VIDEO_RENDITION_FIELDS.map((item) => (
                <Field key={item.field} label={item.label} help={item.help}>
                  <TextInput
                    value={draft[item.field]}
                    onChange={updateField(item.field)}
                    placeholder={placeholderForKind(item.expectedKind)}
                    spellCheck={false}
                  />
                </Field>
              ))}

              {VIDEO_LINKED_ASSET_FIELDS.map((item) => (
                <Field key={item.field} label={item.label} help={item.help}>
                  <TextInput
                    value={draft[item.field]}
                    onChange={updateField(item.field)}
                    placeholder={placeholderForKind(item.expectedKind)}
                    spellCheck={false}
                  />
                </Field>
              ))}
            </div>
          </section>

          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.video-draft.v1"
            title="Local video manifest"
            initiallyOpen={false}
          />

          <RouteTruthPanel
            routeKind="video"
            tone="info"
            title="Video route truth boundary"
            copy="This MVP prepares local MP4/JPEG outputs through Rust and mints selected outputs through gateway routes. Backend CIDs and crab URLs are accepted only from gateway responses."
            allowed={[
              'local video preview',
              'Rust-owned source registration',
              'Rust-staged MP4/JPEG outputs',
              'prepare quote using selected staged output bytes',
              'explicit ROC hold',
              'paid /assets/video and /assets/image upload',
              'backend-returned crab URL display',
              'wallet refresh after mutation',
            ]}
            blocked={[
              'no silent ROC spend',
              'no fake b3 CID',
              'no fake video URL',
              'no fake manifest CID',
              'no fake receipt',
              'no direct storage/index/ledger call',
              'no private path in React state',
              'no DRM or anti-rip claim',
            ]}
          />
        </div>
      </details>
    </section>
  );
}

export function VideoSidePanel() {
  return null;
}

function placeholderForKind(kind) {
  if (kind === 'site') {
    return 'crab://example-site';
  }

  return `crab://<64 lowercase hex>.${kind}`;
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

function aspectRatioFor(width, height) {
  const w = Math.round(Number(width || 0));
  const h = Math.round(Number(height || 0));

  if (!w || !h) {
    return '';
  }

  const divisor = gcd(w, h);
  return `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }

  return x || 1;
}
