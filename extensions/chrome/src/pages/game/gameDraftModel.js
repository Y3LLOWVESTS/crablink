/**
 * RO:WHAT — Local draft model for the React-owned crab://game workspace.
 * RO:WHY — CrabLink refactor; models game manifests, asset bundles, runtime/facet rules, saves, sessions, and economy without execution.
 * RO:INTERACTS — GamePage.jsx, GameDraft.jsx, GameAssets.jsx, useCreatorDraft, future game/facet/sandbox route contracts.
 * RO:INVARIANTS — local draft only; no game execution; no sandbox launch; no b3 CID; no ROC spend; no save/session mutation.
 * RO:METRICS — none; future game sessions/views/saves/spend must be backend-accounted and policy-gated.
 * RO:CONFIG — none; future runtime/economics/policy config comes from backend contracts.
 * RO:SECURITY — playable games require facet.toml, policy, capabilities, resource limits, save-data rules, and sandboxing.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://game route smoke.
 */

export const GAME_SCHEMA = 'crablink.local.game-draft.v1';

export const DEFAULT_GAME_DRAFT = Object.freeze({
  gameTitle: '',
  creatorDisplay: '',
  studioPassport: '',
  description: '',
  gameKind: 'single_player',
  runtime: 'wasm_sandbox_future',
  engine: 'custom_or_unknown',
  platformMode: 'browser_sandbox_future',
  contentRating: 'not_rated',
  releaseMode: 'local_draft',
  executionMode: 'not_executable_in_crablink',
  sandboxMode: 'svc_sandbox_required_future',
  policyMode: 'deny_by_default',
  reviewMode: 'policy_review_required',
  networkPolicy: 'none',
  storagePolicy: 'read_public_assets_future',
  walletPolicy: 'none',
  profilePolicy: 'public_only',
  allowedRoutes: 'launch_preview, render_title_screen',
  allowedActions: 'render_static_preview, read_public_asset_refs',
  deniedActions:
    'eval, fetch_external_network, wallet_spend, private_profile_read, storage_write, background_run, hidden_session_tracking',
  requiredCapabilities: 'game:read, facet:preview',
  memoryLimitMb: '256',
  cpuLimitMs: '500',
  saveLimitKb: '1024',
  outputLimitKb: '1024',
  requestLimit: '0',
  saveDataPolicy: 'local_only_draft',
  saveOwnership: 'player_passport_owned_future',
  multiplayerPolicy: 'disabled_by_default',
  sessionPolicy: 'no_session_routes',
  economyPolicy: 'no_in_game_spend_draft',
  accessMode: 'public_manifest_preview',
  payoutMode: 'no_payout_draft',
  moderationMode: 'site_policy_or_creator_default',
  coverImageCrabUrl: '',
  thumbnailImageCrabUrl: '',
  trailerVideoCrabUrl: '',
  sourceBundleCrabUrl: '',
  desktopBundleCrabUrl: '',
  mobileBundleCrabUrl: '',
  wasmRuntimeCrabUrl: '',
  assetManifestCrabUrl: '',
  audioPackCrabUrl: '',
  mapPackCrabUrl: '',
  docsManualCrabUrl: '',
  saveSchemaCrabUrl: '',
  facetTomlCrabUrl: '',
  policyBundleCrabUrl: '',
  tags: 'game, draft',
});

export const GAME_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const GAME_KIND_OPTIONS = Object.freeze([
  { value: 'single_player', label: 'Single player' },
  { value: 'local_multiplayer_future', label: 'Local multiplayer future' },
  { value: 'online_multiplayer_future', label: 'Online multiplayer future' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'arcade', label: 'Arcade' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'education', label: 'Education' },
]);

export const GAME_RUNTIME_OPTIONS = Object.freeze([
  { value: 'wasm_sandbox_future', label: 'WASM sandbox future' },
  { value: 'javascript_sandbox_future', label: 'JavaScript sandbox future' },
  { value: 'native_streamed_future', label: 'Native/streamed future' },
  { value: 'manifest_only_no_runtime', label: 'Manifest only / no runtime' },
]);

