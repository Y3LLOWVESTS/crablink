/**
 * RO:WHAT — Shared route truth panel for local-only React workspaces.
 * RO:WHY — CrabLink refactor; makes safety boundaries polished, explicit, and reusable.
 * RO:INTERACTS — TruthBoundary, Badge, local creator pages, future protected-route parity pages.
 * RO:INVARIANTS — never claims publication/payment/ownership/CID/receipt truth unless backend supplied it.
 * RO:METRICS — none.
 * RO:CONFIG — routeKind/title/copy/allowed/blocked props.
 * RO:SECURITY — emphasizes no fake backend truth and no silent ROC spend.
 * RO:TEST — manual route smoke in builder/developer modes.
 */

import Badge from './Badge.jsx';
import TruthBoundary from './TruthBoundary.jsx';

const DEFAULT_BLOCKED = Object.freeze([
  'no b3 CID minted',
  'no manifest CID minted',
  'no index pointer written',
  'no ROC hold/capture/release',
  'no wallet mutation',
  'no backend publication claim',
]);

export default function RouteTruthPanel({
  routeKind = 'route',
  title = 'Route truth boundary',
  copy = '',
  tone = 'info',
  allowed = [],
  blocked = DEFAULT_BLOCKED,
  className = '',
}) {
  const safeCopy =
    copy ||
    `crab://${routeKind} is currently a local React workspace. It can help draft and preview data, but it does not create backend truth.`;

  return (
    <TruthBoundary title={title} copy={safeCopy} tone={tone}>
      <div className={['cl-route-truth-panel', className].filter(Boolean).join(' ')}>
        {allowed.length > 0 && (
          <div>
            <strong>Allowed here</strong>
            <div className="cl-route-truth-badges">
              {allowed.map((item) => (
                <Badge key={item} tone="success" uppercase={false}>
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {blocked.length > 0 && (
          <div>
            <strong>Not claimed here</strong>
            <div className="cl-route-truth-badges">
              {blocked.map((item) => (
                <Badge key={item} tone="warning" uppercase={false}>
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </TruthBoundary>
  );
}