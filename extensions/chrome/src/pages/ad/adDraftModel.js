/**
 * RO:WHAT — Local draft model for the React-owned crab://ad workspace.
 * RO:WHY — CrabLink refactor; keeps ad campaign manifests deterministic, privacy-preserving, and separate from UI rendering.
 * RO:INTERACTS — AdPage.jsx, AdCampaignDraft.jsx, AdCreativePreview.jsx, useCreatorDraft, future svc-ads route contracts.
 * RO:INVARIANTS — local draft only; no ad backend claim; no impression/click accounting; no b3 CID; no ROC spend.
 * RO:METRICS — none; future impressions/clicks must be backend-accounted and privacy-preserving.
 * RO:CONFIG — none; future policy/economics comes from backend config.
 * RO:SECURITY — no tracking pixels, scripts, popups, iframes, fingerprinting, autoplay, or page takeover.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://ad route smoke.
 */

export const AD_SCHEMA = 'crablink.local.ad-campaign-draft.v1';

export const DEFAULT_AD_DRAFT = Object.freeze({
  campaignName: '',
  sponsorDisplay: '',
  sponsorPassport: '',
  headline: '',
  body: '',
  callToAction: 'Learn more',
  destinationCrabUrl: '',
  creativeImageCrabUrl: '',
  campaignKind: 'header_sponsorship',
  creativeKind: 'text_card',
  placement: 'standard_header_slot',
  deviceMode: 'responsive_all',
  scheduleMode: 'draft_unscheduled',
  startDate: '',
  endDate: '',
  budgetMinor: '',
  budgetAsset: 'roc',
  pacingMode: 'manual_review_first',
  payoutMode: 'site_creator_treasury_split_future',
  reviewMode: 'policy_review_required',
  audienceMode: 'contextual_no_tracking',
  targetingNotes: '',
  frequencyMode: 'privacy_preserving_cap_future',
  contentPolicy: 'family_safe_default',
  tags: 'ad, campaign',
  disclaimer: 'Sponsored',
});

export const AD_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const AD_CAMPAIGN_KIND_OPTIONS = Object.freeze([
  { value: 'header_sponsorship', label: 'Header sponsorship' },
  { value: 'creator_site_campaign', label: 'Creator site campaign' },
  { value: 'asset_page_campaign', label: 'Asset page campaign' },
  { value: 'community_notice', label: 'Community notice' },
  { value: 'protocol_announcement', label: 'Protocol announcement' },
]);

export const AD_CREATIVE_KIND_OPTIONS = Object.freeze([
  { value: 'text_card', label: 'Text card' },
  { value: 'image_card', label: 'Image card' },
  { value: 'sponsor_badge', label: 'Sponsor badge' },
  { value: 'creator_promo', label: 'Creator promo' },
]);

export const AD_PLACEMENT_OPTIONS = Object.freeze([
  { value: 'standard_header_slot', label: 'Standard header slot' },
  { value: 'site_header_slot_future', label: 'Site header slot future' },
  { value: 'asset_header_slot_future', label: 'Asset header slot future' },
]);

export const AD_DEVICE_OPTIONS = Object.freeze([
  { value: 'responsive_all', label: 'Responsive all' },
  { value: 'desktop_first', label: 'Desktop first' },
  { value: 'mobile_first', label: 'Mobile first' },
]);

export const AD_SCHEDULE_OPTIONS = Object.freeze([
  { value: 'draft_unscheduled', label: 'Draft / unscheduled' },
  { value: 'scheduled_future', label: 'Scheduled future' },
  { value: 'manual_review_then_schedule_future', label: 'Review then schedule future' },
]);

export const AD_PACING_OPTIONS = Object.freeze([
  { value: 'manual_review_first', label: 'Manual review first' },
  { value: 'even_pacing_future', label: 'Even pacing future' },
  { value: 'budget_guarded_future', label: 'Budget guarded future' },
]);

export const AD_PAYOUT_OPTIONS = Object.freeze([
  { value: 'site_creator_treasury_split_future', label: 'Site creator / treasury split future' },
  { value: 'creator_only_future', label: 'Creator only future' },
  { value: 'creator_and_curator_future', label: 'Creator + curator future' },
  { value: 'no_payout_draft', label: 'No payout draft' },
]);

export const AD_REVIEW_OPTIONS = Object.freeze([
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'trusted_sponsor_future', label: 'Trusted sponsor future' },
  { value: 'site_owner_review_future', label: 'Site owner review future' },
]);

export const AD_AUDIENCE_OPTIONS = Object.freeze([
  { value: 'contextual_no_tracking', label: 'Contextual / no tracking' },
  { value: 'site_topic_context_future', label: 'Site topic context future' },
  { value: 'asset_kind_context_future', label: 'Asset kind context future' },
]);

export const AD_FREQUENCY_OPTIONS = Object.freeze([
  { value: 'privacy_preserving_cap_future', label: 'Privacy-preserving cap future' },
  { value: 'per_site_cap_future', label: 'Per-site cap future' },
  { value: 'no_frequency_tracking_draft', label: 'No frequency tracking draft' },
]);

export const AD_CONTENT_POLICY_OPTIONS = Object.freeze([
  { value: 'family_safe_default', label: 'Family-safe default' },
  { value: 'creator_tools', label: 'Creator tools' },
  { value: 'protocol_native_services', label: 'Protocol-native services' },
  { value: 'community_campaign', label: 'Community campaign' },
  { value: 'policy_review_required', label: 'Policy review required' },
]);