export const GAME_ENGINE_OPTIONS = Object.freeze([
  { value: 'custom_or_unknown', label: 'Custom / unknown' },
  { value: 'bevy_wasm_future', label: 'Bevy WASM future' },
  { value: 'godot_export_future', label: 'Godot export future' },
  { value: 'unity_webgl_future', label: 'Unity WebGL future' },
  { value: 'web_canvas_future', label: 'Web canvas future' },
  { value: 'text_game', label: 'Text game' },
]);

export const GAME_PLATFORM_OPTIONS = Object.freeze([
  { value: 'browser_sandbox_future', label: 'Browser sandbox future' },
  { value: 'crablink_renderer_future', label: 'CrabLink renderer future' },
  { value: 'streamed_remote_runtime_future', label: 'Streamed remote runtime future' },
  { value: 'manifest_preview_only', label: 'Manifest preview only' },
]);

export const GAME_RATING_OPTIONS = Object.freeze([
  { value: 'not_rated', label: 'Not rated' },
  { value: 'family_friendly', label: 'Family friendly' },
  { value: 'teen_future', label: 'Teen future' },
  { value: 'mature_review_required', label: 'Mature / review required' },
]);

export const GAME_RELEASE_OPTIONS = Object.freeze([
  { value: 'local_draft', label: 'Local draft' },
  { value: 'prototype_future', label: 'Prototype future' },
  { value: 'review_candidate_future', label: 'Review candidate future' },
  { value: 'released_future', label: 'Released future' },
]);

export const GAME_EXECUTION_OPTIONS = Object.freeze([
  { value: 'not_executable_in_crablink', label: 'Not executable in CrabLink' },
  { value: 'sandboxed_preview_future', label: 'Sandboxed preview future' },
  { value: 'server_side_stream_future', label: 'Server-side stream future' },
  { value: 'disabled_until_review', label: 'Disabled until review' },
]);

export const GAME_SANDBOX_OPTIONS = Object.freeze([
  { value: 'svc_sandbox_required_future', label: 'svc-sandbox required future' },
  { value: 'facet_contract_required_future', label: 'Facet contract required future' },
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'manifest_only_no_runtime', label: 'Manifest only / no runtime' },
]);

export const GAME_POLICY_OPTIONS = Object.freeze([
  { value: 'deny_by_default', label: 'Deny by default' },
  { value: 'allowlist_only_future', label: 'Allowlist only future' },
  { value: 'site_owner_policy_future', label: 'Site owner policy future' },
  { value: 'admin_review_required', label: 'Admin review required' },
]);

export const GAME_REVIEW_OPTIONS = Object.freeze([
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'security_audit_required_future', label: 'Security audit required future' },
  { value: 'trusted_studio_future', label: 'Trusted studio future' },
  { value: 'experimental_draft_only', label: 'Experimental draft only' },
]);

export const GAME_NETWORK_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'crab_only_future', label: 'crab:// only future' },
  { value: 'gateway_only_future', label: 'Gateway only future' },
  { value: 'multiplayer_relay_future', label: 'Multiplayer relay future' },
]);

export const GAME_STORAGE_OPTIONS = Object.freeze([
  { value: 'read_public_assets_future', label: 'Read public assets future' },
  { value: 'local_save_only_future', label: 'Local save only future' },
  { value: 'save_schema_gated_future', label: 'Save schema gated future' },
  { value: 'none', label: 'None' },
]);

export const GAME_WALLET_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'read_balance_future', label: 'Read balance future' },
  { value: 'explicit_user_confirmed_spend_future', label: 'Explicit confirmed spend future' },
]);

export const GAME_PROFILE_OPTIONS = Object.freeze([
  { value: 'public_only', label: 'Public only' },
  { value: 'current_passport_public_future', label: 'Current passport public future' },
  { value: 'player_alias_future', label: 'Player alias future' },
  { value: 'none', label: 'None' },
]);

export const GAME_SAVE_POLICY_OPTIONS = Object.freeze([
  { value: 'local_only_draft', label: 'Local only draft' },
  { value: 'player_passport_save_future', label: 'Player passport save future' },
  { value: 'site_scoped_save_future', label: 'Site-scoped save future' },
  { value: 'disabled', label: 'Disabled' },
]);

