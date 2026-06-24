#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain client-authority boundary scanner.
 * RO:WHY — Prevents the Tauri client layer from drifting into QuickChain/runtime/wallet/ledger authority.
 * RO:INTERACTS — Tauri React source, TS/JS adapters, Rust command bridge, Tauri capabilities, QuickChain boundary docs.
 * RO:INVARIANTS — display-only; gateway-first; typed allowlisted commands; no roots/checkpoints/verifiers/validators/committee/attestation/quorum/bridges/finality/settlement authority.
 * RO:SECURITY — rejects raw/eval/shell/native bridge creep and client-side chain authority naming.
 * RO:TEST — node scripts/check-quickchain-client-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const REQUIRED_FILES = [
  'docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md',
  'apps/crablink-tauri/package.json',
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
  'apps/crablink-tauri/src/shared/api/gatewayClient.js',
  'apps/crablink-tauri/src-tauri/src/lib.rs',
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
  'apps/crablink-tauri/src-tauri/capabilities/default.json',
];

const SCAN_DIRS = [
  'apps/crablink-tauri/src',
  'apps/crablink-tauri/src-tauri/src',
  'apps/crablink-tauri/src-tauri/capabilities',
  'packages/crablink-core/src',
  'packages/crablink-platform/src',
];

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.rs', '.json', '.jsonc', '.toml', '.md', '.css', '.html', '.sh',
]);

const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', 'target', 'gen', '.tauri', '.vite', '.turbo', 'dump',
]);

const FORBIDDEN_COMMAND_NAME_RE = /(?:^|_)(?:raw|shell|eval|execute|native|quickchain|root|proof|replay|checkpoint|verifier|validator|committee|attestation|attestations|quorum|fork[_-]?choice|finality|settlement|settle|bridge|anchor|solana|rox|staking|slashing|liquidity)(?:_|$)/i;
const FORBIDDEN_ROUTE_RE = /['"`]\/quickchain\/(?:root|roots|proof|proofs|replay|replays|checkpoint|checkpoints|verifier|verifiers|validator|validators|committee|committees|attestation|attestations|quorum|finality|settlement|settle|bridge|bridges|anchor|anchors)\b/i;
const FORBIDDEN_PACKAGE_RE = /(?:mainnet-beta\.solana|api\.solana|solanaWeb3|@solana|solana-web3|external-settlement|bridge-proof|validator-signature|attestation-signer|committee-signer|quorum-finality)/i;
const DYNAMIC_INVOKE_ALLOWLIST = new Map([
  [normalizeRel('apps/crablink-tauri/src/platform/tauriPlatform.js'), 'central callTauri adapter'],
  [normalizeRel('apps/crablink-tauri/src/shared/api/videoAssetClient.js'), 'bounded staged image/video upload command selector'],
]);

const FORBIDDEN_PERMISSION_RE = /(?:shell|process|global-shortcut|fs:default|http:default|http:allow|opener:default)/i;

const failures = [];

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    failures.push(`missing required QuickChain boundary file: ${file}`);
  }
}

const clientDoc = readRequired('docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md');
requirePhrases('docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md', clientDoc, [
  'CrabLink Tauri is not QuickChain authority',
  'Local receipt caches are display-only',
  'Offline cache cannot unlock paid content alone',
  'Gateway-first request routing',
  'Raw shell/native/eval/execute command bridge surfaces',
]);

for (const file of collectFiles(SCAN_DIRS)) {
  const rel = normalizeRel(path.relative(ROOT, file));
  const text = fs.readFileSync(file, 'utf8');

  checkDirectInvoke(rel, text);
  checkRustCommandNames(rel, text);
  checkForbiddenRuntimeRoutes(rel, text);
  checkCapabilities(rel, text);
}

