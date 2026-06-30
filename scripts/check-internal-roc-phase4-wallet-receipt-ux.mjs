#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Beta Phase 4 Round 1 CrabLink wallet/receipt UX boundary scanner.
 * RO:WHY — Proves backend-derived receipt/balance labels, stale/offline honesty, display-only caches, and no cache-only paid entitlement.
 * RO:INTERACTS — docs/tauri/INTERNAL_ROC_BETA_PHASE4_WALLET_RECEIPT_UX.md, BalanceChip.jsx, appContext.js, ReceiptsPage.jsx, RecentReceiptsPanel.jsx, recentReceipts.js, paid access gates.
 * RO:INVARIANTS — receipt cache display-only; balance display backend-derived or stale-labeled; paid unlock requires backend receipt proof.
 * RO:SECURITY — rejects fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, and external settlement drift.
 * RO:TEST — node scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_BETA_PHASE4_WALLET_RECEIPT_UX.md',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  preflight: 'scripts/dev-internal-roc-beta-phase4-preflight.sh',
  codebundle: 'scripts/make_codebundle.sh',

  appContext: 'apps/crablink-tauri/src/app/appContext.js',
  balanceChip: 'apps/crablink-tauri/src/app/shell/BalanceChip.jsx',
  recentReceipts: 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  recentReceiptsPanel: 'apps/crablink-tauri/src/app/shell/RecentReceiptsPanel.jsx',
  receiptsPage: 'apps/crablink-tauri/src/pages/receipts/ReceiptsPage.jsx',
  assetContentView: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteVisitAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
};

const failures = [];

for (const file of Object.values(files)) {
  if (!exists(file)) {
    failures.push(`missing required Internal ROC Phase 4 client file: ${file}`);
  }
}

const doc = readRequired(files.doc);
const pkg = readRequired(files.appPkg);
const checkTauri = readRequired(files.checkTauri);
const preflight = readRequired(files.preflight);
const codebundle = readRequired(files.codebundle);
const appContext = readRequired(files.appContext);
const balanceChip = readRequired(files.balanceChip);
const recentReceipts = readRequired(files.recentReceipts);
const recentReceiptsPanel = readRequired(files.recentReceiptsPanel);
const receiptsPage = readRequired(files.receiptsPage);
const assetContentView = readRequired(files.assetContentView);
const siteVisitAccess = readRequired(files.siteVisitAccess);

requireIncludes(files.doc, doc, [
  'Internal ROC Beta Phase 4 Round 1 — receipt and balance UX truth labels',
  'Receipt panel labels backend source.',
  'Recent receipts are display-only.',
  'Balance chip uses backend refresh.',
  'Stale balance labels are visible.',
  'Failed refresh is honest.',
  'No local computed balance as truth.',
  'No local receipt cache as entitlement.',
  'local receipt cache → paid entitlement',
  'A route, b3 CID, storage key, local catalog entry, idempotency key, or crab URL can be useful display context.',
  'Those fields alone are not receipt truth.',
  'Paid content and paid site visit unlocks must require live backend payment proof in the current response.',
  'Internal ROC Beta Phase 4 Round 1 CrabLink Tauri receipt/balance truth-label boundary is GREEN / PARKED.',
]);

checkPackageScripts(pkg);
checkTauriScript(checkTauri);
checkPreflight(preflight);
checkCodebundle(codebundle);
checkBalanceUx(appContext, balanceChip);
checkReceiptCache(recentReceipts);
checkReceiptSurfaces(recentReceiptsPanel, receiptsPage);
checkPaidAccessGates(assetContentView, siteVisitAccess);
scanClientSourceForForbiddenAuthority();

finish();

function checkPackageScripts(text) {
  requireIncludes(files.appPkg, text, [
    '"check:internal-roc-phase4-wallet-receipt-ux"',
    'check-internal-roc-phase4-wallet-receipt-ux.mjs',
    '"check:internal-roc-balance-backend-derived"',
    '"check:internal-roc-no-cache-entitlement"',
    '"park:internal-roc-phase4"',
  ]);

  if (!/check:quickchain-phase5-external-posture-boundary[\s\S]*check:internal-roc-phase4-wallet-receipt-ux[\s\S]*npm run build/.test(text)) {
    failures.push(`${files.appPkg} must run Phase 4 wallet/receipt UX check after QuickChain Phase 5 posture checks and before build`);
  }
}

