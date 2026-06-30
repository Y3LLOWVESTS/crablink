#!/usr/bin/env node
/**
 * RO:WHAT — Internal ROC Beta Phase 2 Round 2 CrabLink replay/audit visibility boundary scanner.
 * RO:WHY — Finishes Phase 2 client display proof without allowing replay/conservation/audit status to become paid unlock, balance, receipt, finality, settlement, wallet, ledger, bridge, staking, or liquidity authority.
 * RO:INTERACTS — docs/tauri/INTERNAL_ROC_BETA_PHASE2_REPLAY_VISIBILITY_CLIENT_BOUNDARY.md, QuickchainReadinessPage.jsx, ReceiptsPage.jsx, RecentReceiptsPanel.jsx, recentReceipts.js, tauriPlatform.js, check-tauri.sh, dev-quickchain-tauri-park.sh.
 * RO:INVARIANTS — display-only replay/audit status; backend access truth still controls paid unlock; accepted backend wallet/ledger receipt remains payment truth.
 * RO:SECURITY — rejects replay-status unlock, fake receipt, fake balance, fake finality, silent spend, bridge, staking, liquidity, exchange-facing, and external settlement drift.
 * RO:TEST — node scripts/check-internal-roc-phase2-replay-visibility.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const files = {
  doc: 'docs/tauri/INTERNAL_ROC_BETA_PHASE2_REPLAY_VISIBILITY_CLIENT_BOUNDARY.md',
  appPkg: 'apps/crablink-tauri/package.json',
  checkTauri: 'scripts/check-tauri.sh',
  park: 'scripts/dev-quickchain-tauri-park.sh',
  codebundle: 'scripts/make_codebundle.sh',

  quickchainPage: 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx',
  receiptsPage: 'apps/crablink-tauri/src/pages/receipts/ReceiptsPage.jsx',
  recentReceiptsPanel: 'apps/crablink-tauri/src/app/shell/RecentReceiptsPanel.jsx',
  recentReceipts: 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  localCatalog: 'apps/crablink-tauri/src/shared/catalog/localCatalog.js',

  tauriPlatform: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
  gatewayClient: 'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  walletClient: 'apps/crablink-tauri/src/shared/api/walletClient.js',
  contentViewClient: 'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteVisitClient: 'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  assetContentView: 'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  siteVisitAccess: 'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
};

const failures = [];

for (const file of Object.values(files)) {
  if (!exists(file)) {
    failures.push(`missing required Internal ROC Phase 2 client boundary file: ${file}`);
  }
}

const doc = readRequired(files.doc);
const pkg = readRequired(files.appPkg);
const checkTauri = readRequired(files.checkTauri);
const park = readRequired(files.park);
const codebundle = readRequired(files.codebundle);
const quickchainPage = readRequired(files.quickchainPage);
const receiptsPage = readRequired(files.receiptsPage);
const recentReceiptsPanel = readRequired(files.recentReceiptsPanel);
const recentReceipts = readRequired(files.recentReceipts);
const tauriPlatform = readRequired(files.tauriPlatform);

requireIncludes(files.doc, doc, [
  'Internal ROC Beta Phase 2 Round 2 — CrabLink Tauri + client adapters',
  'Replay/conservation status is display-only.',
  'Missing replay/audit status does not fabricate truth.',
  'Stale/offline replay/audit labels are honest.',
  'Paid unlock still depends on backend access truth.',
  'Accepted backend wallet/ledger receipts remain the only paid unlock authority.',
  'Receipt cache remains display-only.',
  'CrabLink does not mutate wallet.',
  'CrabLink does not mutate ledger.',
  'CrabLink does not verify replay as authority.',
  'CrabLink does not claim finality from replay status.',
  'Internal ROC Beta Phase 2 replay/conservation proof complete.',
]);

requireIncludes(files.quickchainPage, quickchainPage, [
  'Internal ROC Beta Phase 2 Round 2: downstream replay/audit visibility',
  'replay/audit status is display-only',
  'missing replay/audit status stays unavailable/stale and never fabricates truth',
  'paid unlock still depends on backend access truth',
  'accepted backend wallet/ledger receipts remain the only paid unlock authority',
  'no client-side replay authority',
]);

requireIncludes(files.receiptsPage, receiptsPage, [
  'Internal ROC Beta Phase 2 receipt replay/audit detail posture',
  'receipt replay/audit labels are optional display metadata',
  'receipt replay/audit labels cannot unlock paid content',
  'receipt replay/audit labels cannot claim finality or settlement',
]);

requireIncludes(files.recentReceiptsPanel, recentReceiptsPanel, [
  'Internal ROC Beta Phase 2 compact receipt replay/audit posture',
  'recent receipt replay/audit labels are display-only',
  'recent receipt replay/audit labels are not paid unlock authority',
]);

requireIncludes(files.recentReceipts, recentReceipts, [
  'Internal ROC Beta Phase 2 receipt cache replay/audit posture',
  'local receipt replay/audit labels are display-only',
  'local receipt replay/audit labels cannot create receipt truth',
  'local receipt replay/audit labels cannot create paid unlock authority',
]);

checkPackageScripts(pkg);
checkTauriOrder(checkTauri);
checkParkMarkers(park);
checkCodebundle(codebundle);
checkQuickchainReadinessPage(quickchainPage);
checkReceiptDisplaySurfaces(receiptsPage, recentReceiptsPanel, recentReceipts);
checkPaidAccessStillBackendDerived();
checkTauriCommandBoundary(tauriPlatform);
scanClientSourceForForbiddenAuthority();

finish();

function checkPackageScripts(text) {
  requireIncludes(files.appPkg, text, [
    '"check:internal-roc-phase2-replay-visibility"',
    'check-internal-roc-phase2-replay-visibility.mjs',
  ]);

  if (!/check:quickchain-phase2-replay-boundary[\s\S]*check:internal-roc-phase2-replay-visibility[\s\S]*check:quickchain-phase2-committee-boundary/.test(text)) {
    failures.push(`${files.appPkg} must run check:internal-roc-phase2-replay-visibility after quickchain phase2 replay boundary and before phase2 committee boundary`);
  }
}

function checkTauriOrder(text) {
  requireIncludes(files.checkTauri, text, [
    'npm run check:internal-roc-phase2-replay-visibility',
  ]);

  if (!/npm run check:quickchain-phase2-replay-boundary[\s\S]*npm run check:internal-roc-phase2-replay-visibility[\s\S]*npm run check:quickchain-phase2-committee-boundary/.test(text)) {
    failures.push(`${files.checkTauri} must run Internal ROC Phase 2 replay visibility after quickchain phase2 replay boundary and before phase2 committee boundary`);
  }
}

function checkParkMarkers(text) {
  requireIncludes(files.park, text, [
    'Internal ROC Beta Phase 2 CrabLink replay/audit visibility boundary parking gate passed',
    'Internal ROC Beta Phase 2 replay/conservation proof complete',
    'display-only replay/audit labels and honest stale/offline status complete',
    'no client-side replay authority, fake receipts, fake balances, fake finality, silent spend, cache-only unlock, bridge, staking, liquidity, ROX/Solana, or external settlement introduced',
  ]);
}

function checkCodebundle(text) {
  requireIncludes(files.codebundle, text, [
    'scripts/check-internal-roc-phase2-replay-visibility.mjs',
    '$ROOT/scripts/check-internal-roc-phase2-replay-visibility.mjs',
  ]);
}

function checkQuickchainReadinessPage(text) {
  if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|gatewayAdapter|receiptsAdapter)['"]/.test(text)) {
    failures.push(`${files.quickchainPage} must not import active gateway/wallet/Tauri adapters for replay/audit display`);
  }

  if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(text)) {
    failures.push(`${files.quickchainPage} must not make active runtime calls for replay/audit display`);
  }

  for (const required of ['readLocalCatalog', 'subscribeLocalCatalog', 'readRecentReceipts', 'subscribeRecentReceipts']) {
    if (!text.includes(required)) {
      failures.push(`${files.quickchainPage} should keep using display-only local evidence source: ${required}`);
    }
  }

  rejectIncludes(files.quickchainPage, text, [
    'unlockFromReplayStatus',
    'unlockFromReplayAudit',
    'paidAccessFromReplayStatus',
    'receiptTruthFromReplayStatus',
    'balanceTruthFromReplayStatus',
    'finalityTruthFromReplayStatus',
    'settlementTruthFromReplayStatus',
    'bridgeFromReplayStatus',
    'stakingFromReplayStatus',
    'liquidityFromReplayStatus',
  ]);
}

function checkReceiptDisplaySurfaces(receiptsPageText, recentPanelText, cacheText) {
  for (const [label, text] of [
    [files.receiptsPage, receiptsPageText],
    [files.recentReceiptsPanel, recentPanelText],
    [files.recentReceipts, cacheText],
  ]) {
    rejectIncludes(label, text, [
      'unlockFromReplayStatus',
      'unlockFromReplayAudit',
      'canViewFromReplayStatus',
      'canRenderFromReplayStatus',
      'paidAccessFromReplayStatus',
      'receiptTruthFromReplayStatus',
      'balanceTruthFromReplayStatus',
      'finalityTruthFromReplayStatus',
      'settlementTruthFromReplayStatus',
      'cacheUnlockFromReplayStatus',
    ]);
  }

  if (/replay(?:Status|Audit)[\s\S]{0,280}(?:canView|canRender|unlocked)\s*:\s*true/.test(receiptsPageText + recentPanelText + cacheText)) {
    failures.push('receipt display surfaces appear to allow replay/audit status to create view/render/unlock truth');
  }
}

function checkPaidAccessStillBackendDerived() {
  const asset = readRequired(files.assetContentView);
  const site = readRequired(files.siteVisitAccess);

  requireIncludes(files.assetContentView, asset, [
    'receipt cache is display-only',
    'local cache never grants authorization',
    'client.pay(',
    'confirmed: true',
  ]);

  requireIncludes(files.siteVisitAccess, site, [
    'render unlock follows the live backend quote/pay response only',
    'cached receipts as entitlement truth',
    'visitClient.pay(',
    '{ confirmed: true }',
  ]);

  for (const [label, text] of [
    [files.assetContentView, asset],
    [files.siteVisitAccess, site],
  ]) {
    if (/replay(?:Status|Audit|Visibility)[\s\S]{0,420}(?:canView|canRender|unlocked)\s*:\s*true/.test(text)) {
      failures.push(`${label} appears to unlock from replay/audit visibility`);
    }

    rejectIncludes(label, text, [
      'unlockFromReplayStatus',
      'paidAccessFromReplayStatus',
      'cacheUnlockFromReplayStatus',
      'receiptTruthFromReplayStatus',
      'balanceTruthFromReplayStatus',
    ]);
  }
}

function checkTauriCommandBoundary(text) {
  requireIncludes(files.tauriPlatform, text, [
    'ALLOWED_TAURI_COMMANDS',
    'FORBIDDEN_COMMAND_PATTERNS',
  ]);

  const allowed = extractAllowedCommandList(text);

  for (const command of allowed) {
    if (forbiddenCommand(command)) {
      failures.push(`${files.tauriPlatform} allowed command must not expose Internal ROC Phase 2 replay/audit authority command: ${command}`);
    }
  }
}

function scanClientSourceForForbiddenAuthority() {
  const roots = [
    'apps/crablink-tauri/src',
    'packages/crablink-platform/src',
  ];

  const forbiddenCompact = [
    'unlockfromreplaystatus',
    'unlockfromreplayaudit',
    'paidaccessfromreplaystatus',
    'paidaccessfromreplayaudit',
    'receipttruthfromreplaystatus',
    'balancetruthfromreplaystatus',
    'finalitytruthfromreplaystatus',
    'settlementtruthfromreplaystatus',
    'cacheunlockfromreplaystatus',
    'walletmutationfromreplaystatus',
    'ledgermutationfromreplaystatus',
    'bridgefromreplaystatus',
    'stakingfromreplaystatus',
    'liquidityfromreplaystatus',
    'replaystatuspaidunlockauthority:true',
    '"replaystatuspaidunlockauthority":true',
    'replaystatusfinalitytruth:true',
    '"replaystatusfinalitytruth":true',
    'replaystatussettlementtruth:true',
    '"replaystatussettlementtruth":true',
  ];

  for (const root of roots) {
    for (const abs of collectFiles(root, new Set(['.js', '.jsx', '.ts', '.tsx', '.rs']))) {
      const rel = normalizeRel(path.relative(ROOT, abs));
      const text = fs.readFileSync(abs, 'utf8');
      const compact = compactForScan(stripComments(text));

      for (const forbidden of forbiddenCompact) {
        if (compact.includes(forbidden)) {
          failures.push(`${rel} must not contain forbidden Internal ROC Phase 2 replay/audit authority marker: ${forbidden}`);
        }
      }

      if (/\b(rox|solana|staking|liquidity|exchange|bridge)[A-Za-z0-9_]*(?:Replay|Audit|Receipt|Unlock|Settlement)/.test(text)) {
        failures.push(`${rel} appears to couple replay/audit display to external settlement/bridge/staking/liquidity scope`);
      }
    }
  }
}

function forbiddenCommand(command) {
  const compact = compactForScan(command);

  const forbiddenPieces = [
    'replayexecute',
    'replayverify',
    'replayfinalize',
    'replaysettle',
    'replayunlock',
    'replaymutate',
    'auditunlock',
    'auditsettle',
    'auditfinalize',
    'quickchainroot',
    'quickchainproof',
    'quickchaincheckpoint',
    'quickchainvalidator',
    'quickchainsettle',
    'quickchainsettlement',
    'quickchainfinality',
    'produceroot',
    'produceproof',
    'producecheckpoint',
    'validatorsignature',
    'settlementproof',
    'bridgeproof',
    'bridgeanchor',
    'unlockpaidfromcache',
    'unlockpaidfromreplay',
    'unlockpaidfromaudit',
    'directwalletmutate',
    'directledgermutate',
    'rox',
    'solana',
    'staking',
    'liquidity',
  ];

  return forbiddenPieces.some((piece) => compact.includes(piece));
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
      failures.push(`${rel} must not include forbidden authority marker: ${snippet}`);
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
    console.error('Internal ROC Beta Phase 2 CrabLink replay/audit visibility boundary check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('Internal ROC Beta Phase 2 CrabLink replay/audit visibility boundary check passed.');
  console.log('Display-only replay/audit labels, honest stale/offline status, backend access truth, and no client-side replay authority are intact.');
}
