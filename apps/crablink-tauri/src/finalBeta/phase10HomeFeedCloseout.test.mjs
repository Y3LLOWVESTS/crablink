import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  CRABLINK_HOME_ROUTE,
  navigatePrimaryItem,
  primaryNavigationIdForRoute,
  primaryNavigationItemById,
} from '../app/shell/shellNavigation.js';

const homeUrl =
  new URL(
    '../pages/home/HomePage.jsx',
    import.meta.url,
  );

const exploreUrl =
  new URL(
    '../pages/explore/ExplorePage.jsx',
    import.meta.url,
  );

const profileUrl =
  new URL(
    '../pages/profile/ProfilePublicView.jsx',
    import.meta.url,
  );

const profileModelUrl =
  new URL(
    '../pages/profile/profileTimelineModel.js',
    import.meta.url,
  );

const developerTestUrl =
  new URL(
    '../pages/home/HomePage.developerMode.source.test.mjs',
    import.meta.url,
  );

const followAcceptanceUrl =
  new URL(
    './phase10ProfileFollowHomeRefreshAcceptance.test.mjs',
    import.meta.url,
  );

const parityAcceptanceUrl =
  new URL(
    './phase10ProfileFeedObjectParity.test.mjs',
    import.meta.url,
  );

const offlineAcceptanceUrl =
  new URL(
    './phase10OfflineCacheAcceptance.test.mjs',
    import.meta.url,
  );

const separationAcceptanceUrl =
  new URL(
    './phase10HomeExploreSeparation.test.mjs',
    import.meta.url,
  );

async function sourceOf(
  url,
) {
  return readFile(
    url,
    'utf8',
  );
}

test(
  'Phase 10 closeout locks normal Home as the local-first Following feed',
  async () => {
    const home =
      await sourceOf(
        homeUrl,
      );

    assert.match(
      home,
      /function ConsumerHome/,
    );

    assert.match(
      home,
      /refreshLocalFollowingFeed/,
    );

    assert.match(
      home,
      /localFollowingPort/,
    );

    assert.match(
      home,
      /<FeedCard/,
    );

    assert.equal(
      home.includes(
        'createExploreDiscoveryClient',
      ),
      false,
    );
  },
);

test(
  'Phase 10 closeout locks refresh pagination and truthful offline Home behavior',
  async () => {
    const [
      home,
      offlineAcceptance,
    ] =
      await Promise.all([
        sourceOf(
          homeUrl,
        ),

        sourceOf(
          offlineAcceptanceUrl,
        ),
      ]);

    assert.match(
      home,
      /refreshSequence/,
    );

    assert.match(
      home,
      /loadOfflineLocalFollowingFeed/,
    );

    assert.match(
      home,
      /stale-offline/,
    );

    assert.match(
      home,
      /Load more/,
    );

    assert.match(
      offlineAcceptance,
      /current local follows gate cached creator visibility/,
    );

    assert.match(
      offlineAcceptance,
      /unfollow state removes stale cached creator visibility/,
    );

    assert.match(
      offlineAcceptance,
      /offline projection is always stale/,
    );
  },
);

test(
  'Phase 10 closeout locks Home navigation to crab home',
  () => {
    assert.equal(
      CRABLINK_HOME_ROUTE,
      'crab://home',
    );

    const item =
      primaryNavigationItemById(
        'home',
      );

    assert.equal(
      item?.route,
      'crab://home',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind:
          'home',
      }),
      'home',
    );

    const navigated = [];

    const result =
      navigatePrimaryItem(
        {
          navigate(
            route,
          ) {
            navigated.push(
              route,
            );
          },
        },
        'home',
      );

    assert.equal(
      result,
      true,
    );

    assert.deepEqual(
      navigated,
      [
        'crab://home',
      ],
    );
  },
);

