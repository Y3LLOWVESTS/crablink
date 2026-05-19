/**
 * RO:WHAT — Local site draft model for the React-owned crab://site route.
 * RO:WHY — Lets the React lane model site manifests and safe rendering without mutating the proven backend site flow.
 * RO:INTERACTS — SitePage, SiteCreate, SiteRootUpload, SiteManifestDrawer, SiteCreatorProof, SiteRender.
 * RO:INVARIANTS — local draft only; no fake site pointer; no fake root CID; no fake receipt; no silent ROC spend.
 * RO:METRICS — none.
 * RO:CONFIG — app settings can prefill display-only passport/wallet labels.
 * RO:SECURITY — no direct storage/index/wallet/ledger calls; untrusted root HTML renders in sandbox only.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://site route smoke.
 */

import { DEFAULT_SITE_TEMPLATE } from './siteTemplates.js';

export const SITE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const SITE_HOSTING_OPTIONS = Object.freeze([
  { value: 'local_draft_only', label: 'Local draft only' },
  { value: 'paid_site_launch_future', label: 'Paid site launch future' },
  { value: 'dedicated_provider_future', label: 'Dedicated provider future' },
  { value: 'self_hosted_future', label: 'Self-hosted future' },
]);

export const SITE_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'free_public_site', label: 'Free public site' },
  { value: 'paid_site_access_future', label: 'Paid site access future' },
  { value: 'subscriber_site_future', label: 'Subscriber site future' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const SITE_POLICY_OPTIONS = Object.freeze([
  { value: 'static_html_no_scripts', label: 'Static HTML, no scripts' },
  { value: 'safe_embeds_only', label: 'Safe CrabLink embeds only' },
  { value: 'facet_contract_required_future', label: 'Facet contract required future' },
  { value: 'manual_review_required', label: 'Manual review required' },
]);

export const SITE_PAYOUT_OPTIONS = Object.freeze([
  { value: 'creator_wallet_future', label: 'Creator wallet future' },
  { value: 'creator_provider_treasury_split_future', label: 'Creator/provider/treasury split future' },
  { value: 'site_owner_split_future', label: 'Site owner split future' },
  { value: 'no_payout_draft', label: 'No payout draft' },
]);

export const DEFAULT_SITE_DRAFT = Object.freeze({
  siteName: 'my-crab-site',
  title: DEFAULT_SITE_TEMPLATE.patch.title,
  description: DEFAULT_SITE_TEMPLATE.patch.description,
  creatorDisplay: '',
  ownerPassport: '',
  ownerWallet: '',
  rootDocumentCid: '',
  rootHtml: DEFAULT_SITE_TEMPLATE.buildHtml({
    title: DEFAULT_SITE_TEMPLATE.patch.title,
    description: DEFAULT_SITE_TEMPLATE.patch.description,
    creatorDisplay: 'CrabLink Creator',
  }),
  routeMapJson: DEFAULT_SITE_TEMPLATE.patch.routeMapJson,
  assetMapJson: DEFAULT_SITE_TEMPLATE.patch.assetMapJson,
  tags: DEFAULT_SITE_TEMPLATE.patch.tags,
  hostingMode: 'local_draft_only',
  accessMode: 'public_preview',
  renderPolicy: DEFAULT_SITE_TEMPLATE.patch.renderPolicy,
  payoutMode: 'creator_wallet_future',
  moderationPolicy: 'site_owner_policy_future',
  provenanceNote: '',
});

export function buildSiteManifestDraft(draft, { app, route } = {}) {
  const safeDraft = normalizeSiteDraft(draft, app);
  const routeMap = parseJsonObject(safeDraft.routeMapJson);
  const assetMap = parseJsonObject(safeDraft.assetMapJson);
  const tags = parseTags(safeDraft.tags);
  const rootGuard = analyzeRootDocument(safeDraft.rootDocumentCid, safeDraft.rootHtml);

  return {
    schema: 'crablink.local.site-draft.v1',
    manifest_kind: 'site',
    route: {
      requested_url: route?.rawInput || 'crab://site',
      normalized_url: route?.normalizedInput || 'crab://site',
      route_kind: route?.kind || 'site',
    },
    truth_boundary: {
      local_draft: true,
      backend_published: false,
      site_created: false,
      root_document_stored: false,
      root_document_cid_backend_verified: false,
      manifest_cid_minted: false,
      wallet_mutated: false,
      roc_charged: false,
      receipt_committed: false,
      note:
        'This is a local React site draft. Real site launch must use gateway-backed /sites/prepare, explicit wallet hold, /sites create, and backend receipts later.',
    },
    site: {
      name: normalizeSiteName(safeDraft.siteName),
      title: cleanOrNull(safeDraft.title),
      description: cleanOrNull(safeDraft.description),
      tags,
    },
    identity: {
      creator_display: cleanOrNull(safeDraft.creatorDisplay),
      owner_passport_hint: cleanOrNull(safeDraft.ownerPassport),
      owner_wallet_hint: cleanOrNull(safeDraft.ownerWallet),
      backend_verified: false,
    },
    root_document: {
      cid_hint: normalizeCid(safeDraft.rootDocumentCid),
      has_local_html: Boolean(cleanOrNull(safeDraft.rootHtml)),
      guard: rootGuard,
      backend_verified: false,
    },
    route_map: routeMap,
    asset_map: assetMap,
    rendering: {
      policy: safeDraft.renderPolicy,
      sandbox: 'iframe_srcdoc_no_scripts',
      crab_embeds_supported_here: 'preview_only',
    },
    access_policy: {
      mode: safeDraft.accessMode,
      backend_verified: false,
    },
    hosting: {
      mode: safeDraft.hostingMode,
      provider: null,
      backend_verified: false,
    },
    economics: {
      payout_mode: safeDraft.payoutMode,
      roc_price_minor: null,
      split_basis_points: null,
      backend_verified: false,
    },
    moderation: {
      policy: cleanOrNull(safeDraft.moderationPolicy),
      backend_verified: false,
    },
    provenance: {
      note: cleanOrNull(safeDraft.provenanceNote),
      backend_verified: false,
    },
    receipts: [],
    version_history: [
      {
        version: 1,
        status: 'local_draft',
        manifest_cid: null,
        root_document_cid: null,
        created_at: new Date().toISOString(),
      },
    ],
  };
}

export function statsForSiteDraft(draft, app) {
  const safeDraft = normalizeSiteDraft(draft, app);
  const routeMap = parseJsonObject(safeDraft.routeMapJson);
  const assetMap = parseJsonObject(safeDraft.assetMapJson);
  const rootGuard = analyzeRootDocument(safeDraft.rootDocumentCid, safeDraft.rootHtml);

  return {
    tags: parseTags(safeDraft.tags),
    routeCount: Object.keys(routeMap).length,
    assetCount: Object.keys(assetMap).length,
    hasLocalRootHtml: Boolean(cleanOrNull(safeDraft.rootHtml)),
    hasRootCidHint: Boolean(normalizeCid(safeDraft.rootDocumentCid)),
    rootGuard,
    siteName: normalizeSiteName(safeDraft.siteName),
    rootHtmlBytes: new Blob([String(safeDraft.rootHtml || '')]).size,
  };
}

export function getSiteCompleteness(draft, app) {
  const safeDraft = normalizeSiteDraft(draft, app);
  const checks = [
    normalizeSiteName(safeDraft.siteName),
    cleanOrNull(safeDraft.title),
    cleanOrNull(safeDraft.description),
    cleanOrNull(safeDraft.creatorDisplay) || cleanOrNull(safeDraft.ownerPassport),
    cleanOrNull(safeDraft.ownerWallet),
    cleanOrNull(safeDraft.rootHtml) || normalizeCid(safeDraft.rootDocumentCid),
    cleanOrNull(safeDraft.routeMapJson),
    cleanOrNull(safeDraft.assetMapJson),
    cleanOrNull(safeDraft.tags),
    safeDraft.renderPolicy,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function normalizeSiteDraft(draft, app) {
  const settings = app?.settings || {};

  return {
    ...DEFAULT_SITE_DRAFT,
    ...(draft || {}),
    ownerPassport:
      cleanOrNull(draft?.ownerPassport) ||
      cleanOrNull(settings.passportSubject) ||
      DEFAULT_SITE_DRAFT.ownerPassport,
    ownerWallet:
      cleanOrNull(draft?.ownerWallet) ||
      cleanOrNull(settings.walletAccount) ||
      DEFAULT_SITE_DRAFT.ownerWallet,
  };
}

export function normalizeSiteName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^crab:\/\//, '')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeCid(value) {
  const clean = String(value || '').trim().toLowerCase();
  const hash = clean.startsWith('b3:') ? clean.slice(3) : clean;

  if (/^[0-9a-f]{64}$/.test(hash)) {
    return `b3:${hash}`;
  }

  return '';
}

export function analyzeRootDocument(rootDocumentCid, rootHtml) {
  const cid = normalizeCid(rootDocumentCid);
  const html = String(rootHtml || '');
  const hasHtml = Boolean(html.trim());
  const lower = String(rootDocumentCid || '').toLowerCase();

  if (lower.includes('.image') || lower.includes('/image') || lower.endsWith('image')) {
    return {
      ok: false,
      level: 'danger',
      reason: 'Root document cannot be an image asset URL. A site root should be HTML/document content.',
    };
  }

  if (!cid && !hasHtml) {
    return {
      ok: false,
      level: 'warning',
      reason: 'Add local root HTML or a backend-provided root document CID before launching.',
    };
  }

  if (cid && hasHtml) {
    return {
      ok: true,
      level: 'info',
      reason: 'Both a CID hint and local HTML exist. Backend launch should decide the real root document.',
    };
  }

  if (cid) {
    return {
      ok: true,
      level: 'info',
      reason: 'CID shape is valid, but this React draft has not verified it through storage.',
    };
  }

  return {
    ok: true,
    level: 'success',
    reason: 'Local root HTML is ready for safe sandbox preview.',
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function parseJsonObject(input) {
  const text = String(input || '').trim();

  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

export function cleanOrNull(value) {
  const clean = String(value ?? '').trim();
  return clean || null;
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}