export const GAME_SAVE_OWNERSHIP_OPTIONS = Object.freeze([
  { value: 'player_passport_owned_future', label: 'Player passport owned future' },
  { value: 'local_device_only_draft', label: 'Local device only draft' },
  { value: 'site_owned_future', label: 'Site owned future' },
]);

export const GAME_MULTIPLAYER_OPTIONS = Object.freeze([
  { value: 'disabled_by_default', label: 'Disabled by default' },
  { value: 'invite_only_future', label: 'Invite-only future' },
  { value: 'public_lobby_future', label: 'Public lobby future' },
  { value: 'site_scoped_sessions_future', label: 'Site-scoped sessions future' },
]);

export const GAME_SESSION_OPTIONS = Object.freeze([
  { value: 'no_session_routes', label: 'No session routes' },
  { value: 'ephemeral_sessions_future', label: 'Ephemeral sessions future' },
  { value: 'passport_sessions_future', label: 'Passport sessions future' },
]);

export const GAME_ECONOMY_OPTIONS = Object.freeze([
  { value: 'no_in_game_spend_draft', label: 'No in-game spend draft' },
  { value: 'cosmetic_purchase_future', label: 'Cosmetic purchase future' },
  { value: 'paid_access_future', label: 'Paid access future' },
  { value: 'creator_reward_future', label: 'Creator reward future' },
]);

export const GAME_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_manifest_preview', label: 'Public manifest preview' },
  { value: 'free_play_future', label: 'Free play future' },
  { value: 'paid_play_future', label: 'Paid play future' },
  { value: 'site_members_only_future', label: 'Site members only future' },
  { value: 'private_draft', label: 'Private draft' },
]);

export const GAME_PAYOUT_OPTIONS = Object.freeze([
  { value: 'no_payout_draft', label: 'No payout draft' },
  { value: 'creator_revenue_future', label: 'Creator revenue future' },
  { value: 'creator_site_split_future', label: 'Creator/site split future' },
  { value: 'team_split_future', label: 'Team split future' },
]);

export const GAME_MODERATION_OPTIONS = Object.freeze([
  { value: 'site_policy_or_creator_default', label: 'Site policy or creator default' },
  { value: 'player_reports_future', label: 'Player reports future' },
  { value: 'moderated_sessions_future', label: 'Moderated sessions future' },
  { value: 'chat_disabled_future', label: 'Chat disabled future' },
]);

export const GAME_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'coverImageCrabUrl',
    role: 'cover_image',
    label: 'Cover image',
    expectedKind: 'image',
    help: 'Cover art should be a normal crab://<hash>.image asset.',
  },
  {
    field: 'thumbnailImageCrabUrl',
    role: 'thumbnail_image',
    label: 'Thumbnail image',
    expectedKind: 'image',
    help: 'Small preview image for cards, search, and profiles.',
  },
  {
    field: 'trailerVideoCrabUrl',
    role: 'trailer_video',
    label: 'Trailer video',
    expectedKind: 'video',
    help: 'Optional trailer or gameplay preview video asset.',
  },
  {
    field: 'sourceBundleCrabUrl',
    role: 'source_bundle',
    label: 'Source/master bundle',
    expectedKind: 'game',
    help: 'Future source/master game bundle reference. This route never fetches it.',
  },
  {
    field: 'desktopBundleCrabUrl',
    role: 'desktop_bundle',
    label: 'Desktop bundle',
    expectedKind: 'game',
    help: 'Future desktop-friendly game bundle reference.',
  },
  {
    field: 'mobileBundleCrabUrl',
    role: 'mobile_bundle',
    label: 'Mobile bundle',
    expectedKind: 'game',
    help: 'Future mobile-friendly game bundle reference.',
  },
  {
    field: 'wasmRuntimeCrabUrl',
    role: 'wasm_runtime',
    label: 'WASM/runtime asset',
    expectedKind: 'code',
    help: 'Future runtime bytes must be governed as code/facet assets.',
  },
  {
    field: 'assetManifestCrabUrl',
    role: 'asset_manifest',
    label: 'Asset manifest',
    expectedKind: 'manifest',
    help: 'Future manifest listing game bundles/resources.',
  },
  {
    field: 'audioPackCrabUrl',
    role: 'audio_pack',
    label: 'Audio pack',
    expectedKind: 'music',
    help: 'Optional music/audio asset pack reference.',
  },
  {
    field: 'mapPackCrabUrl',
    role: 'map_pack',
    label: 'Map/level pack',
    expectedKind: 'game',
    help: 'Optional map or level pack reference.',
  },
  {
    field: 'docsManualCrabUrl',
    role: 'docs_manual',
    label: 'Docs/manual',
    expectedKind: 'article',
    help: 'Human-readable manual, rules, or documentation.',
  },
  {
    field: 'saveSchemaCrabUrl',
    role: 'save_schema',
    label: 'Save schema',
    expectedKind: 'manifest',
    help: 'Future schema for save data validation.',
  },
  {
    field: 'facetTomlCrabUrl',
    role: 'facet_contract',
    label: 'facet.toml',
    expectedKind: 'facet',
    help: 'Future permissions/sandbox contract for playable game runtime.',
  },
  {
    field: 'policyBundleCrabUrl',
    role: 'policy_bundle',
    label: 'Policy bundle',
    expectedKind: 'policy',
    help: 'Future policy bundle for runtime, multiplayer, saves, and economy.',
  },
]);

