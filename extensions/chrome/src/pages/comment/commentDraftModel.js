/**
 * RO:WHAT — Local draft model helpers for crab://comment.
 * RO:WHY — CrabLink refactor; separates route-owned comment manifest/stat logic from React rendering.
 * RO:INTERACTS — CommentPage.jsx, CommentDraft.jsx, useCreatorDraft, shared creator workspace panels.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional app settings labels are display-only and supplied by caller.
 * RO:SECURITY — does not call backend services or render user text as HTML.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://comment route smoke.
 */

import {
  buildContentReferenceGraphDraft,
  buildReferenceConnectionDraft,
  buildSiteConnectionDraft,
  connectionIsSatisfied,
} from '../../shared/manifest/siteAttachment.js';

export const DEFAULT_COMMENT_DRAFT = Object.freeze({
  title: '',
  body: '',
  creatorDisplay: '',
  language: 'en',
  commentKind: 'reply',
  visibility: 'public_preview',
  moderationMode: 'site_policy_or_creator_default',
  rightsMode: 'creator_owned_original',
  parentCrabUrl: '',
  siteContextCrabUrl: '',
  threadContextCrabUrl: '',
  contentWarning: '',
  tags: 'comment, reply',
});

export const COMMENT_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const COMMENT_KIND_OPTIONS = Object.freeze([
  { value: 'reply', label: 'Reply' },
  { value: 'thread_comment', label: 'Thread comment' },
  { value: 'review_note', label: 'Review note' },
  { value: 'moderator_note', label: 'Moderator note' },
  { value: 'annotation', label: 'Annotation' },
]);

export const COMMENT_VISIBILITY_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'site_context_later', label: 'Site context later' },
  { value: 'thread_only_later', label: 'Thread-only later' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const COMMENT_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_original', label: 'Creator-owned / original' },
  { value: 'quoted_or_referenced', label: 'Quoted / referenced' },
  { value: 'public_domain', label: 'Public domain' },
  { value: 'unknown_or_unverified', label: 'Unknown / unverified' },
]);

export const COMMENT_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'creator_review_required', label: 'Creator review required' },
  { value: 'site_mod_review_required', label: 'Site mod review required' },
  { value: 'sensitive_content_review', label: 'Sensitive content review' },
]);

export function buildCommentManifestDraft(draft, { app = null, route = null } = {}) {
  const safeDraft = {
    ...DEFAULT_COMMENT_DRAFT,
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
    assetKind: 'comment',
    required: true,
    relation: 'comment_on_site',
  });
  const parentConnection = buildReferenceConnectionDraft({
    crabUrl: safeDraft.parentCrabUrl,
    acceptedAssetKinds: ['post', 'comment'],
    required: true,
    relation: 'comment_parent',
    label: 'parent post/comment',
  });
  const threadConnection = buildReferenceConnectionDraft({
    crabUrl: safeDraft.threadContextCrabUrl,
    acceptedAssetKinds: ['thread', 'post'],
    required: false,
    relation: 'thread_context',
    label: 'thread context',
  });
  const referenceGraph = buildContentReferenceGraphDraft({
    siteConnection,
    parentConnection,
    threadConnection,
  });

  return {
    schema: 'crablink.local.comment-draft.v1',
    status: 'local_draft_only',
    route: {
      requested_url: route?.rawInput || 'crab://comment',
      normalized_url: route?.normalizedInput || 'crab://comment',
      route_kind: route?.kind || 'comment',
    },
    asset: {
      kind: 'comment',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      comment_kind: safeDraft.commentKind,
      language: safeDraft.language.trim() || 'en',
      content_warning: safeDraft.contentWarning.trim() || null,
      tags,
      body_preview: safeDraft.body.slice(0, 240),
      stats: commentStats(safeDraft),
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
      parent_crab_url: safeDraft.parentCrabUrl.trim() || null,
      site_context_crab_url: safeDraft.siteContextCrabUrl.trim() || null,
      thread_context_crab_url: safeDraft.threadContextCrabUrl.trim() || null,
      embedded_assets: [],
      site_connection: siteConnection,
      reference_graph: referenceGraph,
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend comment contracts exist.',
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
      source: 'crab://comment workspace',
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

export function statsForCommentDraft(draft) {
  return commentStats(draft || DEFAULT_COMMENT_DRAFT);
}

export function commentStats(draft) {
  const body = String(draft?.body || '');
  const title = String(draft?.title || '');
  const combined = `${title}\n${body}`.trim();
  const tags = parseTags(draft?.tags || '');
  const links = countCrabLinks(combined);

  const siteConnection = buildSiteConnectionDraft({
    siteContextCrabUrl: draft?.siteContextCrabUrl,
    assetKind: 'comment',
    required: true,
    relation: 'comment_on_site',
  });
  const parentConnection = buildReferenceConnectionDraft({
    crabUrl: draft?.parentCrabUrl,
    acceptedAssetKinds: ['post', 'comment'],
    required: true,
    relation: 'comment_parent',
    label: 'parent post/comment',
  });
  const threadConnection = buildReferenceConnectionDraft({
    crabUrl: draft?.threadContextCrabUrl,
    acceptedAssetKinds: ['thread', 'post'],
    relation: 'thread_context',
    label: 'thread context',
  });

  return {
    characters: body.length,
    words: body.trim() ? body.trim().split(/\s+/).length : 0,
    lines: body ? body.split(/\r\n|\r|\n/).length : 0,
    tags: tags.length,
    crab_links: links,
    site_attached: connectionIsSatisfied(siteConnection),
    parent_attached: connectionIsSatisfied(parentConnection),
    thread_attached: connectionIsSatisfied(threadConnection),
  };
}

export function getCommentCompleteness(draft) {
  const safeDraft = {
    ...DEFAULT_COMMENT_DRAFT,
    ...(draft || {}),
  };

  const checks = [
    safeDraft.body.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.language.trim(),
    safeDraft.commentKind,
    safeDraft.visibility,
    safeDraft.rightsMode,
    safeDraft.moderationMode,
    connectionIsSatisfied(buildSiteConnectionDraft({
      siteContextCrabUrl: safeDraft.siteContextCrabUrl,
      assetKind: 'comment',
      required: true,
      relation: 'comment_on_site',
    })),
    connectionIsSatisfied(buildReferenceConnectionDraft({
      crabUrl: safeDraft.parentCrabUrl,
      acceptedAssetKinds: ['post', 'comment'],
      required: true,
      relation: 'comment_parent',
      label: 'parent post/comment',
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