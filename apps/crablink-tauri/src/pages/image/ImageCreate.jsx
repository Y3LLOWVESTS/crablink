/**
 * RO:WHAT — Image metadata and file-selection form for crab://image.
 * RO:WHY — Gives image route a real React workspace feeding local preview, rendition planning, and explicit publish flow.
 * RO:INTERACTS — ImagePage.jsx, ImagePublishFlow.jsx, ImageRenditions.jsx, imageDraftModel.js, shared form/card/button components.
 * RO:INVARIANTS — selected file preview is local until explicit upload; no fake b3 CID; no fake manifest CID; no silent wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display-only identity hints.
 * RO:SECURITY — file selection alone never uploads; publish panel performs explicit paid actions only.
 * RO:TEST — manual crab://image builder/developer/publish route smoke; scripts/check-tauri.sh.
 */

import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import SegmentedControl from '../../shared/components/SegmentedControl.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import {
  IMAGE_ACCESS_OPTIONS,
  IMAGE_MODERATION_OPTIONS,
  IMAGE_RIGHTS_OPTIONS,
  IMAGE_ROLE_OPTIONS,
  IMAGE_SOURCE_OPTIONS,
  IMAGE_VIEW_OPTIONS,
} from './imageDraftModel.js';

export default function ImageCreate({
  app,
  draftState,
  fileFacts,
  onFileSelected,
}) {
  const {
    draft,
    updateDraft,
    clearDraft,
    viewMode,
    setViewMode,
  } = draftState;

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    onFileSelected(file);
  }

  function scrollToPublishPanel() {
    document.querySelector('.image-publish-card')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <Card
      eyebrow="Builder"
      title="Image asset draft"
      className="image-create-card"
      actions={
        <SegmentedControl
          options={IMAGE_VIEW_OPTIONS}
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Image workspace mode"
          size="sm"
        />
      }
    >
      <div className="image-draft-intro">
        <Badge tone="info">Draft metadata</Badge>
        <Badge tone="neutral">crab://image</Badge>
        <Badge tone="warning">No upload until publish step</Badge>
        <Badge tone="neutral">No silent ROC hold</Badge>
      </div>

      <section className="image-file-picker" aria-label="Local image file picker">
        <div>
          <span>Local preview file</span>
          <strong>{fileFacts?.name || 'No image selected'}</strong>
          <small>
            {fileFacts
              ? `${fileFacts.type || 'unknown type'} · ${formatBytes(fileFacts.size)}`
              : 'Choose a local image to preview and feed the explicit publish flow below.'}
          </small>
        </div>

        <div className="image-file-actions">
          <label className="image-file-button">
            Choose image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
              onChange={handleFileChange}
            />
          </label>

          <Button variant="secondary" onClick={() => onFileSelected(null)}>
            Clear file
          </Button>
        </div>
      </section>

      <div className="image-form-grid">
        <Field label="Title" help="Human-facing image title. Backend truth comes from publish response later.">
          <TextInput
            value={draft.title}
            onChange={updateField('title')}
            placeholder="Dusty Onion poster"
            maxLength={140}
          />
        </Field>

        <Field label="Creator display" help="Display label only. Passport truth must come from backend later.">
          <TextInput
            value={draft.creatorDisplay}
            onChange={updateField('creatorDisplay')}
            placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
            maxLength={90}
          />
        </Field>

        <Field label="Owner passport hint" help="Optional future owner passport or @username hint. Not verified here.">
          <TextInput
            value={draft.ownerPassport}
            onChange={updateField('ownerPassport')}
            placeholder={app?.settings?.passportSubject || '@creator'}
            spellCheck={false}
          />
        </Field>

        <Field label="Image role" help="Usage context. The asset kind still remains .image.">
          <select value={draft.imageRole} onChange={updateField('imageRole')}>
            {IMAGE_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source mode" help="Local provenance planning only.">
          <select value={draft.sourceMode} onChange={updateField('sourceMode')}>
            {IMAGE_SOURCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Expected MIME type" help="Used for draft planning; selected file type is used for upload.">
          <TextInput
            value={draft.expectedMimeType}
            onChange={updateField('expectedMimeType')}
            placeholder="image/png"
            spellCheck={false}
          />
        </Field>

        <Field label="Dimensions hint" help="Optional human-entered dimensions for now.">
          <TextInput
            value={draft.dimensions}
            onChange={updateField('dimensions')}
            placeholder="1920x1080"
            spellCheck={false}
          />
        </Field>

        <Field label="Color profile" help="Optional future display/rendering metadata.">
          <TextInput
            value={draft.colorProfile}
            onChange={updateField('colorProfile')}
            placeholder="standard_rgb"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field label="Description" help="Public-facing image description for future manifest metadata.">
        <TextArea
          value={draft.description}
          onChange={updateField('description')}
          placeholder="Describe the image, purpose, subject, and context."
          rows={4}
          maxLength={1000}
        />
      </Field>

      <Field label="Alt text" help="Accessibility text. Strongly recommended for image assets.">
        <TextArea
          value={draft.altText}
          onChange={updateField('altText')}
          placeholder="A concise visual description for screen readers."
          rows={3}
          maxLength={500}
        />
      </Field>

      <div className="image-policy-grid">
        <Field label="Rights mode">
          <select value={draft.rightsMode} onChange={updateField('rightsMode')}>
            {IMAGE_RIGHTS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Access mode">
          <select value={draft.accessMode} onChange={updateField('accessMode')}>
            {IMAGE_ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Moderation mode">
          <select value={draft.moderationMode} onChange={updateField('moderationMode')}>
            {IMAGE_MODERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="image-form-grid">
        <Field label="Linked site crab URL" help="Optional site context that may reference this image later.">
          <TextInput
            value={draft.linkedSiteCrabUrl}
            onChange={updateField('linkedSiteCrabUrl')}
            placeholder="crab://example-site"
            spellCheck={false}
          />
        </Field>

        <Field label="Tags" help="Comma-separated local tags.">
          <TextInput
            value={draft.tags}
            onChange={updateField('tags')}
            placeholder="image, poster, creator"
          />
        </Field>

        <Field label="Content warning" help="Optional warning label.">
          <TextInput
            value={draft.contentWarning}
            onChange={updateField('contentWarning')}
            placeholder="optional"
            maxLength={140}
          />
        </Field>

        <Field label="Rendition group ID" help="Optional local planning ID for sibling image variants.">
          <TextInput
            value={draft.renditionGroupId}
            onChange={updateField('renditionGroupId')}
            placeholder="dusty-onion-poster-v1"
            spellCheck={false}
          />
        </Field>
      </div>

      <Field label="Provenance note" help="Local rights/source notes. This is not backend verification.">
        <TextArea
          value={draft.provenanceNote}
          onChange={updateField('provenanceNote')}
          placeholder="Created by me, generated elsewhere, licensed, scanned, edited, etc."
          rows={3}
        />
      </Field>

      <div className="image-actions">
        <div>
          <strong>{draftState.completeness}% complete</strong>
          <span>Local manifest draft completeness</span>
        </div>

        <div className="image-action-buttons">
          <Button variant="secondary" onClick={clearDraft}>
            Clear draft
          </Button>
          <Button variant="primary" onClick={scrollToPublishPanel}>
            Continue to Publish
          </Button>
        </div>
      </div>
    </Card>
  );
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}