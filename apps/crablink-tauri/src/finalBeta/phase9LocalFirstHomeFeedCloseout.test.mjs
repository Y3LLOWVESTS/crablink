import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT,
  readPhase9LocalFirstHomeFeedCloseout,
} from './phase9LocalFirstHomeFeedCloseout.js';

test(
  'Phase 9 acceptance is formally locked to the FINAL_BETA contract',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .acceptance,
      {
        phase:
          'FINAL_BETA_PHASE9_FOLLOWING_FEED_BACKEND',
        status:
          'GREEN',
        ordering:
          'CHRONOLOGICAL',
        opaqueRanking:
          'NO',
        paidRanking:
          'NO',
        feedHydration:
          'BOUNDED',
        deletedContentFiltered:
          'YES',
        blockedContentFiltered:
          'YES',
        moderatedContentFiltered:
          'YES',
        planNextPhase:
          'FINAL_BETA_PHASE10_HOME_FEED_UI',
        effectiveNextPhase:
          'FINAL_BETA_PHASE10_HOME_FEED_AND_EXPLORE_SEPARATION',
      },
    );
  },
);

test(
  'Phase 9 locks the superseding local-first doctrine',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .doctrine,
      {
        supersedingAddendum:
          'FINAL_BETA_LOCAL_FOLLOWING_QUICKCHAIN_ADDENDUM_V1',
        composition:
          'LOCAL_FIRST',
        followingListOwner:
          'LOCAL_CRABLINK_APP',
        followingListStorage:
          'LOCAL_DEVICE_STORAGE',
        contentSource:
          'PUBLIC_NETWORK_TIMELINES',
        completeFollowingListUpload:
          false,
        serverSocialGraphRequired:
          false,
        networkFollowMutationRequired:
          false,
        globalFeedCursor:
          false,
        perCreatorOpaqueCursor:
          true,
      },
    );
  },
);

test(
  'Phase 9 locks the complete reviewed implementation stack',
  () => {
    const implementation =
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .implementation;

    assert.equal(
      implementation.sharedFeedModel,
      true,
    );

    assert.equal(
      implementation.deterministicChronologicalMerge,
      true,
    );

    assert.equal(
      implementation.maximumFeedItems,
      50,
    );

    assert.equal(
      implementation.creatorBatchMaximum,
      32,
    );

    assert.equal(
      implementation.hydrationConcurrencyMaximum,
      8,
    );

    assert.equal(
      implementation.creatorPublicationLimitMaximum,
      50,
    );

    assert.equal(
      implementation.nativeAtomicCacheStore,
      true,
    );

    assert.equal(
      implementation.tauriCacheCommandBridge,
      true,
    );

    assert.equal(
      implementation.offlineCacheProjection,
      true,
    );

    assert.equal(
      implementation.consumerHomeFeedWiring,
      true,
    );
  },
);

test(
  'Phase 9 locks deterministic public-only feed behavior',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .feedBehavior,
      {
        followedCreatorsOnly:
          true,
        publicPublicationSummariesOnly:
          true,
        chronologicalNewestFirst:
          true,
        equalTimestampDeterministic:
          true,
        conflictingDuplicatesFailClosed:
          true,
        creatorMismatchFailClosed:
          true,
        malformedPublicationPageFailClosed:
          true,
        unlistedFiltered:
          true,
        privateFiltered:
          true,
        deletedFiltered:
          true,
        blockedFiltered:
          true,
        moderatedFiltered:
          true,
        opaqueRanking:
          false,
        paidRanking:
          false,
      },
    );
  },
);

test(
  'Phase 9 offline cache remains stale display state without invented truth',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .offlineCache,
      {
        schema:
          'crablink.local-following-feed-cache.v1',
        maximumItems:
          50,
        publicSummariesOnly:
          true,
        deterministicChronology:
          true,
        currentLocalFollowingFilter:
          true,
        unfollowedCreatorsVisible:
          false,
        staleLabelRequired:
          true,
        status:
          'stale-offline',
        inventsFreshnessTruth:
          false,
        inventsDeletionTruth:
          false,
        inventsPaidEntitlementTruth:
          false,
        incomingNonPublicAccepted:
          false,
        persistedNonPublicAccepted:
          false,
      },
    );
  },
);

test(
  'Phase 9 grants no server graph ranking or economic authority',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .boundaries,
      {
        completeFollowingListUpload:
          false,
        publicFollowerCount:
          false,
        publicFollowingCount:
          false,
        publicFollowerList:
          false,
        publicFollowingList:
          false,
        publicSocialGraph:
          false,
        serverFeedAuthority:
          false,
        globalFeedCursor:
          false,
        browserStorageInHome:
          false,
        directTauriInvokeInHome:
          false,
        directNetworkTransportInHome:
          false,
        followMutationFromFeed:
          false,
        publicationMutationFromFeed:
          false,
        walletMutation:
          false,
        ledgerMutation:
          false,
        quickchainMutation:
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
  'Phase 9 hands the implemented Home feed into the remaining Phase 10 product acceptance',
  () => {
    assert.deepEqual(
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
        .phase10Handoff,
      {
        homeFollowingFeed:
          'IMPLEMENTED',
        manualRefresh:
          true,
        automaticPolling:
          false,
        offlineStaleLabel:
          true,
        emptyFollowingGuidance:
          true,
        creatorShortcut:
          true,
        profileShortcut:
          true,
        receiptsShortcut:
          true,
        libraryShortcut:
          true,
        developerDashboardQuarantined:
          true,
        exploreSeparation:
          'NEXT',
        homeIconAcceptance:
          'NEXT',
        profileFollowLiveAcceptance:
          'NEXT',
        profileFeedObjectParity:
          'NEXT',
      },
    );
  },
);

test(
  'Phase 9 closeout object and nested records are immutable and canonical',
  () => {
    assert.equal(
      readPhase9LocalFirstHomeFeedCloseout(),
      PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT,
    );

    for (
      const value
      of [
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .acceptance,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .doctrine,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .implementation,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .feedBehavior,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .offlineCache,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .boundaries,
        PHASE9_LOCAL_FIRST_HOME_FEED_CLOSEOUT
          .phase10Handoff,
      ]
    ) {
      assert.equal(
        Object.isFrozen(value),
        true,
      );
    }
  },
);
