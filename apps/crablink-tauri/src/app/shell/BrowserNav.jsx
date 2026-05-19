/**
 * RO:WHAT — Browser-style navigation controls for the CrabLink React shell.
 * RO:WHY — App Integration; Concerns: DX; provides predictable Back/Forward/Home/Refresh controls.
 * RO:INTERACTS — appState navigation callbacks and TopBar.
 * RO:INVARIANTS — UI controls mutate route state only; no backend truth or wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no privileged Chrome APIs used here.
 * RO:TEST — manual route navigation smoke.
 */

export default function BrowserNav({ onBack, onForward, onHome, onRefresh }) {
  return (
    <nav className="cl-browser-nav" aria-label="Browser navigation">
      <button type="button" onClick={onBack} title="Back" aria-label="Back">
        ←
      </button>
      <button type="button" onClick={onForward} title="Forward" aria-label="Forward">
        →
      </button>
      <button type="button" onClick={onHome} title="Home" aria-label="Home">
        ⌂
      </button>
      <button type="button" onClick={onRefresh} title="Refresh route" aria-label="Refresh route">
        ↻
      </button>
    </nav>
  );
}