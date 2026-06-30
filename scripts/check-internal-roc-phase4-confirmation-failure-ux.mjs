#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Beta Phase 4 Round 2 CrabLink explicit confirmation/failure UX scanner.
 * RO:WHY — Proves paid actions show user-visible spend detail, require confirm, preserve cancel safety, keep failures locked, and retry safely.
 * RO:INTERACTS — docs/tauri/INTERNAL_ROC_BETA_PHASE4_CONFIRMATION_FAILURE_UX.md, AssetContentViewAccess.jsx, SiteVisitAccess.jsx, contentViewClient.js, siteVisitClient.js.
 * RO:INVARIANTS — every spend shows amount/action/asset; cancel never mutates; confirm triggers adapter path only; failure does not unlock; retry is idempotent/safe.
 * RO:SECURITY — rejects silent spend, cache-only unlock, fake receipt/balance/finality, raw invoke creep, wallet/ledger authority, bridge, staking, liquidity, ROX/Solana, external settlement.
 * RO:TEST — node scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_BETA_PHASE4_CONFIRMATION_FAILURE_UX.md',
  packageJson: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  preflight: 'scripts/dev-internal-roc-beta-phase4-preflight.sh',
  makeCodebundle: 'scripts/make_codebundle.sh',
  assetAccess: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  contentViewClient: 'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteVisitClient: 'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
};

const failures = [];

for (const file of Object.values(files)) {
  if (!exists(file)) {
    failures.push(`missing Phase 4 Round 2 client file: ${file}`);
  }
}

const doc = readRequired(files.doc);
const packageJson = readRequired(files.packageJson);
const checkTauri = readRequired(files.checkTauri);
const preflight = readRequired(files.preflight);
const makeCodebundle = readRequired(files.makeCodebundle);
const assetAccess = readRequired(files.assetAccess);
const siteAccess = readRequired(files.siteAccess);
const contentViewClient = readRequired(files.contentViewClient);
const siteVisitClient = readRequired(files.siteVisitClient);

checkDoc();
checkScripts();
checkClientAdapters();
checkRouteUx();
scanClientSourceForForbiddenAuthority();

finish();

function checkDoc() {
  requireIncludes(files.doc, doc, [
    'Internal ROC Beta Phase 4 Round 2 — explicit confirmation and failure UX',
    'every spend shows amount/action/asset',
    'recipient/split is shown if known',
    'cancel never mutates',
    'confirm triggers adapter path only',
    'failure never unlocks',
    'retry is idempotent/safe',
    'confirm passes confirmed=true',
    'backend wallet/ledger receipt proof',
    'failure does not unlock',
    'quote alone → unlock',
    'cancel → mutation',
    'failure → unlock',
    'retry → double spend',
    'local cache → unlock',
    'raw invoke → wallet mutation',
    'Internal ROC Beta Phase 4 Round 2 CrabLink explicit confirmation/failure UX boundary is GREEN / PARKED.',
  ]);
}

function checkScripts() {
  requireIncludes(files.packageJson, packageJson, [
    '"check:internal-roc-phase4-confirmation-failure-ux"',
    'check-internal-roc-phase4-confirmation-failure-ux.mjs',
    '"check:internal-roc-explicit-confirmation"',
    '"check:internal-roc-failure-does-not-unlock"',
    '"check:internal-roc-cancel-no-mutation"',
  ]);

  requireIncludes(files.checkTauri, checkTauri, [
    'npm run check:internal-roc-phase4-confirmation-failure-ux',
  ]);

  requireIncludes(files.preflight, preflight, [
    'npm run check:internal-roc-phase4-wallet-receipt-ux',
    'npm run check:internal-roc-phase4-confirmation-failure-ux',
    'npm run build',
    'Internal ROC Beta Phase 4 CrabLink wallet/receipt + confirmation/failure UX preflight passed',
  ]);

  requireIncludes(files.makeCodebundle, makeCodebundle, [
    'scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs',
    '$ROOT/scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs',
  ]);
}

