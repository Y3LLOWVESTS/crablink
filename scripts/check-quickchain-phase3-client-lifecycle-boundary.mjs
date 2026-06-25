#!/usr/bin/env node
/**
 * RO:WHAT — Phase 3 Round 2 validator lifecycle client-boundary scanner.
 * RO:WHY — Ensures CrabLink can display backend-derived lifecycle/governance/replay-challenge status without becoming lifecycle, governance, challenge, finality, settlement, wallet, ledger, or paid-unlock authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts, Phase 3 validator boundary scanner.
 * RO:INVARIANTS — lifecycle display-only; no validator lifecycle mutation; no downtime/equivocation/challenge/governance mutation; no client settlement/finality/paid unlock truth.
 * RO:SECURITY — rejects authority-shaped lifecycle command, function, route, cache, and bridge/staking/slashing/bonding names.
 * RO:TEST — node scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const docPath = 'docs/tauri/QUICKCHAIN_PHASE3_CLIENT_LIFECYCLE_BOUNDARY.md';
const validatorDocPath = 'docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md';
const pagePath = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const pkgPath = 'apps/crablink-tauri/package.json';
const tauriPath = 'apps/crablink-tauri/src/platform/tauriPlatform.js';
const checkPath = 'scripts/check-tauri.sh';
const parkPath = 'scripts/dev-quickchain-tauri-park.sh';
const validatorScriptPath = 'scripts/check-quickchain-phase3-client-validator-boundary.mjs';

const clientFiles = [
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
  'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
];

const required = [docPath, validatorDocPath, pagePath, pkgPath, tauriPath, checkPath, parkPath, validatorScriptPath, ...clientFiles];
for (const file of required) {
  if (!exists(file)) failures.push(`missing required Phase 3 lifecycle boundary file: ${file}`);
}

const doc = read(docPath);
const page = read(pagePath);
const pkg = read(pkgPath);
const tauri = read(tauriPath);
const check = read(checkPath);
const park = read(parkPath);

need(docPath, doc, [
  'QuickChain Phase 3 Round 2 — validator operation / lifecycle hardening',
  'client-boundary lifecycle display only',
  'lifecycle status display',
  'governance review display',
  'replay challenge display',
  'downtime display',
  'grantValidatorLifecycleAuthority',
  'commitValidatorRotation',
  'commitValidatorRevocation',
  'markValidatorDowntime',
  'acceptEquivocationEvidence',
  'acceptReplayChallenge',
  'commitGovernanceParameterUpdate',
  'unlockFromValidatorLifecycle',
  'settleFromReplayChallenge',
  'QuickChain Phase 3 complete',
  'passport-gated validator set complete',
]);

need(pagePath, page, [
  'Phase 3 Round 2: validator operation / lifecycle hardening',
  'client-boundary lifecycle display only',
  'lifecycle status display',
  'governance review display',
  'replay challenge display',
  'downtime display',
  'phase3_lifecycle_boundary',
  'no client-side validator lifecycle authority',
  'no replay challenge authority',
  'no governance parameter-update authority',
]);

need(pkgPath, pkg, [
  '"check:quickchain-phase3-validator-boundary"',
  '"check:quickchain-phase3-lifecycle-boundary"',
  'check-quickchain-phase3-client-validator-boundary.mjs',
  'check-quickchain-phase3-client-lifecycle-boundary.mjs',
]);

if (!/check:quickchain-phase3-validator-boundary[\s\S]*check:quickchain-phase3-lifecycle-boundary[\s\S]*build/.test(check)) {
  failures.push('scripts/check-tauri.sh must run Phase 3 lifecycle boundary after validator boundary and before build');
}

need(parkPath, park, [
  'Phase 3 Round 2 final client parking gate',
  'validator operation/lifecycle hardening client boundary complete',
  'QuickChain Phase 3 complete',
  'passport-gated validator set complete',
]);

if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/.test(page)) {
  failures.push('QuickchainReadinessPage imports active adapters; lifecycle readiness must use display caches only');
}

if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(page)) {
  failures.push('QuickchainReadinessPage contains active calls; lifecycle readiness must stay display-only');
}

need(tauriPath, tauri, [
  'FORBIDDEN_COMMAND_PATTERNS',
  'validator[_-]?lifecycle',
  'downtime',
  'equivocation',
  'replay[_-]?challenge',
  'governance[_-]?parameter',
]);


const lifecycleBoundaryStart = page.indexOf('const PHASE3_LIFECYCLE_BOUNDARY = Object.freeze({');
const lifecycleMilestonesStart = page.indexOf('\nconst MILESTONES', lifecycleBoundaryStart);
if (lifecycleBoundaryStart < 0 || lifecycleMilestonesStart < 0) {
  failures.push('QuickchainReadinessPage must define PHASE3_LIFECYCLE_BOUNDARY before MILESTONES');
} else {
  const lifecycleBoundaryBlock = page.slice(lifecycleBoundaryStart, lifecycleMilestonesStart).trimEnd();
  if (!lifecycleBoundaryBlock.endsWith('});')) {
    failures.push('QuickchainReadinessPage PHASE3_LIFECYCLE_BOUNDARY must close before MILESTONES');
  }
}

const allowed = tauri.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/)?.[1] || '';
if (/(validator|lifecycle|downtime|equivocation|evidence|challenge|governance|parameter|finality|settlement|bridge|stake|slash|bond|rox|solana)/i.test(allowed)) {
  failures.push('Tauri allowlist contains Phase 3 lifecycle/governance/challenge authority command names');
}

const lifecycleAuthorityNameRe = /\b(?:grantValidatorLifecycleAuthority|commitValidatorRotation|commitValidatorRevocation|markValidatorDowntime|acceptEquivocationEvidence|acceptReplayChallenge|commitGovernanceParameterUpdate|unlockFromValidatorLifecycle|settleFromReplayChallenge|validatorLifecycleAuthority|validatorDowntimeAuthority|equivocationAuthority|replayChallengeAuthority|governanceParameterAuthority)\b/;
const lifecycleAuthorityRouteRe = /['"`]\/(?:quickchain|validator|validators|governance|challenge|challenges)\/(?:lifecycle|rotation|revocation|downtime|equivocation|evidence|replay-challenge|replay_challenge|parameter-update|parameter_update|finality|settlement|settle)\b/i;
const forbiddenRuntimeRe = /\b(?:staking|slashing|bonding|validatorRewards|validator_rewards|publicValidatorEconomy|public_validator_economy|bridgeSettlement|externalSettlement|rox|solana)\b/i;

for (const file of clientFiles) {
  const text = read(file);
  if (lifecycleAuthorityNameRe.test(text)) failures.push(`${file} contains Phase 3 lifecycle authority-shaped function or field name`);
  if (lifecycleAuthorityRouteRe.test(text)) failures.push(`${file} contains Phase 3 lifecycle authority route`);
  if (/unlock\s*[:=]\s*true/.test(text) && /(lifecycle|validator|challenge|governance|equivocation|downtime|quickchain)/i.test(text)) {
    failures.push(`${file} appears to unlock from lifecycle/challenge/governance material`);
  }
  if (forbiddenRuntimeRe.test(text) && !/(no |not |never |forbidden|display-only|boundary|does not|without)/i.test(text)) {
    failures.push(`${file} contains Phase 3/4+ runtime scope without explicit boundary language`);
  }
}

finish('QuickChain Phase 3 lifecycle boundary check passed.');

function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return exists(file) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : ''; }
function need(file, text, phrases) { for (const phrase of phrases) if (!text.includes(phrase)) failures.push(`${file} must include: ${phrase}`); }
function finish(message) { if (failures.length) { console.error('QuickChain Phase 3 lifecycle boundary check failed:'); for (const failure of failures) console.error(` - ${failure}`); process.exit(1); } console.log(message); }
