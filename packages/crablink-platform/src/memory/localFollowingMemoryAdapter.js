/**
 * RO:WHAT — Deterministic test-only memory persistence for the local-following record.
 * RO:WHY — Phase 8 behavior needs a portable persistence fixture before desktop native storage is wired.
 * RO:INTERACTS — localFollowingPort and memorySnapshot.
 * RO:INVARIANTS — values are isolated immutable snapshots; absent state reads as null.
 * RO:SECURITY — no disk, browser storage, Tauri, network, social graph, wallet, ledger, ROC, or finality authority.
 * RO:TEST — localFollowingMemoryAdapter.test.mjs.
 */

// FINAL_BETA_PHASE8A2_LOCAL_FOLLOWING_MEMORY_ADAPTER_V1

import {
  createLocalFollowingPort,
} from '../contracts/localFollowingPort.js';

import {
  freezeMemorySnapshot,
} from './memorySnapshot.js';

export function createMemoryLocalFollowingAdapter(
  initialRecord = null,
) {
  let stored =
    initialRecord === null
      ? null
      : freezeMemorySnapshot(
          initialRecord,
        );

  return createLocalFollowingPort({
    async readLocalFollowing() {
      if (stored === null) {
        return null;
      }

      return freezeMemorySnapshot(
        stored,
      );
    },

    async writeLocalFollowing(
      record,
    ) {
      if (
        record === null ||
        typeof record !== 'object' ||
        Array.isArray(record)
      ) {
        throw new TypeError(
          'local following persistence requires a record',
        );
      }

      stored =
        freezeMemorySnapshot(
          record,
        );

      return freezeMemorySnapshot(
        stored,
      );
    },
  });
}
