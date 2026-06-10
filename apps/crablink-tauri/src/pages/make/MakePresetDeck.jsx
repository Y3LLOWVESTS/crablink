/**
 * RO:WHAT — Scene preset deck for crab://make creator templates.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; extracts preset selection UI from the route container.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, make.css.
 * RO:INVARIANTS — local draft patch intent only; no backend truth; no receipts; no wallet/ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — MAKE_SCENE_PRESETS local template definitions.
 * RO:SECURITY — no secrets, native paths, capabilities, balances, or spend authority.
 * RO:TEST — npm run build; manual crab://make scene preset selection smoke.
 */

import { MAKE_SCENE_PRESETS } from './makeDraftModel.js';

export default function MakePresetDeck({ activePreset, disabled, onApply }) {
  return (
    <section className="make-preset-deck" aria-label="Make scene presets">
      <div className="make-section-kicker">
        <div>
          <p className="cl-eyebrow">Scene presets</p>
          <h3>Start with a creator template</h3>
        </div>
        {disabled && <small>Stop preview to switch templates.</small>}
      </div>

      <div className="make-preset-grid">
        {MAKE_SCENE_PRESETS.map((preset) => {
          const active = preset.value === activePreset;

          return (
            <button
              className={`make-preset-card ${active ? 'is-active' : ''}`}
              key={preset.value}
              type="button"
              onClick={() => onApply(preset.value)}
              disabled={disabled}
            >
              <span className="make-preset-eye">{preset.eyebrow}</span>
              <strong>{preset.label}</strong>
              <small>{preset.copy}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
