/**
 * RO:WHAT — Tiny shared display/toggle controls for crab://make.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; removes repeated presentational helpers from MakePage.jsx.
 * RO:INTERACTS — MakePage.jsx and future extracted Make cards.
 * RO:INVARIANTS — display/input only; no backend truth; no wallet/ledger mutation.
 * RO:METRICS — none.
 * RO:CONFIG — local labels/values.
 * RO:SECURITY — no secrets, no native paths, no spend authority.
 * RO:TEST — npm run build; manual project toggles and command stats smoke.
 */

export function StatPill({ label, value }) {
  return (
    <span className="make-stat-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}




export function CheckToggle({ checked, label, onChange }) {
  return (
    <label className="make-check-toggle">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}


