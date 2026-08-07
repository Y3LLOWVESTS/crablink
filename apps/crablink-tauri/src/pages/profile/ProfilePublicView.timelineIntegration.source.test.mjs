import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

const viewUrl =
  new URL(
    './ProfilePublicView.jsx',
    import.meta.url,
  );

async function source() {
  return readFile(
    viewUrl,
    'utf8',
  );
}

test(
  'phase7a3 marks the ProfilePublicView timeline integration',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /FINAL_BETA_PHASE7A3_PROFILE_TIMELINE_INTEGRATION_V1/,
    );

    assert.match(
      value,
      /ProfileTimelineSurface/,
    );
  },
);

test(
  'phase7a3 creates the publication port from the existing gateway boundary',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /app\?\.clients\?\.publications/,
    );

    assert.match(
      value,
      /createPublicationAdapter/,
    );

    assert.match(
      value,
      /app\.clients\.gateway/,
    );
  },
);

test(
  'phase7a3 performs one bounded initial creator publication read',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /publicationClient[\s\S]*listCreatorPublications/,
    );

    assert.match(
      value,
      /username,[\s\S]*limit:[\s\S]*20/,
    );
  },
);

test(
  'phase7a3 builds the reviewed model before rendering the surface',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /createProfileTimelineModel/,
    );

    assert.match(
      value,
      /const timelineModel/,
    );

    assert.match(
      value,
      /model=\{timelineModel\}/,
    );

    assert.match(
      value,
      /reviewTimelinePage/,
    );
  },
);

test(
  'phase7a3 connects model-owned tabs to local presentation state',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /normalizeProfileTimelineTab/,
    );

    assert.match(
      value,
      /setTimelineTab/,
    );

    assert.match(
      value,
      /onSelectTab=/,
    );
  },
);

test(
  'phase7a3 preserves the opaque cursor and caps accumulated items at fifty',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /cursor,/,
    );

    assert.match(
      value,
      /50 - currentItems\.length/,
    );

    assert.match(
      value,
      /Math\.min\([\s\S]*20,[\s\S]*remaining/,
    );

    assert.match(
      value,
      /items\.length >= 50/,
    );

    assert.equal(
      value.includes(
        'nextCursor +',
      ),
      false,
    );
  },
);

test(
  'phase7a3 deduplicates appended publications without reordering backend pages',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /const seen[\s\S]*new Set/,
    );

    assert.match(
      value,
      /\.\.\.currentPage\.items/,
    );

    assert.match(
      value,
      /\.\.\.nextPage\.items/,
    );

    assert.match(
      value,
      /seen\.has/,
    );
  },
);

test(
  'phase7a3 derives owner editing from the existing own-profile identity projection',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /resolveOwnProfileHandle/,
    );

    assert.match(
      value,
      /normalizeProfileUsername\([\s\S]*ownHandle/,
    );

    assert.match(
      value,
      /isOwner/,
    );

    assert.match(
      value,
      /onEditProfile=/,
    );
  },
);

test(
  'phase7a3 navigates only reviewed crab publication routes',
  async () => {
    const value =
      await source();

    assert.match(
      value,
      /startsWith\([\s\S]*'crab:\/\/'/,
    );

    assert.match(
      value,
      /app\?\.navigate/,
    );

    assert.match(
      value,
      /onOpenPublication=/,
    );
  },
);

test(
  'phase7a3 preserves honest failure states and adds no forbidden authority',
  async () => {
    const value =
      await source();

    for (const required of [
      "'offline'",
      "'stale'",
      "'error'",
      'timelineFailureStatus',
      'current.page',
    ]) {
      assert.equal(
        value.includes(
          required,
        ),
        true,
        `missing timeline failure behavior: ${required}`,
      );
    }

    for (const forbidden of [
      '/v1/index/',
      'localCatalog',
      'publishCreatorPublication',
      'followMutation',
      'walletMutation',
      'receiptAuthority',
      'paidEntitlementAuthority',
      'settlementAuthority',
      'privateKey',
      'recoveryPhrase',
      'capabilityToken',
    ]) {
      assert.equal(
        value.includes(
          forbidden,
        ),
        false,
        `forbidden timeline integration authority: ${forbidden}`,
      );
    }
  },
);
