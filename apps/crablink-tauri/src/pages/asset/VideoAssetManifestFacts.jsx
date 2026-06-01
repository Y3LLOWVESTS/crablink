/**
 * RO:WHAT — Read-only video manifest renderer for hydrated crab://<hash>.video asset pages.
 * RO:WHY — Gives video assets the same clear manifest/certificate treatment as image assets.
 * RO:INTERACTS — AssetHydratedView.jsx, gateway-returned video DTOs, VideoPublishFlow rendition groups.
 * RO:INVARIANTS — display-only; gateway/local display-cache fields only; no fake ownership/rights/receipt/ledger truth; no protected bytes.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no HTML injection; all fields rendered as text; no asset mutation.
 * RO:TEST — mint video bundle, open each video rendition, verify all sibling versions appear in the manifest.
 */

import Badge from '../../shared/components/Badge.jsx';

export default function VideoAssetManifestFacts({ summary, fallbackText = '' }) {
  const facts = videoFactsFromSummary(summary, fallbackText);

  if (!summary?.isVideoRoute) {
    return (
      <p className="asset-description">
        {fallbackText || summary?.description || 'The gateway returned this typed asset response without a public description field.'}
      </p>
    );
  }

  return (
    <section className="asset-image-manifest-document asset-video-manifest-document asset-image-manifest-certificate" aria-label="Video manifest information">
      <div className="asset-image-manifest-document-header">
        <div className="asset-image-manifest-title-stack">
          <span>Video manifest</span>
          <h2>{facts.title || 'Video details'}</h2>
          <p>
            {facts.description ||
              'This video asset resolved through the configured gateway. Manifest fields are visible, but protected video bytes stay behind the paid content_view gate.'}
          </p>
        </div>

        <div className="asset-image-manifest-badges" aria-label="Video manifest badges">
          {facts.roleLabel && <Badge tone="info" uppercase={false}>{facts.roleLabel}</Badge>}
          {facts.codecLabel && <Badge tone="neutral" uppercase={false}>{facts.codecLabel}</Badge>}
          {facts.sourceLabel && <Badge tone="success" uppercase={false}>{facts.sourceLabel}</Badge>}
          {facts.rightsLabel && <Badge tone="neutral" uppercase={false}>{facts.rightsLabel}</Badge>}
        </div>
      </div>

      <div className="asset-image-manifest-identity-strip" aria-label="Video manifest identity strip">
        <IdentityItem label="Creator" value={facts.creatorDisplay || 'Not returned'} />
        <IdentityItem label="Rendition" value={facts.currentRendition || 'Not returned'} />
        <IdentityItem label="Bundle" value={facts.bundleCount ? `${facts.bundleCount} linked outputs` : 'Not returned'} />
        <IdentityItem label="Access" value={facts.accessLabel || 'Not returned'} />
      </div>

      <div className="asset-image-manifest-fact-grid" aria-label="Video manifest fields">
        <ManifestFact label="Video Description" value={facts.description || 'Not returned'} wide />
        <ManifestFact label="Resolution" value={facts.resolution || 'Not returned'} />
        <ManifestFact label="Duration" value={facts.duration || 'Not returned'} />
        <ManifestFact label="Content Type" value={facts.contentType || 'Not returned'} />
        <ManifestFact label="Current Role" value={facts.currentRendition || 'Not returned'} />
        <ManifestFact label="Primary Video" value={facts.canonicalCrabUrl || 'Not returned'} wide monospace />
      </div>

      <p className="asset-image-manifest-note">
        {facts.bundleSource === 'local-display-cache'
          ? 'This page is showing a local display-only sibling map created from backend-returned crab URLs after upload. It helps navigation, but backend b3 assets, paid receipts, wallet balances, and ownership truth remain backend-owned.'
          : 'These are backend-returned video manifest fields. Local preview paths and staged handles are not persisted as authority; the sibling map only records backend-returned crab URLs for the minted video bundle.'}
      </p>
    </section>
  );
}

function IdentityItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || 'Not returned'}</strong>
    </div>
  );
}

function ManifestFact({ label, value, wide = false, monospace = false }) {
  return (
    <div className={wide ? 'is-wide' : ''}>
      <span>{label}</span>
      <strong className={monospace ? 'is-monospace' : ''}>{value || 'Not returned'}</strong>
    </div>
  );
}

function videoFactsFromSummary(summary, fallbackText) {
  const raw = objectValue(summary?.raw);
  const manifest = objectValue(raw.manifest || raw.asset_manifest || raw.assetManifest);
  const metadata = objectValue(raw.metadata || manifest.metadata);
  const metadataVideo = objectValue(metadata.video);
  const group = summary?.renditionGroup || null;
  const groupRaw = objectValue(group?.raw || group);
  const current = summary?.rendition || null;
  const owner = objectValue(summary?.owner);

  return {
    title: stringValue(summary?.title, raw.title, manifest.title, metadata.title, groupRaw.title, 'Video'),
    description: stringValue(summary?.description, raw.description, manifest.description, metadata.description, fallbackText),
    creatorDisplay: stringValue(
      metadata.creator_display,
      metadata.creatorDisplay,
      owner.passport,
      owner.passportSubject,
      owner.wallet,
      owner.walletAccount,
    ),
    currentRendition: stringValue(current?.label, current?.role),
    roleLabel: stringValue(current?.label, current?.role),
    sourceLabel: groupRaw.display_cache_truth ? 'local-display-cache' : current?.isOriginal ? 'primary source' : group?.sourceCid ? 'bundle rendition' : '',
    bundleSource: groupRaw.display_cache_truth ? 'local-display-cache' : 'backend-manifest',
    rightsLabel: stringValue(metadata.rights_mode, metadata.rightsMode, raw.rights_mode, raw.rightsMode),
    accessLabel: stringValue(metadata.access_mode, metadata.accessMode, raw.access_mode, raw.accessMode, 'paid content_view'),
    codecLabel: stringValue(metadata.codec_format, metadata.codecFormat, raw.codec_format, raw.codecFormat),
    resolution: stringValue(
      metadata.resolution,
      metadataVideo.resolution,
      raw.resolution,
      current?.width && current?.height ? `${current.width}x${current.height}` : '',
    ),
    duration: stringValue(metadata.duration, metadataVideo.duration, raw.duration, current?.durationSeconds),
    contentType: stringValue(summary?.contentType, current?.mime, metadata.content_type, metadata.contentType),
    canonicalCrabUrl: stringValue(group?.canonicalCrabUrl, groupRaw.canonical_crab_url, summary?.crabUrl),
    bundleCount: Array.isArray(group?.renditions) ? group.renditions.length : 0,
  };
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();
    if (safe && safe !== '[object Object]') return safe;
  }
  return '';
}