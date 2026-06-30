#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Beta Phase 1 CrabLink paid-content client boundary scanner.
 * RO:WHY — Proves CrabLink Tauri/client adapters show explicit paid intent, backend-derived receipts, backend-derived balance refresh, and display-only receipt cache without becoming wallet/ledger truth.
 * RO:INTERACTS — docs/tauri/INTERNAL_ROC_BETA_PHASE1_PAID_CONTENT_CLIENT_BOUNDARY.md, contentView/siteVisit/post/comment/article clients and pages, recentReceipts, tauriPlatform, Tauri Rust command bridge, check-tauri, park script.
 * RO:INVARIANTS — no silent spend; no fake receipt; no fake balance; no cache-only unlock; no direct ledger/wallet mutation; no bridge/staking/liquidity/external settlement scope.
 * RO:SECURITY — rejects client authority shortcuts, unsafe Tauri command names, local paid entitlement markers, raw invoke drift in paid surfaces, and external settlement creep.
 * RO:TEST — node scripts/check-internal-roc-paid-content-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_BETA_PHASE1_PAID_CONTENT_CLIENT_BOUNDARY.md',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  park: 'scripts/dev-quickchain-tauri-park.sh',
  codebundle: 'scripts/make_codebundle.sh',

  gatewayClient: 'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  walletClient: 'apps/crablink-tauri/src/shared/api/walletClient.js',
  contentViewClient: 'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteVisitClient: 'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  postAssetClient: 'apps/crablink-tauri/src/shared/api/postAssetClient.js',
  commentAssetClient: 'apps/crablink-tauri/src/shared/api/commentAssetClient.js',
  articleAssetClient: 'apps/crablink-tauri/src/shared/api/articleAssetClient.js',

  assetContentView: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteVisitAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  postPublish: 'apps/crablink-tauri/src/pages/post/PostPublishFlow.jsx',
  commentPublish: 'apps/crablink-tauri/src/pages/comment/CommentPublishFlow.jsx',
  articlePublish: 'apps/crablink-tauri/src/pages/article/ArticlePublishFlow.jsx',

  receipts: 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  localCatalog: 'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
  tauriPlatform: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
  tauriCommandsMod: 'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
  tauriGatewayCommand: 'apps/crablink-tauri/src-tauri/src/commands/gateway.rs',
  tauriWalletCommand: 'apps/crablink-tauri/src-tauri/src/commands/wallet.rs',
};

const failures = [];

