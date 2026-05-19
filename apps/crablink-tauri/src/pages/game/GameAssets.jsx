/**
 * RO:WHAT — Linked asset editor and preview for the React crab://game local workspace.
 * RO:WHY — Keeps game asset bundle references explicit, independently b3-addressed, and separate from runtime execution.
 * RO:INTERACTS — GameDraft.jsx, gameDraftModel.js, shared form/card components.
 * RO:INVARIANTS — references are inert text; no fetch, no bundle loading, no decompression, no runtime launch.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — never treats game/code bundle URLs as executable inputs in the extension page.
 * RO:TEST — npm run build; manual crab://game asset section smoke.
 */

import Badge from '../../shared/components/Badge.jsx';
import Field from '../../shared/components/Field.jsx';
import TextInput from '../../shared/components/TextInput.jsx';
import { GAME_LINKED_ASSET_FIELDS, labelFromSnake } from './gameDraftModel.js';

export default function GameAssets({ draft, updateDraft }) {
  return (
    <section className="game-form-section" aria-label="Game linked assets">
      <div className="game-form-section-head">
        <div>
          <p className="cl-eyebrow">Linked assets</p>
          <h3>Images, trailers, bundles, runtime, audio, maps, saves, and policy</h3>
        </div>
        <Badge tone="neutral" uppercase={false}>
          inert references
        </Badge>
      </div>

      <div className="game-asset-grid">
        {GAME_LINKED_ASSET_FIELDS.map((item) => (
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

      <div className="game-builder-note">
        <strong>Asset rule</strong>
        <span>
          Every real game resource should become its own immutable b3-backed object later. This
          local route only drafts references and never loads bundles, executes runtime bytes, or
          writes save data.
        </span>
      </div>
    </section>
  );
}

export function GameAssetPlanPreview({ linkedAssets, compact = false }) {
  const assets = Array.isArray(linkedAssets) ? linkedAssets : [];

  if (assets.length === 0) {
    return (
      <div className="game-asset-empty">
        <p>No linked game assets yet.</p>
        <span>Add cover art, thumbnails, bundles, runtime, audio, maps, docs, save schema, or policy references.</span>
      </div>
    );
  }

  const grouped = groupAssets(assets);

  return (
    <div className={compact ? 'game-asset-preview compact' : 'game-asset-preview'}>
      {Object.entries(grouped).map(([kind, items]) => (
        <section key={kind} className="game-asset-group">
          <h3>{labelFromSnake(kind)}</h3>
          <div>
            {items.map((item) => (
              <span key={`${item.role}-${item.crab_url}`}>
                {labelFromSnake(item.role)} · {item.expected_kind}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function groupAssets(assets) {
  return assets.reduce((groups, asset) => {
    const kind = asset.expected_kind || 'other';
    return {
      ...groups,
      [kind]: [...(groups[kind] || []), asset],
    };
  }, {});
}

function placeholderForKind(kind) {
  if (kind === 'site_or_article') {
    return 'crab://example-site or crab://<64 lowercase hex>.article';
  }

  if (kind === 'facet') {
    return 'crab://<64 lowercase hex>.facet';
  }

  if (kind === 'manifest') {
    return 'crab://<64 lowercase hex>.manifest';
  }

  if (kind === 'policy') {
    return 'crab://<64 lowercase hex>.policy';
  }

  return `crab://<64 lowercase hex>.${kind}`;
}