function checkTauriScript(text) {
  requireIncludes(files.checkTauri, text, [
    'npm run check:internal-roc-phase4-wallet-receipt-ux',
  ]);

  if (!/npm run check:quickchain-phase5-external-posture-boundary[\s\S]*npm run check:internal-roc-phase4-wallet-receipt-ux[\s\S]*npm run build/.test(text)) {
    failures.push(`${files.checkTauri} must run Phase 4 wallet/receipt UX check after external posture and before build`);
  }
}

function checkPreflight(text) {
  requireIncludes(files.preflight, text, [
    'npm run check:internal-roc-phase4-wallet-receipt-ux',
    'npm run build',
    'Internal ROC Beta Phase 4 Round 1 CrabLink wallet/receipt UX preflight passed',
    'receipt display backend-derived/display-only; balance display backend-derived or stale-labeled',
  ]);
}

function checkCodebundle(text) {
  requireIncludes(files.codebundle, text, [
    'scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs',
    '$ROOT/scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs',
  ]);
}

function checkBalanceUx(appContextText, chipText) {
  requireIncludes(files.appContext, appContextText, [
    'data: walletState.data',
    'stale: Boolean(walletState.data)',
  ]);

  requireIncludes(files.balanceChip, chipText, [
    'backend-derived balance',
    'ledger-backed backend balance',
    'stale display hint',
    'refresh failed — stale display',
    'refresh failed — no backend balance',
    'sourceLabel',
    'backendDerived',
    "walletBody.source === 'ledger'",
    'Display-only wallet balance',
  ]);

  rejectIncludes(files.balanceChip, chipText, [
    'settings.rocLedgerBacked',
    'localBalanceTruth',
    'computedBalanceTruth',
    'balanceTruthFromCache',
  ]);
}