export function buildGameManifestDraft(draft, context = {}) {
  const safeDraft = normalizeGameDraft(draft);
  const stats = statsForGameDraft(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const facetToml = buildGameFacetToml(safeDraft, stats);

  return {
    schema: GAME_SCHEMA,
    route: 'crab://game',
    asset_kind: 'game_manifest',
    local_workspace: true,
    generated_by: 'CrabLink React game manifest workspace',
    route_context: {
      requested_url: context?.route?.url || context?.route?.rawUrl || 'crab://game',
      route_kind: context?.route?.kind || 'game',
    },
    identity: {
      game_title: trimOrNull(safeDraft.gameTitle),
      creator_display: trimOrNull(safeDraft.creatorDisplay),
      studio_passport_hint: trimOrNull(safeDraft.studioPassport),
      local_operator_passport_hint: context?.app?.settings?.passportSubject || null,
      backend_confirmed: false,
    },
    metadata: {
      description: trimOrNull(safeDraft.description),
      game_kind: safeDraft.gameKind,
      runtime: safeDraft.runtime,
      engine: safeDraft.engine,
      platform_mode: safeDraft.platformMode,
      content_rating: safeDraft.contentRating,
      release_mode: safeDraft.releaseMode,
      tags,
      stats,
    },
    facet_contract: {
      format: 'facet.toml',
      preview_text: facetToml,
      deny_by_default: true,
      required_capabilities: stats.requiredCapabilities,
      allowed_routes: stats.allowedRoutes,
      allowed_actions: stats.allowedActions,
      denied_actions: stats.deniedActions,
      backend_verified: false,
    },
    runtime_policy: {
      execution_mode: safeDraft.executionMode,
      sandbox_mode: safeDraft.sandboxMode,
      policy_mode: safeDraft.policyMode,
      review_mode: safeDraft.reviewMode,
      executes_in_browser: false,
      executes_in_crablink_shell: false,
      sandbox_launch_active: false,
      backend_approved: false,
    },
    permissions: {
      network: safeDraft.networkPolicy,
      storage: safeDraft.storagePolicy,
      wallet: safeDraft.walletPolicy,
      profile: safeDraft.profilePolicy,
      deny_unknown_permissions: true,
    },
    limits: {
      memory_mb: parsePositiveInt(safeDraft.memoryLimitMb, 256),
      cpu_ms: parsePositiveInt(safeDraft.cpuLimitMs, 500),
      save_kb: parsePositiveInt(safeDraft.saveLimitKb, 1024),
      output_kb: parsePositiveInt(safeDraft.outputLimitKb, 1024),
      request_limit: parsePositiveInt(safeDraft.requestLimit, 0),
    },
    save_policy: {
      mode: safeDraft.saveDataPolicy,
      ownership: safeDraft.saveOwnership,
      save_schema_ref: trimOrNull(safeDraft.saveSchemaCrabUrl),
      backend_enforced: false,
    },
    session_policy: {
      multiplayer: safeDraft.multiplayerPolicy,
      session_mode: safeDraft.sessionPolicy,
      backend_sessions_active: false,
    },
    economy_policy: {
      mode: safeDraft.economyPolicy,
      access_mode: safeDraft.accessMode,
      payout_mode: safeDraft.payoutMode,
      roc_charge_active: false,
      wallet_hold_required: false,
      receipt_required: false,
    },
    moderation_policy: {
      mode: safeDraft.moderationMode,
      backend_confirmed: false,
    },
    linked_assets: linkedAssets,
    renditions: linkedAssets.filter((item) =>
      ['source_bundle', 'desktop_bundle', 'mobile_bundle'].includes(item.role),
    ),
    versions: [
      {
        label: 'v0.1-local',
        local_only: true,
        backend_verified: false,
      },
    ],
    receipts: [],
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://game workspace',
      version: 1,
    },
    truth_boundary: {
      local_draft_only: true,
      assigns_b3_cid: false,
      assigns_manifest_cid: false,
      publishes_game: false,
      writes_index_pointer: false,
      performs_paid_action: false,
      spends_roc: false,
      starts_session: false,
      writes_save_data: false,
      fetches_runtime_bytes: false,
      compiles_code: false,
      evaluates_code: false,
      instantiates_wasm: false,
      executes_game: false,
      launches_sandbox: false,
      grants_capabilities: false,
      mutates_wallet: false,
      backend_route_claimed: false,
    },
  };
}

