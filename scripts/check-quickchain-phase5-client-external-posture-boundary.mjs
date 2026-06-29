#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain Phase 5 Round 3 chosen external posture boundary scanner.
 * RO:WHY — Prevents selected external posture display/status from becoming external settlement, bridge, finality, wallet, ledger, balance, receipt, or paid-unlock authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, Tauri command bridge, typed adapters, paid/cache surfaces, Phase 5 docs, Tauri park gate.
 * RO:INVARIANTS — display-only external posture metadata; backend-derived status only; anchor-only/evidence-only posture; no paid unlock from external posture evidence.
 * RO:SECURITY — rejects authority-shaped command names, routes, dependencies, unsafe invokes, bridge/settlement/runtime creep, and paid unlocks from external posture evidence.
 * RO:TEST — node scripts/check-quickchain-phase5-client-external-posture-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = 'docs/tauri/QUICKCHAIN_PHASE5_CLIENT_EXTERNAL_POSTURE_BOUNDARY.md';
const PAGE = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const APP_PACKAGE = 'apps/crablink-tauri/package.json';
const CHECK_TAURI = 'scripts/check-tauri.sh';
const PARK = 'scripts/dev-quickchain-tauri-park.sh';
const CODEBUNDLE = 'scripts/make_codebundle.sh';

const REQUIRED_FILES = [
  DOC,
  PAGE,
  APP_PACKAGE,
  CHECK_TAURI,
  PARK,
  CODEBUNDLE,
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
  'apps/crablink-tauri/src-tauri/src/lib.rs',
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
  'apps/crablink-tauri/src-tauri/capabilities/default.json',
];

const REQUIRED_DOC_PHRASES = [
  'QuickChain Phase 5 Round 3',
  'chosen external integration path',
  'selected external posture is display-only',
  'external posture evidence is display-only',
  'external integration is evidence/anchoring only',
  'internal wallet/ledger truth remains canonical',
  'external posture evidence does not unlock paid content',
  'no client-side paid unlock from external posture evidence',
  'anchor-only is the selected posture',
  'prepare / quote',
  'backend wallet path',
  'backend receipt / access response',
  'CrabLink = display/user intent only',
  'QuickChain Phase 5 Round 3 complete',
  'selected external integration posture boundary sweep complete',
  'QuickChain Phase 5 complete',
  'external anchoring/decentralization option complete',
];

const REQUIRED_PAGE_PHRASES = [
  'crablink.quickchain-phase5-external-posture-boundary.v1',
  'Phase 5 Round 3: chosen external integration posture',
  'backend-derived external posture evidence/status',
  'display-only external posture metadata',
  'anchor-only is the selected external posture',
  'external integration is evidence/anchoring only',
  'internal wallet/ledger truth remains canonical',
  'no external posture authority',
  'no paid unlock from external posture evidence',
  'accepted wallet/ledger receipts remain the only paid unlock authority',
];

const REQUIRED_PACKAGE_PHRASES = [
  'check:quickchain-phase5-external-posture-boundary',
  '../../scripts/check-quickchain-phase5-client-external-posture-boundary.mjs',
];

const REQUIRED_CHECK_TAURI_PHRASES = ['npm run check:quickchain-phase5-external-posture-boundary'];

const REQUIRED_PARK_PHRASES = [
  'CrabLink Tauri QuickChain Phase 5 Round 3 selected external posture client parking gate passed',
  'selected external posture client boundary complete',
  'QuickChain Phase 5 Round 3 complete',
  'selected external integration posture boundary sweep complete',
  'QuickChain Phase 5 complete',
  'external anchoring/decentralization option complete',
];

const SCAN_DIRS = [
  'apps/crablink-tauri/src',
  'apps/crablink-tauri/src-tauri/src',
  'apps/crablink-tauri/src-tauri/capabilities',
  'packages/crablink-core/src',
  'packages/crablink-platform/src',
];

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.rs', '.json', '.jsonc', '.toml', '.md', '.css', '.html', '.sh']);
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'target', 'gen', '.tauri', '.vite', '.turbo', 'dump']);

