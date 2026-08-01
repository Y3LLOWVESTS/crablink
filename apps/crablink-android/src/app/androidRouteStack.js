import {
  ANDROID_HOME_ROUTE_ID,
  isAndroidRouteId,
} from './androidRouteRegistry.js';

export const ANDROID_ROUTE_STACK_LIMIT = 32;

function normalizeRouteId(routeId) {
  return isAndroidRouteId(routeId)
    ? String(routeId)
    : ANDROID_HOME_ROUTE_ID;
}

export function createAndroidRouteStack(
  initialRouteId = ANDROID_HOME_ROUTE_ID,
) {
  return Object.freeze([
    normalizeRouteId(initialRouteId),
  ]);
}

export function currentAndroidRouteId(stack) {
  if (!Array.isArray(stack) || stack.length === 0) {
    return ANDROID_HOME_ROUTE_ID;
  }

  return normalizeRouteId(stack[stack.length - 1]);
}

export function pushAndroidRoute(
  stack,
  routeId,
) {
  const current = Array.isArray(stack)
    ? stack.map(normalizeRouteId)
    : createAndroidRouteStack();

  const nextRouteId = normalizeRouteId(routeId);

  if (
    current.length > 0 &&
    current[current.length - 1] === nextRouteId
  ) {
    return Object.freeze([...current]);
  }

  const next = [
    ...current,
    nextRouteId,
  ].slice(-ANDROID_ROUTE_STACK_LIMIT);

  return Object.freeze(next);
}

export function popAndroidRoute(stack) {
  if (!Array.isArray(stack) || stack.length <= 1) {
    return Object.freeze([
      ANDROID_HOME_ROUTE_ID,
    ]);
  }

  return Object.freeze(stack.slice(0, -1));
}
