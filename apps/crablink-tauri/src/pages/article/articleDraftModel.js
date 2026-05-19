/**
 * RO:WHAT — Local draft model helpers for crab://article.
 * RO:WHY — CrabLink refactor; separates route-owned article manifest/stat logic from React rendering.
 * RO:INTERACTS — ArticlePage.jsx, ArticleDraft.jsx, useCreatorDraft, shared creator workspace panels.
 * RO:INVARIANTS — local draft only; no fake b3 CID; no fake manifest CID; no publication; no wallet/ROC mutation.
 * RO:METRICS — none.
 * RO:CONFIG — optional app settings labels are display-only and supplied by caller.
 * RO:SECURITY — does not call backend services or render user text as HTML.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://article route smoke.
 */

import {
  buildContentReferenceGraphDraft,
  buildReferenceConnectionDraft,
  buildSiteConnectionDraft,
  connectionIsSatisfied,
} from '../../shared/manifest/siteAttachment.js';

export const DEFAULT_ARTICLE_DRAFT = Object.freeze({
  title: '',
  subtitle: '',
  body: '',
  creatorDisplay: '',
  language: 'en',
  articleKind: 'essay',
  visibility: 'public_preview',
  rightsMode: 'creator_owned_original',
  moderationMode: 'site_policy_or_creator_default',
  siteContextCrabUrl: '',
  heroImageCrabUrl: '',
  linkedSourceCrabUrl: '',
  tags: 'article, essay',
  contentWarning: '',
  summary: '',
});

export const ARTICLE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const ARTICLE_KIND_OPTIONS = Object.freeze([
  { value: 'essay', label: 'Essay' },
  { value: 'news', label: 'News / report' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'review', label: 'Review' },
  { value: 'research_note', label: 'Research note' },
  { value: 'manifesto', label: 'Manifesto' },
]);

export const ARTICLE_VISIBILITY_OPTIONS = Object.freeze([
  { value: 'public_preview', label: 'Public preview' },
  { value: 'site_context_later', label: 'Site context later' },
  { value: 'paid_access_later', label: 'Paid access later' },
  { value: 'owner_only_draft', label: 'Owner-only draft' },
]);

export const ARTICLE_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_original', label: 'Creator-owned / original' },
  { value: 'licensed_or_syndicated', label: 'Licensed / syndicated' },
  { value: 'public_domain', label: 'Public domain' },
  { value: 'unknown_or_unverified', label: 'Unknown / unverified' },
]);

export const ARTICLE_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'creator_review_required', label: 'Creator review required' },
  { value: 'editor_review_required', label: 'Editor review required' },
  { value: 'sensitive_content_review', label: 'Sensitive content review' },
]);

export function buildArticleManifestDraft(draft, { app = null, route = null } = {}) {
  const safeDraft = {
    ...DEFAULT_ARTICLE_DRAFT,
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
    assetKind: 'article',
    required: true,
    relation: 'published_on_site',
  });
  const heroImageConnection = buildReferenceConnectionDraft({
    crabUrl: safeDraft.heroImageCrabUrl,
    acceptedAssetKinds: ['image'],
    required: false,
    relation: 'hero_image',
    label: 'hero image',
  });
  const sourceConnection = buildReferenceConnectionDraft({
    crabUrl: safeDraft.linkedSourceCrabUrl,
    acceptedAssetKinds: ['post', 'article', 'image', 'video', 'music', 'song'],
    required: false,
    relation: 'source_or_reference',
    label: 'source/reference',
  });
  const referenceGraph = buildContentReferenceGraphDraft({
    siteConnection,
    heroImageConnection,
    sourceConnection,
  });

  return {
    schema: 'crablink.local.article-draft.v1',
    status: 'local_draft_only',
    route: {
      requested_url: route?.rawInput || 'crab://article',
      normalized_url: route?.normalizedInput || 'crab://article',
      route_kind: route?.kind || 'article',
    },
    asset: {
      kind: 'article',
      title,
      canonical_cid: null,
      canonical_crab_url: null,
      manifest_cid: null,
    },
    metadata: {
      article_kind: safeDraft.articleKind,
      subtitle: safeDraft.subtitle.trim() || null,
      summary: safeDraft.summary.trim() || null,
      language: safeDraft.language.trim() || 'en',
      content_warning: safeDraft.contentWarning.trim() || null,
      tags,
      body_preview: safeDraft.body.slice(0, 320),
      stats: articleStats(safeDraft),
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
      hero_image_crab_url: safeDraft.heroImageCrabUrl.trim() || null,
      linked_source_crab_url: safeDraft.linkedSourceCrabUrl.trim() || null,
      embedded_assets: [],
      site_connection: siteConnection,
      reference_graph: referenceGraph,
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend article contracts exist.',
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
      source: 'crab://article workspace',
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

export function statsForArticleDraft(draft) {
  return articleStats(draft || DEFAULT_ARTICLE_DRAFT);
}

export function articleStats(draft) {
  const title = String(draft?.title || '');
  const subtitle = String(draft?.subtitle || '');
  const summary = String(draft?.summary || '');
  const body = String(draft?.body || '');
  const combined = `${title}\n${subtitle}\n${summary}\n${body}`.trim();
  const tags = parseTags(draft?.tags || '');

  const siteConnection = buildSiteConnectionDraft({
    siteContextCrabUrl: draft?.siteContextCrabUrl,
    assetKind: 'article',
    required: true,
    relation: 'published_on_site',
  });
  const heroImageConnection = buildReferenceConnectionDraft({
    crabUrl: draft?.heroImageCrabUrl,
    acceptedAssetKinds: ['image'],
    relation: 'hero_image',
    label: 'hero image',
  });
  const sourceConnection = buildReferenceConnectionDraft({
    crabUrl: draft?.linkedSourceCrabUrl,
    acceptedAssetKinds: ['post', 'article', 'image', 'video', 'music', 'song'],
    relation: 'source_or_reference',
    label: 'source/reference',
  });

  return {
    characters: body.length,
    words: body.trim() ? body.trim().split(/\s+/).length : 0,
    lines: body ? body.split(/\r\n|\r|\n/).length : 0,
    tags: tags.length,
    crab_links: countCrabLinks(combined),
    reading_minutes: estimateReadingMinutes(body),
    site_attached: connectionIsSatisfied(siteConnection),
    hero_image_attached: connectionIsSatisfied(heroImageConnection),
    source_attached: connectionIsSatisfied(sourceConnection),
  };
}

export function getArticleCompleteness(draft) {
  const safeDraft = {
    ...DEFAULT_ARTICLE_DRAFT,
    ...(draft || {}),
  };

  const checks = [
    safeDraft.title.trim(),
    safeDraft.summary.trim() || safeDraft.subtitle.trim(),
    safeDraft.body.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.language.trim(),
    safeDraft.articleKind,
    safeDraft.visibility,
    safeDraft.rightsMode,
    safeDraft.moderationMode,
    connectionIsSatisfied(buildSiteConnectionDraft({
      siteContextCrabUrl: safeDraft.siteContextCrabUrl,
      assetKind: 'article',
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

function estimateReadingMinutes(body) {
  const words = String(body || '').trim()
    ? String(body || '').trim().split(/\s+/).length
    : 0;

  return Math.max(0, Math.ceil(words / 220));
}