const FORBIDDEN_AUTHORITY_PATTERNS = [
  /\b(?:externalPostureAuthority|externalPostureTruth|externalIntegrationAuthority|externalSettlementTruth|externalFinalityTruth|bridgeTruthFromExternalPosture|walletMutationFromExternalPosture|ledgerMutationFromExternalPosture|balanceFromExternalPosture|receiptFromExternalPosture|paidUnlockFromExternalPosture|externalChainRocTruth|outsideProgramRocTruth|settleFromExternalPosture|finalizeFromExternalPosture|unlockFromExternalPosture|bridgeFromExternalPosture)\b/,
  /(?:^|[^\w])(?:external_posture_authority|external_posture_truth|external_integration_authority|external_settlement_truth|external_finality_truth|bridge_truth_from_external_posture|wallet_mutation_from_external_posture|ledger_mutation_from_external_posture|balance_from_external_posture|receipt_from_external_posture|paid_unlock_from_external_posture|external_chain_roc_truth|outside_program_roc_truth|settle_from_external_posture|finalize_from_external_posture|unlock_from_external_posture|bridge_from_external_posture)(?:[^\w]|$)/,
  /\b(?:solanaRuntime|roxRuntime|bridgeSettlement|externalSettlement|mintRox|createLiquidityPool|openStakingMarket|externalDaRuntime|externalL2Runtime)\b/,
  /(?:^|[^\w])(?:solana_runtime|rox_runtime|bridge_settlement|external_settlement|mint_rox|create_liquidity_pool|open_staking_market|external_da_runtime|external_l2_runtime)(?:[^\w]|$)/,
];

