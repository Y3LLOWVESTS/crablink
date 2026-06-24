#!/usr/bin/env node
/** RO:WHAT — Phase 2 Round 2 small committee readiness boundary scanner. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const docPath = 'docs/tauri/QUICKCHAIN_PHASE2_COMMITTEE_BOUNDARY.md';
const pagePath = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const pkgPath = 'apps/crablink-tauri/package.json';
const tauriPath = 'apps/crablink-tauri/src/platform/tauriPlatform.js';
const clientFiles = [
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
];
const required = [docPath, pagePath, pkgPath, tauriPath, 'scripts/check-tauri.sh', 'scripts/dev-quickchain-tauri-park.sh', 'scripts/check-quickchain-phase2-client-replay-boundary.mjs', ...clientFiles, 'apps/crablink-tauri/src/shared/receipts/recentReceipts.js', 'apps/crablink-tauri/src/shared/catalog/localCatalog.js'];
for (const f of required) if (!exists(f)) failures.push(`missing required Phase 2 committee boundary file: ${f}`);
const doc = read(docPath), page = read(pagePath), pkg = read(pkgPath), tauri = read(tauriPath), check = read('scripts/check-tauri.sh'), park = read('scripts/dev-quickchain-tauri-park.sh');
need(docPath, doc, ['QuickChain Phase 2 Round 2 — small committee agreement/readiness', 'client-boundary readiness only', 'display-only committee readiness', 'no client attestation signing', 'no quorum/finality/settlement claims', 'Phase 2 complete', 'small committee replicated verification complete']);
need(pagePath, page, ['Phase 2 Round 2', 'small committee agreement/readiness', 'display-only committee readiness', 'no client attestation signing', 'no quorum/finality/settlement', 'phase2_committee_boundary', 'small committee replicated verification complete']);
need(pkgPath, pkg, ['"check:quickchain-phase2-replay-boundary"', '"check:quickchain-phase2-committee-boundary"', 'check-quickchain-phase2-committee-boundary.mjs']);
need('scripts/dev-quickchain-tauri-park.sh', park, ['Phase 2 Round 2 final client parking gate', 'Phase 2 complete', 'small committee replicated verification complete']);
if (!/check:quickchain-phase2-replay-boundary[\s\S]*check:quickchain-phase2-committee-boundary[\s\S]*build/.test(check)) failures.push('scripts/check-tauri.sh must run committee boundary after replay boundary and before build');
if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/.test(page)) failures.push('QuickchainReadinessPage imports active adapters; committee readiness must use display caches only');
if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(page)) failures.push('QuickchainReadinessPage contains active calls; committee readiness must stay display-only');
need(tauriPath, tauri, ['FORBIDDEN_COMMAND_PATTERNS', 'attestation', 'committee', 'quorum', 'finality', 'settlement', 'bridge', 'staking', 'slashing', 'rox', 'solana']);
const allowed = tauri.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/)?.[1] || '';
if (/(quickchain|proof|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|slash|rox|solana)/i.test(allowed)) failures.push('Tauri allowlist contains QuickChain committee/attestation authority commands');
for (const f of clientFiles) {
  const t = read(f);
  if (/['"`]\/quickchain\/(root|proof|checkpoint|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|slash)\b/i.test(t)) failures.push(`${f} contains QuickChain authority route`);
  if (/\b(sign|submit|produce|verify|validate|count|finalize|settle|bridge|anchor|stake|slash|adjudicate)[A-Za-z0-9_]*(Attestation|Committee|Quorum|Finality|Settlement|Bridge|Anchor|Stake|Slash|Validator)\b/.test(t)) failures.push(`${f} contains authority-shaped committee/attestation method`);
  if (/unlock\s*[:=]\s*true/.test(t) && /(committee|attestation|quorum|replay|proof|quickchain)/i.test(t)) failures.push(`${f} appears to unlock from committee/replay/proof material`);
}
for (const f of ['apps/crablink-tauri/src/shared/receipts/recentReceipts.js','apps/crablink-tauri/src/shared/catalog/localCatalog.js']) {
  if (/\b(canView|canSpend|canSettle|isFinal|hasQuorum|attestationVerified)\s*:\s*true\b/.test(read(f))) failures.push(`${f} exports authorization-shaped true flags from display cache`);
}
finish('QuickChain Phase 2 committee boundary check passed.');
function exists(f){return fs.existsSync(path.join(ROOT,f));}
function read(f){return exists(f)?fs.readFileSync(path.join(ROOT,f),'utf8'):'';}
function need(f,t,phrases){for(const p of phrases) if(!t.includes(p)) failures.push(`${f} must include: ${p}`);}
function finish(ok){if(failures.length){console.error('QuickChain Phase 2 committee boundary check failed:'); for(const f of failures) console.error(` - ${f}`); process.exit(1);} console.log(ok);}
