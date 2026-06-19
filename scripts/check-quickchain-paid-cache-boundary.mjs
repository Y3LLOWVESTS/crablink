#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain paid/cache boundary scanner.
 * RO:WHY — Proves local receipt and cache helpers remain display-only and cannot unlock paid content alone.
 * RO:INTERACTS — recentReceipts.js, paid asset viewers, contentViewClient.js, docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md.
 * RO:INVARIANTS — prepare/quote → explicit confirm → backend receipt/access → unlock; never cache-only entitlement.
 * RO:SECURITY — static scan only; no gateway calls, wallet calls, or cache mutation.
 * RO:TEST — npm run check:quickchain-paid-cache-boundary.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const APP = path.join(ROOT, 'apps', 'crablink-tauri');
const failures = [];

const REQUIRED_PHRASES = [
  'Receipt display cache is display-only',
  'Cached receipt cannot unlock paid content',
  'Offline cache cannot unlock paid content by itself',
  'Paid unlock requires backend-derived receipt/access response',
  'no client-side receipt minting',
];

const doc = readRel('docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md');
for (const phrase of REQUIRED_PHRASES) {
  requireText(doc, phrase, 'docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md');
}

const receiptsPath = 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js';
const receipts = readRel(receiptsPath);
for (const phrase of [
  'display-only',
  'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
  'hasReceiptProof',
  'writeRecentReceipt',
  'readRecentReceipts',
]) {
  requireText(receipts, phrase, receiptsPath);
}

const contentViewPath = 'apps/crablink-tauri/src/shared/api/contentViewClient.js';
const contentView = readRel(contentViewPath);
for (const phrase of [
  'payment requires explicit user confirmation',
  'options.confirmed !== true',
  '/content/view/quote',
  '/content/view/pay',
]) {
  requireText(contentView, phrase, contentViewPath);
}

const assetGatePath = 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx';
const assetGate = readRel(assetGatePath);
for (const phrase of [
  'local cache never grants authorization',
  'writeRecentReceipt',
  'Backend receipt',
]) {
  requireText(assetGate, phrase, assetGatePath);
}

const forbiddenSourceRules = [
  { pattern: /unlock[_-]?paid[_-]?from[_-]?cache/i, reason: 'cache-only paid unlock helper is forbidden' },
  { pattern: /paid[_-]?entitlement\s*[:=]\s*true/i, reason: 'local paid entitlement truth is forbidden' },
  { pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*(paid|entitlement|balance|wallet)[^'"]*['"]/i, reason: 'localStorage must not set paid/wallet/balance truth' },
  { pattern: /sessionStorage\.setItem\s*\(\s*['"][^'"]*(paid|entitlement|balance|wallet)[^'"]*['"]/i, reason: 'sessionStorage must not set paid/wallet/balance truth' },
  { pattern: /receiptCache\s*\.\s*unlock/i, reason: 'receipt cache cannot unlock paid content' },
  { pattern: /recentReceipts\s*\.\s*unlock/i, reason: 'recent receipt cache cannot unlock paid content' },
];

for (const file of walkFiles(path.join(APP, 'src'), ['.js', '.jsx', '.ts', '.tsx'])) {
  const rel = path.relative(ROOT, file);
  const text = readFile(file);

  for (const rule of forbiddenSourceRules) {
    if (rule.pattern.test(text)) {
      fail(`${rel}: ${rule.reason}`);
    }
  }
}

finish('QuickChain paid/cache boundary check passed.');

function readRel(rel) {
  return readFile(path.join(ROOT, rel));
}

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`unable to read ${path.relative(ROOT, file)}: ${error.message}`);
    return '';
  }
}

function requireText(text, needle, rel) {
  if (!text.includes(needle)) {
    fail(`${rel}: missing required phrase: ${needle}`);
  }
}

function walkFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function fail(message) {
  failures.push(message);
}

function finish(message) {
  if (failures.length > 0) {
    console.error('QuickChain paid/cache boundary check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log(message);
}
