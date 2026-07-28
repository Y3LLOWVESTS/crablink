/**
 * RO:WHAT — Coordinates TV catalog reads for Home browsing.
 * RO:WHY — Keeps catalog loading explicit, deterministic, and testable before React integration.
 * RO:INTERACTS — tvCatalogAdapter readCatalogView and tvCatalogModel lifecycle views.
 * RO:INVARIANTS — no automatic polling; duplicate loads share one promise; newer refreshes win.
 * RO:SECURITY — publishes sanitized catalog views only; no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCatalogInteraction.test.mjs and check-crablink-tv-catalog-interaction-boundary.mjs.
 */

import {
  TV_CATALOG_VIEW_KIND,
  createTvCatalogLoadingView,
  createTvCatalogUnavailableView,
} from './tvCatalogModel.js';

export const INITIAL_TV_CATALOG_INTERACTION_STATE =
  Object.freeze({
    view:
      createTvCatalogLoadingView(),

    loading: false,

    loadAttempted: false,
  });

const CATALOG_VIEW_KINDS =
  new Set(
    Object.values(
      TV_CATALOG_VIEW_KIND,
    ),
  );

function requireOperation(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `${label} must be a function`,
    );
  }

  return value;
}

function isRecord(
  value,
) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function sanitizeCatalogView(
  value,
) {
  if (
    !isRecord(value) ||
    !CATALOG_VIEW_KINDS.has(
      value.kind,
    ) ||
    !Array.isArray(
      value.rails,
    )
  ) {
    return createTvCatalogUnavailableView({
      code:
        'catalog_unavailable',

      retryable: false,
    });
  }

  return value;
}

export function createTvCatalogInteraction({
  readCatalogView,
  onState = () => {},
}) {
  const readCatalogViewOperation =
    requireOperation(
      readCatalogView,
      'readCatalogView',
    );

  const publishState =
    requireOperation(
      onState,
      'onState',
    );

  let view =
    INITIAL_TV_CATALOG_INTERACTION_STATE.view;

  let loading =
    INITIAL_TV_CATALOG_INTERACTION_STATE.loading;

  let loadAttempted =
    INITIAL_TV_CATALOG_INTERACTION_STATE.loadAttempted;

  let inFlight = null;
  let operationVersion = 0;

  function currentState() {
    return Object.freeze({
      view,
      loading,
      loadAttempted,
    });
  }

  function publish() {
    const nextState =
      currentState();

    publishState(
      nextState,
    );

    return nextState;
  }

  function startCatalogRead() {
    const version =
      operationVersion + 1;

    operationVersion = version;
    loadAttempted = true;
    loading = true;
    view =
      createTvCatalogLoadingView();

    publish();

    const promise =
      (async () => {
        try {
          const nextView =
            sanitizeCatalogView(
              await readCatalogViewOperation(),
            );

          if (
            version !==
            operationVersion
          ) {
            return currentState();
          }

          view =
            nextView;
          loading = false;
        } catch {
          if (
            version !==
            operationVersion
          ) {
            return currentState();
          }

          view =
            createTvCatalogUnavailableView({
              code:
                'catalog_unavailable',

              retryable: false,
            });

          loading = false;
        }

        return publish();
      })();

    inFlight =
      promise;

    promise.finally(
      () => {
        if (
          inFlight ===
          promise
        ) {
          inFlight = null;
        }
      },
    );

    return promise;
  }

  function loadCatalog() {
    if (inFlight) {
      return inFlight;
    }

    return startCatalogRead();
  }

  function refreshCatalog() {
    return startCatalogRead();
  }

  return Object.freeze({
    loadCatalog,
    refreshCatalog,
    getState: currentState,
  });
}
