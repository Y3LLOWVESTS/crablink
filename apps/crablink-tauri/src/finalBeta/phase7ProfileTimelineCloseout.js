/**
 * RO:WHAT — Formal FINAL_BETA Phase 7 public-profile timeline closeout.
 * RO:WHY — Locks the completed social profile read surface before local following begins.
 * RO:INTERACTS — profileTimelineModel, ProfileTimelineSurface, ProfilePublicView, and the Phase 6 publication projection.
 * RO:INVARIANTS — public content is backend-derived; owner editing is owner-only; local catalog and relationship state are not authorities.
 * RO:SECURITY — no publication mutation, server follow graph, follower counts, wallet mutation, receipt authority, or settlement authority.
 * RO:TEST — phase7ProfileTimelineCloseout.test.mjs plus the Phase 7A1, 7A2, and 7A3 focused tests.
 */

// FINAL_BETA_PHASE7_PROFILE_TIMELINE_CLOSEOUT_V1

export const PHASE7_PROFILE_TIMELINE_CLOSEOUT =
  Object.freeze({
    acceptance:
      Object.freeze({
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

        // Preserve the original build-plan label while recording
        // the superseding local-following product decision.
        planNextPhase:
          'FINAL_BETA_PHASE8_FOLLOW_GRAPH',
        effectiveNextPhase:
          'FINAL_BETA_PHASE8_LOCAL_FOLLOWING',
      }),

    implementation:
      Object.freeze({
        modelMarker:
          'FINAL_BETA_PHASE7A1_PROFILE_TIMELINE_MODEL_V1',
        surfaceMarker:
          'FINAL_BETA_PHASE7A2_PROFILE_TIMELINE_SURFACE_V1',
        integrationMarker:
          'FINAL_BETA_PHASE7A3_PROFILE_TIMELINE_INTEGRATION_V1',

        tabs:
          Object.freeze([
            'Posts',
            'About',
            'Sites',
          ]),

        sitesTabConditional:
          true,
        pinnedPublication:
          true,
        boundedPagination:
          true,
        pageRequestLimit:
          20,
        accumulatedTimelineLimit:
          50,
        opaqueCursorPreserved:
          true,
        backendOrderPreserved:
          true,
        publicationIdDeduplication:
          true,
        emptyState:
          true,
        loadingState:
          true,
        errorState:
          true,
        staleState:
          true,
        offlineState:
          true,
        ownerEditOnly:
          true,
      }),

    boundaries:
      Object.freeze({
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
      }),

    followingDoctrine:
      Object.freeze({
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
      }),
  });

export function readPhase7ProfileTimelineCloseout() {
  return PHASE7_PROFILE_TIMELINE_CLOSEOUT;
}
