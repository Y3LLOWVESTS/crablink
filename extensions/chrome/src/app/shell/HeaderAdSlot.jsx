/**
 * RO:WHAT — Standardized CrabLink header ad slot.
 * RO:WHY — Reserves one protocol-native ad placement without invasive tracking or page-specific hacks.
 * RO:INTERACTS — Shell theme tokens, route state, future crab://ad manifests.
 * RO:INVARIANTS — clearly labeled; one header slot; no third-party tracking scripts; no adversarial anti-adblock logic.
 * RO:METRICS — none yet.
 * RO:CONFIG — future ad feature gate and campaign manifest route.
 * RO:SECURITY — static placeholder only until backend ad contracts exist.
 * RO:TEST — visual/manual shell smoke.
 */

export default function HeaderAdSlot({ route }) {
  const routeLabel = route?.kind ? `crab://${route.kind}` : 'CrabLink';

  return (
    <aside className="cl-header-ad" aria-label="Advertisement">
      <span className="cl-ad-label">Ad Space</span>
      <span className="cl-ad-copy">protocol-native header slot · {routeLabel}</span>
    </aside>
  );
}