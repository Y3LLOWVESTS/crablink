#!/usr/bin/env node
/**
 * RO:WHAT — Phase 3 Round 1 passport-gated validator readiness boundary scanner.
 * RO:WHY — Ensures CrabLink may display backend-derived validator/passport readiness without becoming validator, passport registry, capability, validator-set, finality, settlement, or paid-unlock authority.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, gateway/wallet/content/site clients, paid gates, localCatalog, recentReceipts.
 * RO:INVARIANTS — display-only validator readiness; no validator/passport-registry/capability/set authority; no client quorum/finality/settlement; no validator/passport paid unlock.
 * RO:SECURITY — rejects authority-shaped route/function/command names for validators, registry, capabilities, staking/slashing/bonding, bridge, ROX, Solana, and external settlement.
 * RO:TEST — node scripts/check-quickchain-phase3-client-validator-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const docPath = 'docs/tauri/QUICKCHAIN_PHASE3_CLIENT_VALIDATOR_BOUNDARY.md';
const pagePath = 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx';
const pkgPath = 'apps/crablink-tauri/package.json';
const tauriPath = 'apps/crablink-tauri/src/platform/tauriPlatform.js';
const checkPath = 'scripts/check-tauri.sh';
const parkPath = 'scripts/dev-quickchain-tauri-park.sh';

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

const required = [docPath, pagePath, pkgPath, tauriPath, checkPath, parkPath, ...clientFiles];
for (const file of required) {
  if (!exists(file)) failures.push(`missing required Phase 3 validator boundary file: ${file}`);
}

const doc = read(docPath);
const page = read(pagePath);
const pkg = read(pkgPath);
const tauri = read(tauriPath);
const check = read(checkPath);
const park = read(parkPath);

need(docPath, doc, [
  'QuickChain Phase 3 Round 1 — validator identity + registry gating',
  'client-boundary readiness only',
  'validator-readiness-display',
  'backend-derived validator/readiness status',
  'no client-side validator authority',
  'no passport registry authority',
  'no validator capability authority',
  'no validator-set authority',
  'no paid unlock from validator passport, validator set, registry status, or cache',
]);

need(pagePath, page, [
  'Phase 3 Round 1: passport-gated validator identity/registry boundary',
  'validator-readiness-display',
  'backend-derived validator/readiness status',
  'no client-side validator authority',
  'no passport registry authority',
  'no validator capability authority',
  'no validator-set authority',
  'phase3_validator_boundary',
]);

need(pkgPath, pkg, [
  '"check:quickchain-phase3-validator-boundary"',
  'check-quickchain-phase3-client-validator-boundary.mjs',
]);

need(parkPath, park, [
  'Phase 3 Round 1 final client parking gate',
  'passport-gated validator identity/registry boundary foundation',
]);

if (!/check:quickchain-phase2-committee-boundary[\s\S]*check:quickchain-phase3-validator-boundary[\s\S]*(check:quickchain-phase3-lifecycle-boundary[\s\S]*)?build/.test(check)) {
  failures.push('scripts/check-tauri.sh must run Phase 3 validator boundary after Phase 2 committee boundary and before build');
}

if (/from\s+['"][^'"]*(gatewayClient|walletClient|contentViewClient|siteVisitClient|tauriPlatform|ronClient|settingsAdapter|gatewayAdapter|receiptsAdapter)['"]/.test(page)) {
  failures.push('QuickchainReadinessPage imports active adapters; validator readiness must use display caches only');
}

if (/\b(invoke|callTauri|fetch|XMLHttpRequest|gateway_request|wallet_balance_gateway)\b/.test(page)) {
  failures.push('QuickchainReadinessPage contains active calls; validator readiness must stay display-only');
}

need(tauriPath, tauri, [
  'FORBIDDEN_COMMAND_PATTERNS',
  'validator',
  'passport',
  'registry',
  'capability',
  'attestation',
  'committee',
  'quorum',
  'finality',
  'settlement',
  'bridge',
  'staking',
  'slashing',
  'rox',
  'solana',
]);

const allowed = tauri.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/)?.[1] || '';
if (/(quickchain|proof|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|slash|bond|rox|solana|passport[_-]?registry|validator[_-]?capability)/i.test(allowed)) {
  failures.push('Tauri allowlist contains QuickChain validator/passport/settlement authority command names');
}

const authorityNameRe = /\b(?:admitValidator|registerValidator|authorizeValidator|grantValidator|issueValidatorCapability|revokeValidator|rotateValidator|commitValidatorSet|signValidatorAttestation|verifyValidatorAttestationAsAuthority|unlockFromValidator|unlockFromPassport|unlockFromRegistry|stakeValidator|slashValidator|bondValidator|mintValidatorReward|bridgeSettlement|externalSettlement)\b/;
const authorityRouteRe = /['"`]\/(?:quickchain|validator|validators|passport|registry)\/(?:admit|admission|register|registration|authorize|grant|issue|revoke|revocation|rotate|rotation|capability|set|finality|settlement|bridge|stake|slash|bond)\b/i;

for (const file of clientFiles) {
  const text = read(file);
  if (authorityNameRe.test(text)) failures.push(`${file} contains validator/passport authority-shaped function or field name`);
  if (authorityRouteRe.test(text)) failures.push(`${file} contains validator/passport authority route`);
  if (/unlock\s*[:=]\s*true/.test(text) && /(validator|passport|registry|capability|validatorSet|quickchain)/i.test(text)) {
    failures.push(`${file} appears to unlock from validator/passport/registry material`);
  }
}

finish('QuickChain Phase 3 validator boundary check passed.');

function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return exists(file) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : ''; }
function need(file, text, phrases) { for (const phrase of phrases) if (!text.includes(phrase)) failures.push(`${file} must include: ${phrase}`); }
function finish(message) { if (failures.length) { console.error('QuickChain Phase 3 validator boundary check failed:'); for (const failure of failures) console.error(` - ${failure}`); process.exit(1); } console.log(message); }
