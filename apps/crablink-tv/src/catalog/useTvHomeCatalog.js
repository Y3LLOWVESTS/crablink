/**
 * RO:WHAT — React hook that wires the TV Home catalog panel to the reviewed catalog controller.
 * RO:WHY — Home needs visible catalog loading without automatic polling or direct Tauri calls in JSX.
 * RO:INTERACTS — tvCatalogPort, tvCatalogAdapter, and tvCatalogInteraction.
 * RO:INVARIANTS — manual load only; duplicate loads share the controller lock; refresh is explicit.
 * RO:SECURITY — the hook consumes one fixed catalog port and publishes sanitized views only.
 * RO:TEST — TvHomeCatalogPanel.source.test.mjs and check-crablink-tv-home-catalog-react-boundary.mjs.
 */

import {
  useMemo,
  useState,
} from 'react';

import {
  tvCatalogPort,
} from '../platform/tauriTvAdapter.js';

import {
  createTvCatalogAdapter,
} from './tvCatalogAdapter.js';

import {
  INITIAL_TV_CATALOG_INTERACTION_STATE,
  createTvCatalogInteraction,
} from './tvCatalogInteraction.js';

import {
  TV_CATALOG_VIEW_KIND,
} from './tvCatalogModel.js';

function summarizeCatalogState(
  state,
) {
  if (state.loading) {
    return 'Loading the reviewed Home catalog from the configured gateway.';
  }

  if (!state.loadAttempted) {
    return 'Home catalog is waiting for a manual load.';
  }

  switch (state.view.kind) {
    case TV_CATALOG_VIEW_KIND.READY:
      return 'Home catalog loaded from the reviewed gateway response.';

    case TV_CATALOG_VIEW_KIND.EMPTY:
      return 'Home catalog returned no rails. No synthetic rows were created.';

    case TV_CATALOG_VIEW_KIND.MALFORMED:
      return 'Home catalog response was rejected by the local model.';

    case TV_CATALOG_VIEW_KIND.UNAVAILABLE:
      return state.view.retryable
        ? 'Home catalog is unavailable and can be retried.'
        : 'Home catalog is unavailable.';

    default:
      return 'Home catalog remains in a safe waiting state.';
  }
}

export function useTvHomeCatalog({
  onActivity = () => {},
} = {}) {
  const [
    catalogState,
    setCatalogState,
  ] = useState(
    INITIAL_TV_CATALOG_INTERACTION_STATE,
  );

  const catalogInteraction =
    useMemo(
      () => {
        const catalogAdapter =
          createTvCatalogAdapter(
            tvCatalogPort,
          );

        return createTvCatalogInteraction({
          readCatalogView:
            catalogAdapter.readCatalogView,

          onState:
            setCatalogState,
        });
      },
      [],
    );

  async function loadHomeCatalog() {
    const state =
      await catalogInteraction.loadCatalog();

    onActivity(
      summarizeCatalogState(
        state,
      ),
    );

    return state;
  }

  async function refreshHomeCatalog() {
    const state =
      await catalogInteraction.refreshCatalog();

    onActivity(
      summarizeCatalogState(
        state,
      ),
    );

    return state;
  }

  return Object.freeze({
    catalogState,
    loadHomeCatalog,
    refreshHomeCatalog,
  });
}
