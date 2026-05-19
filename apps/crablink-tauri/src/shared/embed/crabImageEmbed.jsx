/**
 * RO:WHAT — Trusted React preview card for crab://<hash>.image references.
 * RO:WHY — Gives React pages a reusable image embed component while iframe/site HTML uses embedRegistry.
 * RO:INTERACTS — future asset pages, site manifest preview, profile/avatar preview, image rendition views.
 * RO:INVARIANTS — displays backend/gateway-derived URLs only; does not mint CIDs or claim ownership.
 * RO:METRICS — none.
 * RO:CONFIG — src, rawUrl, title, caption props.
 * RO:SECURITY — no arbitrary HTML; image-only rendering; no extension authority.
 * RO:TEST — npm run build; visual smoke when wired into a route.
 */

export default function CrabImageEmbed({
  src = '',
  crabUrl = '',
  title = 'CrabLink image',
  caption = '',
  alt = '',
}) {
  const safeTitle = title || 'CrabLink image';
  const safeAlt = alt || safeTitle;

  if (!src) {
    return (
      <section className="cl-card cl-scaffold-card" role="note">
        <p className="cl-eyebrow">Image Embed</p>
        <h1>Image unavailable</h1>
        <p>{crabUrl || 'No gateway-backed image URL was provided.'}</p>
      </section>
    );
  }

  return (
    <figure className="cl-crab-image-embed">
      <img src={src} alt={safeAlt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
      <figcaption>
        <strong>{safeTitle}</strong>
        {caption && <span>{caption}</span>}
        {crabUrl && <small>{crabUrl}</small>}
      </figcaption>
    </figure>
  );
}