test(
  'Phase 10 closeout locks Profile Follow into the reviewed Home refresh lifecycle',
  async () => {
    const [
      profile,
      home,
      acceptance,
    ] =
      await Promise.all([
        sourceOf(
          profileUrl,
        ),

        sourceOf(
          homeUrl,
        ),

        sourceOf(
          followAcceptanceUrl,
        ),
      ]);

    assert.match(
      profile,
      /followProfileLocalFollowing/,
    );

    assert.match(
      profile,
      /followPublicProfileLocally/,
    );

    assert.match(
      home,
      /refreshLocalFollowingFeed/,
    );

    assert.match(
      home,
      /app\?\.isActiveTab/,
    );

    assert.match(
      acceptance,
      /Home refresh lifecycle depends on active-tab transition/,
    );

    assert.match(
      acceptance,
      /Follow handler does not directly drive Home transport/,
    );
  },
);

test(
  'Phase 10 closeout locks Profile and Home to the same canonical publication object',
  async () => {
    const [
      model,
      acceptance,
    ] =
      await Promise.all([
        sourceOf(
          profileModelUrl,
        ),

        sourceOf(
          parityAcceptanceUrl,
        ),
      ]);

    assert.match(
      model,
      /FINAL_BETA_PHASE10A5_PROFILE_FEED_OBJECT_PARITY_V1/,
    );

    assert.match(
      model,
      /assertPublicationPageV1/,
    );

    assert.match(
      acceptance,
      /Profile and Home expose exactly equal publication objects/,
    );

    assert.match(
      acceptance,
      /canonical PublicationSummaryV1/,
    );
  },
);

test(
  'Phase 10 closeout locks Explore as a separate public discovery product',
  async () => {
    const [
      home,
      explore,
      separation,
    ] =
      await Promise.all([
        sourceOf(
          homeUrl,
        ),

        sourceOf(
          exploreUrl,
        ),

        sourceOf(
          separationAcceptanceUrl,
        ),
      ]);

    assert.match(
      explore,
      /FINAL_BETA_PHASE10A3F_EXPLORE_DISCOVERY_UI_V1/,
    );

    assert.match(
      explore,
      /createExploreDiscoveryClient/,
    );

    assert.match(
      explore,
      /recentPublications/,
    );

    assert.match(
      explore,
      /publicCreators/,
    );

    assert.match(
      explore,
      /templateSites/,
    );

    assert.equal(
      home.includes(
        'createExploreDiscoveryClient',
      ),
      false,
    );

    assert.match(
      separation,
      /Home and Explore as distinct primary routes/,
    );
  },
);

test(
  'Phase 10 closeout locks the proof dashboard outside normal consumer Home',
  async () => {
    const [
      home,
      developerTest,
    ] =
      await Promise.all([
        sourceOf(
          homeUrl,
        ),

        sourceOf(
          developerTestUrl,
        ),
      ]);

    const consumerIndex =
      home.indexOf(
        '<ConsumerHome',
      );

    const developerIndex =
      home.indexOf(
        'data-final-beta-home-mode="developer"',
      );

    assert.equal(
      consumerIndex >=
        0,
      true,
    );

    assert.equal(
      developerIndex >
        consumerIndex,
      true,
    );

    assert.match(
      home,
      /isExplicitDeveloperSurface/,
    );

    assert.match(
      home,
      /data-final-beta-home-mode="consumer"/,
    );

    assert.match(
      developerTest,
      /returns consumer Home before the engineering dashboard/,
    );

    assert.match(
      developerTest,
      /normal Home contains no engineering dashboard copy/,
    );
  },
);

test(
  'Phase 10 closeout preserves local selection and non-economic social boundaries',
  async () => {
    const [
      followAcceptance,
      offlineAcceptance,
      separationAcceptance,
    ] =
      await Promise.all([
        sourceOf(
          followAcceptanceUrl,
        ),

        sourceOf(
          offlineAcceptanceUrl,
        ),

        sourceOf(
          separationAcceptanceUrl,
        ),
      ]);

    assert.match(
      followAcceptance,
      /local following controller grants no network relationship authority/,
    );

    assert.match(
      followAcceptance,
      /Follow handler does not directly drive Home transport/,
    );

    assert.match(
      followAcceptance,
      /acceptance preserves local-first social and economic boundaries/,
    );

    assert.match(
      offlineAcceptance,
      /cached paid metadata never becomes paid entitlement or unlock truth/,
    );

    assert.match(
      separationAcceptance,
      /grants no new social graph ranking or economic authority/,
    );
  },
);
