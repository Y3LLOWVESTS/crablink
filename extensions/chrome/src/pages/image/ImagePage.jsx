/**
 * RO:WHAT — Route owner for the React crab://image workspace and explicit paid image publishing flow.
 * RO:WHY — CrabLink refactor; moves image publish parity into React while preserving protected legacy lane behavior.
 * RO:INTERACTS — ImageCreate, ImagePreview, ImagePublishFlow, ImageRenditions, ImageManifest, useCreatorDraft.
 * RO:INVARIANTS — no fake b3 CID; no fake manifest CID; no silent ROC spend; mutations require explicit user actions.
 * RO:METRICS — prepare/hold/upload use gateway correlation IDs through shared API clients.
 * RO:CONFIG — app settings provide passport/wallet/gateway labels.
 * RO:SECURITY — selected image is local until explicit upload; no direct internal-service calls.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://image prepare/hold/upload route smoke.
 */

import { useCallback, useEffect, useState } from 'react';
import CreatorWorkspaceLayout from '../../shared/components/CreatorWorkspaceLayout.jsx';
import RouteTruthPanel from '../../shared/components/RouteTruthPanel.jsx';
import useCreatorDraft from '../../shared/hooks/useCreatorDraft.js';
import ImageCreate from './ImageCreate.jsx';
import ImagePreview from './ImagePreview.jsx';
import ImagePublishFlow from './ImagePublishFlow.jsx';
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
    title: 'Publishing is explicit',
    copy:
      'React now separates prepare, wallet hold, and raw image upload into visible clicks. It never silently spends ROC or invents receipts.',
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
      copy="Draft image asset metadata, preview local bytes, prepare a paid upload, create an explicit ROC hold, and submit the image through svc-gateway."
      badges={[
        { label: 'React lane', tone: 'neutral' },
        { label: 'Image draft', tone: 'info' },
        { label: 'Explicit ROC hold', tone: 'warning' },
        { label: 'Gateway upload', tone: 'success' },
      ]}
      principles={PRINCIPLES}
      side={<ImageSidePanel draftState={draftState} fileFacts={fileFacts} />}
      className="image-page"
    >
      <RouteTruthPanel
        routeKind="image"
        tone="info"
        title="Image route truth boundary"
        copy="This route can now prepare a paid image upload, create an explicit wallet hold, and submit raw image bytes through the configured gateway. Backend b3 CIDs, manifests, receipts, and index pointers must still come from the gateway response."
        allowed={[
          'local file preview',
          'manifest draft',
          'prepare /assets/image/prepare',
          'explicit /wallet/hold',
          'paid /assets/image upload',
          'returned crab URL display',
          'wallet refresh after mutation',
        ]}
        blocked={[
          'no silent ROC spend',
          'no fake b3 CID',
          'no fake manifest CID',
          'no fake receipt',
          'no direct storage/index/ledger call',
          'no private-key custody',
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

      <ImagePublishFlow
        app={app}
        draftState={draftState}
        selectedFile={selectedFile}
        fileFacts={fileFacts}
      />

      <ImageRenditions draftState={draftState} />

      <ImageManifest draftState={draftState} fileFacts={fileFacts} />
    </CreatorWorkspaceLayout>
  );
}