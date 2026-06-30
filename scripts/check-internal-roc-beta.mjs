#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Beta Phase 6 CrabLink Tauri aggregate boundary checker.
 * RO:WHY — Composes existing paid-content, replay visibility, wallet/receipt UX, confirmation/failure, build, and Rust bridge checks without treating checker deny-lists as runtime code.
 * RO:INTERACTS — apps/crablink-tauri/package.json, client boundary scanners, and selected runtime UI/adapter files.
 * RO:INVARIANTS — CrabLink is display/user intent only; backend wallet/ledger remain truth; local receipt cache is display-only; no silent spend or cache-only unlock.
 * RO:SECURITY — Runtime source must not introduce active bridge/staking/liquidity/external-settlement/wallet-authority paths or fake balance/receipt/finality authority.
 * RO:TEST — npm --prefix apps/crablink-tauri run check:internal-roc-beta.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = {
  appPkg: 'apps/crablink-tauri/package.json',
  paidContentBoundary: 'scripts/check-internal-roc-paid-content-boundary.mjs',
  replayVisibility: 'scripts/check-internal-roc-phase2-replay-visibility.mjs',
  walletReceiptUx: 'scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs',
  confirmationFailureUx: 'scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs',
  paidCacheBoundary: 'scripts/check-quickchain-paid-cache-boundary.mjs',
  checkTauri: 'scripts/check-tauri.sh',

  appContext: 'apps/crablink-tauri/src/app/appContext.js',
  balanceChip: 'apps/crablink-tauri/src/app/shell/BalanceChip.jsx',
  recentReceiptsPanel: 'apps/crablink-tauri/src/app/shell/RecentReceiptsPanel.jsx',
  recentReceipts: 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  assetAccess: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  contentViewClient: 'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteVisitClient: 'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  tauriPlatform: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
};

const failures = [];

for (const file of Object.values(files)) {
  if (!exists(file)) {
    failures.push(`missing required Internal ROC Beta CrabLink file: ${file}`);
  }
}

const pkg = readJson(files.appPkg);
const scripts = pkg.scripts || {};

requireScript('check:internal-roc-beta');
requireScript('check:internal-roc-paid-content-boundary');
requireScript('check:internal-roc-paid-cache-boundary');
requireScript('check:internal-roc-phase2-replay-visibility');
requireScript('check:internal-roc-phase4-wallet-receipt-ux');
requireScript('check:internal-roc-phase4-confirmation-failure-ux');
requireScript('check:internal-roc-no-silent-spend');
requireScript('check:internal-roc-balance-backend-derived');
requireScript('check:internal-roc-no-cache-entitlement');
requireScript('check:rust:mac-media');

requireScriptIncludes('check:internal-roc-beta', [
  'check:internal-roc-paid-content-boundary',
  'check:internal-roc-paid-cache-boundary',
  'check:internal-roc-phase2-replay-visibility',
  'check:internal-roc-phase4-wallet-receipt-ux',
  'check:internal-roc-phase4-confirmation-failure-ux',
  'check-internal-roc-beta.mjs',
  'build',
  'check:rust:mac-media',
]);

const checkerTexts = [
  files.paidContentBoundary,
  files.replayVisibility,
  files.walletReceiptUx,
  files.confirmationFailureUx,
  files.paidCacheBoundary,
].map((file) => [file, read(file)]);

requireAnyAcross(checkerTexts, 'backend-derived receipt/balance/access wording', [
  'backend-derived',
  'backend receipt',
  'backend balance',
]);

requireAnyAcross(checkerTexts, 'display-only receipt/cache wording', [
  'display-only',
  'cache-only',
]);

requireAnyAcross(checkerTexts, 'explicit confirmation / no silent spend wording', [
  'explicit confirmation',
  'silent spend',
  'cancel',
]);

// Checker scripts intentionally contain deny-list words. Do not scan those files as runtime source.
const runtimeSources = [
  files.appContext,
  files.balanceChip,
  files.recentReceiptsPanel,
  files.recentReceipts,
  files.assetAccess,
  files.siteAccess,
  files.contentViewClient,
  files.siteVisitClient,
  files.tauriPlatform,
].map((file) => [file, read(file)]);

for (const [file, text] of runtimeSources) {
  rejectRuntimeAuthorization(file, text);
}

if (failures.length > 0) {
  console.error('Internal ROC Beta CrabLink checker failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Internal ROC Beta CrabLink checker passed.');
console.log('CrabLink remains display/user-intent only with backend-derived receipt, balance, and paid-access UX.');

function resolve(file) {
  return path.join(ROOT, file);
}

function exists(file) {
  return fs.existsSync(resolve(file));
}

function read(file) {
  const full = resolve(file);
  try {
    return fs.readFileSync(full, 'utf8');
  } catch (err) {
    failures.push(`failed to read ${file}: ${err.message}`);
    return '';
  }
}

function readJson(file) {
  const text = read(file);
  try {
    return JSON.parse(text);
  } catch (err) {
    failures.push(`failed to parse ${file}: ${err.message}`);
    return {};
  }
}

function requireScript(name) {
  if (!Object.prototype.hasOwnProperty.call(scripts, name)) {
    failures.push(`package.json missing script: ${name}`);
  }
}

function requireScriptIncludes(name, needles) {
  const script = String(scripts[name] || '');
  for (const needle of needles) {
    if (!script.includes(needle)) {
      failures.push(`package.json script ${name} must include ${needle}`);
    }
  }
}

function requireAnyAcross(entries, label, needles) {
  const combined = entries.map(([, text]) => text).join('\n');
  if (!needles.some((needle) => combined.includes(needle))) {
    failures.push(`missing ${label}; expected one of: ${needles.join(', ')}`);
  }
}

function rejectRuntimeAuthorization(file, text) {
  const lowered = stripCommentsAndStrings(text).toLowerCase();
  const compact = lowered.replace(/[^a-z0-9_]+/g, '');

  const forbiddenCompact = [
    'bridge_mint',
    'bridgeburn',
    'stakingapr',
    'stakingapy',
    'liquiditypool',
    'exchangeready',
    'externalsettlementready',
    'publicvalidatoreconomy',
    'fakebalance',
    'fakereceipt',
    'fakefinality',
    'silent_spend_authority',
    'cache_only_unlock_authority',
    'rawinvoke',
    'raw_invoke',
    'uncappedspend',
    'privatekey',
    'seedphrase',
  ];

  for (const needle of forbiddenCompact) {
    if (compact.includes(needle.replace(/[^a-z0-9_]+/g, ''))) {
      failures.push(`${file} contains forbidden runtime-authority token: ${needle}`);
    }
  }

  const externalAuthorityPattern =
    /\b(rox|solana|staking|liquidity|exchange|bridge)[a-z0-9_]*(receipt|balance|unlock|entitlement|wallet|ledger|confirm|spend|mint|burn|settle|finality)\b/i;

  if (externalAuthorityPattern.test(lowered)) {
    failures.push(`${file} appears to couple ROC paid UX to forbidden external runtime authority`);
  }
}

function stripCommentsAndStrings(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n\r]*/g, ' ')
    .replace(/(['"`])(?:\\.|(?!\1)[\s\S])*\1/g, ' ');
}
