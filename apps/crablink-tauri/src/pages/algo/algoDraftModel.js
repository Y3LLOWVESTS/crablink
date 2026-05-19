/**
 * RO:WHAT — Local draft model for the React-owned crab://algo transparency workspace.
 * RO:WHY — CrabLink refactor; keeps algorithm manifest drafting deterministic and separate from UI rendering.
 * RO:INTERACTS — AlgoPage.jsx, AlgoDraft.jsx, AlgoTransparency.jsx, useCreatorDraft, future facet/sandbox/policy manifests.
 * RO:INVARIANTS — local draft only; no code execution; no ranking execution; no b3 CID; no ROC spend.
 * RO:METRICS — none; future ranking/accounting events must be backend-accounted and policy-gated.
 * RO:CONFIG — none; future algo policy/economics/facet config comes from backend contracts.
 * RO:SECURITY — crab://algo never executes code; executable primitives require facet.toml, policy, and sandbox services.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://algo route smoke.
 */

export const ALGO_SCHEMA = 'crablink.local.algo-draft.v1';

export const DEFAULT_ALGO_DRAFT = Object.freeze({
  algorithmName: '',
  creatorDisplay: '',
  maintainerPassport: '',
  purpose: '',
  algoKind: 'feed_ranking',
  transparencyLevel: 'explainable_manifest',
  executionMode: 'manifest_only_no_execution',
  sandboxMode: 'facet_contract_required_future',
  auditMode: 'public_audit_notes',
  inputSignals:
    'content freshness, creator reputation, user-selected topics, moderation status, explicit follows',
  excludedSignals:
    'private messages, precise location, hidden tracking pixels, third-party cookies, fingerprinting',
  outputShape: 'ordered_content_list',
  rankingGoal: 'surface relevant creator content without hidden tracking',
  fairnessNotes: '',
  moderationNotes: '',
  evaluationNotes: '',
  sourceCodeCrabUrl: '',
  facetTomlCrabUrl: '',
  policyBundleCrabUrl: '',
  evaluationReportCrabUrl: '',
  safetyReviewCrabUrl: '',
  exampleInputCrabUrl: '',
  exampleOutputCrabUrl: '',
  rightsMode: 'creator_owned_manifest',
  accessMode: 'public_transparency',
  payoutMode: 'no_payout_draft',
  governanceMode: 'policy_review_required',
  releaseChannel: 'draft_only',
  versionLabel: 'v0.1-local',
  tags: 'algo, transparency',
});

export const ALGO_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const ALGO_KIND_OPTIONS = Object.freeze([
  { value: 'feed_ranking', label: 'Feed ranking' },
  { value: 'search_ranking', label: 'Search ranking' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'curation', label: 'Curation' },
  { value: 'moderation_assist', label: 'Moderation assist' },
  { value: 'trust_scoring', label: 'Trust scoring' },
  { value: 'content_discovery', label: 'Content discovery' },
]);

export const ALGO_TRANSPARENCY_OPTIONS = Object.freeze([
  { value: 'explainable_manifest', label: 'Explainable manifest' },
  { value: 'open_source_future', label: 'Open source future' },
  { value: 'audit_report_future', label: 'Audit report future' },
  { value: 'policy_summary_only', label: 'Policy summary only' },
]);

export const ALGO_EXECUTION_OPTIONS = Object.freeze([
  { value: 'manifest_only_no_execution', label: 'Manifest only / no execution' },
  { value: 'sandboxed_wasm_future', label: 'Sandboxed WASM future' },
  { value: 'sandboxed_js_future', label: 'Sandboxed JS future' },
  { value: 'server_side_policy_module_future', label: 'Server-side policy module future' },
]);

export const ALGO_SANDBOX_OPTIONS = Object.freeze([
  { value: 'facet_contract_required_future', label: 'Facet contract required future' },
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'manifest_only_no_runtime', label: 'Manifest only / no runtime' },
]);

export const ALGO_AUDIT_OPTIONS = Object.freeze([
  { value: 'public_audit_notes', label: 'Public audit notes' },
  { value: 'signed_audit_report_future', label: 'Signed audit report future' },
  { value: 'community_review_future', label: 'Community review future' },
  { value: 'private_review_required', label: 'Private review required' },
]);

export const ALGO_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_manifest', label: 'Creator-owned manifest' },
  { value: 'open_license_future', label: 'Open license future' },
  { value: 'restricted_use_future', label: 'Restricted use future' },
  { value: 'policy_review_required', label: 'Policy review required' },
]);

