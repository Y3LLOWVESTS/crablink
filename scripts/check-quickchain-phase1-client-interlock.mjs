#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri Phase 1 Round 2 final client-boundary scanner.
 * RO:WHY — Parks the final Round 2 client pair by rejecting cache-only paid unlocks, local verified-balance claims, and client QuickChain authority.
 * RO:INTERACTS — Tauri React paid gates, wallet/profile shell, gateway/wallet/content clients, Tauri command adapter, QuickChain interlock docs.
 * RO:INVARIANTS — backend response unlocks paid content; cached receipts/catalog entries are display-only; wallet verification is backend-derived; no roots/proofs/checkpoints/validators/settlement.
 * RO:SECURITY — rejects fake receipts, fake balances, silent spend, cache-only entitlement, direct wallet/ledger mutation, ROX/Solana/bridge/staking/liquidity authority.
 * RO:TEST — node scripts/check-quickchain-phase1-client-interlock.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const DOC = 'docs/tauri/QUICKCHAIN_PHASE1_CLIENT_INTERLOCK.md';

const REQUIRED_FILES = [
  DOC,
  'apps/crablink-tauri/package.json',
  'scripts/check-tauri.sh',
  'scripts/dev-quickchain-tauri-park.sh',
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx',
  'apps/crablink-tauri/src/app/shell/BalanceChip.jsx',
  'apps/crablink-tauri/src/app/shell/PassportSummary.jsx',
  'apps/crablink-tauri/src/app/shell/TopBar.jsx',
  'apps/crablink-tauri/src/pages/profile/profileDraftModel.js',
  'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
];

const REQUIRED_DOC_PHRASES = [
  'Phase 1 Round 2 final downstream/client boundary pass',
  'backend/service crate-pair sweep is parked',
  'CrabLink Tauri + client adapters are the final Phase 1 Round 2 pair',
  'backend receipt/access response unlocks paid content',
  'cached receipts/catalog entries are display-only',
  'Wallet and balance UI may display cached labels',
  'Display-only receipt cache is not paid unlock authority.',
  'Verified b3 proves bytes, not paid entitlement.',
  'QuickChain readiness is display-only',
  'QuickChain readiness UI is informational, not authority.',
  'CrabLink Tauri is display and user intent only',
];

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!exists(file)) {
    failures.push(`missing required Phase 1 Round 2 client interlock file: ${file}`);
  }
}

const docText = readRequired(DOC);
requirePhrases(DOC, docText, REQUIRED_DOC_PHRASES);

checkPackageScripts();
checkParkMarker();
checkSiteVisitGate();
checkAssetContentGate();
checkBalanceVerification();
checkDisplayCacheBoundaries();
checkQuickchainReadiness();
checkTauriCommandBoundary();
checkGatewayFirstClients();
checkNoDirectAuthorityCalls();

