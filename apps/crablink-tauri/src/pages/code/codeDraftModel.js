/**
 * RO:WHAT — Local draft model for the React-owned crab://code workspace.
 * RO:WHY — CrabLink refactor; models code primitive and facet manifests without enabling execution.
 * RO:INTERACTS — CodePage.jsx, CodeDraft.jsx, CodeFacet.jsx, FacetContractPreview.jsx, useCreatorDraft.
 * RO:INVARIANTS — local draft only; no code fetch/eval/compile/instantiate; no sandbox launch; no b3 CID; no ROC spend.
 * RO:METRICS — none; future code/facet execution must be sandbox/accounting/policy observable.
 * RO:CONFIG — none; future runtime/policy config comes from backend route contracts.
 * RO:SECURITY — b3hash.code is only an address; facet.toml is the contract; svc-sandbox is the cage.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual crab://code route smoke.
 */

export const CODE_SCHEMA = 'crablink.local.code-primitive-draft.v1';

export const DEFAULT_CODE_DRAFT = Object.freeze({
  primitiveName: '',
  creatorDisplay: '',
  maintainerPassport: '',
  description: '',
  codeKind: 'reusable_ui_primitive',
  declaredRuntime: 'wasm_future',
  language: 'rust_wasm_future',
  sourceVisibility: 'manifest_visible_source_optional',
  executionMode: 'not_executable_in_crablink',
  sandboxMode: 'svc_sandbox_required_future',
  policyMode: 'deny_by_default',
  reviewMode: 'policy_review_required',
  codeBytesCrabUrl: '',
  codeManifestCrabUrl: '',
  facetTomlCrabUrl: '',
  docsCrabUrl: '',
  testReportCrabUrl: '',
  auditReportCrabUrl: '',
  examplePageCrabUrl: '',
  allowedRoutes: 'render, preview',
  allowedActions: 'render_static_ui',
  deniedActions:
    'eval, fetch_external_network, wallet_spend, profile_private_read, storage_write, background_run',
  requiredCapabilities: 'code:read, facet:preview',
  memoryLimitMb: '64',
  cpuLimitMs: '250',
  outputLimitKb: '256',
  requestLimit: '0',
  networkPolicy: 'none',
  storagePolicy: 'none',
  walletPolicy: 'none',
  profilePolicy: 'public_only',
  rightsMode: 'creator_owned_manifest',
  accessMode: 'public_manifest_preview',
  payoutMode: 'no_payout_draft',
  tags: 'code, facet, primitive',
});

export const CODE_VIEW_OPTIONS = Object.freeze([
  { value: 'builder', label: 'Builder' },
  { value: 'developer', label: 'Developer' },
]);

export const CODE_KIND_OPTIONS = Object.freeze([
  { value: 'reusable_ui_primitive', label: 'Reusable UI primitive' },
  { value: 'embed_renderer', label: 'Embed renderer' },
  { value: 'facet_module_future', label: 'Facet module future' },
  { value: 'validation_helper', label: 'Validation helper' },
  { value: 'site_component_future', label: 'Site component future' },
  { value: 'moderation_tool_future', label: 'Moderation tool future' },
]);

export const CODE_RUNTIME_OPTIONS = Object.freeze([
  { value: 'wasm_future', label: 'WASM future' },
  { value: 'javascript_future', label: 'JavaScript future' },
  { value: 'typescript_future', label: 'TypeScript future' },
  { value: 'lua_future', label: 'Lua future' },
  { value: 'manifest_only_no_runtime', label: 'Manifest only / no runtime' },
]);

export const CODE_LANGUAGE_OPTIONS = Object.freeze([
  { value: 'rust_wasm_future', label: 'Rust / WASM future' },
  { value: 'typescript_future', label: 'TypeScript future' },
  { value: 'javascript_future', label: 'JavaScript future' },
  { value: 'lua_future', label: 'Lua future' },
  { value: 'other_future', label: 'Other future' },
  { value: 'not_applicable', label: 'Not applicable' },
]);

export const CODE_SOURCE_OPTIONS = Object.freeze([
  { value: 'manifest_visible_source_optional', label: 'Manifest visible / source optional' },
  { value: 'open_source_future', label: 'Open source future' },
  { value: 'closed_source_reviewed_future', label: 'Closed source reviewed future' },
  { value: 'bytecode_only_future', label: 'Bytecode only future' },
]);

export const CODE_EXECUTION_OPTIONS = Object.freeze([
  { value: 'not_executable_in_crablink', label: 'Not executable in CrabLink' },
  { value: 'sandboxed_preview_future', label: 'Sandboxed preview future' },
  { value: 'server_side_sandbox_future', label: 'Server-side sandbox future' },
  { value: 'disabled_until_review', label: 'Disabled until review' },
]);

export const CODE_SANDBOX_OPTIONS = Object.freeze([
  { value: 'svc_sandbox_required_future', label: 'svc-sandbox required future' },
  { value: 'facet_contract_required_future', label: 'Facet contract required future' },
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'manifest_only_no_runtime', label: 'Manifest only / no runtime' },
]);

