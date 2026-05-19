/**
 * RO:WHAT — Shared builder/developer manifest preview panel.
 * RO:WHY — CrabLink refactor; keeps JSON preview/copy behavior consistent across local creator pages.
 * RO:INTERACTS — Card, CopyButton, JsonPreview, route-local manifest draft builders.
 * RO:INVARIANTS — local manifest preview only; no fake b3 CID; no fake receipt; no backend publication claim.
 * RO:METRICS — none.
 * RO:CONFIG — manifest/label/visible props.
 * RO:SECURITY — redaction is handled by JsonPreview; copying local JSON does not prove backend truth.
 * RO:TEST — manual copy/show/hide smoke in React HTTP preview.
 */

import Card from './Card.jsx';
import CopyButton from './CopyButton.jsx';
import JsonPreview from './JsonPreview.jsx';

export default function ManifestPreviewPanel({
  manifest,
  label = 'Local manifest draft',
  title = 'Manifest JSON',
  eyebrow = 'Developer',
  initiallyOpen = true,
  className = '',
}) {
  const manifestText = stringifyManifest(manifest);

  return (
    <Card
      eyebrow={eyebrow}
      title={title}
      className={['cl-manifest-preview-panel', className].filter(Boolean).join(' ')}
      actions={
        <CopyButton
          text={manifestText}
          label="Copy JSON"
          successLabel="Copied"
          errorLabel="Copy failed"
          variant="secondary"
          size="sm"
        />
      }
    >
      <JsonPreview data={manifest} label={label} initiallyOpen={initiallyOpen} />
    </Card>
  );
}

function stringifyManifest(manifest) {
  try {
    return JSON.stringify(manifest, null, 2);
  } catch (_error) {
    return String(manifest ?? '');
  }
}