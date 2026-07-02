#!/usr/bin/env node
/**
 * RO:WHAT — Aggregated CrabLink Tauri Internal ROC Stabilization park-gate scanner.
 * RO:WHY — Product beta readiness needs one reproducible local proof that paid UX, balance refresh, and render-lock stabilization gates are wired together.
 * RO:INTERACTS — stabilization docs/checkers/preflights, package scripts, check-tauri.sh, make_codebundle.sh.
 * RO:INVARIANTS — Tauri remains display/user-intent only; wallet/ledger truth stays backend-owned; caches stay display-only.
 * RO:SECURITY — rejects aggregate park gates that omit paid proof, stale-balance, render-lock, or forbidden external settlement boundaries.
 * RO:TEST — node scripts/check-internal-roc-stabilization-tauri-park.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = Object.freeze({
  parkDoc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_TAURI_PARK.md',
  paidDoc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_PAID_UX.md',
  balanceDoc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_BALANCE_REFRESH.md',
  renderDoc: 'docs/tauri/INTERNAL_ROC_STABILIZATION_RENDER_LOCK.md',

  paidCheck: 'scripts/check-internal-roc-stabilization-paid-ux.mjs',
  balanceCheck: 'scripts/check-internal-roc-stabilization-balance-refresh.mjs',
  renderCheck: 'scripts/check-internal-roc-stabilization-render-lock.mjs',
  parkCheck: 'scripts/check-internal-roc-stabilization-tauri-park.mjs',

  paidPreflight: 'scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh',
  balancePreflight: 'scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh',
  renderPreflight: 'scripts/dev-internal-roc-stabilization-render-lock-preflight.sh',
  parkPreflight: 'scripts/dev-internal-roc-stabilization-tauri-park.sh',

  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  codebundle: 'scripts/make_codebundle.sh',
});

const failures = [];
const text = {};

for (const [key, rel] of Object.entries(files)) {
  const abs = path.join(ROOT, rel);

  if (!fs.existsSync(abs)) {
    failures.push(`missing stabilization park file: ${rel}`);
    text[key] = '';
    continue;
  }

  text[key] = fs.readFileSync(abs, 'utf8');
}

need(files.parkDoc, text.parkDoc, [
  'Internal ROC Stabilization — CrabLink Tauri Product Beta Park Gate',
  'Paid UX retry / receipt truth',
  'Backend-derived balance refresh / stale labeling',
  'Paid denial render-lock / protected payload fetch gating',
  'Tauri Rust mac-media cargo check',
]);

need(files.appPkg, text.appPkg, [
  '"check:internal-roc-stabilization-tauri-park"',
  '"park:internal-roc-stabilization-tauri"',
  'check-internal-roc-stabilization-tauri-park.mjs',
  'dev-internal-roc-stabilization-tauri-park.sh',
]);

need(files.checkTauri, text.checkTauri, [
  'npm run check:internal-roc-stabilization-paid-ux',
  'npm run check:internal-roc-stabilization-balance-refresh',
  'npm run check:internal-roc-stabilization-render-lock',
]);

need(files.codebundle, text.codebundle, [
  'check-internal-roc-stabilization-paid-ux.mjs',
  'check-internal-roc-stabilization-balance-refresh.mjs',
  'check-internal-roc-stabilization-render-lock.mjs',
  'check-internal-roc-stabilization-tauri-park.mjs',
  'dev-internal-roc-stabilization-paid-ux-preflight.sh',
  'dev-internal-roc-stabilization-balance-refresh-preflight.sh',
  'dev-internal-roc-stabilization-render-lock-preflight.sh',
  'dev-internal-roc-stabilization-tauri-park.sh',
]);

need(files.parkPreflight, text.parkPreflight, [
  'check:internal-roc-stabilization-tauri-park',
  'check:internal-roc-stabilization-render-lock',
  'check:internal-roc-stabilization-balance-refresh',
  'check:internal-roc-stabilization-paid-ux',
  'check:internal-roc-phase4-wallet-receipt-ux',
  'check:internal-roc-phase4-confirmation-failure-ux',
  'npm run build',
  'npm run check:rust:mac-media',
  'CrabLink Tauri Internal ROC Stabilization product beta park gate passed',
]);

for (const [rel, body] of [
  [files.parkDoc, text.parkDoc],
  [files.parkPreflight, text.parkPreflight],
]) {
  const compact = body.toLowerCase().replace(/[^a-z0-9_]+/g, '');

  for (const marker of [
    'fakebalancetrue',
    'fakebackendreceipt',
    'fakefinalitytrue',
    'silentspendtrue',
    'cacheonlyunlocktrue',
    'developerpaidbypasstrue',
    'ledgermutatefromtauri',
    'walletmutatefromreact',
  ]) {
    if (compact.includes(marker)) {
      failures.push(`${rel} contains forbidden aggregate park marker: ${marker}`);
    }
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
  console.error('Internal ROC Stabilization CrabLink Tauri park-gate check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('Internal ROC Stabilization CrabLink Tauri park-gate check passed.');
console.log('Paid UX, backend-derived balance refresh, paid denial render-lock, Phase 4 compatibility, build, and Tauri Rust mac-media checks are wired for one park gate.');
