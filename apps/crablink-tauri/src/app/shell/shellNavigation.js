/**
 * RO:WHAT — Canonical consumer-facing navigation contract for the CrabLink desktop shell.
 * RO:WHY — FINAL_BETA Phase 3; makes normal navigation understandable while preserving direct routes and advanced surfaces.
 * RO:INTERACTS — Shell, PrimaryNavigation, appState, routeRegistry, and future Advanced navigation.
 * RO:INVARIANTS — Home is always crab://home; simple mode is default; navigation changes route UI only.
 * RO:SECURITY — no backend, Passport, wallet, receipt, publication, QuickChain, or ROC authority.
 * RO:TEST — shellNavigation.test.mjs.
 *
 * FINAL_BETA_PHASE3A1_CONSUMER_NAVIGATION_CONTRACT_V1
 */

export const CRABLINK_HOME_ROUTE =
  'crab://home';

export const SHELL_MODE_SIMPLE =
  'simple';

export const SHELL_MODE_POWER_USER =
  'power-user';

export const DEFAULT_SHELL_MODE =
  SHELL_MODE_SIMPLE;

export const SUPPORTED_SHELL_MODES =
  Object.freeze([
    SHELL_MODE_SIMPLE,
    SHELL_MODE_POWER_USER,
  ]);

export const PRIMARY_NAVIGATION_ITEMS =
  Object.freeze([
    freezeNavigationItem({
      id: 'home',
      label: 'Home',
      icon: '⌂',
      route: CRABLINK_HOME_ROUTE,
      routeKinds: ['home'],
    }),

    freezeNavigationItem({
      id: 'explore',
      label: 'Explore',
      icon: '◉',
      route: 'crab://explore',
      routeKinds: ['explore'],
    }),

    freezeNavigationItem({
      id: 'create',
      label: 'Create',
      icon: '+',
      route: 'crab://make',
      routeKinds: ['make'],
    }),

    freezeNavigationItem({
      id: 'library',
      label: 'Library',
      icon: '▦',
      route: 'crab://library',
      routeKinds: ['library'],
    }),

    freezeNavigationItem({
      id: 'profile',
      label: 'Profile',
      icon: '@',
      route: 'crab://profile',
      routeKinds: ['profile'],
    }),
  ]);

export const ADVANCED_NAVIGATION_ITEMS =
  Object.freeze([
    freezeNavigationItem({
      id: 'receipts',
      label: 'Receipts',
      route: 'crab://receipts',
      routeKinds: ['receipts'],
    }),

    freezeNavigationItem({
      id: 'operator',
      label: 'Node operator',
      route: 'crab://operator',
      routeKinds: ['operator'],
    }),

    freezeNavigationItem({
      id: 'quickchain',
      label: 'QuickChain',
      route: 'crab://quickchain',
      routeKinds: ['quickchain'],
    }),

    freezeNavigationItem({
      id: 'interface-diagnostics',
      label: 'Interface diagnostics',
      route: 'crab://text',
      routeKinds: ['text'],
    }),
  ]);

const PRIMARY_ITEM_BY_ID =
  new Map(
    PRIMARY_NAVIGATION_ITEMS.map(
      (item) => [
        item.id,
        item,
      ],
    ),
  );

export function normalizeShellMode(
  value,
) {
  const normalized =
    String(value || '')
      .trim()
      .toLowerCase();

  return SUPPORTED_SHELL_MODES.includes(
    normalized,
  )
    ? normalized
    : DEFAULT_SHELL_MODE;
}

export function primaryNavigationIdForRoute(
  route,
) {
  const kind =
    String(
      route?.kind || '',
    )
      .trim()
      .toLowerCase();

  for (
    const item
    of PRIMARY_NAVIGATION_ITEMS
  ) {
    if (
      item.routeKinds.includes(
        kind,
      )
    ) {
      return item.id;
    }
  }

  return '';
}

export function primaryNavigationItemById(
  value,
) {
  return (
    PRIMARY_ITEM_BY_ID.get(
      String(value || ''),
    ) ||
    null
  );
}

export function navigatePrimaryItem(
  navigation,
  itemOrId,
) {
  const item =
    typeof itemOrId === 'string'
      ? primaryNavigationItemById(
          itemOrId,
        )
      : itemOrId;

  if (
    !item ||
    !item.route ||
    typeof navigation?.navigate !== 'function'
  ) {
    return false;
  }

  navigation.navigate(
    item.route,
  );

  return true;
}

function freezeNavigationItem({
  id,
  label,
  icon = '',
  route,
  routeKinds = [],
}) {
  return Object.freeze({
    id,
    label,
    icon,
    route,
    routeKinds:
      Object.freeze([
        ...routeKinds,
      ]),
  });
}
