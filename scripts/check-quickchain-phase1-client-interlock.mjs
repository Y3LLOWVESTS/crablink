#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QC-1A client interlock scanner.
 * RO:WHY — Completes the Phase 1 Round 1 client pass by rejecting cache-only paid unlocks, local verified-balance claims, and client QuickChain authority.
 * RO:INTERACTS — Tauri React paid gates, wallet/profile shell, gateway/wallet/content clients, Tauri command adapter, QuickChain interlock docs.
 * RO:INVARIANTS — backend response unlocks paid content; cached receipts/catalog entries are display-only; wallet verification is backend-derived; no roots/checkpoints/validators/settlement.
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
  'Phase 1 Round 1 / QC-1A foundation',
  'backend receipt/access response unlocks paid content',
  'cached receipts/catalog entries are display-only',
  'Wallet and balance UI may display cached labels',
  'QuickChain readiness is display-only',
  'CrabLink Tauri is display and user intent only',
];

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!exists(file)) {
    failures.push(`missing required Phase 1 client interlock file: ${file}`);
  }
}

const docText = readRequired(DOC);
requirePhrases(DOC, docText, REQUIRED_DOC_PHRASES);

checkPackageScripts();
checkParkMarker();
checkSiteVisitGate();
checkAssetContentGate();
checkBalanceVerification();
checkQuickchainReadiness();
checkTauriCommandBoundary();
checkGatewayFirstClients();

if (failures.length) {
  console.error('QuickChain Phase 1 client interlock check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain Phase 1 client interlock check passed.');

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
    'Phase 1 Round 1 foundation parking gate',
    'scripts/check-tauri.sh',
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
    'source: \'site_visit_payment_success\'',
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

  if (/\/quickchain\/(?:root|checkpoint|validator|settlement|bridge|anchor|finality)/i.test(text)) {
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

  const forbiddenAllowedCommand = /['"`](?:quickchain[_-]?(?:root|checkpoint|validator|settlement)|produce[_-]?(?:root|checkpoint)|validator[_-]?signature|settlement[_-]?proof|bridge[_-]?proof|unlock[_-]?paid[_-]?from[_-]?cache|direct[_-]?(?:wallet|ledger)[_-]?mutate)['"`]/i;
  if (forbiddenAllowedCommand.test(text)) {
    failures.push(`${rel} allowlist contains a forbidden authority-shaped command`);
  }
}

function checkGatewayFirstClients() {
  const gatewayClient = readRequired('apps/crablink-tauri/src/shared/api/gatewayClient.js');
  const walletClient = readRequired('apps/crablink-tauri/src/shared/api/walletClient.js');
  const contentViewClient = readRequired('apps/crablink-tauri/src/shared/api/contentViewClient.js');
  const siteVisitClient = readRequired('apps/crablink-tauri/src/shared/api/siteVisitClient.js');

  requireIncludes('apps/crablink-tauri/src/shared/api/gatewayClient.js', gatewayClient, [
    'baseUrl = \'http://127.0.0.1:8090\'',
    'callTauri(\'gateway_request\'',
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

  if (/\/quickchain\/(?:root|checkpoint|validator|settlement|bridge|anchor|finality)/i.test(combined)) {
    failures.push('gateway/client API files must not expose active QuickChain authority routes');
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

function requirePhrases(rel, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${rel} must contain required interlock phrase: ${phrase}`);
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
      failures.push(`${rel} must not include cache-authority marker: ${snippet}`);
    }
  }
}
