import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  isExplicitDeveloperSurface,
} from '../../app/developerSurfaceMode.js';

const setupUrl =
  new URL(
    './SiteGuidedSetup.jsx',
    import.meta.url,
  );

async function setupSource() {
  return readFile(
    setupUrl,
    'utf8',
  );
}

test(
  'Phase 11A1 custom-code surface is hidden by default',
  () => {
    assert.equal(
      isExplicitDeveloperSurface(),
      false,
    );
  },
);

test(
  'Phase 11A1 release build fails closed with stale Developer Mode',
  () => {
    assert.equal(
      isExplicitDeveloperSurface({
        buildDev:
          false,

        settings: {
          devMode:
            true,
        },
      }),
      false,
    );
  },
);

test(
  'Phase 11A1 development build alone cannot expose custom-code tools',
  () => {
    assert.equal(
      isExplicitDeveloperSurface({
        buildDev:
          true,

        settings: {
          devMode:
            false,
        },
      }),
      false,
    );
  },
);

test(
  'Phase 11A1 development build plus explicit Developer Mode may expose retained tools',
  () => {
    assert.equal(
      isExplicitDeveloperSurface({
        buildDev:
          true,

        settings: {
          devMode:
            true,
        },
      }),
      true,
    );
  },
);

test(
  'Phase 11A1 SiteGuidedSetup derives custom-code visibility from shared developer contract',
  async () => {
    const source =
      await setupSource();

    assert.match(
      source,
      /isExplicitDeveloperSurface/,
    );

    assert.match(
      source,
      /import\.meta\.env\.DEV === true/,
    );

    assert.match(
      source,
      /settings:\s*app\?\.settings/,
    );
  },
);

test(
  'Phase 11A1 Import HTML control is gated',
  async () => {
    const source =
      await setupSource();

    const controlIndex =
      source.indexOf(
        'Import HTML',
      );

    const gateIndex =
      source.lastIndexOf(
        '{customCodeEnabled && (',
        controlIndex,
      );

    assert.equal(
      controlIndex >= 0,
      true,
    );

    assert.equal(
      gateIndex >= 0,
      true,
    );
  },
);

test(
  'Phase 11A1 Root HTML editor is gated',
  async () => {
    const source =
      await setupSource();

    const controlIndex =
      source.indexOf(
        'label="Root HTML"',
      );

    const gateIndex =
      source.lastIndexOf(
        '{customCodeEnabled && (',
        controlIndex,
      );

    assert.equal(
      controlIndex >= 0,
      true,
    );

    assert.equal(
      gateIndex >= 0,
      true,
    );
  },
);

test(
  'Phase 11A1 Clear HTML control is gated',
  async () => {
    const source =
      await setupSource();

    const controlIndex =
      source.indexOf(
        'Clear HTML',
      );

    const gateIndex =
      source.lastIndexOf(
        '{customCodeEnabled && (',
        controlIndex,
      );

    assert.equal(
      controlIndex >= 0,
      true,
    );

    assert.equal(
      gateIndex >= 0,
      true,
    );
  },
);
