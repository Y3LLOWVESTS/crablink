#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain Phase 5 Round 2 DA/archive/challenge fallback boundary scanner.
 * RO:WHY — Prevents DA/archive/challenge display/status work from becoming client-side DA truth, archive truth, challenge truth, pruning, settlement, finality, bridge, wallet, ledger, balance, receipt, or paid-unlock authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, Tauri command bridge, typed adapters, paid/cache surfaces, Phase 5 docs, Tauri park gate.
 * RO:INVARIANTS — display-only DA/archive/challenge metadata; backend-derived status only; pruning blocked; no paid unlock from DA/archive/challenge/cache metadata.
 * RO:SECURITY — rejects authority-shaped command names, routes, dependencies, unsafe invokes, pruning authority, and paid unlocks from DA/archive/challenge evidence.
 * RO:TEST — node scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const DOC = 'docs/tauri/QUICKCHAIN_PHASE5_CLIENT_DA_FALLBACK_BOUNDARY.md';
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
  'QuickChain Phase 5 Round 2',
  'DA/archive/challenge fallback',
  'DA evidence is display-only',
  'archive restore evidence is display-only',
  'missing-data challenge evidence is display-only',
  'retention windows are display-only metadata',
  'pruning remains blocked',
  'DA/archive/challenge evidence does not unlock paid content',
  'no client-side paid unlock from DA/archive/challenge evidence',
  'prepare / quote',
  'backend wallet path',
  'backend receipt / access response',
  'CrabLink = display/user intent only',
  'Phase 5 Round 2 complete',
  'DA/archive/challenge fallback boundary sweep complete',
];

const REQUIRED_PAGE_PHRASES = [
  'crablink.quickchain-phase5-da-fallback-boundary.v1',
  'Phase 5 Round 2: DA/archive/challenge fallback',
  'backend-derived DA/archive/challenge evidence/status',
  'display-only DA/archive/challenge metadata',
  'retention-window display metadata',
  'pruning remains blocked',
  'no DA truth',
  'no archive restore truth',
  'no missing-data challenge truth',
  'no pruning authority',
  'no paid unlock from DA/archive/challenge evidence',
  'accepted wallet/ledger receipts remain the only paid unlock authority',
];

const REQUIRED_PACKAGE_PHRASES = [
  'check:quickchain-phase5-da-fallback-boundary',
  '../../scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs',
];

const REQUIRED_CHECK_TAURI_PHRASES = [
  'npm run check:quickchain-phase5-da-fallback-boundary',
];

const REQUIRED_PARK_PHRASES = [
  'CrabLink Tauri QuickChain Phase 5 Round 2 DA/archive/challenge fallback client parking gate passed',
  'DA/archive/challenge fallback client boundary complete',
  'QuickChain Phase 5 Round 2 complete',
  'DA/archive/challenge fallback boundary sweep complete',
];

const REQUIRED_CODEBUNDLE_PHRASES = [
  'check-quickchain-phase5-client-da-fallback-boundary.mjs',
];

const SCAN_DIRS = [
  'apps/crablink-tauri/src',
  'apps/crablink-tauri/src-tauri/src',
  'apps/crablink-tauri/src-tauri/capabilities',
  'packages/crablink-core/src',
  'packages/crablink-platform/src',
];

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.rs',
  '.json',
  '.jsonc',
  '.toml',
  '.md',
  '.css',
  '.html',
  '.sh',
]);

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'target',
  'gen',
  '.tauri',
  '.vite',
  '.turbo',
  'dump',
]);

