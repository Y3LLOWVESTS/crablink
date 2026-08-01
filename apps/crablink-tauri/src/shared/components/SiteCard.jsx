/**
 * RO:WHAT — Shared consumer-facing card for a reviewed CrabLink site summary.
 * RO:WHY — FINAL_BETA Phase 2C1; provides one product surface for Blog, Imageboard, Forum, and later reviewed templates.
 * RO:INTERACTS — ContentCard, safe site-template adapters, Explore, profiles, and Library.
 * RO:INVARIANTS — template and update labels come from the caller; no custom-code execution or ownership claim.
 * RO:SECURITY — no HTML execution, iframe, remote script, arbitrary network call, or site mutation.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import ContentCard from './ContentCard.jsx';

export default function SiteCard({
  templateLabel = 'Site',
  updatedLabel = '',
  ownerLabel = '',
  preview = null,
  metadata = null,
  ...contentProps
}) {
  const combinedMetadata = (
    <>
      {(ownerLabel || updatedLabel) && (
        <div className="cl-site-card-facts">
          {ownerLabel && (
            <span>{ownerLabel}</span>
          )}

          {updatedLabel && (
            <span>{updatedLabel}</span>
          )}
        </div>
      )}

      {metadata}
    </>
  );

  return (
    <ContentCard
      {...contentProps}
      kind={templateLabel}
      creator={ownerLabel}
      timeLabel={updatedLabel}
      thumbnail={preview}
      metadata={combinedMetadata}
      variant="site"
    />
  );
}