export const ALGO_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_transparency', label: 'Public transparency' },
  { value: 'site_admins_future', label: 'Site admins future' },
  { value: 'moderators_future', label: 'Moderators future' },
  { value: 'private_review_draft', label: 'Private review draft' },
]);

export const ALGO_PAYOUT_OPTIONS = Object.freeze([
  { value: 'no_payout_draft', label: 'No payout draft' },
  { value: 'creator_wallet_future', label: 'Creator wallet future' },
  { value: 'site_split_future', label: 'Site split future' },
  { value: 'curator_reward_future', label: 'Curator reward future' },
]);

export const ALGO_GOVERNANCE_OPTIONS = Object.freeze([
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'site_owner_review_future', label: 'Site owner review future' },
  { value: 'community_review_future', label: 'Community review future' },
  { value: 'experimental_draft_only', label: 'Experimental draft only' },
]);

export const ALGO_RELEASE_OPTIONS = Object.freeze([
  { value: 'draft_only', label: 'Draft only' },
  { value: 'review_candidate_future', label: 'Review candidate future' },
  { value: 'approved_future', label: 'Approved future' },
]);

export const ALGO_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'sourceCodeCrabUrl',
    role: 'source_code',
    label: 'Source code crab URL',
    expectedKind: 'code',
    help: 'Future code bytes must be independently addressed and governed by a facet contract.',
  },
  {
    field: 'facetTomlCrabUrl',
    role: 'facet_contract',
    label: 'facet.toml crab URL',
    expectedKind: 'facet',
    help: 'Future execution requires a permissions/sandbox contract. This draft never executes it.',
  },
  {
    field: 'policyBundleCrabUrl',
    role: 'policy_bundle',
    label: 'Policy bundle crab URL',
    expectedKind: 'policy',
    help: 'Future policy bundle reference for allowed signals, limits, and governance.',
  },
  {
    field: 'evaluationReportCrabUrl',
    role: 'evaluation_report',
    label: 'Evaluation report crab URL',
    expectedKind: 'article',
    help: 'Human-readable report or evaluation artifact.',
  },
  {
    field: 'safetyReviewCrabUrl',
    role: 'safety_review',
    label: 'Safety review crab URL',
    expectedKind: 'article',
    help: 'Future safety or red-team review artifact.',
  },
  {
    field: 'exampleInputCrabUrl',
    role: 'example_input',
    label: 'Example input crab URL',
    expectedKind: 'manifest',
    help: 'Sample input object or manifest for transparent examples.',
  },
  {
    field: 'exampleOutputCrabUrl',
    role: 'example_output',
    label: 'Example output crab URL',
    expectedKind: 'manifest',
    help: 'Sample output object or manifest for transparent examples.',
  },
]);

export function buildAlgoManifestDraft(draft, context = {}) {
  const safeDraft = normalizeAlgoDraft(draft);
  const stats = statsForAlgoDraft(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const creatorDisplay = trimOrNull(safeDraft.creatorDisplay);

  return {
    schema: ALGO_SCHEMA,
    route: 'crab://algo',
    asset_kind: 'algorithm_manifest',
    local_workspace: true,
    generated_by: 'CrabLink React algorithm transparency workspace',
    route_context: {
      requested_url: context?.route?.url || context?.route?.rawUrl || 'crab://algo',
      route_kind: context?.route?.kind || 'algo',
    },
    identity: {
      algorithm_name: trimOrNull(safeDraft.algorithmName),
      creator_display: creatorDisplay,
      maintainer_passport_hint: trimOrNull(safeDraft.maintainerPassport),
      local_operator_passport_hint: context?.app?.settings?.passportSubject || null,
      backend_confirmed: false,
    },
    metadata: {
      purpose: trimOrNull(safeDraft.purpose),
      algo_kind: safeDraft.algoKind,
      transparency_level: safeDraft.transparencyLevel,
      version_label: trimOrNull(safeDraft.versionLabel),
      release_channel: safeDraft.releaseChannel,
      tags,
      stats,
    },
    behavior_contract: {
      input_signals: parseLinesOrCommaList(safeDraft.inputSignals),
      excluded_signals: parseLinesOrCommaList(safeDraft.excludedSignals),
      output_shape: trimOrNull(safeDraft.outputShape),
      ranking_goal: trimOrNull(safeDraft.rankingGoal),
      fairness_notes: trimOrNull(safeDraft.fairnessNotes),
      moderation_notes: trimOrNull(safeDraft.moderationNotes),
      evaluation_notes: trimOrNull(safeDraft.evaluationNotes),
    },
    execution_policy: {
      mode: safeDraft.executionMode,
      sandbox_mode: safeDraft.sandboxMode,
      executes_in_browser: false,
      executes_in_crablink_shell: false,
      requires_facet_contract: true,
      backend_execution_active: false,
    },
    audit_policy: {
      mode: safeDraft.auditMode,
      governance_mode: safeDraft.governanceMode,
      backend_reviewed: false,
      approved_for_runtime: false,
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend algorithm/facet contracts exist.',
    },
    access_policy: {
      mode: safeDraft.accessMode,
      backend_enforced: false,
    },
    economics: {
      payout_mode: safeDraft.payoutMode,
      roc_charge_active: false,
      receipt_required: false,
    },
    linked_assets: linkedAssets,
    versions: [
      {
        label: trimOrNull(safeDraft.versionLabel) || 'v0.1-local',
        local_only: true,
        backend_verified: false,
      },
    ],
    receipts: [],
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://algo workspace',
      version: 1,
    },
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_asset: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      backend_route_claimed: false,
      executes_code: false,
      executes_algorithm: false,
      ranks_content: false,
      records_impressions: false,
      mutates_feed: false,
      launches_sandbox: false,
    },
  };
}

