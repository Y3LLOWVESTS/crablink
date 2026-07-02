#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Stabilization paid UX retry/receipt truth scanner for CrabLink Tauri.
 * RO:WHY — Product beta readiness requires deterministic retry keys, backend-derived proof checks, locked failures, redacted/source-labeled errors, and display-only caches.
 * RO:INTERACTS — paidAccessTruth.js, AssetContentViewAccess, SiteVisitAccess, contentViewClient, siteVisitClient, recentReceipts, package scripts, check-tauri.sh.
 * RO:INVARIANTS — idempotency key is retry glue, not authority; backend receipt/access proof gates paid render; local cache remains display-only.
 * RO:SECURITY — rejects fake balance/receipt/finality, silent spend, cache-only paid access, bridge/staking/liquidity/ROX/Solana/external settlement creep.
 * RO:TEST — node scripts/check-internal-roc-stabilization-paid-ux.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = Object.freeze({
  doc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_PAID_UX.md',
  helper: 'apps/crablink-tauri/src/shared/paidAccess/paidAccessTruth.js',
  assetAccess: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  contentViewClient: 'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteVisitClient: 'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  recentReceipts: 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  preflight: 'scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh',
  codebundle: 'scripts/make_codebundle.sh',
});

const failures = [];
const text = {};

for (const [key, rel] of Object.entries(files)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`missing stabilization paid UX file: ${rel}`);
    text[key] = '';
    continue;
  }

  text[key] = fs.readFileSync(abs, 'utf8');
}

requireAll(files.doc, text.doc, [
  'Internal ROC Stabilization — Paid UX Retry / Receipt Truth Boundary',
  'deterministic retry idempotency key',
  'backend wallet/ledger receipt/access proof',
  'idempotency_key = retry key, not authority',
  'operation_id = backend durable ledger-op display metadata',
]);

requireAll(files.helper, text.helper, [
  'makeStablePaidIdempotencyKey',
  'buildPaidRetryState',
  'describeBackendPaymentProof',
  'hasBackendPaymentProof',
  'ensureBackendPaymentProof',
  'sanitizePaidAccessError',
  'operationId',
  'payment_missing_backend_receipt',
  'idempotency_key is retry glue, not authority',
  'Failure state is display-only and locked.',
]);

requireAll(files.assetAccess, text.assetAccess, [
  'useRef',
  'paidAccessTruth.js',
  'payIdempotencyKeyRef',
  'makeStablePaidIdempotencyKey',
  'buildPaidRetryState',
  'ensureBackendPaymentProof',
  'sanitizePaidAccessError',
  'idempotencyKey: payIdempotencyKey',
  "sourceLabel: 'content_view_backend_pay'",
  'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid content locked.',
  'hasBackendPaymentProof',
  'payment_missing_backend_receipt',
  'canView: false',
  'canView: true',
]);

requireAll(files.siteAccess, text.siteAccess, [
  'paidAccessTruth.js',
  'payIdempotencyKeyRef',
  'makeStablePaidIdempotencyKey',
  'buildPaidRetryState',
  'ensureBackendPaymentProof',
  'sanitizePaidAccessError',
  'idempotencyKey: payIdempotencyKey',
  "sourceLabel: 'site_visit_backend_pay'",
  'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid site locked.',
  'hasBackendPaymentProof',
  'payment_missing_backend_receipt',
  'canRender: false',
  'canRender: true',
]);

rejectAll(files.siteAccess, text.siteAccess, [
  'uniqueSiteVisitIdem(',
  'Math.random().toString(36)',
  'retryDoubleSpend',
]);

requireAll(files.contentViewClient, text.contentViewClient, [
  'operationId',
  'operation_id',
  'client_idempotency_key',
]);

requireAll(files.siteVisitClient, text.siteVisitClient, [
  'operationId',
  'operation_id',
  'client_idempotency_key',
]);

requireAll(files.recentReceipts, text.recentReceipts, [
  'operationId',
  'operation_id',
  'backendDerived',
  'displayOnly: true',
  'sourceLabelForReceipt',
  'hasBackendReceiptProof({ txid, receiptHash, ledgerRoot, operationId })',
]);

requireAll(files.appPkg, text.appPkg, [
  '"check:internal-roc-stabilization-paid-ux"',
  'check-internal-roc-stabilization-paid-ux.mjs',
  'npm run check:internal-roc-stabilization-paid-ux',
]);

requireAll(files.checkTauri, text.checkTauri, [
  'npm run check:internal-roc-stabilization-paid-ux',
]);

requireAll(files.preflight, text.preflight, [
  'check:internal-roc-stabilization-paid-ux',
  'Internal ROC Stabilization paid UX retry/receipt truth preflight passed',
]);

requireAll(files.codebundle, text.codebundle, [
  'check-internal-roc-stabilization-paid-ux.mjs',
  'dev-internal-roc-stabilization-paid-ux-preflight.sh',
]);

for (const [rel, body] of [
  [files.helper, text.helper],
  [files.assetAccess, text.assetAccess],
  [files.siteAccess, text.siteAccess],
  [files.contentViewClient, text.contentViewClient],
  [files.siteVisitClient, text.siteVisitClient],
  [files.recentReceipts, text.recentReceipts],
]) {
  const compact = body.toLowerCase().replace(/[^a-z0-9_]+/g, '');

  for (const marker of [
    'silentspendtrue',
    'cacheonlyunlocktrue',
    'unlockfromcache',
    'receiptcacheunlock',
    'localreceipttruth',
    'clientreceipttruth',
    'clientbalancetruth',
    'fakebackendreceipt',
    'fakewalletbalance',
    'retrydoublespendtrue',
    'bridgetxid',
    'stakingpositionid',
    'liquiditypoolid',
    'externalsettlementid',
  ]) {
    if (compact.includes(marker)) {
      failures.push(`${rel} contains forbidden stabilization authority marker: ${marker}`);
    }
  }

  if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Receipt|Balance|Access|Entitlement|Wallet|Ledger|Confirm|Spend)/.test(body)) {
    failures.push(`${rel} couples paid UX to forbidden external runtime vocabulary`);
  }
}

function requireAll(rel, body, snippets) {
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      failures.push(`${rel} must include: ${snippet}`);
    }
  }
}

function rejectAll(rel, body, snippets) {
  for (const snippet of snippets) {
    if (body.includes(snippet)) {
      failures.push(`${rel} must not include: ${snippet}`);
    }
  }
}

if (failures.length) {
  console.error('Internal ROC Stabilization paid UX retry/receipt truth check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('Internal ROC Stabilization paid UX retry/receipt truth check passed.');
console.log('Deterministic retry keys, backend-derived proof checks, locked failures, redacted/source-labeled errors, and display-only receipt cache boundaries are intact.');
