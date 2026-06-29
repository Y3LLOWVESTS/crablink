#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain Phase 4 Round 3 controlled bond-enforcement boundary scanner.
 * RO:WHY — Prevents final Phase 4 UI/status work from becoming client-side bond, slash-reserve, wallet, ledger, paid-unlock, bridge, or settlement authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, Tauri command bridge, typed adapters, paid/cache surfaces, Phase 4 docs, Tauri park gate.
 * RO:INVARIANTS — display-only enforcement labels; backend-derived status only; no client enforcement/capture/release/slash authority; no fake receipt/balance/finality.
 * RO:SECURITY — rejects authority-shaped command names, routes, dependencies, and paid unlocks from enforcement/policy/index/cache metadata.
 * RO:TEST — node scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const DOC = 'docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_ENFORCEMENT_BOUNDARY.md';
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
  'QuickChain Phase 4 Round 3',
  'controlled live bond enforcement',
  'display-only bond enforcement status',
  'backend-derived bond enforcement/capture/release status',
  'no client-side bond enforcement truth',
  'no reserve-slash authority',
  'no capture authority',
  'no release authority',
  'no paid unlock from bond enforcement, slash reserve, capture, release, policy, index, cache, localStorage, or sessionStorage',
  'svc-wallet remains the mutation front-door',
  'ron-ledger remains durable economic truth',
  'QuickChain Phase 4 complete',
  'internal bonded validator model complete',
];

const REQUIRED_PAGE_PHRASES = [
  'crablink.quickchain-phase4-bond-enforcement-boundary.v1',
  'Phase 4 Round 3: controlled live bond enforcement',
  'display-only bond enforcement status',
  'backend-derived bond enforcement/capture/release status',
  'no client-side bond enforcement truth',
  'no reserve-slash authority',
  'no capture authority',
  'no release authority',
  'accepted wallet/ledger receipts remain the only paid unlock authority',
  'QuickChain Phase 4 complete',
  'internal bonded validator model complete',
];

const SCAN_DIRS = [
  'apps/crablink-tauri/src',
  'apps/crablink-tauri/src-tauri/src',
  'apps/crablink-tauri/src-tauri/capabilities',
  'packages/crablink-core/src',
  'packages/crablink-platform/src',
];

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.rs', '.json', '.jsonc', '.toml', '.md', '.css', '.html', '.sh',
]);

const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', 'target', 'gen', '.tauri', '.vite', '.turbo', 'dump',
]);

const FORBIDDEN_COMMAND_NAME_RE = /(?:^|_)(?:execute[_-]?bond[_-]?enforcement|commit[_-]?bond[_-]?enforcement|enforce[_-]?bond|reserve[_-]?slash|create[_-]?slash[_-]?reserve|capture[_-]?slash[_-]?reserve|release[_-]?slash[_-]?reserve|capture[_-]?validator[_-]?bond|release[_-]?validator[_-]?bond|slash[_-]?validator|controlled[_-]?slash|execute[_-]?controlled[_-]?slash|commit[_-]?controlled[_-]?slash|create[_-]?validator[_-]?consequence|create[_-]?finality|create[_-]?settlement[_-]?truth|create[_-]?paid[_-]?unlock[_-]?truth|unlock[_-]?from[_-]?bond[_-]?enforcement|unlock[_-]?from[_-]?slash[_-]?reserve|unlock[_-]?from[_-]?policy[_-]?allow|unlock[_-]?from[_-]?index[_-]?pointer|unlock[_-]?from[_-]?cache|open[_-]?staking[_-]?market|create[_-]?staking[_-]?market|create[_-]?liquidity[_-]?pool|grant[_-]?liquidity[_-]?authority|bridge[_-]?settlement|external[_-]?settlement|solana[_-]?settlement|mint[_-]?rox)(?:_|$)/i;
const FORBIDDEN_CAMEL_AUTHORITY_RE = /\b(?:executeBondEnforcement|commitBondEnforcement|enforceBond|reserveSlash|createSlashReserve|captureSlashReserve|releaseSlashReserve|captureValidatorBond|releaseValidatorBond|slashValidator|controlledSlash|executeControlledSlash|commitControlledSlash|createValidatorConsequence|createFinality|createSettlementTruth|createPaidUnlockTruth|unlockFromBondEnforcement|unlockFromSlashReserve|unlockFromPolicyAllow|unlockFromIndexPointer|unlockFromCache|openStakingMarket|createStakingMarket|createLiquidityPool|grantLiquidityAuthority|bridgeSettlement|externalSettlement|solanaSettlement|mintRox)\b/;
const FORBIDDEN_ROUTE_RE = /['"`]\/(?:quickchain|bond|bonds|validator|validators|slash|slashing|staking|liquidity|bridge|settlement)\/(?:enforce|enforcement|reserve|capture|release|slash|controlled-slash|finality|settle|settlement|bridge|stake|staking|liquidity)\b/i;
const FORBIDDEN_PACKAGE_RE = /(?:@solana|solana-web3|mainnet-beta\.solana|api\.solana|external-settlement|bridge-proof|staking-market|liquidity-pool|mint-rox|rox-runtime)/i;
const FORBIDDEN_PERMISSION_RE = /(?:shell|process|global-shortcut|fs:default|http:default|http:allow|opener:default)/i;

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!exists(file)) {
    failures.push(`missing required Phase 4 Round 3 client boundary file: ${file}`);
  }
}

