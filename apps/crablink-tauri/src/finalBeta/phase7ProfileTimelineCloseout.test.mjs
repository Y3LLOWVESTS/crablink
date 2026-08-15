import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE7_PROFILE_TIMELINE_CLOSEOUT,
  readPhase7ProfileTimelineCloseout,
} from './phase7ProfileTimelineCloseout.js';

test(
  'Phase 7 profile timeline acceptance is formally locked',
  () => {
    assert.deepEqual(
      PHASE7_PROFILE_TIMELINE_CLOSEOUT
        .acceptance,
      {
        phase:
          'FINAL_BETA_PHASE7_PROFILE_TIMELINE',
        status:
          'GREEN',
        publicProfilePosts:
          'GREEN',
        profileContentBackendDerived:
          'YES',
        ownerEditBoundary:
          'GREEN',
        localCatalogAuthority:
          'NO',
        planNextPhase:
          'FINAL_BETA_PHASE8_FOLLOW_GRAPH',
        effectiveNextPhase:
          'FINAL_BETA_PHASE8_LOCAL_FOLLOWING',
      },
    );
  },
);

test(
  'Phase 7 locks the implemented profile timeline behavior',
  () => {
    const implementation =
      PHASE7_PROFILE_TIMELINE_CLOSEOUT
        .implementation;

    assert.deepEqual(
      implementation.tabs,
      [
        'Posts',
        'About',
        'Sites',
      ],
    );

    assert.equal(
      implementation.sitesTabConditional,
      true,
    );

    assert.equal(
      implementation.pinnedPublication,
      true,
    );

    assert.equal(
      implementation.boundedPagination,
      true,
    );

    assert.equal(
      implementation.pageRequestLimit,
      20,
    );

    assert.equal(
      implementation.accumulatedTimelineLimit,
      50,
    );

    assert.equal(
      implementation.opaqueCursorPreserved,
      true,
    );

    assert.equal(
      implementation.backendOrderPreserved,
      true,
    );

    assert.equal(
      implementation.publicationIdDeduplication,
      true,
    );

    assert.equal(
      implementation.ownerEditOnly,
      true,
    );
  },
);

test(
  'Phase 7 remains a backend-derived read surface without extra authority',
  () => {
    assert.deepEqual(
      PHASE7_PROFILE_TIMELINE_CLOSEOUT
        .boundaries,
      {
        backendDerivedPublications:
          true,
        localCatalogAuthority:
          false,
        directIndexAccessFromCrabLink:
          false,
        directOmnigateAccessFromCrabLink:
          false,
        publicationMutation:
          false,
        relationshipMutation:
          false,
        serverSocialGraphAuthority:
          false,
        walletMutation:
          false,
        ledgerMutation:
          false,
        receiptAuthority:
          false,
        paidEntitlementAuthority:
          false,
        settlementAuthority:
          false,
      },
    );
  },
);

test(
  'Phase 7 closeout locks local following instead of the obsolete server graph',
  () => {
    assert.deepEqual(
      PHASE7_PROFILE_TIMELINE_CLOSEOUT
        .followingDoctrine,
      {
        supersedingAddendum:
          'FINAL_BETA_LOCAL_FOLLOWING_QUICKCHAIN_ADDENDUM_V1',
        legacyServerGraphSuperseded:
          true,
        followingListOwner:
          'LOCAL_CRABLINK_APP',
        followingListDefaultStorage:
          'LOCAL_DEVICE_STORAGE',
        publicFollowerCount:
          'FORBIDDEN',
        publicFollowingCount:
          'FORBIDDEN',
        publicFollowerList:
          'FORBIDDEN',
        publicFollowingList:
          'FORBIDDEN',
        networkFollowMutation:
          'NOT_REQUIRED',
        serverSocialGraph:
          'NOT_REQUIRED_FOR_BETA',
        profileFollowingState:
          'LOCAL_DERIVED',
        completeFollowingListUpload:
          'FORBIDDEN',
        homeFeedComposition:
          'LOCAL_FIRST',
        homeFeedContentSource:
          'PUBLIC_NETWORK_TIMELINES',
        homeFeedOrder:
          'CHRONOLOGICAL',
      },
    );
  },
);

test(
  'Phase 7 closeout object and reader are immutable and canonical',
  () => {
    assert.equal(
      readPhase7ProfileTimelineCloseout(),
      PHASE7_PROFILE_TIMELINE_CLOSEOUT,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT
          .acceptance,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT
          .implementation,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT
          .implementation.tabs,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT
          .boundaries,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE7_PROFILE_TIMELINE_CLOSEOUT
          .followingDoctrine,
      ),
      true,
    );
  },
);
