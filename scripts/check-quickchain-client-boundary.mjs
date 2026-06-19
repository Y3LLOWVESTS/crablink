#!/usr/bin/env node
/**
 * RO:WHAT — CrabLink Tauri QuickChain client-boundary scanner.
 * RO:WHY — Proves React/TS/Tauri command surfaces do not drift into QuickChain, wallet, ledger, or settlement authority.
 * RO:INTERACTS — apps/crablink-tauri/src, src-tauri command bridge, docs/tauri boundary notes.
 * RO:INVARIANTS — gateway-first; typed allowlist; no raw invoke scatter; no roots/checkpoints/validators/bridges/staking/liquidity.
 * RO:SECURITY — static scan only; no network, no secrets, no mutation.
 * RO:TEST — npm run check:quickchain-boundary.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const APP = path.join(ROOT, 'apps', 'crablink-tauri');

const REQUIRED_DOCS = [
  'docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md',
  'docs/tauri/QUICKCHAIN_PAID_CACHE_BOUNDARY.md',
  'docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md',
];

const FORBIDDEN_COMMAND_PATTERNS = [
  /^raw[_-]/i,
  /(^|[_-])(run|execute|eval|shell|native)([_-]|$)/i,
  /quickchain[_-]?(root|state|receipt|checkpoint|validator|settle|settlement)/i,
  /(^|[_-])(checkpoint|validator|settle|settlement|bridge|staking|liquidity)([_-]|$)/i,
  /(^|[_-])(rox|solana)([_-]|$)/i,
  /(^|[_-])(mint|issue|transfer|burn|hold|capture|release)([_-]|$)/i,
  /unlock[_-]?paid[_-]?from[_-]?cache/i,
];

const FORBIDDEN_SOURCE_PATTERNS = [
  { pattern: /window\.__TAURI__\s*\.\s*invoke/i, reason: 'raw window.__TAURI__.invoke is forbidden' },
  { pattern: /window\.__TAURI_INTERNALS__\s*\.\s*invoke/i, reason: 'raw window.__TAURI_INTERNALS__.invoke is forbidden' },
  { pattern: /localStorage\.setItem\s*\(\s*['"][^'"]*(wallet_secret|private_key|seed_phrase|spend_authority|current_balance|paid_entitlement)[^'"]*['"]/i, reason: 'localStorage must not store wallet/secret/balance/entitlement truth' },
  { pattern: /sessionStorage\.setItem\s*\(\s*['"][^'"]*(wallet_secret|private_key|seed_phrase|spend_authority|current_balance|paid_entitlement)[^'"]*['"]/i, reason: 'sessionStorage must not store wallet/secret/balance/entitlement truth' },
];

const DIRECT_INVOKE_IMPORT = /import\s*\{\s*invoke\s*\}\s*from\s*['"]@tauri-apps\/api\/core['"]/;
const ALLOWED_INVOKE_FILE = path.join('apps', 'crablink-tauri', 'src', 'platform', 'tauriPlatform.js');

const failures = [];

for (const doc of REQUIRED_DOCS) {
  requireFile(doc);
}

const platformPath = path.join(ROOT, ALLOWED_INVOKE_FILE);
const platformText = readFile(platformPath);
requireText(platformText, 'ALLOWED_TAURI_COMMANDS', ALLOWED_INVOKE_FILE);
requireText(platformText, 'FORBIDDEN_COMMAND_PATTERNS', ALLOWED_INVOKE_FILE);
requireText(platformText, 'not authorized by CrabLink boundary policy', ALLOWED_INVOKE_FILE);
requireText(platformText, 'redactForDisplay', ALLOWED_INVOKE_FILE);

const allowedCommands = parseAllowedCommands(platformText);
const registeredCommands = parseRegisteredCommands(readFile(path.join(APP, 'src-tauri', 'src', 'lib.rs')));

for (const command of registeredCommands) {
  if (!allowedCommands.has(command)) {
    fail(`registered Tauri command is missing from frontend allowlist: ${command}`);
  }

  if (FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    fail(`registered Tauri command violates QuickChain/client boundary: ${command}`);
  }
}

for (const command of allowedCommands) {
  if (!registeredCommands.has(command)) {
    fail(`frontend allowlist contains command not registered by Tauri: ${command}`);
  }

  if (FORBIDDEN_COMMAND_PATTERNS.some((pattern) => pattern.test(command))) {
    fail(`frontend allowlist contains forbidden command name: ${command}`);
  }
}

for (const file of walkFiles(path.join(APP, 'src'), ['.js', '.jsx', '.ts', '.tsx'])) {
  const rel = path.relative(ROOT, file);
  const text = readFile(file);

  if (DIRECT_INVOKE_IMPORT.test(text) && rel !== ALLOWED_INVOKE_FILE) {
    fail(`${rel}: direct Tauri invoke import is forbidden; use platform/tauriPlatform.callTauri`);
  }

  for (const rule of FORBIDDEN_SOURCE_PATTERNS) {
    if (rule.pattern.test(text)) {
      fail(`${rel}: ${rule.reason}`);
    }
  }
}

finish('QuickChain client-boundary check passed.');

function parseAllowedCommands(text) {
  const match = text.match(/ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!match) {
    fail('apps/crablink-tauri/src/platform/tauriPlatform.js: could not parse ALLOWED_TAURI_COMMANDS');
    return new Set();
  }

  return new Set([...match[1].matchAll(/['"]([a-zA-Z0-9_]+)['"]/g)].map((entry) => entry[1]));
}

function parseRegisteredCommands(text) {
  const match = text.match(/tauri::generate_handler!\s*\[([\s\S]*?)\]/);
  if (!match) {
    fail('apps/crablink-tauri/src-tauri/src/lib.rs: could not parse generate_handler command list');
    return new Set();
  }

  return new Set([...match[1].matchAll(/commands::[a-zA-Z0-9_]+::([a-zA-Z0-9_]+)/g)].map((entry) => entry[1]));
}

function requireFile(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    fail(`missing required file: ${rel}`);
  }
}

function requireText(text, needle, rel) {
  if (!text.includes(needle)) {
    fail(`${rel}: missing required phrase: ${needle}`);
  }
}

function readFile(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail(`unable to read ${path.relative(ROOT, file)}: ${error.message}`);
    return '';
  }
}

function walkFiles(dir, extensions) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'target') {
      continue;
    }

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function fail(message) {
  failures.push(message);
}

function finish(successMessage) {
  if (failures.length > 0) {
    console.error('QuickChain client-boundary check failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log(successMessage);
}
