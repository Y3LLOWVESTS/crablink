#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain paid/cache authority scanner.
 * RO:WHY — Ensures local receipts, catalogs, settings, and offline bytes cannot become paid-access, wallet, ledger, or receipt truth.
 * RO:INTERACTS — recentReceipts, localCatalog, paid content viewers, wallet/content-view clients, QuickChain paid/cache docs.
 * RO:INVARIANTS — backend receipt/access response unlocks; local cache is display-only; no fake balance/receipt/finality.
 * RO:SECURITY — rejects cache-only paid unlock and entitlement naming drift.
 * RO:TEST — node scripts/check-quickchain-paid-cache-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const REQUIRED_FILES = [
  'docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md',
  'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
];

const SOURCE_DIRS = [
  'apps/crablink-tauri/src/shared/receipts',
  'apps/crablink-tauri/src/shared/catalog',
  'apps/crablink-tauri/src/shared/api',
  'apps/crablink-tauri/src/pages/asset',
  'apps/crablink-tauri/src/pages/site',
];

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.vite', '.turbo']);

const DANGEROUS_CACHE_AUTHORITY_RE = /(?:allowPaidUnlockFromCache|allow_paid_unlock_from_cache|unlockFromCache|unlock_from_cache|cacheOnlyPaidUnlock|cache_only_paid_unlock|receiptCacheUnlock|receipt_cache_unlock|receiptCacheEntitlement|receipt_cache_entitlement|cachedEntitlement|cached_entitlement|offlinePaidEntitlement|offline_paid_entitlement|balanceFromCache|balance_from_cache|receiptFromCache|receipt_from_cache|fabricateReceipt|fabricate_receipt|fakeReceipt|fake_receipt|fakeBalance|fake_balance|mintReceipt|mint_receipt|clientReceiptMint|client_receipt_mint)/;
const SAFE_BOUNDARY_RE = /(?:display-only|display cache|Backend|backend|truthBoundary|no fake|no silent|local cache never grants authorization|local-only display cache|UX hint|not backend truth|wallet and ledger remain authoritative)/i;

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    failures.push(`missing required paid/cache boundary file: ${file}`);
  }
}

const paidDoc = readRequired('docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md');
requirePhrases('docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md', paidDoc, [
  'Receipt display cache is display-only',
  'Cached receipt cannot unlock paid content',
  'Paid unlock requires backend-derived receipt/access response',
  'Offline cache cannot create receipt, balance, or entitlement truth',
  'Forbidden paid flow',
]);

for (const file of collectFiles(SOURCE_DIRS)) {
  const rel = normalizeRel(path.relative(ROOT, file));
  const text = fs.readFileSync(file, 'utf8');

  if (DANGEROUS_CACHE_AUTHORITY_RE.test(text)) {
    failures.push(`${rel} contains cache-authority naming that looks like local paid unlock / fake truth`);
  }

  const touchesBrowserStorage = /\b(?:localStorage|sessionStorage)\b/.test(text);
  const mentionsEconomicTruth = /(?:receipt|balance|paid|unlock|entitlement|wallet|ledger|finality|settlement|nonce)/i.test(text);

  if (touchesBrowserStorage && mentionsEconomicTruth && !SAFE_BOUNDARY_RE.test(text)) {
    failures.push(`${rel} uses browser storage near paid/wallet/receipt language without an explicit display-only/backend-truth boundary`);
  }

  if (/\bcanView\s*:\s*true\b/.test(text) && /(?:localStorage|sessionStorage|readRecentReceipts|readLocalCatalog)/.test(text)) {
    failures.push(`${rel} appears to grant canView from local storage/catalog/receipt cache`);
  }
}

if (failures.length) {
  console.error('QuickChain paid/cache boundary check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain paid/cache boundary check passed.');

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

function collectFiles(relativeDirs) {
  const out = [];

  for (const relDir of relativeDirs) {
    const dir = path.join(ROOT, relDir);
    if (fs.existsSync(dir)) {
      walk(dir, out);
    }
  }

  return out.sort();
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(abs, out);
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      out.push(abs);
    }
  }
}

function normalizeRel(value) {
  return String(value || '').split(path.sep).join('/');
}