function checkReceiptCache(text) {
  requireIncludes(files.recentReceipts, text, [
    'backendDerived',
    'displayOnly: true',
    'sourceLabel',
    'function hasBackendReceiptProof',
    'Browser-local receipt display cache only. Backend wallet and ledger remain authoritative; cache is not paid entitlement.',
    'route/crabUrl/idempotency/storageKey alone is not backend receipt proof',
  ]);

  const hasReceiptProof = text.match(/function\s+hasReceiptProof\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  if (!hasReceiptProof) {
    failures.push(`${files.recentReceipts} must define hasReceiptProof`);
  } else {
    const body = stripComments(hasReceiptProof[1]);
    for (const forbidden of ['crabUrl', 'idempotencyKey', 'storageKey']) {
      if (body.includes(forbidden)) {
        failures.push(`${files.recentReceipts} hasReceiptProof must not treat ${forbidden} alone as backend receipt proof`);
      }
    }
  }

  rejectIncludes(files.recentReceipts, text, [
    'receiptCachePaidEntitlement: true',
    'cachePaidEntitlement: true',
    'paidEntitlementAuthority: true',
    'cacheUnlockAuthority: true',
  ]);
}

function checkReceiptSurfaces(panelText, pageText) {
  for (const [label, text] of [
    [files.recentReceiptsPanel, panelText],
    [files.receiptsPage, pageText],
  ]) {
    requireIncludes(label, text, [
      'Source boundary',
      'Backend-derived',
      'Display cache',
      'display-only; not paid entitlement',
      'sourceLabel',
      'backendDerived',
    ]);

    rejectIncludes(label, text, [
      'receiptCachePaidEntitlement',
      'cacheUnlockAuthority',
      'receiptTruthFromCache',
      'balanceTruthFromReceiptCache',
    ]);
  }
}

function checkPaidAccessGates(assetText, siteText) {
  requireIncludes(files.assetContentView, assetText, [
    'hasBackendPaymentProof',
    'payment_missing_backend_receipt',
    'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid content locked.',
    'confirmed: true',
    'canView: true',
  ]);

  requireIncludes(files.siteVisitAccess, siteText, [
    'hasBackendPaymentProof',
    'payment_missing_backend_receipt',
    'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid site locked.',
    '{ confirmed: true }',
    'canRender: true',
  ]);

  for (const [label, text] of [
    [files.assetContentView, assetText],
    [files.siteVisitAccess, siteText],
  ]) {
    if (/readRecentReceipts|readLocalCatalog|localStorage|sessionStorage/.test(stripComments(text))) {
      failures.push(`${label} paid access gate must not read local cache/storage/catalog/receipt cache for entitlement`);
    }

    rejectIncludes(label, text, [
      'cacheOnlyUnlock',
      'unlockFromReceiptCache',
      'canViewFromReceiptCache',
      'canRenderFromReceiptCache',
      'paidAccessFromLocalCatalog',
      'paidAccessFromLocalStorage',
      'paidAccessFromSessionStorage',
      'paidAccessFromIndexedDb',
    ]);
  }
}

function scanClientSourceForForbiddenAuthority() {
  const roots = [
    'apps/crablink-tauri/src',
    'packages/crablink-platform/src',
  ];

  const forbiddenCompact = [
    'receiptcachepaidentitlement:true',
    '"receiptcachepaidentitlement":true',
    'cachepaidentitlement:true',
    '"cachepaidentitlement":true',
    'cacheunlockauthority:true',
    '"cacheunlockauthority":true',
    'balancetruthfromcache',
    'receipttruthfromcache',
    'paidentitlementfromlocalcache',
    'paidentitlementfromreceiptcache',
    'paidentitlementfromlocalcatalog',
    'paidentitlementfromlocalstorage',
    'paidentitlementfromsessionstorage',
    'paidentitlementfromindexeddb',
    'canviewfromreceiptcache',
    'canrenderfromreceiptcache',
    'unlockfromreceiptcache',
    'unlockfromlocalcatalog',
    'unlockfromlocalstorage',
    'unlockfromsessionstorage',
    'fakebalance:true',
    '"fakebalance":true',
    'fakereceipt:true',
    '"fakereceipt":true',
    'silentspend:true',
    '"silentspend":true',
  ];

  for (const root of roots) {
    for (const abs of collectFiles(root, new Set(['.js', '.jsx', '.ts', '.tsx', '.rs']))) {
      const rel = normalizeRel(path.relative(ROOT, abs));
      const text = fs.readFileSync(abs, 'utf8');
      const compact = compactForScan(stripComments(text));

      for (const forbidden of forbiddenCompact) {
        if (compact.includes(forbidden)) {
          failures.push(`${rel} must not contain forbidden Phase 4 wallet/receipt authority marker: ${forbidden}`);
        }
      }

      if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Receipt|Balance|Unlock|Entitlement|Wallet|Ledger)/.test(text)) {
        failures.push(`${rel} appears to couple wallet/receipt UX to forbidden external settlement/bridge/staking/liquidity scope`);
      }
    }
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readRequired(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    return '';
  }

  return fs.readFileSync(abs, 'utf8');
}

function requireIncludes(rel, text, snippets) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      failures.push(`${rel} must include: ${snippet}`);
    }
  }
}

function rejectIncludes(rel, text, snippets) {
  for (const snippet of snippets) {
    if (text.includes(snippet)) {
      failures.push(`${rel} must not include forbidden authority marker: ${snippet}`);
    }
  }
}

function collectFiles(relDir, extensions) {
  const dir = path.join(ROOT, relDir);
  const out = [];

  if (!fs.existsSync(dir)) {
    return out;
  }

  walk(dir, out, extensions);
  return out.sort();
}

function walk(dir, out, extensions) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
      continue;
    }

    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(abs, out, extensions);
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      out.push(abs);
    }
  }
}

function stripComments(text) {
  return String(text || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function compactForScan(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[_-]+/g, '')
    .toLowerCase();
}

function normalizeRel(value) {
  return String(value || '').split(path.sep).join('/');
}

function finish() {
  if (failures.length) {
    console.error('Internal ROC Beta Phase 4 CrabLink wallet/receipt UX check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('Internal ROC Beta Phase 4 CrabLink wallet/receipt UX check passed.');
  console.log('Backend-derived/display-only receipts, backend/stale-labeled balances, no cache-only entitlement, no fake receipts, and no silent spend are intact.');
}