const docText = read(DOC);
const pageText = read(PAGE);
const appPackageText = read(APP_PACKAGE);
const checkTauriText = read(CHECK_TAURI);
const parkText = read(PARK);
const codebundleText = read(CODEBUNDLE);

requirePhrases(DOC, docText, REQUIRED_DOC_PHRASES);
requirePhrases(PAGE, pageText, REQUIRED_PAGE_PHRASES);

for (const required of [
  'check:quickchain-phase4-bond-enforcement-boundary',
  'check-quickchain-phase4-client-bond-enforcement-boundary.mjs',
]) {
  if (!appPackageText.includes(required)) {
    failures.push(`${APP_PACKAGE} must include: ${required}`);
  }
}

if (!checkTauriText.includes('npm run check:quickchain-phase4-bond-enforcement-boundary')) {
  failures.push(`${CHECK_TAURI} must run check:quickchain-phase4-bond-enforcement-boundary`);
}

for (const required of [
  'CrabLink Tauri QuickChain Phase 4 Round 3 bond enforcement client parking gate passed',
  'controlled live bond enforcement client boundary complete',
  'QuickChain Phase 4 complete',
  'internal bonded validator model complete',
  'CrabLink Tauri + client adapters are 100% COMPLETE / PARKED for QuickChain Phase 4',
]) {
  if (!parkText.includes(required)) {
    failures.push(`${PARK} must include final Phase 4 closeout label: ${required}`);
  }
}

if (!codebundleText.includes('check-quickchain-phase4-client-bond-enforcement-boundary.mjs')) {
  failures.push(`${CODEBUNDLE} must include the Phase 4 Round 3 checker in selected scripts / scope`);
}

checkReadinessPageIsDisplayOnly(pageText);

for (const file of collectFiles(SCAN_DIRS)) {
  const rel = normalizeRel(path.relative(ROOT, file));
  const text = fs.readFileSync(file, 'utf8');

  checkInvokeNames(rel, text);
  checkRustCommandNames(rel, text);
  checkAuthorityRoutes(rel, text);
  checkPackageOrCargo(rel, text);
  checkCapabilities(rel, text);
  checkSuspiciousPaidUnlock(rel, text);
}

finish('QuickChain Phase 4 bond enforcement client boundary check passed.');

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return exists(file) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
}

