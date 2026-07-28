/**
 * RO:WHAT — Adapts one shared read-only catalog operation into TV-safe catalog views.
 * RO:WHY — Phase 8 needs a pure boundary between future native transport and TV presentation.
 * RO:INTERACTS — @crablink/platform catalog port and tvCatalogModel projections.
 * RO:INVARIANTS — one readCatalogView method; no read at construction; malformed data never becomes ready.
 * RO:SECURITY — raw errors are redacted; no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, or finality authority.
 * RO:TEST — tvCatalogAdapter.test.mjs and check-crablink-tv-catalog-adapter-boundary.mjs.
 */

import {
  createCatalogPort,
} from '../../../../packages/crablink-platform/src/index.js';

import {
  createTvCatalogUnavailableView,
  projectTvCatalogResponse,
} from './tvCatalogModel.js';

const SAFE_UNAVAILABLE_CODES =
  new Set([
    'catalog_unavailable',
    'gateway_unconfigured',
    'gateway_unreachable',
  ]);

function projectCatalogFailure(
  error,
) {
  const candidateCode =
    typeof error?.code === 'string'
      ? error.code
      : '';

  const code =
    SAFE_UNAVAILABLE_CODES.has(
      candidateCode,
    )
      ? candidateCode
      : 'catalog_unavailable';

  const retryable =
    code !== 'gateway_unconfigured' &&
    error?.retryable === true;

  return createTvCatalogUnavailableView({
    code,
    retryable,
  });
}

export function createTvCatalogAdapter({
  readCatalog,
}) {
  const catalogPort =
    createCatalogPort({
      readCatalog,
    });

  async function readCatalogView() {
    try {
      const response =
        await catalogPort.readCatalog();

      return projectTvCatalogResponse(
        response,
      );
    } catch (error) {
      return projectCatalogFailure(
        error,
      );
    }
  }

  return Object.freeze({
    readCatalogView,
  });
}
