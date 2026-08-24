/**
 * RO:WHAT — Focused Physical M1 guard for public profile claim identity.
 * RO:WHY — A username must never be reserved by the legacy passport:main:dev fallback.
 * RO:INTERACTS — identityClient normalizeProfileClaimRequest and future Native Passport ID projection.
 * RO:INVARIANTS — missing identity fails closed; explicit real subject is preserved; no backend call is made here.
 * RO:SECURITY — no key material, PIN, recovery phrase, wallet authority, or ledger mutation.
 * RO:TEST — node --test src/shared/api/identityClient.physicalM1Guard.test.mjs.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeProfileClaimRequest,
} from './identityClient.js';

test(
  'Physical M1 profile claim refuses a missing Passport subject instead of using the dev fallback',
  () => {
    assert.throws(
      () =>
        normalizeProfileClaimRequest(
          {
            requested_username:
              'testmac',
          },
          {},
        ),
      (error) =>
        error?.code ===
        'missing_passport_subject',
    );
  },
);

test(
  'Physical M1 profile claim refuses the explicit legacy dev Passport subject',
  () => {
    assert.throws(
      () =>
        normalizeProfileClaimRequest(
          {
            passport_subject:
              'passport:main:dev',
            requested_username:
              'testmac',
          },
          {},
        ),
      (error) =>
        error?.code ===
        'missing_passport_subject',
    );
  },
);

test(
  'Physical M1 profile claim preserves an explicit canonical-shaped Native Passport subject',
  () => {
    const subject =
      `passport:v1:main:ed25519:b3:${'a'.repeat(64)}`;

    const request =
      normalizeProfileClaimRequest(
        {
          passport_subject:
            subject,
          requested_username:
            'testmac',
        },
        {},
      );

    assert.equal(
      request.passport_subject,
      subject,
    );

    assert.equal(
      request.requested_username,
      '@testmac',
    );
  },
);
