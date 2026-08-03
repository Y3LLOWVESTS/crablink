/**
 * RO:WHAT — Active consumer-facing primary navigation for the CrabLink desktop shell.
 * RO:WHY — FINAL_BETA Phase 3; makes Home, Explore, Create, Library, and Profile immediately visible.
 * RO:INTERACTS — PrimaryNavigation, shellNavigation, Shell, and caller-owned route navigation.
 * RO:INVARIANTS — simple mode is the default; active state derives from route kind; tabs remain secondary.
 * RO:SECURITY — navigation changes route UI only and grants no backend, Passport, wallet, receipt, publication, QuickChain, or ROC authority.
 * RO:TEST — ShellPrimaryNavigation.source.test.mjs.
 *
 * FINAL_BETA_PHASE3A2_ACTIVE_PRIMARY_NAVIGATION_ADOPTION_V1
 */

import PrimaryNavigation from '../../shared/components/PrimaryNavigation.jsx';
import {
  DEFAULT_SHELL_MODE,
  PRIMARY_NAVIGATION_ITEMS,
  navigatePrimaryItem,
  primaryNavigationIdForRoute,
} from './shellNavigation.js';

export default function ShellPrimaryNavigation({
  route,
  navigation,
}) {
  const activeId =
    primaryNavigationIdForRoute(
      route,
    );

  return (
    <div
      className="cl-shell-primary-navigation-bar"
      data-shell-mode={DEFAULT_SHELL_MODE}
    >
      <PrimaryNavigation
        items={PRIMARY_NAVIGATION_ITEMS}
        activeId={activeId}
        label="CrabLink primary navigation"
        className="cl-shell-primary-navigation"
        onSelect={(item) =>
          navigatePrimaryItem(
            navigation,
            item,
          )
        }
      />
    </div>
  );
}
