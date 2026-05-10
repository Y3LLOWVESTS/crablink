/**
 * RO:WHAT — Safe local preview for the React crab://image workspace.
 * RO:WHY — Gives image authors immediate visual feedback without uploading bytes or claiming a b3 CID.
 * RO:INTERACTS — ImagePage selected file state, ImageCreate file picker, shared Card/Badge components.
 * RO:INVARIANTS — object URL preview only; no upload; no backend truth; no fake hash.
 * RO:METRICS — none.
 * RO:CONFIG — local selected File facts.
 * RO:SECURITY — local blob URL only; no script execution; no untrusted HTML.
 * RO:TEST — select/clear local image in React HTTP preview.
 */

import Badge from '../../shared/components/Badge.jsx';
import Card from '../../shared/components/Card.jsx';

export default function ImagePreview({ draftState, previewUrl, fileFacts }) {
  const { draft } = draftState;

  return (
    <Card
      eyebrow="Preview"
      title="Local image preview"
      className="image-preview-card"
      actions={
        <div className="image-preview-badges">
          <Badge tone={previewUrl ? 'success' : 'neutral'}>
            {previewUrl ? 'Preview ready' : 'No file'}
          </Badge>
          <Badge tone="warning">Local only</Badge>
        </div>
      }
    >
      <div className={previewUrl ? 'image-preview-frame has-image' : 'image-preview-frame'}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={draft.altText || draft.title || 'Local image preview'}
          />
        ) : (
          <div className="image-preview-empty">
            <strong>No local image selected</strong>
            <span>Choose an image file above to preview it in this React route.</span>
          </div>
        )}
      </div>

      <div className="image-preview-meta">
        <Fact label="Title" value={draft.title || 'Untitled image draft'} />
        <Fact label="Alt text" value={draft.altText || 'Not entered'} />
        <Fact label="Local file" value={fileFacts?.name || 'Not selected'} />
        <Fact label="MIME type" value={fileFacts?.type || draft.expectedMimeType || 'Not known'} />
      </div>

      <p className="image-preview-note">
        This preview uses a browser object URL. It does not prove storage, ownership,
        provider placement, paid access, b3 identity, or manifest publication.
      </p>
    </Card>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}