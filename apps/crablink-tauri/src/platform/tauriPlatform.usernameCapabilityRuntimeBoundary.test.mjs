/**
 * RO:WHAT — Proves the CN-4 purpose-specific username-capability command survives the actual runtime Tauri boundary predicate.
 * RO:WHY — Allowlist membership alone is insufficient because forbidden-pattern checks can reject a reviewed command before native invocation.
 * RO:INTERACTS — tauriPlatform.js runtime allowlist, forbidden-pattern policy, and the fixed passport_issue_username_capability command.
 * RO:INVARIANTS — only the exact reviewed username-capability command bypasses pattern rejection; it must still be allowlisted; broad capability and unrelated authority-shaped commands remain rejected.
 * RO:METRICS — none.
 * RO:CONFIG — controlled-beta desktop command boundary.
 * RO:SECURITY — no wildcard bypass, prefix bypass, dynamic command authority, raw capability, secret, wallet, ledger, validator, or QuickChain authority.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  ALLOWED_TAURI_COMMANDS,
  isAllowedTauriCommand,
} from './tauriPlatform.js';

const PLATFORM = path.resolve(
  new URL('./tauriPlatform.js', import.meta.url).pathname,
);

test(
  'CN4 exact username capability command is admitted by the real runtime predicate',
  () => {
    assert.equal(
      ALLOWED_TAURI_COMMANDS.includes(
        'passport_issue_username_capability',
      ),
      true,
    );

    assert.equal(
      isAllowedTauriCommand(
        'passport_issue_username_capability',
      ),
      true,
    );
  },
);

test(
  'CN4 broad and near-match capability commands remain rejected',
  () => {
    for (const command of [
      'passport_issue_capability',
      'passport_issue_username_capability_extra',
      'passport_issue_admin_capability',
      'passport_get_capability',
      'validator_issue_capability',
      'quickchain_validator_capability',
    ]) {
      assert.equal(
        isAllowedTauriCommand(command),
        false,
        `${command} must remain rejected`,
      );
    }
  },
);

test(
  'CN4 reviewed exception is exact and still depends on allowlist membership',
  () => {
    const source =
      fs.readFileSync(
        PLATFORM,
        'utf8',
      );

    const match =
      source.match(
        /REVIEWED_FORBIDDEN_PATTERN_EXCEPTIONS\s*=\s*[\r\n\s]*new Set\(\[([\s\S]*?)\]\)/,
      );

    assert.ok(
      match,
      'reviewed exception set must exist',
    );

    const body = match[1];

    const names = [
      ...body.matchAll(/['"]([^'"]+)['"]/g),
    ].map((entry) => entry[1]);

    assert.deepEqual(
      names,
      [
        'passport_issue_username_capability',
      ],
    );

    assert.match(
      source,
      /REVIEWED_FORBIDDEN_PATTERN_EXCEPTIONS\.has\(normalized\)[\s\S]*return ALLOWED_TAURI_COMMAND_SET\.has\(normalized\)/,
    );
  },
);

test(
  'CN4 existing fixed Passport commands and unsafe commands preserve runtime policy',
  () => {
    for (const command of [
      'passport_status',
      'passport_lock',
      'passport_verify_device_possession',
      'passport_issue_username_capability',
    ]) {
      assert.equal(
        isAllowedTauriCommand(command),
        true,
        `${command} should remain admitted`,
      );
    }

    for (const command of [
      '',
      'raw_shell',
      'execute_native',
      'quickchain_validator_admit',
      'passport_registry_validator',
      'direct_wallet_mutate',
    ]) {
      assert.equal(
        isAllowedTauriCommand(command),
        false,
        `${command || '<empty>'} must remain rejected`,
      );
    }
  },
);