const FORBIDDEN_INVOKE_RE = /\binvoke\s*\(\s*['"`](?:external_posture|external|anchor_settle|bridge|solana|rox|settle|finalize|wallet_mutate_from_external_posture|ledger_mutate_from_external_posture)[_-]/i;
const FORBIDDEN_ROUTE_RE = /['"`]\/(?:external-posture|external|bridge|settlement|rox|solana)\/(?:commit|submit|settle|finalize|verify|mint|bridge|unlock|receipt|balance|approve|execute|restore|accept)\b/i;
const FORBIDDEN_PACKAGE_RE = /(?:@solana|solana-web3|mainnet-beta\.solana|api\.solana|external-settlement|bridge-proof|staking-market|liquidity-pool|mint-rox|rox-runtime|external-da-runtime|external-l2-runtime|rollup-settlement-runtime)/i;
const PACKAGE_REFERENCE_CONTEXT_RE = /\b(?:import\s+.*from|import\s*\(|require\s*\(|dependencies|devDependencies|optionalDependencies|peerDependencies|package-lock|resolved|integrity|registry|https?:\/\/|npm:|pnpm:|yarn:)\b/i;
const PAID_UNLOCK_EXTERNAL_POSTURE_RE = /\b(?:canAccess|hasAccess|isUnlocked|authorized|entitled|unlock|grantAccess|paidAccess)\b[\s\S]{0,240}\b(?:externalPosture|externalEvidence|externalStatus|externalIntegration|bridgeEvidence|settlementEvidence|outsideProgram|anchorOnlyPosture)\b/i;
const PAGE_FORBIDDEN_IMPORTS = ['gatewayClient', 'walletClient', 'contentViewClient', 'siteVisitClient', '@tauri-apps/api/core', '@tauri-apps/api/tauri', 'invoke('];

function fail(message) {
  console.error(`QuickChain Phase 5 external posture client boundary check failed: ${message}`);
  process.exit(1);
}

function abs(file) {
  return path.join(ROOT, file);
}

function readRequired(file) {
  const filePath = abs(file);
  if (!fs.existsSync(filePath)) fail(`missing required file: ${file}`);
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, phrase, source) {
  if (!text.includes(phrase)) fail(`${source} missing required phrase: ${phrase}`);
}

function hasForbiddenExternalPackageReference(text) {
  return text.split(/\r?\n/).some((line) => {
    if (!FORBIDDEN_PACKAGE_RE.test(line)) return false;
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('RO:')) return false;
    return PACKAGE_REFERENCE_CONTEXT_RE.test(line);
  });
}

function rel(file) {
  return file.split(path.sep).join('/');
}

function walk(dir) {
  const dirPath = abs(dir);
  if (!fs.existsSync(dirPath)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    const entryRel = rel(path.relative(ROOT, entryPath));
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) out.push(...walk(entryRel));
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(entryRel);
  }
  return out;
}

for (const file of REQUIRED_FILES) readRequired(file);

const doc = readRequired(DOC);
for (const phrase of REQUIRED_DOC_PHRASES) assertIncludes(doc, phrase, DOC);

const page = readRequired(PAGE);
for (const phrase of REQUIRED_PAGE_PHRASES) assertIncludes(page, phrase, PAGE);
for (const phrase of PAGE_FORBIDDEN_IMPORTS) if (page.includes(phrase)) fail(`${PAGE} imports or invokes authority surface: ${phrase}`);
for (const phrase of ['readLocalCatalog', 'readRecentReceipts', 'subscribeLocalCatalog', 'subscribeRecentReceipts']) assertIncludes(page, phrase, PAGE);

const appPackageText = readRequired(APP_PACKAGE);
for (const phrase of REQUIRED_PACKAGE_PHRASES) assertIncludes(appPackageText, phrase, APP_PACKAGE);
let appPackage;
try {
  appPackage = JSON.parse(appPackageText);
} catch (error) {
  fail(`${APP_PACKAGE} is not valid JSON: ${error.message}`);
}
if (appPackage.scripts?.['check:quickchain-phase5-external-posture-boundary'] !== 'node ../../scripts/check-quickchain-phase5-client-external-posture-boundary.mjs') {
  fail(`${APP_PACKAGE} does not define check:quickchain-phase5-external-posture-boundary correctly`);
}
if (!String(appPackage.scripts.check || '').includes('check:quickchain-phase5-external-posture-boundary')) fail(`${APP_PACKAGE} aggregate check script does not include Phase 5 external posture boundary`);

const checkTauri = readRequired(CHECK_TAURI);
for (const phrase of REQUIRED_CHECK_TAURI_PHRASES) assertIncludes(checkTauri, phrase, CHECK_TAURI);
const park = readRequired(PARK);
for (const phrase of REQUIRED_PARK_PHRASES) assertIncludes(park, phrase, PARK);
assertIncludes(readRequired(CODEBUNDLE), 'check-quickchain-phase5-client-external-posture-boundary.mjs', CODEBUNDLE);

for (const file of SCAN_DIRS.flatMap(walk)) {
  const text = fs.readFileSync(abs(file), 'utf8');
  for (const pattern of FORBIDDEN_AUTHORITY_PATTERNS) if (pattern.test(text)) fail(`${file} contains Phase 5 external posture authority-shaped pattern: ${pattern}`);
  if (FORBIDDEN_INVOKE_RE.test(text)) fail(`${file} contains forbidden external posture/bridge/settlement invoke surface`);
  if (FORBIDDEN_ROUTE_RE.test(text)) fail(`${file} contains forbidden external posture/bridge/settlement authority route`);
  if (hasForbiddenExternalPackageReference(text)) fail(`${file} contains forbidden external-chain/bridge/staking/liquidity/runtime package reference`);
  const highRiskPaidSurface = file.includes('/pages/asset/') || file.includes('/pages/site/') || file.includes('/shared/api/') || file.includes('/shared/receipts/') || file.includes('/shared/catalog/');
  if (file !== PAGE && highRiskPaidSurface && PAID_UNLOCK_EXTERNAL_POSTURE_RE.test(text)) fail(`${file} appears to couple paid unlock/access logic to external posture evidence/status`);
}

console.log('QuickChain Phase 5 external posture client boundary check passed.');