function requirePhrases(rel, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${rel} must include: ${phrase}`);
    }
  }
}

function checkReadinessPageIsDisplayOnly(text) {
  const forbiddenImportRe = /from\s+['"][^'"]*(?:gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/;
  const forbiddenCallRe = /\b(?:invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway|resolve_crab_url_gateway|health_check_gateway|ready_check_gateway)\b/;
  const forbiddenRuntimeRe = /(?:\/quickchain\/(?:bond|enforce|enforcement|slash|settlement|bridge|anchor)|produceRoot|produceCheckpoint|validatorSignature|settlementProof|bridgeProof)/i;

  if (forbiddenImportRe.test(text)) {
    failures.push(`${PAGE} imports an active gateway/wallet/client adapter; Phase 4 Round 3 status must stay display-only`);
  }

  if (forbiddenCallRe.test(text)) {
    failures.push(`${PAGE} contains active invoke/fetch/gateway command calls; Phase 4 Round 3 readiness must stay display-only`);
  }

  if (forbiddenRuntimeRe.test(text)) {
    failures.push(`${PAGE} contains forbidden QuickChain bond enforcement/bridge/settlement runtime surface`);
  }

  for (const required of ['readLocalCatalog', 'subscribeLocalCatalog', 'readRecentReceipts', 'subscribeRecentReceipts']) {
    if (!text.includes(required)) {
      failures.push(`${PAGE} should keep using display-only local evidence source: ${required}`);
    }
  }
}

function collectFiles(relativeDirs) {
  const out = [];

  for (const relDir of relativeDirs) {
    const dir = path.join(ROOT, relDir);
    if (fs.existsSync(dir)) {
      walk(dir, out);
    }
  }

  return out.sort();
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(abs, out);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(abs);
    }
  }
}

function checkInvokeNames(rel, text) {
  if (!/@tauri-apps\/api\/core|\binvoke\s*\(/.test(text)) {
    return;
  }

  const invokeCallRe = /\binvoke\s*\(\s*([^,\)]+)/g;
  let match;

  while ((match = invokeCallRe.exec(text)) !== null) {
    const commandName = literalStringValue(match[1]);
    if (commandName && FORBIDDEN_COMMAND_NAME_RE.test(commandName)) {
      failures.push(`${rel} invokes forbidden Phase 4 bond-enforcement authority command: ${commandName}`);
    }
  }
}

function checkRustCommandNames(rel, text) {
  if (!rel.endsWith('.rs')) {
    return;
  }

  const commandRe = /#\s*\[\s*tauri::command\s*\][\s\S]*?\bfn\s+([A-Za-z0-9_]+)/g;
  let match;

  while ((match = commandRe.exec(text)) !== null) {
    const name = match[1];
    if (FORBIDDEN_COMMAND_NAME_RE.test(name)) {
      failures.push(`${rel} declares forbidden Phase 4 authority-shaped Tauri command: ${name}`);
    }
  }

  if (rel.endsWith('src-tauri/src/lib.rs')) {
    const handlerBlock = text.match(/generate_handler!\s*\[([\s\S]*?)\]/)?.[1] || '';
    for (const name of handlerBlock.matchAll(/commands::[A-Za-z0-9_:]+::([A-Za-z0-9_]+)/g)) {
      if (FORBIDDEN_COMMAND_NAME_RE.test(name[1])) {
        failures.push(`${rel} registers forbidden Phase 4 authority-shaped Tauri command: ${name[1]}`);
      }
    }
  }
}

function checkAuthorityRoutes(rel, text) {
  if (FORBIDDEN_ROUTE_RE.test(text)) {
    failures.push(`${rel} contains an active Phase 4 bond/slash/staking/liquidity/bridge authority route`);
  }

  if (rel !== PAGE && FORBIDDEN_CAMEL_AUTHORITY_RE.test(text)) {
    failures.push(`${rel} contains forbidden Phase 4 bond-enforcement authority-shaped name`);
  }
}

function checkPackageOrCargo(rel, text) {
  if ((rel.endsWith('package.json') || rel.endsWith('Cargo.toml')) && FORBIDDEN_PACKAGE_RE.test(text)) {
    failures.push(`${rel} declares forbidden external settlement / Solana / ROX / bridge / staking / liquidity runtime dependency`);
  }
}

function checkCapabilities(rel, text) {
  if (!rel.endsWith('capabilities/default.json')) {
    return;
  }

  if (FORBIDDEN_PERMISSION_RE.test(text)) {
    failures.push(`${rel} grants a forbidden broad native capability; keep bridge small and allowlisted`);
  }
}

function checkSuspiciousPaidUnlock(rel, text) {
  if (rel === PAGE) {
    return;
  }

  const unlockTruthRe = /\b(?:unlock|unlocked|hasAccess|paidAccess|canAccess|canUnlock|authorized)\s*[:=]\s*true\b|\bset[A-Za-z]*(?:Unlock|Access|Authorized)[A-Za-z]*\(\s*true\s*\)/i;
  const enforcementMaterialRe = /(?:bond[_ -]?enforcement|slash[_ -]?reserve|capture[_ -]?status|release[_ -]?status|policy[_ -]?allow|index[_ -]?pointer|localStorage|sessionStorage|IndexedDB|cache[_ -]?only)/i;

  if (unlockTruthRe.test(text) && enforcementMaterialRe.test(text)) {
    failures.push(`${rel} appears to create paid-access truth from Phase 4 enforcement/policy/index/cache metadata`);
  }
}

function normalizeRel(value) {
  return String(value || '').split(path.sep).join('/');
}

function literalStringValue(value) {
  const clean = String(value || '').trim();
  const match = clean.match(/^(['"`])([^'"`]+)\1$/);
  return match ? match[2] : '';
}

function finish(message) {
  if (failures.length) {
    console.error('QuickChain Phase 4 bond enforcement client boundary check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log(message);
}