if (failures.length) {
  console.error('QuickChain client-boundary check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('QuickChain client-boundary check passed.');

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
    if (!fs.existsSync(dir)) {
      continue;
    }
    walk(dir, out);
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

function checkDirectInvoke(rel, text) {
  const usesInvoke = /@tauri-apps\/api\/core|\binvoke\s*\(/.test(text);

  if (!usesInvoke) {
    return;
  }

  const invokeCallRe = /\binvoke\s*\(\s*([^,\)]+)/g;
  let match;

  while ((match = invokeCallRe.exec(text)) !== null) {
    const firstArg = String(match[1] || '').trim();
    const commandName = literalStringValue(firstArg);

    if (!commandName) {
      if (isAllowedDynamicInvoke(rel, firstArg, text)) {
        continue;
      }

      failures.push(`${rel} uses invoke with a dynamic command name; use typed string-literal command calls only`);
      continue;
    }

    if (FORBIDDEN_COMMAND_NAME_RE.test(commandName)) {
      failures.push(`${rel} invokes forbidden authority-shaped Tauri command: ${commandName}`);
    }
  }
}

function checkRustCommandNames(rel, text) {
  if (!rel.endsWith('.rs')) {
    return;
  }

  const commandRe = /#\s*\[\s*tauri::command\s*\][\s\S]*?\bfn\s+([A-Za-z0-9_]+)/g;
  let match;

  while ((match = commandRe.exec(text)) !== null) {
    const name = match[1];
    if (FORBIDDEN_COMMAND_NAME_RE.test(name)) {
      failures.push(`${rel} declares forbidden authority-shaped Tauri command: ${name}`);
    }
  }

  if (rel.endsWith('src-tauri/src/lib.rs')) {
    const handlerBlock = text.match(/generate_handler!\s*\[([\s\S]*?)\]/)?.[1] || '';
    for (const name of handlerBlock.matchAll(/commands::[A-Za-z0-9_:]+::([A-Za-z0-9_]+)/g)) {
      if (FORBIDDEN_COMMAND_NAME_RE.test(name[1])) {
        failures.push(`${rel} registers forbidden authority-shaped Tauri command: ${name[1]}`);
      }
    }
  }
}

function checkForbiddenRuntimeRoutes(rel, text) {
  if (FORBIDDEN_ROUTE_RE.test(text)) {
    failures.push(`${rel} contains an active QuickChain authority route; CrabLink may only display readiness/status in this phase`);
  }

  if ((rel.endsWith('package.json') || rel.endsWith('Cargo.toml')) && FORBIDDEN_PACKAGE_RE.test(text)) {
    failures.push(`${rel} declares forbidden external settlement / bridge / validator / Solana runtime dependency`);
  }
}

function checkCapabilities(rel, text) {
  if (!rel.endsWith('capabilities/default.json')) {
    return;
  }

  if (FORBIDDEN_PERMISSION_RE.test(text)) {
    failures.push(`${rel} grants a forbidden broad native capability; keep bridge small and allowlisted`);
  }
}

function normalizeRel(value) {
  return String(value || '').split(path.sep).join('/');
}

function literalStringValue(value) {
  const clean = String(value || '').trim();
  const match = clean.match(/^(['"`])([^'"`]+)\1$/);
  return match ? match[2] : '';
}

function isAllowedDynamicInvoke(rel, firstArg, text) {
  if (!DYNAMIC_INVOKE_ALLOWLIST.has(rel)) {
    return false;
  }

  if (rel.endsWith('/platform/tauriPlatform.js')) {
    const guardedCentralCommand =
      firstArg === 'command' ||
      (
        firstArg === 'normalized' &&
        text.includes('const normalized = normalizeCommandName(command);') &&
        text.includes('if (!isAllowedTauriCommand(normalized))') &&
        text.includes('return await invoke(normalized, args && typeof args === \'object\' ? args : {});')
      );

    return guardedCentralCommand &&
      /export\s+(?:async\s+)?function\s+callTauri\s*\(\s*command\s*,/.test(text) &&
      text.includes('ALLOWED_TAURI_COMMANDS') &&
      text.includes('ALLOWED_TAURI_COMMAND_SET') &&
      text.includes('FORBIDDEN_COMMAND_PATTERNS') &&
      text.includes('isAllowedTauriCommand') &&
      text.includes('normalizeCommandName') &&
      text.includes('redactForDisplay');
  }

  if (rel.endsWith('/shared/api/videoAssetClient.js')) {
    return firstArg === 'command' &&
      text.includes("'upload_staged_image_asset_gateway'") &&
      text.includes("'upload_staged_video_asset_gateway'") &&
      !FORBIDDEN_COMMAND_NAME_RE.test('upload_staged_image_asset_gateway') &&
      !FORBIDDEN_COMMAND_NAME_RE.test('upload_staged_video_asset_gateway');
  }

  return false;
}
