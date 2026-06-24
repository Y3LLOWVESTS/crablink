#!/usr/bin/env node
/** RO:WHAT — Phase 2 Round 1 read-only replay/verifier boundary scanner. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const files = [
  'docs/tauri/QUICKCHAIN_PHASE2_CLIENT_REPLAY_BOUNDARY.md',
  'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx',
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
];
for (const f of files) if (!exists(f)) failures.push(`missing required Phase 2 replay boundary file: ${f}`);
const doc = read(files[0]);
const page = read(files[1]);
const pkg = read(files[2]);
const check = read(files[3]);
need(files[0], doc, [
  'QuickChain Phase 2 Round 1 — verifier artifact / read-only replication',
  'CrabLink may display backend-derived verifier/replay/readiness status',
  'paid unlock tied to backend wallet/ledger receipt truth',
  'Read-only replay/verifier artifacts cannot replace that path',
]);
need(files[1], page, [
  'Phase 2 Round 1: read-only verifier artifact replication',
  'backend-derived replay/verifier artifact status',
  'phase2_replay_boundary',
]);
need(files[2], pkg, ['"check:quickchain-phase2-replay-boundary"', 'check-quickchain-phase2-client-replay-boundary.mjs']);
if (!/check:quickchain-phase1-interlock[\s\S]*check:quickchain-phase2-replay-boundary[\s\S]*(check:quickchain-phase2-committee-boundary[\s\S]*)?build/.test(check)) failures.push('scripts/check-tauri.sh must run Phase 2 replay boundary after Phase 1 and before build');
if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/.test(page)) failures.push('QuickchainReadinessPage imports active adapters; replay readiness must use display caches only');
if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(page)) failures.push('QuickchainReadinessPage contains active calls; replay readiness must stay display-only');
for (const f of files.slice(6)) {
  const t = read(f);
  if (/['"`]\/quickchain\/(root|proof|checkpoint|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor)\b/i.test(t)) failures.push(`${f} contains QuickChain authority route`);
  if (/unlock\s*[:=]\s*true/.test(t) && /(replay|proof|verifier|quickchain)/i.test(t)) failures.push(`${f} appears to unlock from replay/proof/verifier material`);
}
finish('QuickChain Phase 2 replay boundary check passed.');
function exists(f){return fs.existsSync(path.join(ROOT,f));}
function read(f){return exists(f)?fs.readFileSync(path.join(ROOT,f),'utf8'):'';}
function need(f,t,phrases){for(const p of phrases) if(!t.includes(p)) failures.push(`${f} must include: ${p}`);}
function finish(ok){if(failures.length){console.error('QuickChain Phase 2 replay boundary check failed:'); for(const f of failures) console.error(` - ${f}`); process.exit(1);} console.log(ok);}
