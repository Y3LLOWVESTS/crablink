#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain readiness display-boundary scanner.
 * RO:WHY — Ensures the readiness page cannot drift from display-only status into wallet, ledger, root, checkpoint, validator, or settlement authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, quickchain.css, localCatalog, recentReceipts, readiness boundary docs.
 * RO:INVARIANTS — local readiness evidence is display-only; no gateway mutation; no Tauri invoke; no QuickChain runtime.
 * RO:SECURITY — rejects direct backend/bridge/validator calls from readiness UI.
 * RO:TEST — node scripts/check-quickchain-readiness-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const PAGE = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const DOC = 'docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md';

const REQUIRED_PAGE_PHRASES = [
  'display-only',
  'no chain logic',
  'no ROX/Solana',
  'no wallet mutation',
  'no fake replay/accounting/reward proofs',
];

const REQUIRED_DOC_PHRASES = [
  'display-only boundary',
  'localCatalog is display memory',
  'recentReceipts is display memory',
  'must not directly call',
  'QuickChain state is locked/deferred until gates are green',
];

const FORBIDDEN_IMPORT_RE = /from\s+['"][^'"]*(?:gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/;
const FORBIDDEN_CALL_RE = /\b(?:invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway|resolve_crab_url_gateway|health_check_gateway|ready_check_gateway)\b/;
const FORBIDDEN_RUNTIME_RE = /(?:\/quickchain\/(?:root|checkpoint|validator|settlement|bridge|anchor)|produceRoot|produceCheckpoint|validatorSignature|settlementProof|bridgeProof)/i;

const failures = [];

if (!fs.existsSync(path.join(ROOT, PAGE))) {
  failures.push(`missing QuickChain readiness page: ${PAGE}`);
}

if (!fs.existsSync(path.join(ROOT, DOC))) {
  failures.push(`missing QuickChain readiness boundary doc: ${DOC}`);
}

const pageText = readRequired(PAGE);
const docText = readRequired(DOC);

requirePhrases(PAGE, pageText, REQUIRED_PAGE_PHRASES);
requirePhrases(DOC, docText, REQUIRED_DOC_PHRASES);

if (FORBIDDEN_IMPORT_RE.test(pageText)) {
  failures.push(`${PAGE} imports an active gateway/wallet/client adapter; readiness must use local display sources only in this phase`);
}

if (FORBIDDEN_CALL_RE.test(pageText)) {
  failures.push(`${PAGE} contains active invoke/fetch/gateway command calls; readiness must stay display-only in this phase`);
}

if (FORBIDDEN_RUNTIME_RE.test(pageText)) {
  failures.push(`${PAGE} contains forbidden QuickChain runtime/bridge/validator/settlement surface`);
}

for (const required of ['readLocalCatalog', 'subscribeLocalCatalog', 'readRecentReceipts', 'subscribeRecentReceipts']) {
  if (!pageText.includes(required)) {
    failures.push(`${PAGE} should keep using display-only local evidence source: ${required}`);
  }
}

if (failures.length) {
  console.error('QuickChain readiness boundary check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain readiness boundary check passed.');

function readRequired(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

function requirePhrases(rel, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${rel} must contain required boundary phrase: ${phrase}`);
    }
  }
}
