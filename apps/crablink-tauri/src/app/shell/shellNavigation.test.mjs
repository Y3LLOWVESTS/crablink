import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADVANCED_NAVIGATION_ITEMS,
  CRABLINK_HOME_ROUTE,
  DEFAULT_SHELL_MODE,
  PRIMARY_NAVIGATION_ITEMS,
  SHELL_MODE_POWER_USER,
  SHELL_MODE_SIMPLE,
  navigatePrimaryItem,
  normalizeShellMode,
  primaryNavigationIdForRoute,
  primaryNavigationItemById,
} from './shellNavigation.js';

test(
  'Phase 3A1 freezes the consumer primary navigation order and routes',
  () => {
    assert.deepEqual(
      PRIMARY_NAVIGATION_ITEMS.map(
        ({
          id,
          label,
          route,
        }) => ({
          id,
          label,
          route,
        }),
      ),
      [
        {
          id: 'home',
          label: 'Home',
          route: 'crab://home',
        },
        {
          id: 'explore',
          label: 'Explore',
          route: 'crab://explore',
        },
        {
          id: 'create',
          label: 'Create',
          route: 'crab://make',
        },
        {
          id: 'library',
          label: 'Library',
          route: 'crab://library',
        },
        {
          id: 'profile',
          label: 'Profile',
          route: 'crab://profile',
        },
      ],
    );

    assert.equal(
      CRABLINK_HOME_ROUTE,
      'crab://home',
    );
  },
);

test(
  'Phase 3A1 keeps advanced engineering surfaces outside primary navigation',
  () => {
    const primaryIds =
      new Set(
        PRIMARY_NAVIGATION_ITEMS.map(
          (item) => item.id,
        ),
      );

    assert.deepEqual(
      ADVANCED_NAVIGATION_ITEMS.map(
        (item) => item.id,
      ),
      [
        'receipts',
        'operator',
        'quickchain',
        'interface-diagnostics',
      ],
    );

    for (
      const advancedItem
      of ADVANCED_NAVIGATION_ITEMS
    ) {
      assert.equal(
        primaryIds.has(
          advancedItem.id,
        ),
        false,
      );
    }
  },
);

test(
  'Phase 3A1 defaults to simple mode and recognizes power-user mode explicitly',
  () => {
    assert.equal(
      DEFAULT_SHELL_MODE,
      SHELL_MODE_SIMPLE,
    );

    assert.equal(
      normalizeShellMode(''),
      SHELL_MODE_SIMPLE,
    );

    assert.equal(
      normalizeShellMode('unexpected'),
      SHELL_MODE_SIMPLE,
    );

    assert.equal(
      normalizeShellMode('POWER-USER'),
      SHELL_MODE_POWER_USER,
    );
  },
);

test(
  'Phase 3A1 derives active consumer navigation from route kind',
  () => {
    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'home',
      }),
      'home',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'explore',
      }),
      'explore',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'make',
      }),
      'create',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'library',
      }),
      'library',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'profile',
      }),
      'profile',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind: 'quickchain',
      }),
      '',
    );
  },
);

test(
  'Phase 3A1 primary navigation performs only caller-owned route navigation',
  () => {
    const calls = [];

    assert.equal(
      navigatePrimaryItem(
        {
          navigate:
            (route) => {
              calls.push(route);
            },
        },
        'home',
      ),
      true,
    );

    assert.equal(
      navigatePrimaryItem(
        {
          navigate:
            (route) => {
              calls.push(route);
            },
        },
        primaryNavigationItemById(
          'explore',
        ),
      ),
      true,
    );

    assert.deepEqual(
      calls,
      [
        'crab://home',
        'crab://explore',
      ],
    );

    assert.equal(
      navigatePrimaryItem(
        {},
        'home',
      ),
      false,
    );

    assert.equal(
      navigatePrimaryItem(
        {
          navigate() {
            throw new Error(
              'unknown item must not navigate',
            );
          },
        },
        'unknown',
      ),
      false,
    );
  },
);
