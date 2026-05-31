/**
 * RO:WHAT — Route owner for the React crab://image simple mint workspace.
 * RO:WHY — Keeps image minting as the one-card Simple Mint reference pattern while supporting explicit image bundles.
 * RO:INTERACTS — ImagePublishFlow, ImageRenditions, ImageManifest, RouteTruthPanel, useCreatorDraft.
 * RO:INVARIANTS — no fake b3 CID; no fake manifest CID; no fake rendition URL; no silent ROC spend; backend quote before mint.
 * RO:METRICS — prepare/hold/upload use gateway correlation IDs through shared API clients.
 * RO:CONFIG — app settings provide passport/wallet/gateway labels.
 * RO:SECURITY — selected image and generated renditions are local until explicit upload; no direct internal-service calls.
 * RO:TEST — npm run build; manual crab://image simple mint and bundle mint smoke.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Badge from '../../shared/components/Badge.jsx';
import Button from '../../shared/components/Button.jsx';
import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import TextArea from '../../shared/components/TextArea.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import ImagePublishFlow from './ImagePublishFlow.jsx';
import ImageRenditions from './ImageRenditions.jsx';
import ImageManifest from './ImageManifest.jsx';
import {
  DEFAULT_IMAGE_DRAFT,
  IMAGE_RIGHTS_OPTIONS,
  IMAGE_SOURCE_OPTIONS,
  buildImageManifestDraft,
  getImageCompleteness,
  selectedRenditionTargets,
  statsForImageDraft,
} from './imageDraftModel.js';
import {
  generateImageRenditions,
  revokeGeneratedImageRenditions,
} from './imageRenditionGenerator.js';
import './image.css';

export default function ImagePage({ app, route }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileFacts, setFileFacts] = useState(null);
  const [localRenditions, setLocalRenditions] = useState(null);
  const [renditionState, setRenditionState] = useState({ status: 'idle', error: '' });
  const localRenditionsRef = useRef(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    localRenditionsRef.current = localRenditions;
  }, [localRenditions]);

  useEffect(() => {
    return () => {
      revokeGeneratedImageRenditions(localRenditionsRef.current);
      localRenditionsRef.current = null;
    };
  }, []);

  const buildManifest = useCallback(
    (draft) => buildImageManifestDraft(draft, { app, route, fileFacts, localRenditions }),
    [app, route, fileFacts, localRenditions],
  );

  const buildStats = useCallback(
    (draft) => statsForImageDraft(draft, fileFacts, localRenditions),
    [fileFacts, localRenditions],
  );

  const getCompleteness = useCallback(
    (draft) => getImageCompleteness(draft, fileFacts),
    [fileFacts],
  );

  const draftState = useCreatorDraft({
    initialDraft: DEFAULT_IMAGE_DRAFT,
    buildManifest,
    buildStats,
    getCompleteness,
  });

  function clearGeneratedRenditions() {
    setLocalRenditions((current) => {
      revokeGeneratedImageRenditions(current);
      return null;
    });
    setRenditionState({ status: 'idle', error: '' });
  }

  function handleFileSelected(file) {
    clearGeneratedRenditions();

    if (!file) {
      setSelectedFile(null);
      setFileFacts(null);
      return;
    }

    setSelectedFile(file);
    setFileFacts({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: Number.isFinite(file.lastModified)
        ? new Date(file.lastModified).toISOString()
        : '',
    });
  }

  async function ensureRenditions(sourceFile = selectedFile) {
    const renditionSource = sourceFile || selectedFile;

    if (!renditionSource) {
      return null;
    }

    const targets = selectedRenditionTargets(draftState.draft.renditionTargetCsv);

    if (!targets.length) {
      clearGeneratedRenditions();
      return null;
    }

    setRenditionState({ status: 'generating', error: '' });

    try {
      const result = await generateImageRenditions(renditionSource, targets);

      setLocalRenditions((current) => {
        revokeGeneratedImageRenditions(current);
        return result;
      });
      setRenditionState({ status: 'ready', error: '' });

      return result;
    } catch (error) {
      setLocalRenditions((current) => {
        revokeGeneratedImageRenditions(current);
        return null;
      });
      setRenditionState({
        status: 'error',
        error: error?.message || 'Local rendition generation failed.',
      });
      throw error;
    }
  }

  return (
    <main className="image-page image-page-simple image-page-one-card">
      <header className="image-simple-hero">
        <div>
          <p className="cl-eyebrow">crab://image</p>
          <h1>Mint an image</h1>
          <p>
            Choose one source image. CrabLink can generate selected versions in the background,
            then mint the original and each version as separate backend-returned image assets.
          </p>
        </div>

        <div className="image-simple-hero-badges">
          <Badge tone="success">Simple Mint</Badge>
          <Badge tone="info">Auto Versions</Badge>
          <Badge tone="warning">Explicit ROC Confirm</Badge>
          <Badge tone="info">Metadata stripped</Badge>
        </div>
      </header>

      <section className="image-one-card-shell" aria-label="Simple image mint">
        <ImageSimpleMintCard
          app={app}
          draftState={draftState}
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          fileFacts={fileFacts}
          onFileSelected={handleFileSelected}
        />

        <ImagePublishFlow
          app={app}
          draftState={draftState}
          selectedFile={selectedFile}
          fileFacts={fileFacts}
          localRenditions={localRenditions}
          renditionState={renditionState}
          onEnsureRenditions={ensureRenditions}
        />

        <details className="image-advanced-drawer image-advanced-drawer-quiet">
          <summary>
            <span>
              <strong>Advanced image options</strong>
              <small>Tags, alt text, source, rights, use cases, auto-renditions, manifest preview, and route truth</small>
            </span>
          </summary>

          <div className="image-advanced-stack">
            <ImageRenditions
              draftState={draftState}
              fileFacts={fileFacts}
              localRenditions={localRenditions}
              renditionState={renditionState}
              onGenerate={ensureRenditions}
              onClear={clearGeneratedRenditions}
            />

            <ImageManifest draftState={draftState} fileFacts={fileFacts} />

            <RouteTruthPanel
              routeKind="image"
              tone="info"
              title="Image route truth boundary"
              copy="This MVP mints the original and generated renditions through the existing paid /assets/image route. Each returned crab URL is backend truth. The bundle relationship shown here is a display map until a backend-native image bundle manifest route is added."
              allowed={[
                'local file preview',
                'local rendition byte generation',
                'privacy metadata cleanup before b3 prediction',
                'prepare quote using cleaned original + rendition bytes',
                'explicit /wallet/hold',
                'paid /assets/image upload for each image',
                'backend-returned crab URL display',
                'wallet refresh after mutation',
              ]}
              blocked={[
                'no silent ROC spend',
                'no fake b3 CID',
                'no fake rendition URL',
                'no fake manifest CID',
                'no fake receipt',
                'no raw EXIF/GPS mint by default',
                'no direct storage/index/ledger call',
                'no private-key custody',
              ]}
            />
          </div>
        </details>
      </section>
    </main>
  );
}

function ImageSimpleMintCard({
  app,
  draftState,
  selectedFile,
  previewUrl,
  fileFacts,
  onFileSelected,
}) {
  const { draft, updateDraft, clearDraft } = draftState;

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    onFileSelected(file);
  }

  return (
    <Card
      eyebrow="Simple Mint"
      title="Image"
      className="image-simple-mint-card"
      actions={
        <div className="image-simple-card-actions">
          <Badge tone={previewUrl ? 'success' : 'neutral'}>
            {previewUrl ? 'Preview ready' : 'No file'}
          </Badge>
          <Badge tone="warning">Local until mint</Badge>
        </div>
      }
    >
      <section
        className={previewUrl ? 'image-drop-preview has-image' : 'image-drop-preview'}
        aria-label="Select image preview"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={draft.altText || draft.title || 'Local image preview'}
          />
        ) : (
          <div className="image-drop-empty">
            <strong>No image selected</strong>
            <span>Hover here and choose an image to preview it before minting.</span>
          </div>
        )}

        <div className="image-drop-overlay">
          <label className="image-hover-select">
            {previewUrl ? 'Change image' : 'Select image'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={handleFileChange}
            />
          </label>

          {selectedFile && (
            <Button variant="secondary" onClick={() => onFileSelected(null)}>
              Clear
            </Button>
          )}
        </div>
      </section>

      <div className="image-file-line">
        <span>{fileFacts?.name || 'No local file selected'}</span>
        <strong>{fileFacts?.size ? formatBytes(fileFacts.size) : 'Choose image'}</strong>
      </div>

      <section className="image-under-preview-form" aria-label="Image mint details">
        <div className="image-form-grid image-simple-fields">
          <Field label="Title" help="Required for a clean image page and link preview.">
            <TextInput
              value={draft.title}
              onChange={updateField('title')}
              placeholder="Dusty Onion poster"
              maxLength={140}
            />
          </Field>

          <Field label="Description" help="Optional public-facing description.">
            <TextArea
              value={draft.description}
              onChange={updateField('description')}
              placeholder="Describe the image, purpose, subject, and context."
              rows={3}
              maxLength={1000}
            />
          </Field>
        </div>

        <details className="image-inline-advanced image-inline-advanced-slim">
          <summary>
            <span>
              <strong>Advanced fields</strong>
              <small>Tags, alt text, source, rights, and provenance</small>
            </span>
          </summary>

          <div className="image-inline-advanced-body">
            <div className="image-form-grid">
              <Field label="Tags" help="Comma-separated local tags.">
                <TextInput
                  value={draft.tags}
                  onChange={updateField('tags')}
                  placeholder="image, poster, creator"
                />
              </Field>

              <Field label="Creator display" help="Display label only. Backend identity truth comes later.">
                <TextInput
                  value={draft.creatorDisplay}
                  onChange={updateField('creatorDisplay')}
                  placeholder={app?.settings?.handle || app?.settings?.passportSubject || '@creator'}
                  maxLength={90}
                />
              </Field>

              <Field label="Source" help="Local provenance hint only.">
                <select value={draft.sourceMode} onChange={updateField('sourceMode')}>
                  {IMAGE_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Rights" help="Local rights hint. Backend policy is not proven here.">
                <select value={draft.rightsMode} onChange={updateField('rightsMode')}>
                  {IMAGE_RIGHTS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Alt text" help="Accessibility text.">
              <TextArea
                value={draft.altText}
                onChange={updateField('altText')}
                placeholder="A concise visual description for screen readers."
                rows={2}
                maxLength={500}
              />
            </Field>

            <Field label="Provenance note" help="Local source/rights note. Not backend verification.">
              <TextArea
                value={draft.provenanceNote}
                onChange={updateField('provenanceNote')}
                placeholder="Created by me, licensed, scanned, edited, etc."
                rows={2}
              />
            </Field>
          </div>
        </details>
      </section>

      <div className="image-simple-footer-actions">
        <Button variant="secondary" onClick={clearDraft}>
          Clear draft
        </Button>
        <span>
          Backend truth starts after quote, ROC confirmation, and gateway mint response.
        </span>
      </div>
    </Card>
  );
}

function formatBytes(value) {
  const bytes = Number(value || 0);

  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}