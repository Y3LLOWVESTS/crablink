/**
 * RO:WHAT — Shared local manifest helpers for site-attached content drafts.
 * RO:WHY — NEXT_LEVEL reference-graph contract; posts/articles/comments should declare the site/thread they belong to before backend minting exists.
 * RO:INTERACTS — postDraftModel.js, commentDraftModel.js, articleDraftModel.js, future backend DTO route contracts.
 * RO:INVARIANTS — local draft metadata only; no fake CID; no index write; no wallet/ROC mutation; no direct internal-service calls.
 * RO:METRICS — none.
 * RO:CONFIG — accepted typed asset kinds supplied by caller.
 * RO:SECURITY — parses references only; does not fetch, hydrate, execute, or trust referenced content.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual manifest JSON preview on crab://post/comment/article.
 */

const HEX_64 = '[0-9a-f]{64}';
const TYPED_ASSET_RE = new RegExp(`^crab://(${HEX_64})\\.([a-z][a-z0-9_-]{0,31})$`, 'i');
const NAMED_SITE_RE = /^crab:\/\/([a-z0-9][a-z0-9_-]{0,62})(\/[^\s<>"]*)?$/i;
const USERNAME_RE = /^crab:\/\/@([a-z0-9][a-z0-9_-]{2,31})(\/[^\s<>"]*)?$/i;

export function buildSiteConnectionDraft({
  siteContextCrabUrl = '',
  assetKind = 'asset',
  required = false,
  relation = 'published_on_site',
} = {}) {
  const raw = clean(siteContextCrabUrl);
  const parsed = parseCrabReference(raw);
  const attached = Boolean(parsed && parsed.kind === 'site');
  const missing = !raw;
  const status = attached
    ? 'site_attached_local_draft'
    : missing && required
      ? 'missing_required_site'
      : missing
        ? 'not_attached'
        : 'invalid_site_reference';

  return freezePlain({
    required: Boolean(required),
    attached,
    relation,
    asset_kind: assetKind,
    raw_crab_url: raw || null,
    normalized_crab_url: attached ? parsed.normalizedCrabUrl : null,
    site_name: attached ? parsed.siteName : null,
    site_route: attached ? parsed.routePath : null,
    status,
    backend_confirmed: false,
    note: siteConnectionNote({ assetKind, required, status }),
  });
}

export function buildReferenceConnectionDraft({
  crabUrl = '',
  acceptedAssetKinds = [],
  required = false,
  relation = 'reference',
  label = 'reference',
} = {}) {
  const raw = clean(crabUrl);
  const parsed = parseCrabReference(raw);
  const acceptedKinds = acceptedAssetKinds.map((kind) => String(kind || '').toLowerCase()).filter(Boolean);
  const typedAsset = parsed?.kind === 'typed_asset';
  const accepted = typedAsset
    ? acceptedKinds.length === 0 || acceptedKinds.includes(parsed.assetKind)
    : Boolean(parsed && acceptedKinds.length === 0);
  const attached = Boolean(raw && parsed && accepted);
  const missing = !raw;
  const status = attached
    ? 'reference_attached_local_draft'
    : missing && required
      ? 'missing_required_reference'
      : missing
        ? 'not_attached'
        : 'invalid_or_unaccepted_reference';

  return freezePlain({
    required: Boolean(required),
    attached,
    relation,
    label,
    accepted_asset_kinds: Object.freeze([...acceptedKinds]),
    raw_crab_url: raw || null,
    normalized_crab_url: attached ? parsed.normalizedCrabUrl : null,
    reference_kind: parsed?.kind || null,
    asset_kind: parsed?.assetKind || null,
    content_cid: parsed?.contentCid || null,
    site_name: parsed?.siteName || null,
    site_route: parsed?.routePath || null,
    status,
    backend_confirmed: false,
  });
}

export function buildContentReferenceGraphDraft({
  siteConnection,
  parentConnection = null,
  threadConnection = null,
  heroImageConnection = null,
  sourceConnection = null,
  embeddedAssets = [],
} = {}) {
  const references = [
    siteConnection ? { role: 'site', ...siteConnection } : null,
    parentConnection ? { role: 'parent', ...parentConnection } : null,
    threadConnection ? { role: 'thread', ...threadConnection } : null,
    heroImageConnection ? { role: 'hero_image', ...heroImageConnection } : null,
    sourceConnection ? { role: 'source', ...sourceConnection } : null,
    ...embeddedAssets.map((asset, index) => ({ role: `embedded_${index + 1}`, ...asset })),
  ].filter(Boolean);

  return freezePlain({
    model: 'site_reference_graph_local_draft.v1',
    site: siteConnection || null,
    parent: parentConnection || null,
    thread: threadConnection || null,
    hero_image: heroImageConnection || null,
    source: sourceConnection || null,
    embedded_assets: Object.freeze([...embeddedAssets]),
    references: Object.freeze(references.map((reference) => freezePlain(reference))),
    counts: freezePlain({
      total: references.length,
      attached: references.filter((reference) => reference.attached).length,
      missing_required: references.filter((reference) => reference.required && !reference.attached).length,
    }),
    backend_confirmed: false,
  });
}

export function parseCrabReference(value) {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const typedAssetMatch = raw.match(TYPED_ASSET_RE);
  if (typedAssetMatch) {
    const hash = typedAssetMatch[1].toLowerCase();
    const assetKind = typedAssetMatch[2].toLowerCase();
    return freezePlain({
      kind: 'typed_asset',
      assetKind,
      contentHash: hash,
      contentCid: `b3:${hash}`,
      normalizedCrabUrl: `crab://${hash}.${assetKind}`,
    });
  }

  const usernameMatch = raw.match(USERNAME_RE);
  if (usernameMatch) {
    const username = usernameMatch[1].toLowerCase();
    const routePath = usernameMatch[2] || '';
    return freezePlain({
      kind: 'profile_or_user_route',
      username,
      routePath,
      normalizedCrabUrl: `crab://@${username}${routePath}`,
    });
  }

  const namedSiteMatch = raw.match(NAMED_SITE_RE);
  if (namedSiteMatch) {
    const siteName = namedSiteMatch[1].toLowerCase();
    const routePath = namedSiteMatch[2] || '';
    return freezePlain({
      kind: 'site',
      siteName,
      routePath,
      normalizedCrabUrl: `crab://${siteName}${routePath}`,
    });
  }

  return null;
}

export function connectionIsSatisfied(connection) {
  return Boolean(connection?.attached);
}

export function connectionStatusLabel(connection) {
  const status = String(connection?.status || 'not_attached');
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function siteConnectionNote({ assetKind, required, status }) {
  if (status === 'site_attached_local_draft') {
    return `${assetKind} draft declares the site it belongs to. Backend must verify this before minting.`;
  }

  if (required) {
    return `${assetKind} minting should fail closed later until a valid crab://site connection is supplied.`;
  }

  return `${assetKind} site connection is optional in this local draft, but backend policy may require it later.`;
}

function clean(value) {
  return String(value || '').trim();
}

function freezePlain(value) {
  return Object.freeze({ ...value });
}