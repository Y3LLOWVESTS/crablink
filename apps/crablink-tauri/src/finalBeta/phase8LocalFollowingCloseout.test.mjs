import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE8_LOCAL_FOLLOWING_CLOSEOUT,
  readPhase8LocalFollowingCloseout,
} from './phase8LocalFollowingCloseout.js';

test(
  'Phase 8 local-following acceptance is formally locked',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .acceptance,
      {
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
      },
    );
  },
);

test(
  'Phase 8 locks the complete reviewed local-following implementation stack',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .implementation,
      {
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
      },
    );
  },
);

test(
  'Phase 8 locks deterministic local follow and unfollow behavior',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .localBehavior,
      {
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
      },
    );
  },
);

test(
  'Phase 8 formally rejects the obsolete public follower graph',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .privacy,
      {
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
      },
    );
  },
);

test(
  'Phase 8 local following carries no economic or external-chain authority',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .authority,
      {
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
      },
    );
  },
);

test(
  'Phase 8 hands Home to local-first network-hydrated chronological composition',
  () => {
    assert.deepEqual(
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .homeFeedHandoff,
      {
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
      },
    );
  },
);

test(
  'Phase 8 closeout object and reader are immutable and canonical',
  () => {
    assert.equal(
      readPhase8LocalFollowingCloseout(),
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT,
    );

    for (const value of [
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .acceptance,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .implementation,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .localBehavior,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .privacy,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .authority,
      PHASE8_LOCAL_FOLLOWING_CLOSEOUT
        .homeFeedHandoff,
    ]) {
      assert.equal(
        Object.isFrozen(value),
        true,
      );
    }
  },
);
