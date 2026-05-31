/**
 * RO:WHAT — Professional read-only image manifest renderer for hydrated crab://<hash>.image asset pages.
 * RO:WHY — Presents intentional CrabLink image metadata as a coherent manifest/certificate instead of a debug/database dump.
 * RO:INTERACTS — AssetHydratedView.jsx, gateway-returned image DTOs, ImagePublishFlow rendition_group.creator_intent.
 * RO:INVARIANTS — display-only; gateway-returned fields only; no fake ownership/rights/receipt/ledger truth; no protected image bytes.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no HTML injection; all fields rendered as text; no asset mutation.
 * RO:TEST — mint image bundle, open original/desktop/tablet/mobile/thumbnail, verify manifest fields and title/rendition labels.
 */

import Badge from '../../shared/components/Badge.jsx';

export default function ImageAssetManifestFacts({ summary, fallbackText = '' }) {
  const facts = imageFactsFromSummary(summary, fallbackText);

  if (!summary?.isImageRoute) {
    return (
      <p className="asset-description">
        {fallbackText || summary?.description || 'The gateway returned this typed asset response without a public description field.'}
      </p>
    );
  }

  return (
    <section className="asset-image-manifest-document asset-image-manifest-certificate" aria-label="Image manifest information">
      <div className="asset-image-manifest-document-header">
        <div className="asset-image-manifest-title-stack">
          <span>Image manifest</span>
          <h2>{facts.title || 'Image details'}</h2>
          <p>
            {facts.description ||
              'This image asset resolved through the configured gateway. Manifest fields are visible, but protected image bytes stay behind the paid content_view gate.'}
          </p>
        </div>

        <div className="asset-image-manifest-badges" aria-label="Image manifest badges">
          {facts.roleLabel && (
            <Badge tone="info" uppercase={false}>
              {facts.roleLabel}
            </Badge>
          )}
          {facts.privacyVerified && (
            <Badge tone="success" uppercase={false}>
              privacy verified
            </Badge>
          )}
          {facts.sourceLabel && (
            <Badge tone="neutral" uppercase={false}>
              {facts.sourceLabel}
            </Badge>
          )}
          {facts.rightsLabel && (
            <Badge tone="neutral" uppercase={false}>
              {facts.rightsLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="asset-image-manifest-identity-strip" aria-label="Image manifest identity strip">
        <IdentityItem label="Creator" value={facts.creatorDisplay || 'Not returned'} />
        <IdentityItem label="Rendition" value={facts.currentRendition || 'Not returned'} />
        <IdentityItem label="Rights" value={facts.rightsLabel || 'Not returned'} />
        <IdentityItem label="Privacy" value={facts.privacyCleanup || 'Not returned'} />
      </div>

      <div className="asset-image-manifest-document-grid asset-image-manifest-readable-grid">
        <ManifestField label="Description" value={facts.description} wide />
        <ManifestField label="Alt text" value={facts.altText} wide />
        <ManifestField label="Provenance" value={facts.provenanceNote} wide />
        <ManifestField label="Source" value={facts.sourceLabel} />
        <ManifestField label="Role" value={facts.roleLabel} />
        <ManifestField label="Use cases" value={facts.useCases || facts.roleLabel} />
        <ManifestField label="Privacy cleanup" value={facts.privacyCleanup} />
      </div>

      {facts.tags.length > 0 && (
        <div className="asset-image-manifest-tag-row" aria-label="Image tags">
          {facts.tags.map((tag) => (
            <Badge key={tag} tone="neutral" uppercase={false}>
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="asset-image-manifest-note">
        These are intentional CrabLink manifest fields. Hidden file metadata such as EXIF/GPS/XMP/IPTC was stripped before minting when privacy verification passed.
      </p>
    </section>
  );
}

function IdentityItem({ label, value }) {
  return (
    <div className="asset-image-manifest-identity-item">
      <span>{label}</span>
      <strong>{value || 'Not returned'}</strong>
    </div>
  );
}

function ManifestField({ label, value, wide = false }) {
  return (
    <div className={`asset-image-manifest-document-field${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || 'Not returned'}</strong>
    </div>
  );
}

function imageFactsFromSummary(summary, fallbackText) {
  const raw = objectValue(summary?.raw);
  const groupRaw = objectValue(summary?.renditionGroup?.raw);
  const manifest = objectValue(raw.manifest || raw.asset_manifest || raw.assetManifest);
  const metadata = objectValue(raw.metadata || manifest.metadata);
  const image = objectValue(summary?.image);
  const current = objectValue(summary?.rendition || image.currentRendition);
  const tags = normalizeList(summary?.tags);

  const creatorIntent = objectValue(
    groupRaw.creator_intent ||
      groupRaw.creatorIntent ||
      raw.creator_intent ||
      raw.creatorIntent ||
      manifest.creator_intent ||
      manifest.creatorIntent ||
      metadata.creator_intent ||
      metadata.creatorIntent ||
      image.creatorIntent,
  );

  const privacyCleanup = objectValue(
    groupRaw.privacy_cleanup ||
      groupRaw.privacyCleanup ||
      raw.privacy_cleanup ||
      raw.privacyCleanup ||
      manifest.privacy_cleanup ||
      manifest.privacyCleanup ||
      metadata.privacy_cleanup ||
      metadata.privacyCleanup ||
      image.privacyCleanup,
  );

  const title = cleanString(
    creatorIntent.title ||
      image.title ||
      summary?.title ||
      manifest.title ||
      metadata.title ||
      raw.title,
  );

  const description = cleanString(
    creatorIntent.description ||
      image.description ||
      summary?.description ||
      fallbackText ||
      manifest.description ||
      metadata.description ||
      raw.description,
  );

  const role = cleanString(
    creatorIntent.image_role ||
      creatorIntent.imageRole ||
      image.role ||
      current.role ||
      current.label ||
      raw.rendition_role ||
      raw.renditionRole,
  );

  const sourceHint = cleanString(
    creatorIntent.source_hint ||
      creatorIntent.sourceHint ||
      image.sourceHint ||
      raw.source_hint ||
      raw.sourceHint ||
      metadata.source_hint ||
      metadata.sourceHint,
  );

  const rightsHint = cleanString(
    creatorIntent.rights_hint ||
      creatorIntent.rightsHint ||
      image.rightsHint ||
      raw.rights_hint ||
      raw.rightsHint ||
      metadata.rights_hint ||
      metadata.rightsHint,
  );

  return {
    title: title || 'Image',
    description,
    creatorDisplay: cleanString(
      creatorIntent.creator_display ||
        creatorIntent.creatorDisplay ||
        image.creatorDisplay ||
        raw.creator_display ||
        raw.creatorDisplay ||
        metadata.creator_display ||
        metadata.creatorDisplay,
    ),
    sourceLabel: labelFromValue(sourceHint),
    rightsLabel: labelFromValue(rightsHint),
    altText: cleanString(
      creatorIntent.alt_text ||
        creatorIntent.altText ||
        image.altText ||
        raw.alt_text ||
        raw.altText ||
        metadata.alt_text ||
        metadata.altText,
    ),
    provenanceNote: cleanString(
      creatorIntent.provenance_note ||
        creatorIntent.provenanceNote ||
        image.provenanceNote ||
        raw.provenance_note ||
        raw.provenanceNote ||
        metadata.provenance_note ||
        metadata.provenanceNote,
    ),
    roleLabel: labelFromValue(role || current.label),
    useCases: normalizeList(
      creatorIntent.use_cases ||
        creatorIntent.useCases ||
        image.useCases ||
        raw.use_cases ||
        raw.useCases ||
        metadata.use_cases ||
        metadata.useCases ||
        role,
    )
      .map(labelFromValue)
      .join(', '),
    currentRendition: currentRenditionLabel(current),
    privacyCleanup: privacyCleanupLabel(privacyCleanup, image, tags),
    privacyVerified: isPrivacyVerified(privacyCleanup, image, tags),
    tags,
  };
}

function currentRenditionLabel(current) {
  const label = cleanString(current.label || labelFromValue(current.role));
  const width = Number(current.width || 0);
  const height = Number(current.height || 0);
  const parts = [label];

  if (width > 0 && height > 0) {
    parts.push(`${width}×${height}`);
  }

  if (current.isCurrent || current.role || current.label) {
    parts.push('current version');
  }

  return parts.filter(Boolean).join(' · ');
}

function privacyCleanupLabel(cleanup, image = {}, tags = []) {
  if (isPrivacyVerified(cleanup, image, tags)) {
    if (hasMetadataStrippedTag(tags)) {
      return 'Metadata stripped before minting';
    }

    return 'Verified before minting';
  }

  if (hasMetadataStrippedTag(tags)) {
    return 'Metadata stripped before minting';
  }

  const status = cleanString(
    cleanup.status ||
      cleanup.result ||
      cleanup.mode ||
      cleanup.label ||
      cleanup.note,
  );

  return status ? labelFromValue(status) : '';
}

function isPrivacyVerified(cleanup, image = {}, tags = []) {
  if (image.privacyVerified === true || cleanup.verified === true || cleanup.privacy_verified === true || cleanup.privacyVerified === true) {
    return true;
  }

  if (hasMetadataStrippedTag(tags)) {
    return true;
  }

  const status = cleanString(cleanup.status || cleanup.result || cleanup.mode || cleanup.label).toLowerCase();
  return status === 'verified' || status === 'passed' || status === 'clean' || status === 'stripped';
}

function hasMetadataStrippedTag(tags = []) {
  return tags.some((tag) => {
    const clean = cleanString(tag).toLowerCase();
    return clean === 'metadata-stripped' || clean === 'metadata_stripped' || clean === 'privacy-verified';
  });
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function labelFromValue(value) {
  const clean = cleanString(value);

  if (!clean) {
    return '';
  }

  return clean
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}
