/**
 * RO:WHAT — Source-mode deck for crab://make camera, screen, PiP, cutout, and audio-card modes.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keeps source-mode presentation separate from MakePage route state.
 * RO:INTERACTS — MakePage.jsx, makeDraftModel.js, makePageConstants.js, make.css.
 * RO:INVARIANTS — local mode-change intent only; no capture permission bypass; no backend truth; no wallet/ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — MAKE_MODES and MODE_ICONS local UI definitions.
 * RO:SECURITY — no secrets, native paths, capabilities, receipt truth, or spend authority.
 * RO:TEST — npm run build; manual crab://make mode switch smoke with preview stopped.
 */

import { MAKE_MODES } from './makeDraftModel.js';
import { MODE_ICONS } from './makePageConstants.js';

export default function MakeModeDeck({ activeMode, disabled, onChange }) {
  return (
    <div className="make-mode-deck" aria-label="Make source modes">
      {MAKE_MODES.map((mode) => {
        const active = mode.value === activeMode;

        return (
          <button
            className={`make-mode-card ${active ? 'is-active' : ''}`}
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            disabled={disabled}
          >
            <span className="make-mode-icon">{MODE_ICONS[mode.value] || '●'}</span>
            <span className="make-mode-text">
              <strong>{mode.shortLabel}</strong>
              <small>{mode.copy}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
