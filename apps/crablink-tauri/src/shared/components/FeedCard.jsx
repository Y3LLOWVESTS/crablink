/**
 * RO:WHAT — Shared feed presentation around a typed content summary.
 * RO:WHY — FINAL_BETA Phase 2C1; establishes the visual contract used later by chronological Home and profile timelines.
 * RO:INTERACTS — ContentCard, publication-summary adapters, Home, Explore, and profile timelines.
 * RO:INVARIANTS — presentation only; does not rank, hydrate, invent, follow, reward, or confirm publication truth.
 * RO:SECURITY — no network, storage, wallet, receipt, or ledger authority.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import ContentCard from './ContentCard.jsx';

export default function FeedCard({
  contextLabel = '',
  ...contentProps
}) {
  return (
    <div className="cl-feed-card">
      {contextLabel && (
        <p className="cl-feed-card-context">
          {contextLabel}
        </p>
      )}

      <ContentCard
        {...contentProps}
        variant="feed"
      />
    </div>
  );
}
