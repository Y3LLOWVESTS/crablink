/**
 * RO:WHAT — Pure props-driven video draft workspace for the React-owned crab://video route.
 * RO:WHY — CrabLink refactor; reuses shared creator panels and keeps route state owned by VideoPage.
 * RO:INTERACTS — VideoPage.jsx, videoDraftModel.js, shared components, React shell app context.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no upload/stream claim; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — optional local passport/wallet display labels from app settings.
 * RO:SECURITY — trusted UI only; crab URLs remain inert strings; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://video route smoke.
 */

import { useMemo, useState } from 'react';
import ActionBar from '../../shared/components/ActionBar.jsx';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import DraftStatsPanel from '../../shared/components/DraftStatsPanel.jsx';
import Field from '../../shared/components/Field.jsx';
import ManifestPreviewPanel from '../../shared/components/ManifestPreviewPanel.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import VideoLocalPlaybackPreview from './VideoLocalPlaybackPreview.jsx';
import VideoPublishFlow from './VideoPublishFlow.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  VIDEO_ACCESS_OPTIONS,
  VIDEO_CATEGORY_OPTIONS,
  VIDEO_KIND_OPTIONS,
  VIDEO_LINKED_ASSET_FIELDS,
  VIDEO_MODERATION_OPTIONS,
  VIDEO_PAYOUT_OPTIONS,
  VIDEO_RENDITION_FIELDS,
  VIDEO_RIGHTS_OPTIONS,
  VIDEO_VIEW_OPTIONS,
  labelFromSnake,
} from './videoDraftModel.js';

