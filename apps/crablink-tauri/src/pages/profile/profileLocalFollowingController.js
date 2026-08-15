/**
 * RO:WHAT — Orchestrates local Follow and Unfollow above the reviewed persistence port.
 * RO:WHY — Public-profile UI needs deterministic local preference behavior without network relationship truth.
 * RO:INTERACTS — crablink-core local-following domain and desktop localFollowingPort.
 * RO:INVARIANTS — reads and writes only crablink.local-following.v1; idempotent domain behavior is preserved.
 * RO:SECURITY — no public graph edge, follower count, receipt, notification, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — profileLocalFollowingController.test.mjs.
 */

// FINAL_BETA_PHASE8A7_PROFILE_LOCAL_FOLLOWING_CONTROLLER_V1

import {
  createEmptyLocalFollowingRecord,
  followLocalProfile,
  isLocallyFollowing,
  normalizeFollowingUsername,
  normalizeLocalFollowingRecord,
  normalizePublicProfileRef,
  unfollowLocalProfile,
} from '../../../../../packages/crablink-core/src/localFollowing.js';

export async function readProfileLocalFollowing({
  port,
  username,
}) {
  const persistence =
    requireLocalFollowingPort(
      port,
    );

  const identity =
    profileIdentity(
      username,
    );

  const value =
    await persistence
      .readLocalFollowing();

  const record =
    value === null ||
    value === undefined
      ? null
      : normalizeLocalFollowingRecord(
          value,
        );

  return freezeResult({
    record,
    profileRef:
      identity.profileRef,
    isFollowing:
      record === null
        ? false
        : isLocallyFollowing(
            record,
            identity.profileRef,
          ),
    changed:
      false,
  });
}

export async function followProfileLocalFollowing({
  port,
  username,
  record,
  followedAt,
}) {
  const persistence =
    requireLocalFollowingPort(
      port,
    );

  const identity =
    profileIdentity(
      username,
    );

  const baseRecord =
    record === null ||
    record === undefined
      ? createEmptyLocalFollowingRecord(
          followedAt,
        )
      : normalizeLocalFollowingRecord(
          record,
        );

  const mutation =
    followLocalProfile(
      baseRecord,
      {
        profileRef:
          identity.profileRef,
        username:
          identity.username,
        followedAt,
      },
    );

  if (
    mutation.changed === false
  ) {
    return freezeResult({
      record:
        mutation.record,
      profileRef:
        identity.profileRef,
      isFollowing:
        true,
      changed:
        false,
    });
  }

  const persisted =
    normalizeLocalFollowingRecord(
      await persistence
        .writeLocalFollowing(
          mutation.record,
        ),
    );

  return freezeResult({
    record:
      persisted,
    profileRef:
      identity.profileRef,
    isFollowing:
      true,
    changed:
      true,
  });
}

export async function unfollowProfileLocalFollowing({
  port,
  username,
  record,
  updatedAt,
}) {
  const persistence =
    requireLocalFollowingPort(
      port,
    );

  const identity =
    profileIdentity(
      username,
    );

  const originalAbsent =
    record === null ||
    record === undefined;

  const baseRecord =
    originalAbsent
      ? createEmptyLocalFollowingRecord(
          updatedAt,
        )
      : normalizeLocalFollowingRecord(
          record,
        );

  const mutation =
    unfollowLocalProfile(
      baseRecord,
      {
        profileRef:
          identity.profileRef,
        updatedAt,
      },
    );

  if (
    mutation.changed === false
  ) {
    return freezeResult({
      record:
        originalAbsent
          ? null
          : mutation.record,
      profileRef:
        identity.profileRef,
      isFollowing:
        false,
      changed:
        false,
    });
  }

  const persisted =
    normalizeLocalFollowingRecord(
      await persistence
        .writeLocalFollowing(
          mutation.record,
        ),
    );

  return freezeResult({
    record:
      persisted,
    profileRef:
      identity.profileRef,
    isFollowing:
      false,
    changed:
      true,
  });
}

function profileIdentity(
  username,
) {
  const normalizedUsername =
    normalizeFollowingUsername(
      username,
    );

  return Object.freeze({
    username:
      normalizedUsername,
    profileRef:
      normalizePublicProfileRef(
        `crab://@${normalizedUsername}`,
      ),
  });
}

function requireLocalFollowingPort(
  port,
) {
  if (
    port === null ||
    typeof port !== 'object' ||
    typeof port.readLocalFollowing !==
      'function' ||
    typeof port.writeLocalFollowing !==
      'function'
  ) {
    throw new TypeError(
      'profile local following requires the reviewed persistence port',
    );
  }

  return port;
}

function freezeResult({
  record,
  profileRef,
  isFollowing,
  changed,
}) {
  return Object.freeze({
    record,
    profileRef,
    isFollowing,
    changed,
  });
}
