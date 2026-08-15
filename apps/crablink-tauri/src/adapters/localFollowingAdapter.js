/**
 * RO:WHAT — Desktop adapter for private local-following persistence.
 * RO:WHY — Product code uses the shared persistence port rather than raw Tauri IPC.
 * RO:INTERACTS — @crablink/core local-following model, @crablink/platform port, tauriPlatform.js.
 * RO:INVARIANTS — exactly read/write local-following persistence; versioned records normalized at the IPC boundary.
 * RO:SECURITY — fixed allowlisted commands only; no server social graph, follower counts, secrets, wallet, ledger, ROC, or finality authority.
 * RO:TEST — localFollowingAdapter.test.mjs.
 */

// FINAL_BETA_PHASE8A6_DESKTOP_LOCAL_FOLLOWING_ADAPTER_V1

import {
  normalizeLocalFollowingRecord,
} from '../../../../packages/crablink-core/src/localFollowing.js';

import {
  createLocalFollowingPort,
} from '../../../../packages/crablink-platform/src/index.js';

import {
  callTauri,
} from '../platform/tauriPlatform.js';

export const LOCAL_FOLLOWING_READ_COMMAND =
  'local_following_read';

export const LOCAL_FOLLOWING_WRITE_COMMAND =
  'local_following_write';

export function createDesktopLocalFollowingAdapter({
  callTauriImpl = callTauri,
} = {}) {
  if (
    typeof callTauriImpl !==
    'function'
  ) {
    throw new TypeError(
      'desktop local following adapter requires callTauri',
    );
  }

  async function readLocalFollowing() {
    const value =
      await callTauriImpl(
        LOCAL_FOLLOWING_READ_COMMAND,
      );

    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    return normalizeLocalFollowingRecord(
      value,
    );
  }

  async function writeLocalFollowing(
    record,
  ) {
    const normalized =
      normalizeLocalFollowingRecord(
        record,
      );

    const written =
      await callTauriImpl(
        LOCAL_FOLLOWING_WRITE_COMMAND,
        {
          record:
            normalized,
        },
      );

    return normalizeLocalFollowingRecord(
      written,
    );
  }

  return createLocalFollowingPort({
    readLocalFollowing,
    writeLocalFollowing,
  });
}

export const localFollowingPort =
  createDesktopLocalFollowingAdapter();