export function statsForAlgoDraft(draft) {
  const safeDraft = normalizeAlgoDraft(draft);
  const inputSignals = parseLinesOrCommaList(safeDraft.inputSignals);
  const excludedSignals = parseLinesOrCommaList(safeDraft.excludedSignals);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const text = [
    safeDraft.algorithmName,
    safeDraft.creatorDisplay,
    safeDraft.purpose,
    safeDraft.inputSignals,
    safeDraft.excludedSignals,
    safeDraft.rankingGoal,
    safeDraft.fairnessNotes,
    safeDraft.moderationNotes,
    safeDraft.evaluationNotes,
    ...ALGO_LINKED_ASSET_FIELDS.map((item) => safeDraft[item.field]),
  ].join('\n');

  return {
    purpose_characters: safeDraft.purpose.trim().length,
    purpose_words: safeDraft.purpose.trim() ? safeDraft.purpose.trim().split(/\s+/).length : 0,
    input_signals: inputSignals.length,
    excluded_signals: excludedSignals.length,
    linked_asset_count: linkedAssets.length,
    crab_links: countCrabLinks(text),
    tags: tags.length,
    tag_list: tags,
    transparency_score: estimateTransparencyScore(safeDraft, inputSignals, excludedSignals, linkedAssets),
  };
}

export function getAlgoCompleteness(draft) {
  const safeDraft = normalizeAlgoDraft(draft);
  const checks = [
    safeDraft.algorithmName.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.purpose.trim(),
    safeDraft.algoKind,
    safeDraft.transparencyLevel,
    safeDraft.executionMode,
    safeDraft.sandboxMode,
    safeDraft.auditMode,
    safeDraft.inputSignals.trim(),
    safeDraft.excludedSignals.trim(),
    safeDraft.outputShape.trim(),
    safeDraft.rankingGoal.trim(),
    safeDraft.rightsMode,
    safeDraft.accessMode,
    safeDraft.governanceMode,
    safeDraft.releaseChannel,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function normalizeAlgoDraft(draft) {
  return {
    ...DEFAULT_ALGO_DRAFT,
    ...(draft || {}),
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function parseLinesOrCommaList(input) {
  return String(input || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function labelFromSnake(value) {
  return String(value || '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildLinkedAssets(draft) {
  return ALGO_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function estimateTransparencyScore(draft, inputSignals, excludedSignals, linkedAssets) {
  const checks = [
    draft.purpose.trim(),
    inputSignals.length > 0,
    excludedSignals.length > 0,
    draft.rankingGoal.trim(),
    draft.fairnessNotes.trim(),
    draft.moderationNotes.trim(),
    draft.evaluationNotes.trim(),
    linkedAssets.length > 0,
    draft.executionMode === 'manifest_only_no_execution' ||
      draft.sandboxMode === 'facet_contract_required_future',
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function countCrabLinks(input) {
  const matches = String(input || '').match(/\bcrab:\/\/[^\s<>"')]+/g);
  return matches ? matches.length : 0;
}

function trimOrNull(value) {
  const clean = String(value || '').trim();
  return clean || null;
}