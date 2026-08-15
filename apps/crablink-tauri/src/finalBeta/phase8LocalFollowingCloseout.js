/**
 * RO:WHAT — Formal FINAL_BETA Phase 8 local-following closeout.
 * RO:WHY — Locks the private local social-selection model before Home feed composition begins.
 * RO:INTERACTS — crablink-core, crablink-platform, desktop native persistence, Tauri IPC, desktop adapter, and public profile UI.
 * RO:INVARIANTS — following remains local-device preference state; public creator/profile truth remains network-derived.
 * RO:SECURITY — no public follower graph, complete-following-list upload, economic event, wallet mutation, ledger mutation, QuickChain requirement, ROX, or Solana interaction.
 * RO:TEST — phase8LocalFollowingCloseout.test.mjs.
 */

// FINAL_BETA_PHASE8_LOCAL_FOLLOWING_CLOSEOUT_V1

export const PHASE8_LOCAL_FOLLOWING_CLOSEOUT =
  Object.freeze({
    acceptance:
      Object.freeze({
        phase:
          'FINAL_BETA_PHASE8_LOCAL_FOLLOWING',
        status:
          'GREEN',
        schema:
          'crablink.local-following.v1',
        followingListOwner:
          'LOCAL_CRABLINK_APP',
        followingListDefaultStorage:
          'LOCAL_DEVICE_STORAGE',
        publicProfileLocalFollowUi:
          'GREEN',
        nextPhase:
          'FINAL_BETA_PHASE9_LOCAL_FIRST_HOME_FEED',
      }),

    implementation:
      Object.freeze({
        sharedCoreRecord:
          true,
        sharedPlatformPort:
          true,
        deterministicMemoryAdapter:
          true,
        nativeAtomicStore:
          true,
        tauriReadWriteBridge:
          true,
        desktopPersistenceAdapter:
          true,
        pureFollowUnfollowDomain:
          true,
        publicProfileFollowUi:
          true,
      }),

    localBehavior:
      Object.freeze({
        profileReferenceValidation:
          true,
        usernameProfileMatchValidation:
          true,
        maximumEntries:
          10000,
        followIdempotent:
          true,
        unfollowIdempotent:
          true,
        repeatedFollowPreservesFollowedAt:
          true,
        noopMutationPreservesUpdatedAt:
          true,
        callerRecordMutation:
          false,
        ownerFollowControlVisible:
          false,
        visitorLocalFollowControl:
          true,
      }),

    privacy:
      Object.freeze({
        publicFollowerCount:
          false,
        publicFollowingCount:
          false,
        publicFollowerList:
          false,
        publicFollowingList:
          false,
        completeFollowingListUpload:
          false,
        serverSocialGraphRequired:
          false,
        networkFollowMutationRequired:
          false,
        creatorNotificationOnLocalFollow:
          false,
        networkConfirmationClaim:
          false,
      }),

    authority:
      Object.freeze({
        browserStorage:
          false,
        directReactStorage:
          false,
        rawTauriInvokeInProfile:
          false,
        followActionEconomicEvent:
          false,
        receiptCreated:
          false,
        walletMutation:
          false,
        ledgerMutation:
          false,
        quickchainRequired:
          false,
        roxInteraction:
          false,
        solanaInteraction:
          false,
      }),

    homeFeedHandoff:
      Object.freeze({
        composition:
          'LOCAL_FIRST',
        contentSource:
          'PUBLIC_NETWORK_TIMELINES',
        networkHydration:
          'REQUIRED_WHEN_ONLINE',
        offlineCache:
          'OPTIONAL_AND_BOUNDED',
        order:
          'CHRONOLOGICAL',
        publicSocialGraphRequired:
          false,
        localFollowListRequired:
          true,
        completeFollowingListUpload:
          false,
      }),
  });

export function readPhase8LocalFollowingCloseout() {
  return PHASE8_LOCAL_FOLLOWING_CLOSEOUT;
}
