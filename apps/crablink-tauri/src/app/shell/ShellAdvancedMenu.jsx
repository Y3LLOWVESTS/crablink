/**
 * RO:WHAT — Explicit Advanced entry point for engineering and diagnostic
 *           surfaces in the CrabLink desktop shell.
 * RO:WHY — FINAL_BETA Phase 3; keeps the normal shell consumer-facing while
 *          preserving bounded access to receipts, node, QuickChain, and
 *          interface diagnostics.
 * RO:INTERACTS — appContext, shellNavigation, TopBar, ModalHost, and
 *                caller-owned route navigation.
 * RO:INVARIANTS — advanced routes remain direct routes; opening this surface
 *                 grants no authority and performs no automatic mutation.
 * RO:SECURITY — no raw secrets, JSON, capabilities, wallet mutation,
 *               publication mutation, QuickChain authority, or ROC authority.
 * RO:TEST — ShellAdvancedMenu.source.test.mjs.
 *
 * FINAL_BETA_PHASE3A3_ADVANCED_SURFACE_QUARANTINE_V1
 */

import { useAppContext } from '../appContext.js';
import {
  ADVANCED_NAVIGATION_ITEMS,
} from './shellNavigation.js';

export default function ShellAdvancedMenu({
  navigation,
}) {
  const context =
    useAppContext();

  function openAdvancedMenu() {
    context.openModal({
      eyebrow:
        'Advanced',

      title:
        'Advanced and diagnostic tools',

      content: (
        <AdvancedMenuContent
          context={context}
          navigation={navigation}
        />
      ),

      actions: (
        <button
          className="cl-modal-action"
          type="button"
          onClick={context.closeModal}
        >
          Done
        </button>
      ),
    });
  }

  return (
    <button
      className="cl-icon-button cl-advanced-menu-trigger"
      type="button"
      onClick={openAdvancedMenu}
      title="Open advanced and diagnostic tools"
      aria-label="Open Advanced"
    >
      <span aria-hidden="true">•••</span>
    </button>
  );
}

function AdvancedMenuContent({
  context,
  navigation,
}) {
  const gatewayState =
    context.gatewayStatus?.state ||
    'unknown';

  const gatewayLabel =
    context.gatewayStatus?.label ||
    'Gateway unchecked';

  const localNodeState =
    context.localNodeStatus?.state ||
    'disabled';

  const localNodeLabel =
    context.localNodeStatus?.label ||
    'Local node disabled';

  function openRoute(
    route,
  ) {
    if (
      !route ||
      typeof navigation?.navigate !== 'function'
    ) {
      return;
    }

    context.closeModal?.();
    navigation.navigate(
      route,
    );
  }

  return (
    <section className="cl-advanced-menu">
      <p className="cl-muted-copy">
        Network inspection, receipts, node controls, QuickChain readiness,
        and diagnostics are kept outside normal navigation. These tools do
        not grant wallet, ledger, publication, finality, or settlement
        authority.
      </p>

      <nav
        className="cl-advanced-menu-routes"
        aria-label="Advanced CrabLink routes"
      >
        {ADVANCED_NAVIGATION_ITEMS.map(
          (item) => (
            <button
              className="cl-advanced-menu-route"
              type="button"
              key={item.id}
              onClick={() =>
                openRoute(
                  item.route,
                )
              }
            >
              <strong>{item.label}</strong>
              <span>{item.route}</span>
            </button>
          ),
        )}
      </nav>

      <div className="cl-advanced-status-grid">
        <section className="cl-advanced-status-card">
          <div>
            <strong>Gateway</strong>
            <span
              className={`cl-advanced-status-value cl-status-${gatewayState}`}
            >
              {gatewayLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={context.checkGateway}
          >
            Check gateway
          </button>
        </section>

        <section className="cl-advanced-status-card">
          <div>
            <strong>Local node</strong>
            <span
              className={`cl-advanced-status-value cl-status-${localNodeState}`}
            >
              {localNodeLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={context.checkLocalNode}
          >
            Check local node
          </button>
        </section>
      </div>

      <p className="cl-advanced-menu-note">
        Zoom controls remain available from Settings and through the standard
        Command/Control keyboard shortcuts.
      </p>
    </section>
  );
}