const FORBIDDEN_AUTHORITY_PATTERNS = [
  /\b(?:daAuthority|daTruth|dataAvailabilityTruth|dataAvailabilityAuthority|archiveRestoreTruth|archiveRestoreAuthority|archiveProofTruth|carrierProofAuthority|missingDataChallengeTruth|missingDataChallengeAuthority|challengeAdjudicationTruth|retentionWindowAuthority|pruningTruth|pruningAuthority|pruningApproved|pruneNow|daPaidUnlock|archivePaidUnlock|outsideDaTruth|outsideChainRocTruth|settleFromDa|finalizeFromDa|unlockFromDa|unlockFromArchive|unlockFromChallenge|walletMutationFromDa|ledgerMutationFromDa|balanceFromDa|receiptFromDa)\b/,
  /(?:^|[^\w])(?:da_authority|da_truth|data_availability_truth|data_availability_authority|archive_restore_truth|archive_restore_authority|archive_proof_truth|carrier_proof_authority|missing_data_challenge_truth|missing_data_challenge_authority|challenge_adjudication_truth|retention_window_authority|pruning_truth|pruning_authority|pruning_approved|prune_now|da_paid_unlock|archive_paid_unlock|outside_da_truth|outside_chain_roc_truth|settle_from_da|finalize_from_da|unlock_from_da|unlock_from_archive|unlock_from_challenge|wallet_mutation_from_da|ledger_mutation_from_da|balance_from_da|receipt_from_da)(?:[^\w]|$)/,
  /\b(?:solanaRuntime|roxRuntime|bridgeSettlement|externalSettlement|mintRox|createLiquidityPool|openStakingMarket)\b/,
  /(?:^|[^\w])(?:solana_runtime|rox_runtime|bridge_settlement|external_settlement|mint_rox|create_liquidity_pool|open_staking_market)(?:[^\w]|$)/,
];

