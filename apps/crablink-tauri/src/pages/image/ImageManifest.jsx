/**
 * RO:WHAT — Image manifest panels and side stats for the React crab://image workspace.
 * RO:WHY — Shows the local uniform image manifest without pretending it has backend proof.
 * RO:INTERACTS — ImagePage, imageDraftModel, JsonPreview, CopyButton, StatChip.
 * RO:INVARIANTS — backend_published=false; no fake b3 CID; no fake receipt; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — draftState manifest/stats.
 * RO:SECURITY — JSON preview only; no untrusted HTML execution.
 * RO:TEST — copy/show manifest in crab://image React route.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';
import CopyButton from '../../shared/components/CopyButton.jsx';
import JsonPreview from '../../shared/components/JsonPreview.jsx';
import StatChip from '../../shared/components/StatChip.jsx';
import TruthBoundary from '../../shared/components/TruthBoundary.jsx';
import { labelFromSnake } from './imageDraftModel.js';

export default function ImageManifest({ draftState, fileFacts }) {
  const { draft, manifest, manifestJson, stats } = draftState;

  return (
    <section className="image-manifest-section">
      <Card
        eyebrow="Manifest"
        title="Local image manifest draft"
        className="image-manifest-card"
        actions={
          <div className="image-manifest-actions">
            <CopyButton text={manifestJson} label="Copy manifest JSON" />
          </div>
        }
      >
        <div className="image-manifest-summary">
          <div>
            <span>Manifest kind</span>
            <strong>image</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{labelFromSnake(draft.imageRole)}</strong>
          </div>
          <div>
            <span>Rights</span>
            <strong>{labelFromSnake(draft.rightsMode)}</strong>
          </div>
          <div>
            <span>Access</span>
            <strong>{labelFromSnake(draft.accessMode)}</strong>
          </div>
        </div>

        <TruthBoundary
          tone="warning"
          title="Local manifest only"
          copy="This JSON is useful for UI and product-shape testing, but it is not a stored manifest, not a b3 CID, not a receipt, and not an ownership proof."
        />

        <JsonPreview label="Image manifest JSON" data={manifest} initiallyOpen />
      </Card>

      <Card eyebrow="Sections" title="Image manifest sections">
        <div className="image-section-list">
          <Section
            title="Metadata"
            copy="Title, description, alt text, role, MIME type, dimensions, color profile, tags, and content warning."
          />
          <Section
            title="Renditions"
            copy={`${stats.renditionCount} local rendition references are currently planned. Each future variant should be its own .image asset.`}
          />
          <Section
            title="Rights / access / economics"
            copy="Draft-only policy fields. Future backend policy, wallet hold, receipt, and payout split are not claimed here."
          />
          <Section
            title="Storage"
            copy={
              fileFacts
                ? `${fileFacts.name} is selected locally for preview. No storage provider or b3 CID has been assigned.`
                : 'No local file selected and no storage provider returned.'
            }
          />
        </div>
      </Card>
    </section>
  );
}

export function ImageSidePanel({ draftState, fileFacts }) {
  const { draft, stats, completeness } = draftState;

  return (
    <aside className="image-side-panel" aria-label="Image workspace status">
      <Card eyebrow="Status" title="Image draft health">
        <div className="image-side-stats">
          <StatChip label="Complete" value={`${completeness}%`} help="Local draft completeness" tone="info" />
          <StatChip label="File" value={fileFacts?.name ? 'selected' : 'none'} help="Local preview file" tone={fileFacts?.name ? 'success' : 'neutral'} />
          <StatChip label="Tags" value={stats.tagCount} help="Local comma-separated tags" />
          <StatChip label="Renditions" value={stats.renditionCount} help="Linked image variants" />
        </div>

        <div className="image-completeness">
          <span style={{ width: `${completeness}%` }} />
        </div>

        <div className="image-side-facts">
          <Fact label="Role" value={labelFromSnake(draft.imageRole)} />
          <Fact label="Access" value={labelFromSnake(draft.accessMode)} />
          <Fact label="Rights" value={labelFromSnake(draft.rightsMode)} />
          <Fact label="Local bytes" value={fileFacts?.size ? formatBytes(fileFacts.size) : '0 B'} />
        </div>

        <div className="image-side-badges">
          <Badge tone="warning">backend false</Badge>
          <Badge tone="neutral">b3 false</Badge>
          <Badge tone="neutral">wallet false</Badge>
        </div>
      </Card>
    </aside>
  );
}

function Section({ title, copy }) {
  return (
    <article>
      <strong>{title}</strong>
      <span>{copy}</span>
    </article>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || 'n/a'}</strong>
    </div>
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