/**
 * TV-specific route-label overrides projected through shared core.
 *
 * Shared core owns label formatting. TV owns only deliberate product copy
 * that differs from the generic route name.
 */

import {
  routeKindLabel,
} from '../../../../packages/crablink-core/src/index.js';

export const TV_ROUTE_LABEL_OVERRIDES =
  Object.freeze({
    earn: 'Earn ROC',
  });

export function tvRouteLabel(kind) {
  return routeKindLabel(
    kind,
    TV_ROUTE_LABEL_OVERRIDES,
  );
}