const FORBIDDEN_INVOKE_RE =
  /\binvoke\s*\(\s*['"`](?:da|archive|carrier|missing_data|challenge|retention|prune|pruning|bridge|solana|rox|settle|finalize|wallet_mutate_from_da|ledger_mutate_from_da)[_-]/i;

const FORBIDDEN_ROUTE_RE =
  /['"`]\/(?:da|data-availability|archive|carrier|missing-data|challenge|retention|prune|pruning|bridge|settlement)\/(?:commit|submit|settle|finalize|verify|mint|bridge|unlock|receipt|balance|approve|execute|restore|accept)\b/i;

const FORBIDDEN_PACKAGE_RE =
  /(?:@solana|solana-web3|mainnet-beta\.solana|api\.solana|external-settlement|bridge-proof|staking-market|liquidity-pool|mint-rox|rox-runtime|external-da-runtime|pruning-runtime)/i;

const PACKAGE_REFERENCE_CONTEXT_RE =
  /\b(?:import\s+.*from|import\s*\(|require\s*\(|dependencies|devDependencies|optionalDependencies|peerDependencies|package-lock|resolved|integrity|registry|https?:\/\/|npm:|pnpm:|yarn:)\b/i;

const PAID_UNLOCK_DA_FALLBACK_RE =
  /\b(?:canAccess|hasAccess|isUnlocked|authorized|entitled|unlock|grantAccess|paidAccess)\b[\s\S]{0,220}\b(?:daEvidence|daStatus|dataAvailability|archiveEvidence|archiveStatus|archiveRestore|missingData|challengeEvidence|retentionWindow|pruningBlocked|pruningStatus)\b/i;

const PAGE_FORBIDDEN_IMPORTS = [
  'gatewayClient',
  'walletClient',
  'contentViewClient',
  'siteVisitClient',
  '@tauri-apps/api/core',
  '@tauri-apps/api/tauri',
  'invoke(',
];

function fail(message) {
  console.error(`QuickChain Phase 5 DA/archive/challenge client boundary check failed: ${message}`);
  process.exit(1);
}

function rel(file) {
  return file.split(path.sep).join('/');
}

function abs(file) {
  return path.join(ROOT, file);
}

function readRequired(file) {
  const filePath = abs(file);

  if (!fs.existsSync(filePath)) {
    fail(`missing required file: ${file}`);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(text, phrase, source) {
  if (!text.includes(phrase)) {
    fail(`${source} missing required phrase: ${phrase}`);
  }
}

function hasForbiddenExternalPackageReference(text) {
  return text
    .split(/\r?\n/)
    .some((line) => {
      if (!FORBIDDEN_PACKAGE_RE.test(line)) {
        return false;
      }

      const trimmed = line.trim();

      if (
        trimmed.startsWith('*') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('RO:') ||
        trimmed.startsWith('RO:SECURITY') ||
        trimmed.startsWith('RO:INVARIANTS')
      ) {
        return false;
      }

      return PACKAGE_REFERENCE_CONTEXT_RE.test(line);
    });
}

function walk(dir) {
  const dirPath = abs(dir);

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const out = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    const entryRel = rel(path.relative(ROOT, entryPath));

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        out.push(...walk(entryRel));
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(ext)) {
      out.push(entryRel);
    }
  }

  return out;
}

for (const file of REQUIRED_FILES) {
  readRequired(file);
}

const doc = readRequired(DOC);
for (const phrase of REQUIRED_DOC_PHRASES) {
  assertIncludes(doc, phrase, DOC);
}

const page = readRequired(PAGE);
for (const phrase of REQUIRED_PAGE_PHRASES) {
  assertIncludes(page, phrase, PAGE);
}

for (const phrase of PAGE_FORBIDDEN_IMPORTS) {
  if (page.includes(phrase)) {
    fail(`${PAGE} imports or invokes authority surface: ${phrase}`);
  }
}

for (const phrase of ['readLocalCatalog', 'readRecentReceipts', 'subscribeLocalCatalog', 'subscribeRecentReceipts']) {
  assertIncludes(page, phrase, PAGE);
}

const appPackageText = readRequired(APP_PACKAGE);
for (const phrase of REQUIRED_PACKAGE_PHRASES) {
  assertIncludes(appPackageText, phrase, APP_PACKAGE);
}

let appPackage;
try {
  appPackage = JSON.parse(appPackageText);
} catch (error) {
  fail(`${APP_PACKAGE} is not valid JSON: ${error.message}`);
}

if (
  !appPackage.scripts ||
  appPackage.scripts['check:quickchain-phase5-da-fallback-boundary'] !==
    'node ../../scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs'
) {
  fail(`${APP_PACKAGE} does not define check:quickchain-phase5-da-fallback-boundary correctly`);
}

if (!String(appPackage.scripts.check || '').includes('check:quickchain-phase5-da-fallback-boundary')) {
  fail(`${APP_PACKAGE} aggregate check script does not include Phase 5 DA/archive/challenge boundary`);
}

const checkTauri = readRequired(CHECK_TAURI);
for (const phrase of REQUIRED_CHECK_TAURI_PHRASES) {
  assertIncludes(checkTauri, phrase, CHECK_TAURI);
}

const park = readRequired(PARK);
for (const phrase of REQUIRED_PARK_PHRASES) {
  assertIncludes(park, phrase, PARK);
}

const codebundle = readRequired(CODEBUNDLE);
for (const phrase of REQUIRED_CODEBUNDLE_PHRASES) {
  assertIncludes(codebundle, phrase, CODEBUNDLE);
}

const scanFiles = SCAN_DIRS.flatMap(walk);

for (const file of scanFiles) {
  const text = fs.readFileSync(abs(file), 'utf8');

  for (const pattern of FORBIDDEN_AUTHORITY_PATTERNS) {
    if (pattern.test(text)) {
      fail(`${file} contains Phase 5 DA/archive/challenge authority-shaped pattern: ${pattern}`);
    }
  }

  if (FORBIDDEN_INVOKE_RE.test(text)) {
    fail(`${file} contains forbidden DA/archive/challenge/pruning invoke surface`);
  }

  if (FORBIDDEN_ROUTE_RE.test(text)) {
    fail(`${file} contains forbidden DA/archive/challenge/pruning authority route`);
  }

  if (hasForbiddenExternalPackageReference(text)) {
    fail(`${file} contains forbidden external-chain/bridge/staking/liquidity/pruning package reference`);
  }

  const highRiskPaidSurface =
    file.includes('/pages/asset/') ||
    file.includes('/pages/site/') ||
    file.includes('/shared/api/') ||
    file.includes('/shared/receipts/') ||
    file.includes('/shared/catalog/');

  if (file !== PAGE && highRiskPaidSurface && PAID_UNLOCK_DA_FALLBACK_RE.test(text)) {
    fail(`${file} appears to couple paid unlock/access logic to DA/archive/challenge/pruning evidence/status`);
  }
}

console.log('QuickChain Phase 5 DA/archive/challenge client boundary check passed.');
