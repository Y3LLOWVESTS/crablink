/**
 * RO:WHAT — Route owner for the React crab://image local image workspace.
 * RO:WHY — CrabLink refactor; replaces scaffold UI while preserving protected legacy paid image flow.
 * RO:INTERACTS — ImageCreate, ImagePreview, ImageRenditions, ImageManifest, useCreatorDraft, CreatorWorkspaceLayout.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no silent ROC spend; no backend upload here.
 * RO:METRICS — none; future upload/prepare flow must use gateway client correlation IDs.
 * RO:CONFIG — app settings can provide display-only passport/wallet hints.
 * RO:SECURITY — trusted UI only; selected local image preview stays local; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://image route smoke.
 */

import { useCallback, useEffect, useState } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import ImageCreate from './ImageCreate.jsx';
import ImagePreview from './ImagePreview.jsx';
import ImageRenditions from './ImageRenditions.jsx';
import ImageManifest, { ImageSidePanel } from './ImageManifest.jsx';
import {
  DEFAULT_IMAGE_DRAFT,
  buildImageManifestDraft,
  getImageCompleteness,
  statsForImageDraft,
} from './imageDraftModel.js';
import './image.css';

const PRINCIPLES = Object.freeze([
  {
    title: 'Image assets are canonical',
    copy:
      'Every image-like asset eventually becomes crab://<hash>.image with an internal b3:<hash> content ID. Usage context does not create a new image-like kind.',
  },
  {
    title: 'Renditions are separate assets',
    copy:
      'Original, desktop, mobile, thumbnail, cover, poster, and avatar variants should each be independently b3-addressed and cross-linked in manifests.',
  },
  {
    title: 'Paid upload remains protected',
    copy:
      'This React workspace does not replace the proven paid image upload path yet. It prepares UI parity first without touching wallet, ledger, storage, or index mutation.',
  },
]);

export default function ImagePage({ app, route }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileFacts, setFileFacts] = useState(null);

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

  const buildManifest = useCallback(
    (draft) => buildImageManifestDraft(draft, { app, route, fileFacts }),
    [app, route, fileFacts],
  );

  const buildStats = useCallback(
    (draft) => statsForImageDraft(draft, fileFacts),
    [fileFacts],
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

  function handleFileSelected(file) {
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

  return (
    <CreatorWorkspaceLayout
      eyebrow="crab://image"
      title="Image Workspace"
      copy="Draft image asset metadata, local preview, rendition relationships, rights, access, and future paid-upload manifest fields without claiming backend publication."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Local draft', tone: 'warning' },
        { label: 'No paid upload yet', tone: 'neutral' },
      ]}
      principles={PRINCIPLES}
      side={<ImageSidePanel draftState={draftState} fileFacts={fileFacts} />}
      className="image-page"
    >
      <RouteTruthPanel
        routeKind="image"
        tone="warning"
        title="Image route truth boundary"
        allowed={[
          'local file preview',
          'manifest draft',
          'rendition planning',
          'copy JSON',
          'builder/developer view',
        ]}
      />

      <ImageCreate
        app={app}
        draftState={draftState}
        fileFacts={fileFacts}
        onFileSelected={handleFileSelected}
      />

      <ImagePreview
        draftState={draftState}
        previewUrl={previewUrl}
        fileFacts={fileFacts}
      />

      <ImageRenditions draftState={draftState} />

      <ImageManifest draftState={draftState} fileFacts={fileFacts} />
    </CreatorWorkspaceLayout>
  );
}