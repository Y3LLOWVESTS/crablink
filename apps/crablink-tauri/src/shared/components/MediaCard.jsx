/**
 * RO:WHAT — Shared card for verified media summary presentation.
 * RO:WHY — FINAL_BETA Phase 2C1; creates one visual surface for image, video, music, podcast, and stream summaries.
 * RO:INTERACTS — ContentCard, route-owned verified previews, media pages, Library, profiles, and feeds.
 * RO:INVARIANTS — media rendering remains caller-owned; this component does not fetch, verify, autoplay, or claim B3 success.
 * RO:SECURITY — trusted React preview only; no direct URL fetch, autoplay, entitlement, or payment mutation.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import ContentCard from './ContentCard.jsx';

export default function MediaCard({
  mediaKind = 'Media',
  preview = null,
  durationLabel = '',
  renditionLabel = '',
  metadata = null,
  ...contentProps
}) {
  const combinedMetadata = (
    <>
      {(durationLabel || renditionLabel) && (
        <div className="cl-media-card-facts">
          {durationLabel && (
            <span>{durationLabel}</span>
          )}

          {renditionLabel && (
            <span>{renditionLabel}</span>
          )}
        </div>
      )}

      {metadata}
    </>
  );

  return (
    <ContentCard
      {...contentProps}
      kind={mediaKind}
      thumbnail={preview}
      metadata={combinedMetadata}
      variant="media"
    />
  );
}
