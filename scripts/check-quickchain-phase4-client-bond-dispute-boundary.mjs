#!/usr/bin/env node
/**
 * RO:WHAT — Phase 4 Round 2 bond dispute/challenge simulation client boundary scanner.
 * RO:WHY — Ensures CrabLink stays display/user-intent only for dispute/challenge/appeal/freeze/slash readiness.
 * RO:INTERACTS — QuickchainReadinessPage.jsx, tauriPlatform.js, client API adapters, paid/cache display stores.
 * RO:INVARIANTS — no client dispute truth; no challenge-window truth; no appeal/freeze/slash authority; no paid unlock from dispute metadata.
 * RO:SECURITY — rejects bridge/ROX/Solana/external settlement/staking/liquidity/slash authority creep.
 * RO:TEST — npm run check:quickchain-phase4-bond-dispute-boundary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const files = {
  doc: 'docs/tauri/QUICKCHAIN_PHASE4_CLIENT_BOND_DISPUTE_BOUNDARY.md',
  page: 'apps/crablink-tauri/src/pages/quickchain/QuickchainReadinessPage.jsx',
  pkg: 'apps/crablink-tauri/package.json',
  tauri: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
  check: 'scripts/check-tauri.sh',
  park: 'scripts/dev-quickchain-tauri-park.sh',
  bond: 'scripts/check-quickchain-phase4-client-bond-boundary.mjs',
};

const clientFiles = [
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src/shared/api/walletClient.js',
  'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  'apps/crablink-tauri/src/pages/asset/AssetContentViewAccess.jsx',
  'apps/crablink-tauri/src/pages/site/SiteVisitAccess.jsx',
];

const displayCacheFiles = [
  'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  'apps/crablink-tauri/src/shared/catalog/localCatalog.js',
];

for (const file of [...Object.values(files), ...clientFiles, ...displayCacheFiles]) {
  if (!exists(file)) {
    failures.push(`missing required file: ${file}`);
  }
}

const doc = read(files.doc);
const page = read(files.page);
const pkg = read(files.pkg);
const tauri = read(files.tauri);
const check = read(files.check);
const park = read(files.park);

need(files.doc, doc, [
  'QuickChain Phase 4 Round 2 — bond dispute / challenge simulation boundary',
  'client-boundary dispute readiness only',
  'display-only dispute/challenge readiness',
  'backend-derived dispute/challenge/appeal/freeze status',
  'no client-side dispute truth',
  'no client-side challenge-window truth',
  'no client-side appeal authority',
  'no client-side freeze authority',
  'no irreversible slash authority',
  'no paid unlock from dispute, challenge, appeal, freeze, bond, slash, or cache status',
]);

need(files.page, page, [
  'Phase 4 Round 2',
  'dispute',
  'challenge',
  'appeal',
  'freeze',
  'no client-side dispute truth',
  'no client-side challenge-window truth',
  'no client-side appeal authority',
  'no client-side freeze authority',
  'no irreversible slash authority',
]);

need(files.pkg, pkg, [
  '"check:quickchain-phase4-bond-dispute-boundary"',
  'check-quickchain-phase4-client-bond-dispute-boundary.mjs',
]);

need(files.park, park, [
  'Phase 4 Round 2',
  'bond dispute and challenge simulation boundary complete',
]);

if (!/check:quickchain-phase4-bond-boundary[\s\S]*check:quickchain-phase4-bond-dispute-boundary[\s\S]*build/.test(check)) {
  failures.push('scripts/check-tauri.sh must run Phase 4 dispute boundary after Phase 4 bond boundary and before build');
}

need(files.tauri, tauri, [
  'FORBIDDEN_COMMAND_PATTERNS',
  'bond',
  'slash',
  'staking',
  'liquidity',
  'rox',
  'solana',
]);

for (const term of ['dispute', 'challenge', 'appeal', 'freeze']) {
  if (!new RegExp(term, 'i').test(tauri)) {
    failures.push(`${files.tauri} must include forbidden command coverage for ${term}`);
  }
}

const allowed = tauri.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/)?.[1] || '';

if (/(quickchain|proof|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|staking|slash|slashing|bond|dispute|challenge|appeal|freeze|liquidity|rox|solana)/i.test(allowed)) {
  failures.push('Tauri allowlist contains QuickChain dispute/challenge/slash/settlement authority command names');
}

for (const file of clientFiles) {
  const source = read(file);

  if (/['"`]\/quickchain\/(root|proof|checkpoint|replay|verifier|validator|committee|attestation|quorum|finality|settlement|bridge|anchor|stake|staking|slash|slashing|bond|dispute|challenge|appeal|freeze|liquidity)\b/i.test(source)) {
    failures.push(`${file} contains QuickChain dispute/challenge/slash authority route`);
  }

  if (/\b(sign|submit|produce|verify|validate|count|finalize|settle|bridge|anchor|stake|slash|adjudicate|appeal|freeze|unfreeze|lock|unlock|capture|release|grant|create)[A-Za-z0-9_]*(Bond|Dispute|Challenge|Appeal|Freeze|Slash|Slashing|Stake|Staking|Liquidity|Validator)\b/.test(source)) {
    failures.push(`${file} contains authority-shaped dispute/challenge/slash method`);
  }

  if (/unlock\s*[:=]\s*true/.test(source) && /(dispute|challenge|appeal|freeze|bond|slash|slashing|staking|validator|quickchain)/i.test(source)) {
    failures.push(`${file} appears to unlock from dispute/challenge/slash/validator material`);
  }
}

for (const file of displayCacheFiles) {
  const source = read(file);

  if (/\b(canView|canSpend|canSettle|isFinal|hasQuorum|attestationVerified|bondVerified|slashVerified|disputeVerified|challengeAccepted|appealAccepted|freezeAuthority|stakingActive)\s*:\s*true\b/.test(source)) {
    failures.push(`${file} exports authorization-shaped true flags from display cache`);
  }
}

if (failures.length) {
  console.error('QuickChain Phase 4 bond dispute boundary check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain Phase 4 bond dispute boundary check passed.');

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return exists(file) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
}

function need(file, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${file} must include: ${phrase}`);
    }
  }
}
