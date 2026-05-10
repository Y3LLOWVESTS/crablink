/**
 * RO:WHAT — Tiny app-level event bus for the CrabLink React shell.
 * RO:WHY — App Integration; Concerns: DX/RES; keeps route, toast, modal, settings, and status events explicit.
 * RO:INTERACTS — appContext.js, ToastHost.jsx, ModalHost.jsx, future route-owned pages.
 * RO:INVARIANTS — in-memory UI events only; no backend truth; no wallet mutation; no durable secrets.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — event payloads must not contain tokens or private keys.
 * RO:TEST — npm run build; manual toast/modal/status smoke.
 */

export const APP_EVENTS = Object.freeze({
  ROUTE_CHANGED: 'route:changed',
  SETTINGS_CHANGED: 'settings:changed',
  GATEWAY_STATUS_CHANGED: 'gateway:status-changed',
  TOAST: 'toast',
  MODAL_OPEN: 'modal:open',
  MODAL_CLOSE: 'modal:close',
});

export function createAppEvents() {
  const listeners = new Map();

  function on(type, handler) {
    const safeType = String(type || '').trim();

    if (!safeType || typeof handler !== 'function') {
      return () => {};
    }

    const bucket = listeners.get(safeType) || new Set();
    bucket.add(handler);
    listeners.set(safeType, bucket);

    return () => off(safeType, handler);
  }

  function once(type, handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }

    const unsubscribe = on(type, (payload) => {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  }

  function off(type, handler) {
    const safeType = String(type || '').trim();
    const bucket = listeners.get(safeType);

    if (!bucket) {
      return;
    }

    bucket.delete(handler);

    if (!bucket.size) {
      listeners.delete(safeType);
    }
  }

  function emit(type, payload = {}) {
    const safeType = String(type || '').trim();
    const bucket = listeners.get(safeType);

    if (!bucket?.size) {
      return 0;
    }

    let delivered = 0;

    for (const handler of [...bucket]) {
      try {
        handler(payload);
        delivered += 1;
      } catch (error) {
        console.warn('CrabLink app event handler failed', {
          type: safeType,
          error: error?.message || String(error),
        });
      }
    }

    return delivered;
  }

  function clear(type = '') {
    const safeType = String(type || '').trim();

    if (safeType) {
      listeners.delete(safeType);
      return;
    }

    listeners.clear();
  }

  return Object.freeze({
    on,
    once,
    off,
    emit,
    clear,
  });
}

export const appEvents = createAppEvents();