export function statsForGameDraft(draft) {
  const safeDraft = normalizeGameDraft(draft);
  const allowedRoutes = parseList(safeDraft.allowedRoutes);
  const allowedActions = parseList(safeDraft.allowedActions);
  const deniedActions = parseList(safeDraft.deniedActions);
  const requiredCapabilities = parseList(safeDraft.requiredCapabilities);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const text = [
    safeDraft.gameTitle,
    safeDraft.creatorDisplay,
    safeDraft.description,
    safeDraft.allowedRoutes,
    safeDraft.allowedActions,
    safeDraft.deniedActions,
    safeDraft.requiredCapabilities,
    ...GAME_LINKED_ASSET_FIELDS.map((item) => safeDraft[item.field]),
  ].join('\n');

  return {
    description_characters: safeDraft.description.trim().length,
    description_words: safeDraft.description.trim()
      ? safeDraft.description.trim().split(/\s+/).length
      : 0,
    allowed_routes_count: allowedRoutes.length,
    allowed_actions_count: allowedActions.length,
    denied_actions_count: deniedActions.length,
    required_capabilities_count: requiredCapabilities.length,
    linked_asset_count: linkedAssets.length,
    bundle_count: linkedAssets.filter((item) => item.expected_kind === 'game').length,
    media_count: linkedAssets.filter((item) => ['image', 'video', 'music'].includes(item.expected_kind)).length,
    crab_links: countCrabLinks(text),
    tags: tags.length,
    tag_list: tags,
    allowedRoutes,
    allowedActions,
    deniedActions,
    requiredCapabilities,
    safety_score: estimateSafetyScore(safeDraft, deniedActions, requiredCapabilities),
  };
}