function checkClientAdapters() {
  requireIncludes(files.contentViewClient, contentViewClient, [
    'payment helper requires confirmed=true',
    'quote is read-only; pay is mutation=true and caller-confirmed only',
    'options.confirmed !== true',
    'Content view payment requires explicit user confirmation.',
    'payment_not_confirmed',
    'mutation: true',
    'Idempotency-Key',
    'client_idempotency_key',
    'stableContentViewIdempotencyKey',
    'normalizeContentViewError',
  ]);

  requireIncludes(files.siteVisitClient, siteVisitClient, [
    'payment helper requires confirmed=true',
    'quote is read-only; pay is mutation=true and caller-confirmed only',
    'confirmed',
    'mutation: true',
    'Idempotency-Key',
    'client_idempotency_key',
    'stableSiteVisitIdempotencyKey',
    'SiteVisitError',
  ]);

  rejectIncludes(files.contentViewClient, contentViewClient, [
    'rawInvoke(',
    'invoke(',
    'localStorage.setItem("balance"',
    'unlockFromCache',
    'silentSpend',
  ]);

  rejectIncludes(files.siteVisitClient, siteVisitClient, [
    'rawInvoke(',
    'invoke(',
    'localStorage.setItem("balance"',
    'unlockFromCache',
    'silentSpend',
  ]);
}

function checkRouteUx() {
  for (const [label, text] of [
    [files.assetAccess, assetAccess],
    [files.siteAccess, siteAccess],
  ]) {
    requireIncludes(label, text, [
      'INTERNAL-ROC-PHASE4-R2',
      'every spend shows amount/action/asset/recipient',
      'cancel never mutates',
      'confirm triggers adapter path only',
      'failure does not unlock',
      'retry is idempotent/safe',
      'confirmed: true',
      'hasBackendPaymentProof',
      'payment_missing_backend_receipt',
    ]);

    rejectIncludes(label, text, [
      'cacheOnlyUnlock',
      'unlockFromReceiptCache',
      'canViewFromReceiptCache',
      'canRenderFromReceiptCache',
      'silentSpend',
      'rawInvoke',
    ]);
  }

  requireIncludes(files.assetAccess, assetAccess, [
    'canView: true',
    'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid content locked.',
  ]);

  requireIncludes(files.siteAccess, siteAccess, [
    'canRender: true',
    'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep this paid site locked.',
  ]);
}

function scanClientSourceForForbiddenAuthority() {
  const roots = [
    'apps/crablink-tauri/src',
    'packages/crablink-platform/src',
  ];

  const forbiddenCompact = [
    'silentspend:true',
    '"silentspend":true',
    'cacheonlyunlock:true',
    '"cacheonlyunlock":true',
    'failureunlock:true',
    '"failureunlock":true',
    'cancelmutates:true',
    '"cancelmutates":true',
    'retrydoublespend:true',
    '"retrydoublespend":true',
    'rawinvoke(',
    'walletauthority:true',
    '"walletauthority":true',
    'ledgerauthority:true',
    '"ledgerauthority":true',
    'receipttruthfromcache',
    'paidentitlementfromlocalcache',
    'paidentitlementfromreceiptcache',
    'fakebalance:true',
    '"fakebalance":true',
    'fakereceipt:true',
    '"fakereceipt":true',
    'fakefinality:true',
    '"fakefinality":true',
  ];

  for (const root of roots) {
    for (const abs of collectFiles(root, new Set(['.js', '.jsx', '.ts', '.tsx', '.rs']))) {
      const rel = normalizeRel(path.relative(ROOT, abs));
      const text = fs.readFileSync(abs, 'utf8');
      const compact = compactForScan(stripComments(text));

      for (const forbidden of forbiddenCompact) {
        if (compact.includes(forbidden)) {
          failures.push(`${rel} must not contain forbidden Phase 4 Round 2 authority marker: ${forbidden}`);
        }
      }

      if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Receipt|Balance|Unlock|Entitlement|Wallet|Ledger|Confirm|Spend)/.test(text)) {
        failures.push(`${rel} appears to couple paid confirmation UX to forbidden external settlement/bridge/staking/liquidity scope`);
      }
    }
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readRequired(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
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
      failures.push(`${rel} must not include forbidden marker: ${snippet}`);
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
    console.error('Internal ROC Beta Phase 4 Round 2 CrabLink confirmation/failure UX check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('Internal ROC Beta Phase 4 Round 2 CrabLink confirmation/failure UX check passed.');
  console.log('Explicit confirmation, cancel safety, failure-locked rendering, safe retry/idempotency, and no silent spend are intact.');
}
