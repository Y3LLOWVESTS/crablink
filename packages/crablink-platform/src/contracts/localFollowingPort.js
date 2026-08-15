/**
 * RO:WHAT — Platform-neutral persistence port for the private local-following record.
 * RO:WHY — FINAL_BETA Phase 8 keeps followed-creator selection local without binding shared UI to storage APIs.
 * RO:INTERACTS — localFollowing core model, memory adapter, future desktop Tauri persistence adapter.
 * RO:INVARIANTS — exactly readLocalFollowing and writeLocalFollowing; no network relationship authority.
 * RO:SECURITY — persistence is local preference state, not Passport, wallet, ledger, receipt, ROC, or finality truth.
 * RO:TEST — localFollowingPort.test.mjs.
 */

// FINAL_BETA_PHASE8A2_LOCAL_FOLLOWING_PERSISTENCE_PORT_V1

import {
  createMethodPort,
} from './portContract.js';

const METHODS =
  Object.freeze([
    'readLocalFollowing',
    'writeLocalFollowing',
  ]);

export function createLocalFollowingPort(
  methods,
) {
  return createMethodPort(
    'local following port',
    methods,
    METHODS,
  );
}
