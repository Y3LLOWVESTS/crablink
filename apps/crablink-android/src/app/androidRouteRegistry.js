import {
  routeKindLabel,
} from '../../../../packages/crablink-core/src/index.js';

const ROUTES = Object.freeze([
  Object.freeze({
    id: 'home',
    label: routeKindLabel('home'),
    compactLabel: 'Home',
    description:
      'Public CrabLink browsing will be connected in a later phase.',
  }),
  Object.freeze({
    id: 'library',
    label: routeKindLabel('library'),
    compactLabel: 'Library',
    description:
      'Verified library assets are not connected in the scaffold.',
  }),
  Object.freeze({
    id: 'passport',
    label: 'Passport',
    compactLabel: 'Passport',
    description:
      'Native Passport custody is not connected in the scaffold.',
  }),
  Object.freeze({
    id: 'more',
    label: 'More',
    compactLabel: 'More',
    description:
      'Settings and additional mobile routes will be added incrementally.',
  }),
]);

const ROUTE_BY_ID = new Map(
  ROUTES.map((route) => [route.id, route]),
);

export const ANDROID_HOME_ROUTE_ID = 'home';
export const ANDROID_ROUTE_REGISTRY = ROUTES;

export function getAndroidRoute(routeId) {
  return (
    ROUTE_BY_ID.get(String(routeId || '')) ??
    ROUTE_BY_ID.get(ANDROID_HOME_ROUTE_ID)
  );
}

export function isAndroidRouteId(routeId) {
  return ROUTE_BY_ID.has(String(routeId || ''));
}
