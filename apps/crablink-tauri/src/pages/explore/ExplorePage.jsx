/**
 * RO:WHAT — Honest consumer Explore destination used by the Phase 3 primary shell.
 * RO:WHY — FINAL_BETA Phase 3 requires Explore to be distinct from Home before the Phase 10 public discovery backend exists.
 * RO:INTERACTS — shared PageHeader, EmptyState, Button, and caller-owned route navigation.
 * RO:INVARIANTS — does not invent public content from local caches; direct routes remain available.
 * RO:SECURITY — no network, Passport, wallet, receipt, publication, QuickChain, or ROC authority.
 * RO:TEST — shellNavigation.test.mjs and focused frontend build.
 *
 * FINAL_BETA_PHASE3A1_CONSUMER_NAVIGATION_CONTRACT_V1
 */

import Button from '../../shared/components/Button.jsx';
import EmptyState from '../../shared/components/EmptyState.jsx';
import PageHeader from '../../shared/components/PageHeader.jsx';

export default function ExplorePage({
  app,
}) {
  return (
    <section className="cl-page">
      <PageHeader
        eyebrow="Explore"
        title="Discover CrabLink"
        copy="Explore will show recent public content, reviewed site templates, and public creators when the bounded discovery projection is connected."
      />

      <EmptyState
        icon="◉"
        title="Public discovery is not connected yet"
        copy="CrabLink will not invent public content from local browser caches. Your local Library and creator tools remain available while the public Explore projection is built."
        actions={
          <>
            <Button
              variant="primary"
              onClick={() =>
                app?.navigate?.(
                  'crab://library',
                )
              }
            >
              Open Library
            </Button>

            <Button
              variant="ghost"
              onClick={() =>
                app?.navigate?.(
                  'crab://make',
                )
              }
            >
              Create something
            </Button>
          </>
        }
      />
    </section>
  );
}
