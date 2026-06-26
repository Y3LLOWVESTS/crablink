#!/usr/bin/env node
/**
 * RO:WHAT — Phase 4 Round 1 bonded validator client-boundary scanner.
 * RO:WHY — Ensures CrabLink can display backend-derived bond/no-op accounting status without becoming bond, slash, staking, liquidity, wallet, ledger, finality, settlement, paid-unlock, bridge, ROX, Solana, or external settlement authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, Phase 3 lifecycle boundary scanner.
 * RO:INVARIANTS — bond display-only; no client bond mutation; no client slash mutation; no staking market; no liquidity; no client settlement/finality/paid unlock truth.
 * RO:SECURITY — rejects authority-shaped bond/slash/stake/liquidity command, function, route, cache, and bridge/external-settlement names.
 * RO:TEST — node scripts/check-quickchain-phase4-client-bond-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const docPath = 'docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_BOUNDARY.md';
const lifecycleDocPath = 'docs/tauri/QUICKCHAIN_PHASE3_CLIENT_LIFECYCLE_BOUNDARY.md';
const lifecycleScriptPath = 'scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs';
const pagePath = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const pkgPath = 'apps/crablink-tauri/package.json';
const tauriPath = 'apps/crablink-tauri/src/platform/tauriPlatform.js';
const checkPath = 'scripts/check-tauri.sh';
const parkPath = 'scripts/dev-quickchain-tauri-park.sh';

const clientFiles = [
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
];

const required = [docPath, lifecycleDocPath, lifecycleScriptPath, pagePath, pkgPath, tauriPath, checkPath, parkPath, ...clientFiles];
for (const file of required) {
  if (!exists(file)) failures.push(`missing required Phase 4 bond boundary file: ${file}`);
}

const doc = read(docPath);
const page = read(pagePath);
const pkg = read(pkgPath);
const tauri = read(tauriPath);
const check = read(checkPath);
const park = read(parkPath);

need(docPath, doc, [
  'QuickChain Phase 4 Round 1 — bond DTOs and no-op accounting model',
  'client-boundary bond display only',
  'bond status display',
  'slash evidence display',
  'no-op accounting display',
  'bond review display',
  'accepted wallet/ledger receipts remain the only paid unlock authority',
  'openValidatorBond',
  'captureValidatorBond',
  'releaseValidatorBond',
  'slashValidator',
  'executeSlashing',
  'commitSlashDecision',
  'createStakingMarket',
  'createLiquidityPool',
  'settleBond',
  'bond status cannot unlock paid content',
  'slash evidence cannot mutate ledger truth through CrabLink',
  'automatic slashing live',
  'public staking market',
  'liquidity',
]);

need(pagePath, page, [
  'Phase 4 Round 1: bond DTOs and no-op accounting model',
  'client-boundary bond display only',
  'bond status display',
  'slash evidence display',
  'no-op accounting display',
  'bond review display',
  'phase4_bond_boundary',
  'no client-side bond truth',
  'no client-side slash truth',
  'no staking market authority',
  'no liquidity authority',
  'no automatic slashing live',
  'no public staking market',
]);

need(pkgPath, pkg, [
  '"check:quickchain-phase3-lifecycle-boundary"',
  '"check:quickchain-phase4-bond-boundary"',
  'check-quickchain-phase4-client-bond-boundary.mjs',
]);

if (!/check:quickchain-phase3-lifecycle-boundary[\s\S]*check:quickchain-phase4-bond-boundary[\s\S]*build/.test(check)) {
  failures.push('scripts/check-tauri.sh must run Phase 4 bond boundary after Phase 3 lifecycle boundary and before build');
}

need(parkPath, park, [
  'Phase 4 Round 1 final client parking gate',
  'bond DTOs and no-op accounting client boundary complete',
  'QuickChain Phase 4 Round 1 complete',
  'bond DTOs and no-op accounting model complete',
  'no automatic slashing live, no public staking market, no liquidity, no exchange-facing logic, no bridge, no ROX/Solana, or external settlement introduced',
]);

if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/.test(page)) {
  failures.push('QuickchainReadinessPage imports active adapters; bond readiness must use display caches only');
}

if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(page)) {
  failures.push('QuickchainReadinessPage contains active calls; bond readiness must stay display-only');
}

need(tauriPath, tauri, [
  'FORBIDDEN_COMMAND_PATTERNS',
  'bond[_-]?intent',
  'bond[_-]?account',
  'bond[_-]?lifecycle',
  'slash[_-]?evidence',
  'slash[_-]?decision',
  'staking[_-]?market',
  'liquidity[_-]?pool',
]);

const bondBoundaryStart = page.indexOf('const PHASE4_BOND_BOUNDARY = Object.freeze({');
const milestonesStart = page.indexOf('\nconst MILESTONES', bondBoundaryStart);
if (bondBoundaryStart < 0 || milestonesStart < 0) {
  failures.push('QuickchainReadinessPage must define PHASE4_BOND_BOUNDARY before MILESTONES');
} else {
  const block = page.slice(bondBoundaryStart, milestonesStart).trimEnd();
  if (!block.endsWith('});')) failures.push('QuickchainReadinessPage PHASE4_BOND_BOUNDARY must close before MILESTONES');
}

const allowed = tauri.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/)?.[1] || '';
if (/(quickchain|proof|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|staking|slash|slashing|bond|liquidity|rox|solana)/i.test(allowed)) {
  failures.push('Tauri allowlist contains Phase 4 bond/slash/stake/liquidity authority command names');
}

const bondAuthorityNameRe = /\b(?:openValidatorBond|closeValidatorBond|lockValidatorBond|unlockValidatorBond|captureValidatorBond|releaseValidatorBond|slashValidator|executeSlashing|commitSlashDecision|commitBondLifecycle|grantBondAuthority|grantSlashAuthority|createStakingMarket|openStakingMarket|grantStakingAuthority|createLiquidityPool|grantLiquidityAuthority|settleBond|bondTruth|slashTruth|stakingMarketAuthority|liquidityAuthority)\b/;
const bondAuthorityRouteRe = /['"`]\/(?:quickchain|validator|validators|bond|bonds|slash|slashes|staking|stake|liquidity|bridge)\/(?:bond|bonds|bond-intent|bond_intent|bond-account|bond_account|bond-lifecycle|bond_lifecycle|slash|slashing|slash-evidence|slash_evidence|slash-decision|slash_decision|stake|staking|liquidity|settle|capture|release)\b/i;

for (const file of clientFiles) {
  const text = read(file);
  if (bondAuthorityNameRe.test(text)) failures.push(`${file} contains Phase 4 bond/slash/stake/liquidity authority-shaped function or field name`);
  if (bondAuthorityRouteRe.test(text)) failures.push(`${file} contains Phase 4 bond/slash/stake/liquidity authority route`);
  if (/unlock\s*[:=]\s*true/.test(text) && /(bond|slash|stake|staking|liquidity|quickchain|validator)/i.test(text)) {
    failures.push(`${file} appears to unlock from bond/slash/stake/liquidity/validator material`);
  }
}

finish('QuickChain Phase 4 bond boundary check passed.');

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return exists(file) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
}

function need(file, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${file} must include: ${phrase}`);
  }
}

function finish(message) {
  if (failures.length) {
    console.error('QuickChain Phase 4 bond boundary check failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }
  console.log(message);
}