export const AD_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'creativeImageCrabUrl',
    role: 'creative_image',
    label: 'Creative image',
    expectedKind: 'image',
    help: 'Future creative art should be a normal crab://<hash>.image asset, not a special ad-image kind.',
  },
  {
    field: 'destinationCrabUrl',
    role: 'destination',
    label: 'Destination crab URL',
    expectedKind: 'site_or_asset',
    help: 'Destination should stay inside crab:// surfaces. This draft never opens it automatically.',
  },
]);

export function buildAdManifestDraft(draft, context = {}) {
  const safeDraft = normalizeAdDraft(draft);
  const tags = parseTags(safeDraft.tags);
  const stats = statsForAdDraft(safeDraft);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const sponsorDisplay = trimOrNull(safeDraft.sponsorDisplay);

  return {
    schema: AD_SCHEMA,
    route: 'crab://ad',
    asset_kind: 'ad_campaign',
    local_workspace: true,
    generated_by: 'CrabLink React ad campaign workspace',
    route_context: {
      requested_url: context?.route?.url || context?.route?.rawUrl || 'crab://ad',
      route_kind: context?.route?.kind || 'ad',
    },
    identity: {
      campaign_name: trimOrNull(safeDraft.campaignName),
      sponsor_display: sponsorDisplay,
      sponsor_passport_hint: trimOrNull(safeDraft.sponsorPassport),
      local_operator_passport_hint: context?.app?.settings?.passportSubject || null,
      backend_confirmed: false,
    },
    metadata: {
      headline: trimOrNull(safeDraft.headline),
      body: trimOrNull(safeDraft.body),
      call_to_action: trimOrNull(safeDraft.callToAction),
      disclaimer: trimOrNull(safeDraft.disclaimer) || 'Sponsored',
      campaign_kind: safeDraft.campaignKind,
      creative_kind: safeDraft.creativeKind,
      tags,
      stats,
    },
    placement_policy: {
      placement: safeDraft.placement,
      device_mode: safeDraft.deviceMode,
      one_header_slot_only: true,
      no_popups: true,
      no_autoplay: true,
      no_page_takeover: true,
    },
    schedule_policy: {
      mode: safeDraft.scheduleMode,
      start_date: trimOrNull(safeDraft.startDate),
      end_date: trimOrNull(safeDraft.endDate),
      backend_scheduled: false,
    },
    audience_policy: {
      mode: safeDraft.audienceMode,
      targeting_notes: trimOrNull(safeDraft.targetingNotes),
      tracking_allowed: false,
      fingerprinting_allowed: false,
      third_party_tracking_allowed: false,
    },
    review_policy: {
      mode: safeDraft.reviewMode,
      content_policy: safeDraft.contentPolicy,
      backend_reviewed: false,
      policy_passed: false,
    },
    economics: {
      budget_minor: parseBudgetMinor(safeDraft.budgetMinor),
      budget_asset: safeDraft.budgetAsset,
      pacing_mode: safeDraft.pacingMode,
      payout_mode: safeDraft.payoutMode,
      roc_charge_active: false,
      wallet_hold_required: false,
      receipt_required: false,
    },
    frequency_policy: {
      mode: safeDraft.frequencyMode,
      backend_enforced: false,
    },
    linked_assets: linkedAssets,
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://ad workspace',
      version: 1,
    },
    versions: [],
    receipts: [],
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_campaign: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      spends_budget: false,
      records_impressions: false,
      records_clicks: false,
      runs_tracking: false,
      runs_scripts: false,
      opens_destination: false,
      backend_route_claimed: false,
    },
  };
}

export function statsForAdDraft(draft) {
  const safeDraft = normalizeAdDraft(draft);
  const tags = parseTags(safeDraft.tags);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const text = [
    safeDraft.campaignName,
    safeDraft.sponsorDisplay,
    safeDraft.headline,
    safeDraft.body,
    safeDraft.targetingNotes,
    safeDraft.destinationCrabUrl,
    safeDraft.creativeImageCrabUrl,
  ].join('\n');

  return {
    campaign_name_characters: safeDraft.campaignName.trim().length,
    headline_characters: safeDraft.headline.trim().length,
    body_characters: safeDraft.body.trim().length,
    body_words: safeDraft.body.trim() ? safeDraft.body.trim().split(/\s+/).length : 0,
    tags: tags.length,
    tag_list: tags,
    linked_asset_count: linkedAssets.length,
    crab_links: countCrabLinks(text),
    budget_minor: parseBudgetMinor(safeDraft.budgetMinor),
  };
}

export function getAdCompleteness(draft) {
  const safeDraft = normalizeAdDraft(draft);
  const checks = [
    safeDraft.campaignName.trim(),
    safeDraft.sponsorDisplay.trim(),
    safeDraft.headline.trim(),
    safeDraft.body.trim(),
    safeDraft.callToAction.trim(),
    safeDraft.disclaimer.trim(),
    safeDraft.campaignKind,
    safeDraft.creativeKind,
    safeDraft.placement,
    safeDraft.deviceMode,
    safeDraft.reviewMode,
    safeDraft.audienceMode,
    safeDraft.contentPolicy,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function normalizeAdDraft(draft) {
  return {
    ...DEFAULT_AD_DRAFT,
    ...(draft || {}),
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseBudgetMinor(input) {
  const clean = String(input || '').trim();

  if (!clean) {
    return null;
  }

  if (!/^\d+$/.test(clean)) {
    return null;
  }

  return Number(clean);
}

function buildLinkedAssets(draft) {
  return AD_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function countCrabLinks(input) {
  const matches = String(input || '').match(/\bcrab:\/\/[^\s<>"')]+/g);
  return matches ? matches.length : 0;
}

function trimOrNull(value) {
  const clean = String(value || '').trim();
  return clean || null;
}