export default function VideoDraft({ app, draftState }) {
  const {
    draft,
    updateDraft,
    clearDraft,
    viewMode,
    setViewMode,
    manifest,
    manifestJson,
    completeness,
  } = draftState;

  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [selectedVideoFacts, setSelectedVideoFacts] = useState(null);

  const publishFileFacts = useMemo(() => {
    if (selectedVideoFacts) {
      return selectedVideoFacts;
    }

    if (!selectedVideoFile) {
      return null;
    }

    return {
      name: selectedVideoFile.name || 'selected video',
      type: selectedVideoFile.type || 'video/mp4',
      size: selectedVideoFile.size || 0,
      lastModified: selectedVideoFile.lastModified || 0,
    };
  }, [selectedVideoFacts, selectedVideoFile]);

  function handleLocalPreviewFile(file, meta) {
    setSelectedVideoFile(file || null);
    setSelectedVideoFacts(meta || null);
  }

  return (
    <Card
      eyebrow="Local builder"
      title="Video draft"
      className="video-draft-card"
      actions={
        <SegmentedControl
          options={VIDEO_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Video workspace mode"
          size="sm"
        />
      }
    >
      <div className="video-draft-intro">
        <Badge tone="neutral">crab://video</Badge>
        <Badge tone="warning">Explicit paid mint</Badge>
        <Badge tone="neutral">No silent spend</Badge>
        <Badge tone="neutral">Local preview</Badge>
      </div>

      <div className="video-form-grid">
        <Field label="Video title" help="Creator-facing video title. This is local draft text only.">
          <TextInput
            value={draft.title}
            onChange={(event) => updateDraft('title', event.target.value)}
            placeholder="Example: My first CrabLink video"
          />
        </Field>

        <Field
          label="Creator display"
          help="Display label only. Backend identity truth must come from svc-gateway later."
        >
          <TextInput
            value={draft.creatorDisplay}
            onChange={(event) => updateDraft('creatorDisplay', event.target.value)}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
          />
        </Field>

        <Field label="Video kind" help="Planning field only; no backend schema is claimed here.">
          <select
            className="cl-select"
            value={draft.videoKind}
            onChange={(event) => updateDraft('videoKind', event.target.value)}
          >
            {VIDEO_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category" help="Future discovery/category intent only.">
          <select
            className="cl-select"
            value={draft.category}
            onChange={(event) => updateDraft('category', event.target.value)}
          >
            {VIDEO_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Language" help="Short language tag for future manifest metadata.">
          <TextInput
            value={draft.language}
            onChange={(event) => updateDraft('language', event.target.value)}
            placeholder="en"
            spellCheck={false}
          />
        </Field>

        <Field label="Duration" help="Use seconds, mm:ss, or hh:mm:ss. Parsed locally for preview only.">
          <TextInput
            value={draft.duration}
            onChange={(event) => updateDraft('duration', event.target.value)}
            placeholder="03:45"
            spellCheck={false}
          />
        </Field>

        <Field label="Resolution" help="Future rendition metadata; no video bytes are inspected here.">
          <TextInput
            value={draft.resolution}
            onChange={(event) => updateDraft('resolution', event.target.value)}
            placeholder="1920x1080"
            spellCheck={false}
          />
        </Field>

        <Field label="Aspect ratio" help="Future playback/card hint only.">
          <TextInput
            value={draft.aspectRatio}
            onChange={(event) => updateDraft('aspectRatio', event.target.value)}
            placeholder="16:9"
            spellCheck={false}
          />
        </Field>

        <Field label="Codec format" help="Planning field only; this route does not transcode media.">
          <select
            className="cl-select"
            value={draft.codecFormat}
            onChange={(event) => updateDraft('codecFormat', event.target.value)}
          >
            <option value="mp4_h264_aac">MP4 / H.264 / AAC</option>
            <option value="mp4_h265_aac">MP4 / H.265 / AAC</option>
            <option value="webm_vp9_opus">WebM / VP9 / Opus</option>
            <option value="webm_av1_opus">WebM / AV1 / Opus</option>
            <option value="source_unknown">Source unknown</option>
          </select>
        </Field>

        <Field label="Frame rate" help="Plain metadata draft. No playback validation happens here.">
          <TextInput
            value={draft.frameRate}
            onChange={(event) => updateDraft('frameRate', event.target.value)}
            placeholder="30"
            spellCheck={false}
          />
        </Field>

        <Field label="Color profile" help="Planning field for future player/rendition metadata.">
          <select
            className="cl-select"
            value={draft.colorProfile}
            onChange={(event) => updateDraft('colorProfile', event.target.value)}
          >
            <option value="standard_dynamic_range">Standard dynamic range</option>
            <option value="high_dynamic_range_future">High dynamic range future</option>
            <option value="monochrome_or_archival">Monochrome / archival</option>
            <option value="unknown">Unknown</option>
          </select>
        </Field>

        <Field label="Content warning" help="Optional local label for future moderation/review surfaces.">
          <TextInput
            value={draft.contentWarning}
            onChange={(event) => updateDraft('contentWarning', event.target.value)}
            placeholder="optional"
            maxLength={120}
          />
        </Field>
      </div>

      <Field label="Description" help="Plain text description for local manifest preview and future cards.">
        <TextArea
          value={draft.description}
          onChange={(event) => updateDraft('description', event.target.value)}
          rows={5}
          placeholder="Describe the video and what viewers should know..."
        />
      </Field>

      <VideoLocalPlaybackPreview
        draft={draft}
        updateDraft={updateDraft}
        onFileSelected={handleLocalPreviewFile}
      />

      <VideoPublishFlow
        app={app}
        draftState={draftState}
        selectedFile={selectedVideoFile}
        fileFacts={publishFileFacts}
      />

      <section className="video-form-section" aria-label="Video rendition references">
        <div className="video-form-section-head">
          <div>
            <p className="cl-eyebrow">Renditions</p>
            <h3>Independent video/audio variants</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            references only
          </Badge>
        </div>

        <div className="video-reference-grid">
          {VIDEO_RENDITION_FIELDS.map((item) => (
            <Field key={item.field} label={item.label} help={item.help}>
              <TextInput
                value={draft[item.field]}
                onChange={(event) => updateDraft(item.field, event.target.value)}
                placeholder={item.expectedKind === 'image' ? 'crab://<64 lowercase hex>.image' : `crab://<64 lowercase hex>.${item.expectedKind}`}
                spellCheck={false}
              />
            </Field>
          ))}
        </div>
      </section>

      <section className="video-form-section" aria-label="Video linked asset references">
        <div className="video-form-section-head">
          <div>
            <p className="cl-eyebrow">Linked assets</p>
            <h3>Poster, thumbnail, captions, dubs, and context</h3>
          </div>
          <Badge tone="neutral" uppercase={false}>
            immutable asset plan
          </Badge>
        </div>

        <div className="video-reference-grid">
          {VIDEO_LINKED_ASSET_FIELDS.map((item) => (
            <Field key={item.field} label={item.label} help={item.help}>
              <TextInput
                value={draft[item.field]}
                onChange={(event) => updateDraft(item.field, event.target.value)}
                placeholder={placeholderForKind(item.expectedKind)}
                spellCheck={false}
              />
            </Field>
          ))}
        </div>
      </section>

      <div className="video-form-grid">
        <Field label="Rights mode" help="Planning field only; no rights policy is enforced here.">
          <select
            className="cl-select"
            value={draft.rightsMode}
            onChange={(event) => updateDraft('rightsMode', event.target.value)}
          >
            {VIDEO_RIGHTS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Access mode" help="Planning field only; this route does not gate playback.">
          <select
            className="cl-select"
            value={draft.accessMode}
            onChange={(event) => updateDraft('accessMode', event.target.value)}
          >
            {VIDEO_ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payout mode" help="Planning field only; no ROC spend or payout route is active here.">
          <select
            className="cl-select"
            value={draft.payoutMode}
            onChange={(event) => updateDraft('payoutMode', event.target.value)}
          >
            {VIDEO_PAYOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Moderation mode" help="Planning field only; backend moderation is not active here.">
          <select
            className="cl-select"
            value={draft.moderationMode}
            onChange={(event) => updateDraft('moderationMode', event.target.value)}
          >
            {VIDEO_MODERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Tags"
        help="Comma-separated draft tags. These are not indexed until a real backend publish route exists."
      >
        <TextInput
          value={draft.tags}
          onChange={(event) => updateDraft('tags', event.target.value)}
          placeholder="video, demo, creator"
        />
      </Field>

      {viewMode === 'developer' && (
        <div className="video-inline-dev">
          <ManifestPreviewPanel
            manifest={manifest}
            label="crablink.local.video-draft.v1"
            title="Inline manifest"
            initiallyOpen={false}
          />
        </div>
      )}

      <ActionBar align="between" className="video-actions">
        <div className="video-action-status">
          <Badge tone={completeness === 100 ? 'success' : 'neutral'}>
            {completeness}% complete
          </Badge>
          <span>Local draft state</span>
        </div>

        <div className="video-action-buttons">
          <CopyButton
            text={manifestJson}
            label="Copy manifest JSON"
            successLabel="Manifest copied"
            errorLabel="Copy unavailable"
            variant="secondary"
          />
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
        </div>
      </ActionBar>
    </Card>
  );
}

export function VideoSidePanel({ draftState }) {
  const { draft, viewMode, stats, manifest, completeness } = draftState;
  const tags = manifest?.metadata?.tags || [];
  const renditions = manifest?.renditions || [];
  const linkedAssets = manifest?.linked_assets || [];

  return (
    <>
      <DraftStatsPanel
        completeness={completeness}
        stats={[
          { label: 'Description words', value: stats.description_words || 0 },
          { label: 'Tags', value: tags.length },
          { label: 'Crab links', value: stats.crab_links || 0 },
          { label: 'Renditions', value: renditions.length },
          { label: 'Linked assets', value: linkedAssets.length },
          { label: 'Duration min', value: stats.duration_minutes || 0 },
        ]}
        notes={['local draft', 'local preview optional', 'paid mint path']}
      />

      <RouteTruthPanel
        routeKind="video"
        tone="warning"
        title="Not backend truth"
        copy="The optional local player previews a selected file inside the WebView. The publish panel can send a bounded explicit paid upload through svc-gateway, but it still never creates fake CIDs, fake receipts, local balance truth, range streaming, transcoding, or DRM claims."
      />

      {viewMode === 'developer' ? (
        <ManifestPreviewPanel
          manifest={manifest}
          label="crablink.local.video-draft.v1"
          title="Manifest JSON"
          initiallyOpen
        />
      ) : (
        <Card eyebrow="Builder preview" title={draft.title || 'Untitled video'}>
          <article className="video-preview">
            <div className="video-preview-frame" aria-label="Video poster preview placeholder">
              <span>{draft.posterImageCrabUrl ? 'Poster reference set' : 'No poster image yet'}</span>
            </div>

            <p className="video-preview-meta">
              {manifest?.ownership?.owner_display || 'Unknown creator'} ·{' '}
              {manifest?.metadata?.language || 'en'} · {labelFromSnake(draft.videoKind)}
            </p>

            <div className="video-preview-tags">
              {draft.contentWarning ? (
                <Badge tone="warning" uppercase={false}>
                  CW: {draft.contentWarning}
                </Badge>
              ) : null}

              {tags.length > 0 ? (
                tags.map((tag) => (
                  <Badge key={tag} tone="neutral" uppercase={false}>
                    {tag}
                  </Badge>
                ))
              ) : (
                <Badge tone="neutral">No tags yet</Badge>
              )}
            </div>

            <p className="video-preview-description">
              {draft.description || 'Your video description preview will appear here.'}
            </p>

            <div className="video-preview-facts">
              <PreviewFact label="Resolution" value={draft.resolution} />
              <PreviewFact label="Aspect" value={draft.aspectRatio} />
              <PreviewFact label="Codec" value={labelFromSnake(draft.codecFormat)} />
              <PreviewFact label="Access" value={labelFromSnake(draft.accessMode)} />
            </div>

            <ReferenceList
              title="Rendition plan"
              items={renditions}
              empty="No rendition references yet."
            />
            <ReferenceList
              title="Linked asset plan"
              items={linkedAssets}
              empty="No linked asset references yet."
            />
          </article>
        </Card>
      )}
    </>
  );
}

function PreviewFact({ label, value }) {
  return (
    <div className="video-preview-fact">
      <span>{label}</span>
      <strong>{value || 'Not set'}</strong>
    </div>
  );
}

function ReferenceList({ title, items, empty }) {
  return (
    <section className="video-reference-list">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <span key={`${item.role}-${item.crab_url}`}>
              {labelFromSnake(item.role)} · {item.expected_kind}
            </span>
          ))}
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function placeholderForKind(kind) {
  if (kind === 'site') {
    return 'crab://example-site';
  }

  return `crab://<64 lowercase hex>.${kind}`;
}