/**
 * RO:WHAT — Image rendition relationship planner for crab://image.
 * RO:WHY — Models future bidirectional b3-backed variants without creating fake CIDs.
 * RO:INTERACTS — ImagePage draft state, imageDraftModel linked asset/rendition helpers.
 * RO:INVARIANTS — rendition URLs are local hints only; every real variant must be independently b3-backed later.
 * RO:METRICS — none.
 * RO:CONFIG — draft fields only.
 * RO:SECURITY — no fetching, no upload, no execution.
 * RO:TEST — manual crab://image rendition field smoke.
 */

import Card from '../../shared/components/Card.jsx';
import Field from '../../shared/components/Field.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { IMAGE_LINKED_ASSET_FIELDS } from './imageDraftModel.js';

export default function ImageRenditions({ draftState }) {
  const { draft, updateDraft } = draftState;

  function updateField(key) {
    return (event) => updateDraft(key, event.target.value);
  }

  return (
    <Card eyebrow="Renditions" title="Image rendition graph" className="image-renditions-card">
      <p className="image-section-copy">
        Use these fields to plan sibling image assets. Each real rendition should later
        have its own immutable b3 hash and manifest, cross-linked through the rendition group.
      </p>

      <div className="image-rendition-grid">
        {IMAGE_LINKED_ASSET_FIELDS.map((item) => (
          <Field
            key={item.field}
            label={item.label}
            help={`Expected future kind: .${item.expectedKind}. Backend verification is false in this draft.`}
          >
            <TextInput
              value={draft[item.field]}
              onChange={updateField(item.field)}
              placeholder="crab://<64 lowercase hex>.image"
              spellCheck={false}
            />
          </Field>
        ))}
      </div>

      <div className="image-rendition-explainer">
        <strong>Rendition rule</strong>
        <span>
          The original, desktop, mobile, thumbnail, avatar, cover, and poster variants
          should be independent .image assets. The manifest discovers the group; the b3
          hash remains the canonical identity of each byte object.
        </span>
      </div>
    </Card>
  );
}