export function getGameCompleteness(draft) {
  const safeDraft = normalizeGameDraft(draft);
  const checks = [
    safeDraft.gameTitle.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.description.trim(),
    safeDraft.gameKind,
    safeDraft.runtime,
    safeDraft.engine,
    safeDraft.platformMode,
    safeDraft.contentRating,
    safeDraft.releaseMode,
    safeDraft.executionMode,
    safeDraft.sandboxMode,
    safeDraft.policyMode,
    safeDraft.reviewMode,
    safeDraft.allowedRoutes.trim(),
    safeDraft.allowedActions.trim(),
    safeDraft.deniedActions.trim(),
    safeDraft.requiredCapabilities.trim(),
    safeDraft.saveDataPolicy,
    safeDraft.multiplayerPolicy,
    safeDraft.sessionPolicy,
    safeDraft.economyPolicy,
    safeDraft.accessMode,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function buildGameFacetToml(draft, stats) {
  const safeDraft = normalizeGameDraft(draft);
  const safeStats = stats || statsForGameDraft(safeDraft);
  const lineArray = (values) => `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;

  return [
    '# facet.toml preview generated by CrabLink local game draft UI',
    '# This is not backend truth and does not authorize game execution.',
    '',
    '[facet]',
    `name = ${JSON.stringify(safeDraft.gameTitle || 'untitled-game')}`,
    'kind = "game_runtime"',
    `runtime = ${JSON.stringify(safeDraft.runtime)}`,
    `engine = ${JSON.stringify(safeDraft.engine)}`,
    `platform = ${JSON.stringify(safeDraft.platformMode)}`,
    `execution_mode = ${JSON.stringify(safeDraft.executionMode)}`,
    `sandbox = ${JSON.stringify(safeDraft.sandboxMode)}`,
    `policy = ${JSON.stringify(safeDraft.policyMode)}`,
    'deny_by_default = true',
    '',
    '[routes]',
    `allowed = ${lineArray(safeStats.allowedRoutes)}`,
    '',
    '[actions]',
    `allowed = ${lineArray(safeStats.allowedActions)}`,
    `denied = ${lineArray(safeStats.deniedActions)}`,
    '',
    '[capabilities]',
    `required = ${lineArray(safeStats.requiredCapabilities)}`,
    '',
    '[limits]',
    `memory_mb = ${parsePositiveInt(safeDraft.memoryLimitMb, 256)}`,
    `cpu_ms = ${parsePositiveInt(safeDraft.cpuLimitMs, 500)}`,
    `save_kb = ${parsePositiveInt(safeDraft.saveLimitKb, 1024)}`,
    `output_kb = ${parsePositiveInt(safeDraft.outputLimitKb, 1024)}`,
    `request_limit = ${parsePositiveInt(safeDraft.requestLimit, 0)}`,
    '',
    '[permissions]',
    `network = ${JSON.stringify(safeDraft.networkPolicy)}`,
    `storage = ${JSON.stringify(safeDraft.storagePolicy)}`,
    `wallet = ${JSON.stringify(safeDraft.walletPolicy)}`,
    `profile = ${JSON.stringify(safeDraft.profilePolicy)}`,
    '',
    '[save_data]',
    `mode = ${JSON.stringify(safeDraft.saveDataPolicy)}`,
    `ownership = ${JSON.stringify(safeDraft.saveOwnership)}`,
    '',
    '[sessions]',
    `multiplayer = ${JSON.stringify(safeDraft.multiplayerPolicy)}`,
    `session_policy = ${JSON.stringify(safeDraft.sessionPolicy)}`,
    '',
    '[economy]',
    `mode = ${JSON.stringify(safeDraft.economyPolicy)}`,
    `access = ${JSON.stringify(safeDraft.accessMode)}`,
    `payout = ${JSON.stringify(safeDraft.payoutMode)}`,
    '',
  ].join('\n');
}

export function normalizeGameDraft(draft) {
  return {
    ...DEFAULT_GAME_DRAFT,
    ...(draft || {}),
  };
}

export function parseTags(input) {
  return String(input || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function parseList(value) {
  return String(value || '')
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
  return GAME_LINKED_ASSET_FIELDS.map((item) => ({
    role: item.role,
    crab_url: trimOrNull(draft[item.field]),
    expected_kind: item.expectedKind,
    backend_verified: false,
  })).filter((item) => Boolean(item.crab_url));
}

function parsePositiveInt(input, fallback) {
  const clean = String(input || '').trim();

  if (!/^\d+$/.test(clean)) {
    return fallback;
  }

  const value = Number(clean);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function estimateSafetyScore(draft, deniedActions, requiredCapabilities) {
  const checks = [
    draft.executionMode === 'not_executable_in_crablink' ||
      draft.executionMode === 'disabled_until_review',
    draft.sandboxMode === 'svc_sandbox_required_future' ||
      draft.sandboxMode === 'facet_contract_required_future',
    draft.policyMode === 'deny_by_default',
    draft.walletPolicy === 'none',
    draft.economyPolicy === 'no_in_game_spend_draft',
    deniedActions.length >= 5,
    requiredCapabilities.length > 0,
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