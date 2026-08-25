/**
 * RO:WHAT — Locks the Physical M1 username-capability React→adapter→Tauri trigger.
 * RO:WHY — The user must be able to begin the real CN-4 username authority flow without moving Passport, DeviceKey, scope, proof, or capability material into React.
 * RO:INTERACTS — PassportDrawer.jsx, passportAdapter.js, fixed passport_issue_username_capability command, and generic redacted Passport command normalization.
 * RO:INVARIANTS — drawer supplies zero authority arguments; raw command literal remains outside React; only redacted state is displayed; rejected issuance is warning truth.
 * RO:METRICS — none.
 * RO:CONFIG — Physical M1 controlled-beta desktop flow.
 * RO:SECURITY — no raw invoke, Passport/device IDs, scopes, challenge, DeviceKey, proof signature, capability ID/material/expiry, PIN, RecoveryRoot, wallet, or ledger authority.
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

const DRAWER = path.join(
  ROOT,
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
);

const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
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
  'drawer reaches username capability only through the reviewed adapter',
  () => {
    const drawer = stripComments(read(DRAWER));
    const adapter = stripComments(read(ADAPTER));

    assert.match(
      drawer,
      /issueNativePassportUsernameCapability/,
    );

    assert.match(
      adapter,
      /export async function issueNativePassportUsernameCapability\(\)/,
    );

    assert.match(
      adapter,
      /issueUsernameCapability:\s*[\r\n\s]*['"]passport_issue_username_capability['"]/,
    );

    assert.doesNotMatch(
      drawer,
      /['"]passport_issue_username_capability['"]/,
      'raw Tauri command name must stay in the adapter',
    );

    assert.doesNotMatch(drawer, /\binvoke\s*\(/);
    assert.doesNotMatch(drawer, /\bcallTauri\s*\(/);
    assert.doesNotMatch(
      drawer,
      /@tauri-apps\/api\/core/,
    );
  },
);

test(
  'drawer capability intent is zero argument and retains no authority-shaped result',
  () => {
    const drawer = stripComments(read(DRAWER));

    assert.match(
      drawer,
      /runNativePassportCommand\(\s*issueNativePassportUsernameCapability,\s*['"]issue username capability['"]\s*,?\s*\)/,
    );

    assert.match(
      drawer,
      /Prepare username claim/,
    );

    assert.match(
      drawer,
      /Preparing username claim…/,
    );

    assert.doesNotMatch(
      drawer,
      /issueNativePassportUsernameCapability\s*\([^)]*(passport|device|scope|challenge|signature|capability|expires|pin|password|secret|seed|key|vmk|recovery)[^)]*\)/i,
    );
  },
);

test(
  'capability rejection is rendered as warning rather than success',
  () => {
    const drawer = stripComments(read(DRAWER));

    assert.match(
      drawer,
      /tone:\s*nativePassportCommandTone\(commandResult\.state\)/,
    );

    assert.match(
      drawer,
      /normalized\.endsWith\(['"]_rejected['"]\)/,
    );

    assert.match(
      drawer,
      /normalized === ['"]unavailable['"]/,
    );

    assert.match(
      drawer,
      /normalized === ['"]cancelled['"]/,
    );
  },
);

test(
  'React normalization keeps state but drops injected capability material',
  () => {
    const normalized =
      normalizePassportCommandDto(
        {
          schema:
            'crablink.native-passport.username-capability-command.v1',

          commandName:
            'passport_issue_username_capability',

          state:
            'capability_issued',

          redacted: true,

          capabilityId:
            'must-never-reach-react',

          capability:
            'must-never-reach-react',

          expiresAtMs:
            9999999999999,

          proofSignature:
            'must-never-reach-react',

          serviceSignature:
            'must-never-reach-react',

          deviceSigningSeed:
            'must-never-reach-react',

          secretMaterialReturned: true,
          recoveryRootUnsealed: true,
          walletOrLedgerMutated: true,
        },
        'passport_issue_username_capability',
      );

    assert.equal(
      normalized.state,
      'capability_issued',
    );

    assert.equal(
      normalized.redacted,
      true,
    );

    assert.equal(
      normalized.secretMaterialReturned,
      false,
    );

    assert.equal(
      normalized.recoveryRootUnsealed,
      false,
    );

    assert.equal(
      normalized.walletOrLedgerMutated,
      false,
    );

    for (const forbidden of [
      'capabilityId',
      'capability',
      'expiresAtMs',
      'proofSignature',
      'serviceSignature',
      'deviceSigningSeed',
    ]) {
      assert.equal(
        Object.hasOwn(normalized, forbidden),
        false,
        `React DTO leaked ${forbidden}`,
      );
    }
  },
);
