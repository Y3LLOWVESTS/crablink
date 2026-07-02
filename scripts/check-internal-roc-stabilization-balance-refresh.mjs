#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Stabilization backend balance refresh truth scanner for CrabLink Tauri.
 * RO:WHY — Product beta readiness requires backend-derived balance display, honest stale/failure labels, and refresh after paid success without local balance authority.
 * RO:INTERACTS — BalanceChip.jsx, appContext.js, walletClient.js, paid access gates, package scripts, check-tauri.sh.
 * RO:INVARIANTS — wallet/ledger truth remains backend-owned; stale display is never balance truth; paid success asks backend for refreshed balance.
 * RO:SECURITY — rejects fake balance/finality, local balance truth, silent spend, cache-only entitlement, bridge/staking/liquidity/ROX/Solana/external settlement creep.
 * RO:TEST — node scripts/check-internal-roc-stabilization-balance-refresh.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_BALANCE_REFRESH.md',
  walletClient: 'apps/crablink-tauri/src/shared/api/walletClient.js',
  appContext: 'apps/crablink-tauri/src/app/appContext.js',
  balanceChip: 'apps/crablink-tauri/src/app/shell/BalanceChip.jsx',
  assetAccess: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  preflight: 'scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh',
  codebundle: 'scripts/make_codebundle.sh',
};

const failures = [];
const text = Object.fromEntries(
  Object.entries(files).map(([key, rel]) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      failures.push(`missing balance refresh stabilization file: ${rel}`);
      return [key, ''];
    }
    return [key, fs.readFileSync(abs, 'utf8')];
  }),
);

need(files.doc, text.doc, [
  'Internal ROC Stabilization — Backend Balance Refresh Truth Boundary',
  'backend-derived balance = display only',
  'stale balance = last backend value, visibly stale, never truth',
  'local cache creates balance truth',
]);

need(files.walletClient, text.walletClient, [
  'normalizeGatewayWalletBalanceResponse',
  'normalizeWalletBalance',
  'markWalletBalanceStale',
  'normalizeWalletBalanceError',
  'backendDerived: true',
  'displayOnly: true',
  'truthBoundary:',
  'staleReason',
  'Backend wallet balance response. CrabLink display only; ron-ledger remains durable balance truth.',
  'Stale wallet balance display. Backend refresh failed; this is not balance truth.',
]);

need(files.appContext, text.appContext, [
  'normalizeWalletBalance',
  'markWalletBalanceStale',
  'normalizeWalletBalanceError',
  'response?.walletBalance || normalizeWalletBalance(unwrapGatewayData(response), walletAccount)',
  'markWalletBalanceStale(walletState.data, safeError, walletAccount)',
  'stale: Boolean(walletState.data)',
  'error: safeError',
]);

need(files.balanceChip, text.balanceChip, [
  'stale backend display',
  'refresh failed — stale display',
  'refresh failed — no backend balance',
  'Backend-derived balance refresh truth',
  'Display-only wallet balance',
  'refreshAgeLabel',
  'staleReason',
  "walletBody.source === 'ledger'",
  'backendDerived',
  'sourceLabel',
]);

need(files.assetAccess, text.assetAccess, [
  'void app.refreshWallet(payerAccount)',
  'canView: true',
  'backendProof',
]);

need(files.siteAccess, text.siteAccess, [
  'notifyBalanceRefresh(app, payment, persistedReceipt)',
  'app?.refreshWallet?.()',
  'crablink:wallet-refresh-requested',
  'canRender: true',
  'backendProof',
]);

need(files.appPkg, text.appPkg, [
  '"check:internal-roc-stabilization-balance-refresh"',
  'check-internal-roc-stabilization-balance-refresh.mjs',
  'park:internal-roc-stabilization-balance-refresh',
]);

need(files.checkTauri, text.checkTauri, [
  'npm run check:internal-roc-stabilization-balance-refresh',
]);

need(files.preflight, text.preflight, [
  'check:internal-roc-stabilization-balance-refresh',
  'Internal ROC Stabilization backend balance refresh truth preflight passed',
]);

need(files.codebundle, text.codebundle, [
  'check-internal-roc-stabilization-balance-refresh.mjs',
  'dev-internal-roc-stabilization-balance-refresh-preflight.sh',
]);

for (const [rel, body] of [
  [files.walletClient, text.walletClient],
  [files.appContext, text.appContext],
  [files.balanceChip, text.balanceChip],
]) {
  const compact = body.toLowerCase().replace(/[^a-z0-9_]+/g, '');
  for (const marker of [
    'fakebalancetrue',
    'localbalancetruth',
    'computedbalancetruth',
    'balancetruthfromcache',
    'balancetruthfromsettings',
    'balancetruthfromreceiptcache',
    'clientbalancetruth',
    'ledger_mutate',
    'wallet_mutate',
    'cacheonlyunlocktrue',
    'silentspendtrue',
  ]) {
    if (compact.includes(marker)) {
      failures.push(`${rel} contains forbidden balance authority marker: ${marker}`);
    }
  }

  if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Balance|Wallet|Ledger|Refresh|Spend|Receipt)/.test(body)) {
    failures.push(`${rel} couples balance refresh UX to forbidden external runtime vocabulary`);
  }
}

function need(rel, body, snippets) {
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      failures.push(`${rel} must include: ${snippet}`);
    }
  }
}

if (failures.length) {
  console.error('Internal ROC Stabilization backend balance refresh truth check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('Internal ROC Stabilization backend balance refresh truth check passed.');
console.log('Backend-derived balance normalization, stale/failure labels, paid-success refresh requests, and no local balance truth boundaries are intact.');