if (failures.length) {
  console.error('QuickChain Phase 1 Round 2 client interlock check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain Phase 1 Round 2 client interlock check passed.');

function checkPackageScripts() {
  const pkg = readRequired('apps/crablink-tauri/package.json');
  const checkTauri = readRequired('scripts/check-tauri.sh');

  requireIncludes('apps/crablink-tauri/package.json', pkg, [
    '"check:quickchain-phase1-interlock"',
    'check-quickchain-phase1-client-interlock.mjs',
  ]);

  if (!/npm run check:quickchain-readiness-boundary[\s\S]*npm run check:quickchain-phase1-interlock[\s\S]*npm run build/.test(checkTauri)) {
    failures.push('scripts/check-tauri.sh must run check:quickchain-phase1-interlock after readiness boundary and before build');
  }
}

function checkParkMarker() {
  const park = readRequired('scripts/dev-quickchain-tauri-park.sh');

  requireIncludes('scripts/dev-quickchain-tauri-park.sh', park, [
    'Phase 1 Round 2 final client parking gate',
    'scripts/check-tauri.sh',
  ]);

  rejectIncludes('scripts/dev-quickchain-tauri-park.sh', park, [
    'Phase 1 Round 1 foundation parking gate',
    'Phase-0 parking gate passed',
  ]);
}

function checkSiteVisitGate() {
  const rel = 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx';
  const text = readRequired(rel);

  requireIncludes(rel, text, [
    'render unlock follows the live backend quote/pay response only',
    'cached receipts as entitlement truth',
    'visitClient.pay(',
    '{ confirmed: true }',
    "source: 'site_visit_payment_success'",
    'This is a local display copy of backend-returned receipt metadata',
  ]);

  rejectIncludes(rel, text, [
    'readSessionReceipt',
    'writeSessionReceipt',
    'removeSessionReceipt',
    'receipt_session_key',
    'SESSION_PREFIX',
    'paidFromSession',
    'Clear session receipt',
  ]);

  if (/sessionStorage[\s\S]{0,900}(?:canRender|canView)\s*:\s*true/.test(text) ||
      /(?:canRender|canView)\s*:\s*true[\s\S]{0,900}sessionStorage/.test(text)) {
    failures.push(`${rel} appears to grant render/view access from sessionStorage`);
  }

  if (/readRecentReceipts|readLocalCatalog/.test(text)) {
    failures.push(`${rel} must not read display caches while deciding paid site render access`);
  }
}

function checkAssetContentGate() {
  const rel = 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx';
  const text = readRequired(rel);

  requireIncludes(rel, text, [
    'receipt cache is display-only',
    'local cache never grants authorization',
    'client.pay(',
    'confirmed: true',
    'writeRecentReceipt',
  ]);

  if (/readRecentReceipts|readLocalCatalog|sessionStorage|localStorage/.test(text)) {
    failures.push(`${rel} must not read local caches/storage while deciding paid content_view access`);
  }

  if (/(?:readRecentReceipts|readLocalCatalog|sessionStorage|localStorage)[\s\S]{0,900}canView\s*:\s*true/.test(text) ||
      /canView\s*:\s*true[\s\S]{0,900}(?:readRecentReceipts|readLocalCatalog|sessionStorage|localStorage)/.test(text)) {
    failures.push(`${rel} appears to grant canView from local cache/storage`);
  }
}

function checkBalanceVerification() {
  const rels = [
    'apps/crablink-tauri/src/app/shell/BalanceChip.jsx',
    'apps/crablink-tauri/src/app/shell/PassportSummary.jsx',
    'apps/crablink-tauri/src/app/shell/TopBar.jsx',
    'apps/crablink-tauri/src/pages/profile/profileDraftModel.js',
  ];

  for (const rel of rels) {
    const text = readRequired(rel);

    if (/settings\.rocLedgerBacked/.test(text)) {
      failures.push(`${rel} must not treat stored settings.rocLedgerBacked as verified balance/ledger truth`);
    }
  }

  requireIncludes('apps/crablink-tauri/src/app/shell/BalanceChip.jsx', readRequired('apps/crablink-tauri/src/app/shell/BalanceChip.jsx'), [
    "walletBody.source === 'ledger'",
    'Display-only wallet balance',
  ]);

  requireIncludes('apps/crablink-tauri/src/app/shell/TopBar.jsx', readRequired('apps/crablink-tauri/src/app/shell/TopBar.jsx'), [
    'ROC cache boundary',
    'Stored display hint only; refresh wallet for backend ledger status',
  ]);
}

function checkDisplayCacheBoundaries() {
  const receiptRel = 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js';
  const catalogRel = 'apps/crablink-tauri/src/shared/catalog/localCatalog.js';
  const receipts = readRequired(receiptRel);
  const catalog = readRequired(catalogRel);

  requireIncludes(receiptRel, receipts, [
    'Read-only recent receipt collector',
    'display-only',
    'Backend wallet and ledger remain authoritative',
  ]);

  requireIncludes(catalogRel, catalog, [
    'Local display-only CrabLink catalog collector',
    'local-only display cache',
    'not a backend public catalogue, ownership index, or proof of publication',
  ]);

  const combined = `${receipts}\n${catalog}`;
  if (/(?:canView|canRender|authorized|entitled)\s*:\s*true/.test(combined)) {
    failures.push('local catalog/recent receipt caches must not export authorization-shaped true flags');
  }
}

function checkQuickchainReadiness() {
  const rel = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
  const text = readRequired(rel);

  requireIncludes(rel, text, [
    'display-only',
    'no chain logic',
    'readLocalCatalog',
    'subscribeLocalCatalog',
    'readRecentReceipts',
    'subscribeRecentReceipts',
    'This is a CrabLink display/readiness dashboard',
  ]);

  if (/from\s+['"][^'"]*(?:gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|gatewayAdapter|receiptsAdapter)['"]/.test(text)) {
    failures.push(`${rel} must not import active gateway/wallet/client adapters`);
  }

  if (/\b(?:invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway|resolve_crab_url_gateway|health_check_gateway|ready_check_gateway)\b/.test(text)) {
    failures.push(`${rel} must not call gateway/Tauri/fetch APIs`);
  }

  if (/\/quickchain\/(?:root|proof|checkpoint|validator|settlement|bridge|anchor|finality)/i.test(text)) {
    failures.push(`${rel} must not reference active QuickChain authority routes`);
  }
}

function checkTauriCommandBoundary() {
  const rel = 'apps/crablink-tauri/src/platform/tauriPlatform.js';
  const text = readRequired(rel);

  requireIncludes(rel, text, [
    'ALLOWED_TAURI_COMMANDS',
    'FORBIDDEN_COMMAND_PATTERNS',
    'isAllowedTauriCommand',
    'redactForDisplay',
    'unlock[_-]?paid[_-]?from[_-]?cache',
  ]);

  const allowedList = extractAllowedCommandList(text);
  for (const command of allowedList) {
    if (forbiddenAuthorityCommand(command)) {
      failures.push(`${rel} allowlist contains forbidden authority-shaped command: ${command}`);
    }
  }

  const rustCommandFiles = collectFiles('apps/crablink-tauri/src-tauri/src', new Set(['.rs']));
  for (const file of rustCommandFiles) {
    const relPath = normalizeRel(path.relative(ROOT, file));
    const body = fs.readFileSync(file, 'utf8');
    const commandNames = [...body.matchAll(/#\s*\[\s*tauri::command\s*\][\s\S]{0,320}?pub\s+(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
    for (const command of commandNames) {
      if (forbiddenAuthorityCommand(command)) {
        failures.push(`${relPath} exposes forbidden Tauri authority command: ${command}`);
      }
    }
  }
}

function checkGatewayFirstClients() {
  const gatewayClient = readRequired('apps/crablink-tauri/src/shared/api/gatewayClient.js');
  const walletClient = readRequired('apps/crablink-tauri/src/shared/api/walletClient.js');
  const contentViewClient = readRequired('apps/crablink-tauri/src/shared/api/contentViewClient.js');
  const siteVisitClient = readRequired('apps/crablink-tauri/src/shared/api/siteVisitClient.js');

  requireIncludes('apps/crablink-tauri/src/shared/api/gatewayClient.js', gatewayClient, [
    "baseUrl = 'http://127.0.0.1:8090'",
    "callTauri('gateway_request'",
    'sanitizeHeaders',
    'cleanError',
  ]);

  requireIncludes('apps/crablink-tauri/src/shared/api/walletClient.js', walletClient, [
    'Wallet hold requires explicit caller confirmation.',
    'options.confirmed !== true',
    "this.gateway.request('/wallet/hold'",
    'browser-local nonce hint is only a UX hint, never backend truth',
  ]);

  requireIncludes('apps/crablink-tauri/src/shared/api/contentViewClient.js', contentViewClient, [
    'Content view payment requires explicit user confirmation.',
    'options.confirmed !== true',
    "this.gateway.request('/content/view/pay'",
  ]);

  requireIncludes('apps/crablink-tauri/src/shared/api/siteVisitClient.js', siteVisitClient, [
    'Site visit payment requires explicit caller confirmation.',
    'options.confirmed !== true',
    '/visit/pay',
  ]);

  const combined = [gatewayClient, walletClient, contentViewClient, siteVisitClient].join('\n');
  if (/https?:\/\/(?:127\.0\.0\.1|localhost):(?!8090\b)\d+/i.test(combined)) {
    failures.push('gateway/client API files must not hard-code direct non-gateway localhost service URLs');
  }

  if (/\/quickchain\/(?:root|proof|checkpoint|validator|settlement|bridge|anchor|finality)/i.test(combined)) {
    failures.push('gateway/client API files must not expose active QuickChain authority routes');
  }
}

function checkNoDirectAuthorityCalls() {
  const runtimeFiles = [
    ...collectFiles('apps/crablink-tauri/src', new Set(['.js', '.jsx', '.ts', '.tsx'])),
    ...collectFiles('packages/crablink-platform/src', new Set(['.js', '.ts'])),
    ...collectFiles('packages/crablink-core/src', new Set(['.js', '.ts'])),
  ];

  const directInvokeImport = /import\s*\{[^}]*\binvoke\b[^}]*\}\s*from\s+['"]@tauri-apps\/api\/core['"]|\binvoke\s*\(/;
  const authorityRouteCall = /(?:fetch|request|callTauri|invoke)\s*\([\s\S]{0,160}['"][^'"]*(?:quickchain\/(?:root|proof|checkpoint|validator|settlement|bridge|anchor|finality)|direct[_-]?(?:wallet|ledger)[_-]?mutate|unlock[_-]?paid[_-]?from[_-]?cache)/i;

  for (const file of runtimeFiles) {
    const rel = normalizeRel(path.relative(ROOT, file));
    const text = fs.readFileSync(file, 'utf8');

    if (rel !== 'apps/crablink-tauri/src/platform/tauriPlatform.js' && directInvokeImport.test(text)) {
      failures.push(`${rel} must not import/call raw Tauri invoke; use platform/tauriPlatform.js`);
    }

    if (authorityRouteCall.test(text)) {
      failures.push(`${rel} appears to call a forbidden QuickChain/client authority route or command`);
    }
  }
}

function forbiddenAuthorityCommand(command) {
  return /(?:quickchain[_-]?(?:root|proof|checkpoint|validator|settle|settlement|finality)|produce[_-]?(?:root|proof|checkpoint)|validator[_-]?signature|settlement[_-]?proof|bridge[_-]?(?:proof|anchor)|unlock[_-]?paid[_-]?from[_-]?cache|direct[_-]?(?:wallet|ledger)[_-]?mutate|(?:^|[_-])(?:rox|solana|staking|liquidity)(?:[_-]|$))/i.test(String(command || ''));
}

function extractAllowedCommandList(text) {
  const match = text.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
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

function requirePhrases(rel, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${rel} must contain required Round 2 interlock phrase: ${phrase}`);
    }
  }
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
      failures.push(`${rel} must not include forbidden/cache-authority marker: ${snippet}`);
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

function normalizeRel(value) {
  return String(value || '').split(path.sep).join('/');
}
