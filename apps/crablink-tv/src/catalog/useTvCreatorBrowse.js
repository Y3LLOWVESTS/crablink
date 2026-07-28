/**
 * RO:WHAT — React hook for deriving the TV creator-browse view from the reviewed catalog state.
 * RO:WHY — The visible creator surface should be a thin UI layer over the pure creator-browse model.
 * RO:INTERACTS — tvCreatorBrowseModel and TvCreatorBrowsePanel.
 * RO:INVARIANTS — local query only; catalog view remains the source; no automatic network work.
 * RO:SECURITY — no native invoke, fetch, timers, storage, payment, or settlement behavior.
 * RO:TEST — TvCreatorBrowsePanel.source.test.mjs and check-crablink-tv-creator-browse-react-boundary.mjs.
 */

import {
  useMemo,
  useState,
} from 'react';

import {
  projectTvCreatorBrowseFromCatalog,
} from './tvCreatorBrowseModel.js';

export function useTvCreatorBrowse({
  catalogView,
} = {}) {
  const [
    creatorQuery,
    setCreatorQueryValue,
  ] = useState('');

  const creatorBrowseView =
    useMemo(
      () =>
        projectTvCreatorBrowseFromCatalog(
          catalogView,
          {
            query:
              creatorQuery,
          },
        ),
      [
        catalogView,
        creatorQuery,
      ],
    );

  function setCreatorQuery(
    nextQuery,
  ) {
    setCreatorQueryValue(
      typeof nextQuery === 'string'
        ? nextQuery
        : '',
    );
  }

  function clearCreatorQuery() {
    setCreatorQueryValue('');
  }

  return Object.freeze({
    creatorBrowseView,
    creatorQuery,
    setCreatorQuery,
    clearCreatorQuery,
  });
}
