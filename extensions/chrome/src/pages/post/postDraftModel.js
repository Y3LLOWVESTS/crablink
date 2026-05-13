/**
 * RO:WHAT — Local draft model helpers for crab://post.
 * RO:WHY — CrabLink refactor; separates route-owned post manifest/stat logic from React rendering.
 * RO:INTERACTS — PostPage.jsx, PostDraft.jsx, useCreatorDraft, shared creator workspace panels.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional app settings labels are display-only and supplied by caller.
 * RO:SECURITY — does not call backend services or render user text as HTML.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://post route smoke.
 */

import {
  buildContentReferenceGraphDraft,
  buildReferenceConnectionDraft,
  buildSiteConnectionDraft,
  connectionIsSatisfied,
} from '../../shared/manifest/siteAttachment.js';

export const DEFAULT_POST_DRAFT = Object.freeze({
  title: '',
  body: '',
  creatorDisplay: '',
  language: 'en',
  postKind: 'short_text',
  visibility: 'public_preview',
  rightsMode: 'creator_owned_original',
  moderationMode: 'site_policy_or_creator_default',
  siteContextCrabUrl: '',
  parentCrabUrl: '',
  tags: 'post, demo',
  contentWarning: '',
});

export const POST_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const POST_KIND_OPTIONS = Object.freeze([
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'status_update', label: 'Status update' },
  { value: 'thread_starter', label: 'Thread starter' },
  { value: 'site_announcement', label: 'Site announcement' },
]);

export const POST_VISIBILITY_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'site_context_later', label: 'Site context later' },
  { value: 'followers_later', label: 'Followers later' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const POST_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_original', label: 'Creator-owned / original' },
  { value: 'licensed_or_quoted', label: 'Licensed / quoted' },
  { value: 'public_domain', label: 'Public domain' },
  { value: 'unknown_or_unverified', label: 'Unknown / unverified' },
]);

export const POST_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'creator_review_required', label: 'Creator review required' },
  { value: 'site_mod_review_required', label: 'Site mod review required' },
  { value: 'sensitive_content_review', label: 'Sensitive content review' },
]);

export function buildPostManifestDraft(draft, { app = null, route = null } = {}) {
  const safeDraft = {
    ...DEFAULT_POST_DRAFT,
    ...(draft || {}),
  };

  const tags = parseTags(safeDraft.tags);
  const title = safeDraft.title.trim();
  const creatorLabel =
    safeDraft.creatorDisplay.trim() ||
    app?.settings?.handle ||
    app?.settings?.passportSubject ||
    '';
  const siteConnection = buildSiteConnectionDraft({
    siteContextCrabUrl: safeDraft.siteContextCrabUrl,
    assetKind: 'post',
    required: true,
    relation: 'published_on_site',
  });
  const parentConnection = buildReferenceConnectionDraft({
    crabUrl: safeDraft.parentCrabUrl,
    acceptedAssetKinds: ['post', 'comment'],
    required: false,
    relation: 'reply_or_thread_parent',
    label: 'parent post/comment',
  });
  const referenceGraph = buildContentReferenceGraphDraft({
    siteConnection,
    parentConnection,
  });

  return {
    schema: 'crablink.local.post-draft.v1',
    status: 'local_draft_only',
    route: {
      requested_url: route?.rawInput || 'crab://post',
      normalized_url: route?.normalizedInput || 'crab://post',
      route_kind: route?.kind || 'post',
    },
    asset: {
      kind: 'post',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      post_kind: safeDraft.postKind,
      language: safeDraft.language.trim() || 'en',
      content_warning: safeDraft.contentWarning.trim() || null,
      tags,
      body_preview: safeDraft.body.slice(0, 280),
      stats: postStats(safeDraft),
    },
    ownership: {
      creator_display: creatorLabel,
      passport_subject_label: app?.settings?.passportSubject || '',
      wallet_account_label: app?.settings?.walletAccount || '',
      backend_confirmed: false,
    },
    site_connection: siteConnection,
    reference_graph: referenceGraph,
    linked_assets: {
      site_context_crab_url: safeDraft.siteContextCrabUrl.trim() || null,
      parent_crab_url: safeDraft.parentCrabUrl.trim() || null,
      embedded_assets: [],
      site_connection: siteConnection,
      reference_graph: referenceGraph,
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend post contracts exist.',
    },
    access_policy: {
      mode: safeDraft.visibility,
      paid_access_active: false,
    },
    moderation_policy: {
      mode: safeDraft.moderationMode,
      backend_confirmed: false,
    },
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://post workspace',
      version: 1,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_asset: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      backend_route_claimed: false,
    },
  };
}

export function statsForPostDraft(draft) {
  return postStats(draft || DEFAULT_POST_DRAFT);
}

export function postStats(draft) {
  const body = String(draft?.body || '');
  const title = String(draft?.title || '');
  const combined = `${title}\n${body}`.trim();
  const tags = parseTags(draft?.tags || '');
  const links = countCrabLinks(combined);

  const siteConnection = buildSiteConnectionDraft({
    siteContextCrabUrl: draft?.siteContextCrabUrl,
    assetKind: 'post',
    required: true,
    relation: 'published_on_site',
  });
  const parentConnection = buildReferenceConnectionDraft({
    crabUrl: draft?.parentCrabUrl,
    acceptedAssetKinds: ['post', 'comment'],
    relation: 'reply_or_thread_parent',
    label: 'parent post/comment',
  });

  return {
    characters: body.length,
    words: body.trim() ? body.trim().split(/\s+/).length : 0,
    lines: body ? body.split(/\r\n|\r|\n/).length : 0,
    tags: tags.length,
    crab_links: links,
    site_attached: connectionIsSatisfied(siteConnection),
    parent_attached: connectionIsSatisfied(parentConnection),
  };
}

export function getPostCompleteness(draft) {
  const safeDraft = {
    ...DEFAULT_POST_DRAFT,
    ...(draft || {}),
  };

  const checks = [
    safeDraft.title.trim(),
    safeDraft.body.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.language.trim(),
    safeDraft.postKind,
    safeDraft.visibility,
    safeDraft.rightsMode,
    safeDraft.moderationMode,
    connectionIsSatisfied(buildSiteConnectionDraft({
      siteContextCrabUrl: safeDraft.siteContextCrabUrl,
      assetKind: 'post',
      required: true,
      relation: 'published_on_site',
    })),
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function countCrabLinks(input) {
  const matches = String(input || '').match(/\bcrab:\/\/[^\s<>"')]+/g);
  return matches ? matches.length : 0;
}