export const CODE_POLICY_OPTIONS = Object.freeze([
  { value: 'deny_by_default', label: 'Deny by default' },
  { value: 'allowlist_only_future', label: 'Allowlist only future' },
  { value: 'site_owner_policy_future', label: 'Site owner policy future' },
  { value: 'admin_review_required', label: 'Admin review required' },
]);

export const CODE_REVIEW_OPTIONS = Object.freeze([
  { value: 'policy_review_required', label: 'Policy review required' },
  { value: 'security_audit_required_future', label: 'Security audit required future' },
  { value: 'trusted_publisher_future', label: 'Trusted publisher future' },
  { value: 'experimental_draft_only', label: 'Experimental draft only' },
]);

export const CODE_NETWORK_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'crab_only_future', label: 'crab:// only future' },
  { value: 'gateway_only_future', label: 'Gateway only future' },
]);

export const CODE_STORAGE_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'read_public_assets_future', label: 'Read public assets future' },
  { value: 'draft_local_only_future', label: 'Draft local only future' },
]);

export const CODE_WALLET_OPTIONS = Object.freeze([
  { value: 'none', label: 'None' },
  { value: 'read_balance_future', label: 'Read balance future' },
  { value: 'explicit_user_confirmed_spend_future', label: 'Explicit confirmed spend future' },
]);

export const CODE_PROFILE_OPTIONS = Object.freeze([
  { value: 'public_only', label: 'Public only' },
  { value: 'current_passport_public_future', label: 'Current passport public future' },
  { value: 'none', label: 'None' },
]);

export const CODE_RIGHTS_OPTIONS = Object.freeze([
  { value: 'creator_owned_manifest', label: 'Creator-owned manifest' },
  { value: 'open_license_future', label: 'Open license future' },
  { value: 'restricted_use_future', label: 'Restricted use future' },
  { value: 'policy_review_required', label: 'Policy review required' },
]);

export const CODE_ACCESS_OPTIONS = Object.freeze([
  { value: 'public_manifest_preview', label: 'Public manifest preview' },
  { value: 'developer_preview_future', label: 'Developer preview future' },
  { value: 'site_admin_only_future', label: 'Site admin only future' },
  { value: 'private_draft', label: 'Private draft' },
]);

export const CODE_PAYOUT_OPTIONS = Object.freeze([
  { value: 'no_payout_draft', label: 'No payout draft' },
  { value: 'license_fee_future', label: 'License fee future' },
  { value: 'creator_split_future', label: 'Creator split future' },
  { value: 'facet_usage_reward_future', label: 'Facet usage reward future' },
]);

export const CODE_LINKED_ASSET_FIELDS = Object.freeze([
  {
    field: 'codeBytesCrabUrl',
    role: 'code_bytes',
    label: 'Code bytes crab URL',
    expectedKind: 'code',
    help: 'Future code bytes should be independently b3-addressed. This route never fetches or executes them.',
  },
  {
    field: 'codeManifestCrabUrl',
    role: 'code_manifest',
    label: 'Code manifest crab URL',
    expectedKind: 'manifest',
    help: 'Optional separate code manifest reference.',
  },
  {
    field: 'facetTomlCrabUrl',
    role: 'facet_contract',
    label: 'facet.toml crab URL',
    expectedKind: 'facet',
    help: 'Future permissions/sandbox contract. This draft only previews the idea.',
  },
  {
    field: 'docsCrabUrl',
    role: 'documentation',
    label: 'Documentation crab URL',
    expectedKind: 'article',
    help: 'Human-readable docs or usage notes.',
  },
  {
    field: 'testReportCrabUrl',
    role: 'test_report',
    label: 'Test report crab URL',
    expectedKind: 'article',
    help: 'Future test report or conformance artifact.',
  },
  {
    field: 'auditReportCrabUrl',
    role: 'audit_report',
    label: 'Audit report crab URL',
    expectedKind: 'article',
    help: 'Future security review or audit artifact.',
  },
  {
    field: 'examplePageCrabUrl',
    role: 'example_page',
    label: 'Example page crab URL',
    expectedKind: 'site_or_article',
    help: 'Optional example page where the primitive might be demonstrated later.',
  },
]);

