#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain readiness-page boundary scanner.
 * RO:WHY — Keeps crab://quickchain as display-only project readiness, not fake chain state.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, quickchain.css, docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md.
 * RO:INVARIANTS — no Tauri invoke, no gateway mutation, no roots/checkpoints/validators/finality claims from the page.
 * RO:SECURITY — static scan only; no wallet, ledger, gateway, or cache mutation.
 * RO:TEST — npm run check:quickchain-readiness-boundary.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGE_REL = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const CSS_REL = 'apps/crablink-tauri/src/pages/quickchain/quickchain.css';
const DOC_REL = 'docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md';
const failures = [];

const page = readRel(PAGE_REL);
const css = readRel(CSS_REL);
const doc = readRel(DOC_REL);

for (const phrase of [
  'display-only',
  'no chain logic',
  'no ROX/Solana',
  'no wallet mutation',
  'no fake replay/accounting/reward proofs',
  'QC-0A preflight readiness',
]) {
  requireText(page, phrase, PAGE_REL);
}

for (const phrase of [
  'display-only',
  'not QuickChain',
  'not a chain runtime',
  'not a root producer',
  'not a checkpoint producer',
  'not a validator',
  'no ROX',
  'Solana',
]) {
  requireText(doc, phrase, DOC_REL);
}

for (const phrase of ['quickchain-page', 'quickchain-progress-grid', 'quickchain-proof-card']) {
  requireText(css, phrase, CSS_REL);
}

const forbiddenPageRules = [
  { pattern: /@tauri-apps\/api\/core/, reason: 'readiness page must not import Tauri APIs' },
  { pattern: /\binvoke\s*\(/, reason: 'readiness page must not invoke Tauri commands' },
  { pattern: /createContentViewClient|gateway_request|wallet_balance_gateway|write_settings/, reason: 'readiness page must not call gateway/wallet/mutation helpers' },
  { pattern: /chain\s+(live|online)|validator\s+online|bridge\s+active|external\s+anchor\s+active|balance\s+finalized|receipt\s+finalized/i, reason: 'readiness page must not claim live chain/finality/bridge state' },
];

for (const rule of forbiddenPageRules) {
  if (rule.pattern.test(page)) {
    fail(`${PAGE_REL}: ${rule.reason}`);
  }
}

finish('QuickChain readiness boundary check passed.');

function readRel(rel) {
  const file = path.join(ROOT, rel);
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`unable to read ${rel}: ${error.message}`);
    return '';
  }
}

function requireText(text, needle, rel) {
  if (!text.includes(needle)) {
    fail(`${rel}: missing required phrase: ${needle}`);
  }
}

function fail(message) {
  failures.push(message);
}

function finish(message) {
  if (failures.length > 0) {
    console.error('QuickChain readiness boundary check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log(message);
}
