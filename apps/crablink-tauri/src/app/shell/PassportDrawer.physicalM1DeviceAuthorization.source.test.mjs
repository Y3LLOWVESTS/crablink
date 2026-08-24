/**
 * RO:WHAT — Locks the Physical M1 DeviceAuthorization React→adapter→Tauri trigger boundary.
 * RO:WHY — The physical signing acceptance must use CrabLink's typed adapter path instead of raw WebView invoke or caller-supplied authority.
 * RO:INTERACTS — passportAdapter.js, PassportDrawer.jsx, and the registered passport_authorize_device Tauri command.
 * RO:INVARIANTS — fixed command literal lives only in the adapter; drawer calls a zero-argument adapter function; no PIN, identity, signature, or authorization object is handled by React.
 * RO:SECURITY — source-boundary test only; no Tauri invocation, root confirmation, vault access, persistence, network, wallet, or ledger authority.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  normalizePassportCommandDto,
} from '../../adapters/passportAdapter.js';

const ROOT = path.resolve(
  new URL('../../../../..', import.meta.url).pathname,
);

const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
);

const DRAWER = path.join(
  ROOT,
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test(
  'physical M1 adapter owns one fixed passport_authorize_device command',
  () => {
    const adapter = read(ADAPTER);
    const drawer = stripComments(read(DRAWER));

    assert.equal(
      (
        adapter.match(
          /['"]passport_authorize_device['"]/g,
        ) || []
      ).length,
      1,
    );

    assert.match(
      adapter,
      /authorizeDevice:\s*['"]passport_authorize_device['"]/,
    );

    assert.match(
      adapter,
      /export async function authorizeNativePassportDevice\(\)/,
    );

    assert.match(
      adapter,
      /runPassportCommand\(PASSPORT_COMMANDS\.authorizeDevice\)/,
    );

    assert.doesNotMatch(
      drawer,
      /['"]passport_authorize_device['"]/,
      'raw command literal must not escape passportAdapter.js',
    );
  },
);

test(
  'physical M1 drawer invokes the authorization adapter with no arguments',
  () => {
    const drawer = stripComments(read(DRAWER));

    assert.match(
      drawer,
      /authorizeNativePassportDevice/,
    );

    assert.match(
      drawer,
      /runNativePassportCommand\(\s*authorizeNativePassportDevice,\s*['"]authorize device['"]\s*,?\s*\)/,
    );

    assert.match(
      drawer,
      /Authorize this device/,
    );

    assert.doesNotMatch(
      drawer,
      /\binvoke\s*\(/,
    );

    assert.doesNotMatch(
      drawer,
      /\bcallTauri\s*\(/,
    );

    assert.doesNotMatch(
      drawer,
      /@tauri-apps\/api\/core/,
    );

    assert.doesNotMatch(
      drawer,
      /authorizeNativePassportDevice\s*\([^)]*(pin|secret|password|seed|key|vmk|passport|device)[^)]*\)/i,
    );
  },
);

test(
  'physical M1 command normalization drops authority-shaped unexpected fields',
  () => {
    const normalized = normalizePassportCommandDto(
      {
        schema:
          'crablink.native-passport.device-authorization-command.v1',
        commandName: 'passport_authorize_device',
        state: 'authorized',
        redacted: true,
        nativeSecureInputRequested: true,

        signature:
          'must-never-reach-normalized-react-state',

        authorization:
          'must-never-reach-normalized-react-state',

        authorizationReturnedToWebview: true,
        signatureReturnedToWebview: true,

        pinReceivedFromWebview: true,
        secretMaterialReturned: true,
      },
      'passport_authorize_device',
    );

    assert.equal(
      normalized.state,
      'authorized',
    );

    assert.equal(
      normalized.nativeSecureInputRequested,
      true,
    );

    assert.equal(
      normalized.pinReceivedFromWebview,
      false,
    );

    assert.equal(
      normalized.secretMaterialReturned,
      false,
    );

    assert.equal(
      Object.hasOwn(normalized, 'signature'),
      false,
    );

    assert.equal(
      Object.hasOwn(normalized, 'authorization'),
      false,
    );

    assert.equal(
      Object.hasOwn(
        normalized,
        'authorizationReturnedToWebview',
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        normalized,
        'signatureReturnedToWebview',
      ),
      false,
    );
  },
);