for (const file of Object.values(files)) {
  if (!exists(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

if (failures.length) {
  finish();
}

const doc = read(files.doc);
const appPkg = read(files.appPkg);
const checkTauri = read(files.checkTauri);
const park = read(files.park);
const codebundle = read(files.codebundle);

const gatewayClient = read(files.gatewayClient);
const walletClient = read(files.walletClient);
const contentViewClient = read(files.contentViewClient);
const siteVisitClient = read(files.siteVisitClient);
const postAssetClient = read(files.postAssetClient);
const commentAssetClient = read(files.commentAssetClient);
const articleAssetClient = read(files.articleAssetClient);

const assetContentView = read(files.assetContentView);
const siteVisitAccess = read(files.siteVisitAccess);
const postPublish = read(files.postPublish);
const commentPublish = read(files.commentPublish);
const articlePublish = read(files.articlePublish);

const receipts = read(files.receipts);
const localCatalog = read(files.localCatalog);
const tauriPlatform = read(files.tauriPlatform);
const tauriCommandsMod = read(files.tauriCommandsMod);
const tauriGatewayCommand = read(files.tauriGatewayCommand);
const tauriWalletCommand = read(files.tauriWalletCommand);

need(files.doc, doc, [
  'Internal ROC Beta Phase 1',
  'prepare / quote',
  'explicit user confirmation',
  'backend wallet / ledger receipt',
  'display-only receipt cache',
  'backend-derived balance refresh',
  'CrabLink is display/user intent only',
  'No fake receipts',
  'No fake balances',
  'silent spend',
  'cache-only unlock',
  'Browser-local display cache only. Backend wallet and ledger remain authoritative.',
  'Internal ROC Beta Phase 1 CrabLink paid content client boundary is GREEN / PARKED.',
]);

need(files.appPkg, appPkg, [
  '"check:internal-roc-paid-content-boundary"',
  'check-internal-roc-paid-content-boundary.mjs',
]);

need(files.checkTauri, checkTauri, [
  'npm run check:internal-roc-paid-content-boundary',
]);

need(files.park, park, [
  'Internal ROC Beta Phase 1 CrabLink paid content client boundary parking gate passed',
  'explicit confirmation and backend-derived receipt UX proof complete',
  'display-only receipt cache and backend-derived balance refresh boundary complete',
  'no fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced',
]);

need(files.codebundle, codebundle, [
  'check-internal-roc-paid-content-boundary.mjs',
]);

need(files.gatewayClient, gatewayClient, [
  "callTauri('gateway_request'",
  'sanitizeHeaders',
  'cleanError',
]);

need(files.walletClient, walletClient, [
  'Wallet hold requires explicit caller confirmation.',
  'options.confirmed !== true',
  "this.gateway.request('/wallet/hold'",
]);

need(files.contentViewClient, contentViewClient, [
  'Gateway-only paid content_view quote/pay client',
  'no direct wallet/ledger calls',
  'no fake receipts',
  'payment helper requires confirmed=true',
  '/content/view/quote',
  '/content/view/pay',
  'Content view payment requires explicit user confirmation.',
  'options.confirmed !== true',
  'mutation: true',
]);

need(files.siteVisitClient, siteVisitClient, [
  'Gateway-only paid site_visit quote/pay client',
  'no direct wallet/ledger calls',
  'no fake receipts',
  'payment helper requires confirmed=true',
  'options.confirmed !== true',
  '/visit/quote',
  '/visit/pay',
  'mutation: true',
]);

needAny(files.siteVisitClient, siteVisitClient, [
  'Site visit payment requires explicit user confirmation.',
  'Site visit payment requires explicit caller confirmation.',
]);

checkPublishClient('post', files.postAssetClient, postAssetClient, [
  '/assets/post/prepare',
  '/assets/post',
  'normalizePaidProof',
]);

checkPublishClient('comment', files.commentAssetClient, commentAssetClient, [
  '/assets/comment/prepare',
  '/assets/comment',
  'normalizePaidProof',
]);

checkPublishClient('article', files.articleAssetClient, articleAssetClient, [
  '/assets/article/prepare',
  '/assets/article',
  'normalizePaidProof',
]);

checkPublishPage('post', files.postPublish, postPublish, [
  'createPostAssetClient',
  'createWalletClient',
  'walletClient.hold',
  'confirmed: true',
  'publishPost',
]);

checkPublishPage('comment', files.commentPublish, commentPublish, [
  'createCommentAssetClient',
  'createWalletClient',
  'walletClient.hold',
  'confirmed: true',
  'publishComment',
]);

checkPublishPage('article', files.articlePublish, articlePublish, [
  'createArticleAssetClient',
  'createWalletClient',
  'walletClient.hold',
  'confirmed: true',
  'publishArticle',
]);

need(files.assetContentView, assetContentView, [
  'Explicit paid content_view gate',
  'createContentViewClient',
  'client.pay',
  'confirmed: true',
  'persistContentViewProof',
  'writeRecentReceipt',
  'writeLocalCatalogEntry',
  'void app.refreshWallet(payerAccount)',
  'canView: false',
]);

needAny(files.assetContentView, assetContentView, [
  "status: 'paid'",
  'status: "paid"',
]);

needAny(files.assetContentView, assetContentView, [
  "status: 'error'",
  'status: "error"',
]);

need(files.siteVisitAccess, siteVisitAccess, [
  'Paid site_visit gate',
  'pay button requires explicit user click',
  'no local balance edits',
  'no fake unlock',
  'createSiteVisitClient',
  'confirmed: true',
  'writeRecentReceipt',
  'writeLocalCatalogEntry',
  'canRender',
]);

needAny(files.siteVisitAccess, siteVisitAccess, [
  'visitClient.pay',
  'client.pay',
]);

needAny(files.siteVisitAccess, siteVisitAccess, [
  'void app.refreshWallet(payerAccount)',
  'void app?.refreshWallet?.(payerAccount)',
  'app.refreshWallet(payerAccount)',
  'app?.refreshWallet?.(payerAccount)',
  'refreshWallet(payerAccount)',
  'notifyBalanceRefresh(app, payment, persistedReceipt)',
  'notifyBalanceRefresh',
]);

need(files.receipts, receipts, [
  'Read-only recent receipt collector',
  'display-only',
  'no wallet mutation',
  'no fake receipts',
  'Backend wallet and ledger remain authoritative.',
  'hasReceiptProof',
  'receiptHash',
  'txid',
  'ledgerRoot',
  'clearRecentReceiptCache',
]);

needAny(files.localCatalog, localCatalog, [
  'display-only',
  'display',
]);

need(files.tauriPlatform, tauriPlatform, [
  'Central typed Tauri invoke adapter',
  'ALLOWED_TAURI_COMMANDS',
  'ALLOWED_TAURI_COMMAND_SET',
  'FORBIDDEN_COMMAND_PATTERNS',
  'isAllowedTauriCommand',
  'normalizeCommandName',
  'redactForDisplay',
  'gateway_request',
  'wallet_balance_gateway',
]);

need(files.tauriCommandsMod, tauriCommandsMod, [
  'Command module registry',
  'no run/execute/eval/shell/raw_* commands',
  'gateway',
  'wallet',
]);

need(files.tauriGatewayCommand, tauriGatewayCommand, [
  'Allowlisted svc-gateway request bridge',
  'gateway-first',
  'no direct internal services',
  'no fake balances/receipts',
  'no silent spend',
  'allowlisted public routes only',
  'MAX_BODY_TEXT_BYTES',
  'MAX_RESPONSE_TEXT_BYTES',
]);

need(files.tauriWalletCommand, tauriWalletCommand, [
  'Gateway-backed wallet display commands',
  'display-only',
  'no fake balances',
  'no direct ledger mutation',
  'no silent spend',
  'wallet_balance_gateway',
]);

checkTauriCommandAllowlist();
checkForbiddenClientAuthorityMarkers();
checkNoDirectRawInvokeInPaidSurfaces();

finish();

function checkPublishClient(kind, file, text, phrases) {
  need(file, text, phrases);

  if (!text.includes('mutation: true')) {
    failures.push(`${file} must label mutating gateway publish/prepare path with mutation: true`);
  }

  if (containsAny(lower(text), [
    'ron_ledger::',
    'svc_wallet::',
    'direct_ledger',
    'commit_to_ledger',
    'client_receipt_truth',
    'client_balance_truth',
  ])) {
    failures.push(`${file} contains direct authority marker for ${kind}`);
  }
}

function checkPublishPage(kind, file, text, phrases) {
  need(file, text, phrases);

  if (!text.includes('walletClient.hold') || !text.includes('confirmed: true')) {
    failures.push(`${file} must require explicit confirmed wallet hold for ${kind}`);
  }

  if (!text.includes('refreshWallet')) {
    failures.push(`${file} must refresh wallet/balance from backend after accepted ${kind} path`);
  }

  if (!text.includes('holdReviewOpen') && !text.includes('Review ROC hold') && !text.includes('No ROC has been sent yet.')) {
    failures.push(`${file} must keep visible review/confirmation copy for ${kind} hold/publish`);
  }

  if (containsAny(lower(text), [
    'localstorage.setitem(\'wallet',
    'localstorage.setitem("wallet',
    'localstorage.setitem(`wallet',
    'unlockfromcache',
    'allowpaidunlockfromcache',
    'clientreceipttruth',
    'clientbalancetruth',
  ])) {
    failures.push(`${file} contains forbidden local authority shortcut for ${kind}`);
  }
}

function checkTauriCommandAllowlist() {
  const match = tauriPlatform.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\s*\(\s*\[([\s\S]*?)\]\s*\)/)
    || tauriPlatform.match(/ALLOWED_TAURI_COMMANDS\s*=\s*\[([\s\S]*?)\]/);

  if (!match) {
    failures.push(`${files.tauriPlatform} must expose an ALLOWED_TAURI_COMMANDS array`);
    return;
  }

  const commandNames = [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);

  if (!commandNames.includes('gateway_request')) {
    failures.push('Tauri command allowlist must include gateway_request');
  }

  if (!commandNames.includes('wallet_balance_gateway')) {
    failures.push('Tauri command allowlist must include wallet_balance_gateway');
  }

  for (const command of commandNames) {
    if (command === 'wallet_balance_gateway' || command === 'gateway_request') {
      continue;
    }

    if (/(^raw_|shell|execute|eval|native|ledger|receipt|finality|settlement|bridge|staking|liquidity|rox|solana|payout|spend_authority)/i.test(command)) {
      failures.push(`Tauri allowlist command looks like forbidden authority: ${command}`);
    }
  }
}

function checkForbiddenClientAuthorityMarkers() {
  const scanFiles = [
    files.gatewayClient,
    files.walletClient,
    files.contentViewClient,
    files.siteVisitClient,
    files.postAssetClient,
    files.commentAssetClient,
    files.articleAssetClient,
    files.assetContentView,
    files.siteVisitAccess,
    files.postPublish,
    files.commentPublish,
    files.articlePublish,
    files.receipts,
    files.localCatalog,
    files.tauriPlatform,
    files.tauriGatewayCommand,
    files.tauriWalletCommand,
  ];

  const forbidden = [
    'unlockfromcache',
    'allowpaidunlockfromcache',
    'cacheunlockauthority',
    'receiptcacheauthority',
    'receiptcacheunlock',
    'localreceipttruth',
    'clientreceipttruth',
    'clientbalancetruth',
    'balancefromcache',
    'fakebackendreceipt',
    'fakewalletbalance',
    'silentwalletspend',
    'rawengagementmintsroc',
    'bridge_txid',
    'bridgetxid',
    'staking_position_id',
    'stakingpositionid',
    'liquidity_pool_id',
    'liquiditypoolid',
    'external_settlement_id',
    'externalsettlementid',
  ];

  for (const file of scanFiles) {
    const compact = lower(read(file)).replace(/[^a-z0-9_]+/g, '');

    for (const marker of forbidden) {
      if (compact.includes(marker)) {
        failures.push(`${file} contains forbidden client authority marker: ${marker}`);
      }
    }
  }
}

function checkNoDirectRawInvokeInPaidSurfaces() {
  const paidSurfaceFiles = [
    files.gatewayClient,
    files.walletClient,
    files.contentViewClient,
    files.siteVisitClient,
    files.postAssetClient,
    files.commentAssetClient,
    files.articleAssetClient,
    files.assetContentView,
    files.siteVisitAccess,
    files.postPublish,
    files.commentPublish,
    files.articlePublish,
    files.receipts,
    files.localCatalog,
  ];

  for (const file of paidSurfaceFiles) {
    const text = read(file);

    if (/\binvoke\s*\(/.test(text) || /@tauri-apps\/api\/core/.test(text)) {
      failures.push(`${file} must not import/call raw Tauri invoke; paid surfaces must use typed adapters`);
    }
  }
}

function need(file, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${file} missing required phrase: ${phrase}`);
    }
  }
}

function needAny(file, text, phrases) {
  if (!phrases.some((phrase) => text.includes(phrase))) {
    failures.push(`${file} missing at least one required phrase: ${phrases.join(' OR ')}`);
  }
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function lower(value) {
  return String(value || '').toLowerCase();
}

function containsAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function finish() {
  if (failures.length) {
    console.error('Internal ROC Beta paid-content client boundary check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Internal ROC Beta Phase 1 CrabLink paid content client boundary check passed.');
  console.log('Explicit confirmation, backend-derived receipts, backend-derived balance refresh, display-only receipt cache, and no-silent-spend boundaries are intact.');
}
