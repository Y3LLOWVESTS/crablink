/**
 * RO:WHAT — Shared local uniform manifest draft builder for CrabLink asset/page stubs.
 * RO:WHY — NEXT_LEVEL refactor prep; every asset type should share one predictable manifest structure.
 * RO:INTERACTS — page-social-stubs.js now; future pages/* refactor later.
 * RO:INVARIANTS — local draft only; no b3 CID claim; no backend publication; no wallet mutation; no ROC charge.
 * RO:SECURITY — pure data helpers; no DOM, no network, no storage, no execution.
 * RO:TEST — node --check extensions/chrome/src/page-uniform-manifest.js.
 */

const DEFAULT_VERSION = 1;

export function buildUniformManifestDraft(input = {}) {
  const kind = clean(input.kind || 'asset');
  const slug = clean(input.slug || kind);
  const title = clean(input.title);
  const description = clean(input.description);
  const fields = normalizeFields(input.fields);
  const tags = normalizeTags(input.tags || fields.tags || '');
  const featureGate = clean(input.featureGate);
  const requiredCapabilities = normalizeStringList(input.requiredCapabilities);
  const linkedAssets = normalizeLinkedAssets(input.linkedAssets);
  const policy = normalizePolicy(input.policy);
  const economics = normalizeEconomics(input.economics);
  const futureRoutes = normalizeFutureRoutes(input.futureRoutes, kind);
  const assetShape = clean(input.assetShape) || `crab://<64 lowercase hex>.${kind}`;
  const now = new Date().toISOString();

  return {
    schema: 'crablink.uniform-asset-manifest.local.v1',
    manifest_version: DEFAULT_VERSION,
    status: 'local_draft_not_published',

    identity: {
      kind,
      slug,
      title,
      description,
      canonical_crab_url_shape: assetShape,
      internal_content_id_shape: 'b3:<64 lowercase hex>',
      canonical_b3_cid_assigned: false,
      manifest_b3_cid_assigned: false,
      index_pointer_created: false
    },

    ownership: {
      owner_passport_subject: clean(input.ownerPassportSubject) || null,
      owner_wallet_account: clean(input.ownerWalletAccount) || null,
      payout_account: clean(input.payoutAccount) || null,
      creator_handle_display: clean(input.creatorHandle) || null,
      backend_confirmed: false
    },

    metadata: {
      fields,
      tags,
      language: clean(input.language || fields.language) || null,
      license: clean(input.license || fields.license) || null
    },

    linked_assets: linkedAssets,

    policy: {
      visibility: clean(policy.visibility) || 'local-draft',
      access_mode: clean(policy.accessMode) || 'not-wired',
      moderation_mode: clean(policy.moderationMode) || 'not-wired',
      comment_policy: clean(policy.commentPolicy) || null,
      feature_gate: featureGate || null,
      required_capabilities: requiredCapabilities,
      deny_by_default: true
    },

    economics: {
      asset: clean(economics.asset) || 'roc',
      price_minor: normalizeMinorUnits(economics.priceMinor),
      payout_split_policy: clean(economics.payoutSplitPolicy) || null,
      paid_access_enabled: economics.paidAccessEnabled === true,
      wallet_mutated: false,
      roc_charged: false
    },

    provenance: {
      created_by_client: 'crablink-chrome-extension',
      local_draft_only: true,
      backend_route_wired: false,
      future_routes: futureRoutes,
      created_at: now,
      updated_at: now
    },

    truth_boundary: {
      content_uploaded: false,
      b3_content_id_assigned: false,
      manifest_cid_assigned: false,
      index_pointer_created: false,
      backend_publication_claimed: false,
      wallet_mutated: false,
      roc_charged: false,
      capability_checked_by_backend: false,
      policy_enforced_by_backend: false
    },

    next_required_backend_work: normalizeStringList(input.nextBackendWork),

    refactor_target: {
      future_folder: `extensions/chrome/src/pages/${slug}/`,
      future_owner_module: `${slug}Page.js`,
      one_route_one_owner: true,
      shared_manifest_builder: 'extensions/chrome/src/shared/uniformManifest.js'
    }
  };
}

export function assetTypeSpec(kind, overrides = {}) {
  const normalized = clean(kind);

  const base = {
    kind: normalized,
    slug: normalized,
    assetShape: `crab://<64 lowercase hex>.${normalized}`,
    futureRoutes: {
      prepare: `/assets/${normalized}/prepare`,
      publish: `/assets/${normalized}`,
      read: `/${normalized}/<hash>`
    }
  };

  return {
    ...base,
    ...overrides,
    futureRoutes: {
      ...base.futureRoutes,
      ...(overrides.futureRoutes || {})
    }
  };
}

function normalizeFutureRoutes(routes, kind) {
  const fallback = {
    prepare: `/assets/${kind}/prepare`,
    publish: `/assets/${kind}`,
    read: `/${kind}/<hash>`
  };

  const value = routes && typeof routes === 'object' && !Array.isArray(routes) ? routes : {};

  return {
    prepare: clean(value.prepare) || fallback.prepare,
    publish: clean(value.publish) || fallback.publish,
    read: clean(value.read) || fallback.read
  };
}

function normalizeFields(fields) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};

  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === 'string' ? clean(value) : value;
  }

  return out;
}

function normalizeLinkedAssets(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

    out[key] = {
      kind: clean(item.kind || key),
      crab_url: clean(item.crabUrl || item.crab_url) || null,
      cid: clean(item.cid) || null,
      pending: item.pending !== false
    };
  }

  return out;
}

function normalizePolicy(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeEconomics(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((item) => clean(item).replace(/^#+/, '').toLowerCase()).filter(Boolean).slice(0, 16);
  }

  return clean(value)
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, '').toLowerCase().replace(/[^a-z0-9._-]/g, ''))
    .filter(Boolean)
    .slice(0, 16);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter(Boolean);
}

function normalizeMinorUnits(value) {
  const raw = clean(value);
  if (!raw) return '0';

  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return '0';

  return String(Math.floor(number));
}

function clean(value) {
  return String(value ?? '').trim();
}