export function buildCodeManifestDraft(draft, context = {}) {
  const safeDraft = normalizeCodeDraft(draft);
  const stats = statsForCodeDraft(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const creatorDisplay = trimOrNull(safeDraft.creatorDisplay);
  const facetToml = buildFacetToml(safeDraft, stats);

  return {
    schema: CODE_SCHEMA,
    route: 'crab://code',
    asset_kind: 'code_primitive',
    local_workspace: true,
    generated_by: 'CrabLink React code primitive workspace',
    route_context: {
      requested_url: context?.route?.url || context?.route?.rawUrl || 'crab://code',
      route_kind: context?.route?.kind || 'code',
    },
    identity: {
      primitive_name: trimOrNull(safeDraft.primitiveName),
      creator_display: creatorDisplay,
      maintainer_passport_hint: trimOrNull(safeDraft.maintainerPassport),
      local_operator_passport_hint: context?.app?.settings?.passportSubject || null,
      backend_confirmed: false,
    },
    metadata: {
      description: trimOrNull(safeDraft.description),
      code_kind: safeDraft.codeKind,
      declared_runtime: safeDraft.declaredRuntime,
      language: safeDraft.language,
      source_visibility: safeDraft.sourceVisibility,
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
    execution_policy: {
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
      memory_mb: parsePositiveInt(safeDraft.memoryLimitMb, 64),
      cpu_ms: parsePositiveInt(safeDraft.cpuLimitMs, 250),
      output_kb: parsePositiveInt(safeDraft.outputLimitKb, 256),
      request_limit: parsePositiveInt(safeDraft.requestLimit, 0),
    },
    rights_policy: {
      mode: safeDraft.rightsMode,
      note: 'Local planning field only until backend code/facet contracts exist.',
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
        label: 'v0.1-local',
        local_only: true,
        backend_verified: false,
      },
    ],
    receipts: [],
    provenance: {
      created_by: 'CrabLink React local draft',
      source: 'crab://code workspace',
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
      fetches_code_bytes: false,
      compiles_code: false,
      evaluates_code: false,
      instantiates_wasm: false,
      executes_code: false,
      launches_sandbox: false,
      grants_capabilities: false,
      mutates_wallet: false,
    },
  };
}

export function statsForCodeDraft(draft) {
  const safeDraft = normalizeCodeDraft(draft);
  const allowedRoutes = parseList(safeDraft.allowedRoutes);
  const allowedActions = parseList(safeDraft.allowedActions);
  const deniedActions = parseList(safeDraft.deniedActions);
  const requiredCapabilities = parseList(safeDraft.requiredCapabilities);
  const linkedAssets = buildLinkedAssets(safeDraft);
  const tags = parseTags(safeDraft.tags);
  const text = [
    safeDraft.primitiveName,
    safeDraft.creatorDisplay,
    safeDraft.description,
    safeDraft.allowedRoutes,
    safeDraft.allowedActions,
    safeDraft.deniedActions,
    safeDraft.requiredCapabilities,
    ...CODE_LINKED_ASSET_FIELDS.map((item) => safeDraft[item.field]),
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

export function getCodeCompleteness(draft) {
  const safeDraft = normalizeCodeDraft(draft);
  const checks = [
    safeDraft.primitiveName.trim(),
    safeDraft.creatorDisplay.trim(),
    safeDraft.description.trim(),
    safeDraft.codeKind,
    safeDraft.declaredRuntime,
    safeDraft.language,
    safeDraft.executionMode,
    safeDraft.sandboxMode,
    safeDraft.policyMode,
    safeDraft.reviewMode,
    safeDraft.allowedRoutes.trim(),
    safeDraft.allowedActions.trim(),
    safeDraft.deniedActions.trim(),
    safeDraft.requiredCapabilities.trim(),
    safeDraft.networkPolicy,
    safeDraft.storagePolicy,
    safeDraft.walletPolicy,
    safeDraft.profilePolicy,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

export function buildFacetToml(draft, stats) {
  const safeDraft = normalizeCodeDraft(draft);
  const safeStats = stats || statsForCodeDraft(safeDraft);
  const lineArray = (values) => `[${values.map((value) => JSON.stringify(value)).join(', ')}]`;

  return [
    '# facet.toml preview generated by CrabLink local draft UI',
    '# This is not backend truth and does not authorize execution.',
    '',
    '[facet]',
    `name = ${JSON.stringify(safeDraft.primitiveName || 'untitled-code-primitive')}`,
    `kind = ${JSON.stringify(safeDraft.codeKind)}`,
    `runtime = ${JSON.stringify(safeDraft.declaredRuntime)}`,
    `language = ${JSON.stringify(safeDraft.language)}`,
    `source_visibility = ${JSON.stringify(safeDraft.sourceVisibility)}`,
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
    `memory_mb = ${parsePositiveInt(safeDraft.memoryLimitMb, 64)}`,
    `cpu_ms = ${parsePositiveInt(safeDraft.cpuLimitMs, 250)}`,
    `output_kb = ${parsePositiveInt(safeDraft.outputLimitKb, 256)}`,
    `request_limit = ${parsePositiveInt(safeDraft.requestLimit, 0)}`,
    '',
    '[permissions]',
    `network = ${JSON.stringify(safeDraft.networkPolicy)}`,
    `storage = ${JSON.stringify(safeDraft.storagePolicy)}`,
    `wallet = ${JSON.stringify(safeDraft.walletPolicy)}`,
    `profile = ${JSON.stringify(safeDraft.profilePolicy)}`,
    '',
  ].join('\n');
}

export function normalizeCodeDraft(draft) {
  return {
    ...DEFAULT_CODE_DRAFT,
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
  return CODE_LINKED_ASSET_FIELDS.map((item) => ({
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
    draft.networkPolicy === 'none',
    draft.walletPolicy === 'none',
    deniedActions.length >= 4,
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