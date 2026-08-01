/**
 * RO:WHAT — Focused tests for the Phase 16A2 delegated TV Passport policy.
 *
 * RO:WHY — The TV authority ceiling must fail closed before native Android
 * key or authorization behavior is introduced.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  TV_DELEGATED_PASSPORT_AUTHORIZATION_MODE,
  TV_DELEGATED_PASSPORT_DEVICE_CLASS,
  TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,
  TV_DELEGATED_PASSPORT_READ_SCOPES,
  TV_DELEGATED_PASSPORT_STATES,
  reviewTvDelegatedPassportContract,
} from './tvDelegatedPassportContract.js';

test(
  'phase16a2_projects_the_default_tv_read_only_contract',
  () => {
    const result =
      reviewTvDelegatedPassportContract();

    assert.equal(
      result.state,
      TV_DELEGATED_PASSPORT_STATES.READY,
    );

    assert.equal(
      result.deviceClass,
      TV_DELEGATED_PASSPORT_DEVICE_CLASS,
    );

    assert.equal(
      result.authorizationMode,
      TV_DELEGATED_PASSPORT_AUTHORIZATION_MODE,
    );

    assert.deepEqual(
      result.requestedScopes,
      TV_DELEGATED_PASSPORT_READ_SCOPES,
    );

    assert.equal(
      result.rootAdminAuthorizationRequired,
      true,
    );

    assert.equal(
      result.deviceAuthorizationProofRequired,
      true,
    );

    assert.equal(
      result.companionPassportPairingRequired,
      false,
    );

    assert.equal(
      result.localPassportCustodyRequired,
      true,
    );

    assert.equal(
      result.invalidAuthorizationFallback,
      TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,
    );

    assert.equal(
      Object.isFrozen(result),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.requestedScopes,
      ),
      true,
    );
  },
);

test(
  'phase16a2_accepts_only_bounded_read_scope_subsets',
  () => {
    const result =
      reviewTvDelegatedPassportContract({
        requestedScopes: [
          'identity.read',
          'catalog.read',
          'content.read',
        ],
      });

    assert.equal(
      result.state,
      TV_DELEGATED_PASSPORT_STATES.READY,
    );

    assert.deepEqual(
      result.requestedScopes,
      [
        'identity.read',
        'catalog.read',
        'content.read',
      ],
    );
  },
);

test(
  'phase16a2_rejects_mutating_and_unknown_scopes',
  () => {
    for (const scope of [
      'identity.device.authorize',
      'identity.device.revoke',
      'identity.username.claim',
      'identity.profile.update',
      'content.publish',
      'wallet.spend',
      'ledger.write',
      'reward.issue',
      'node.control',
      'operator.admin',
      'unknown.scope',
    ]) {
      const result =
        reviewTvDelegatedPassportContract({
          requestedScopes: [
            'identity.read',
            scope,
          ],
        });

      assert.equal(
        result.state,
        TV_DELEGATED_PASSPORT_STATES.REJECTED,
        scope,
      );

      assert.equal(
        result.code,
        'scope_not_allowed',
        scope,
      );
    }
  },
);

test(
  'phase16a2_rejects_empty_duplicate_and_malformed_scope_sets',
  () => {
    for (const [
      requestedScopes,
      expectedCode,
    ] of [
      [
        [],
        'scope_set_rejected',
      ],
      [
        [
          'identity.read',
          'identity.read',
        ],
        'duplicate_scope_rejected',
      ],
      [
        [
          ' identity.read',
        ],
        'scope_shape_rejected',
      ],
      [
        [
          '',
        ],
        'scope_shape_rejected',
      ],
      [
        [
          7,
        ],
        'scope_shape_rejected',
      ],
    ]) {
      const result =
        reviewTvDelegatedPassportContract({
          requestedScopes,
        });

      assert.equal(
        result.state,
        TV_DELEGATED_PASSPORT_STATES.REJECTED,
      );

      assert.equal(
        result.code,
        expectedCode,
      );
    }
  },
);

test(
  'phase16a2_rejects_root_recovery_secret_and_mutating_requests',
  () => {
    for (const [
      property,
      expectedCode,
    ] of [
      [
        'recoveryPhraseRequested',
        'recovery_phrase_rejected',
      ],
      [
        'recoveryRootRequested',
        'recovery_root_rejected',
      ],
      [
        'rootAdminKeyRequested',
        'root_admin_key_rejected',
      ],
      [
        'rootAuthorityRequested',
        'root_authority_rejected',
      ],
      [
        'webviewSecretCustodyRequested',
        'webview_secret_custody_rejected',
      ],
      [
        'rawCapabilityToReactRequested',
        'raw_capability_rejected',
      ],
      [
        'mutatingAuthorityRequested',
        'mutating_authority_rejected',
      ],
    ]) {
      const result =
        reviewTvDelegatedPassportContract({
          [property]:
            true,
        });

      assert.equal(
        result.state,
        TV_DELEGATED_PASSPORT_STATES.REJECTED,
      );

      assert.equal(
        result.code,
        expectedCode,
      );
    }
  },
);

test(
  'phase16a2_rejects_non_tv_and_companion_passport_pairing',
  () => {
    const desktopResult =
      reviewTvDelegatedPassportContract({
        platformFamily:
          'desktop',
      });

    assert.equal(
      desktopResult.code,
      'platform_family_rejected',
    );

    const pairingResult =
      reviewTvDelegatedPassportContract({
        companionPassportPairingRequired:
          true,
      });

    assert.equal(
      pairingResult.code,
      'companion_passport_pairing_rejected',
    );
  },
);

test(
  'phase16a2_source_consumes_shared_contract_without_runtime_authority',
  async () => {
    const source =
      await readFile(
        new URL(
          './tvDelegatedPassportContract.js',
          import.meta.url,
        ),
        'utf8',
      );

    assert.match(
      source,
      /packages\/crablink-core\/src\/onboardingContract\.js/,
    );

    for (const marker of [
      'tv_read_only',
      'root-signed-device-authorization',
      'unauthenticated_read_only',
      'rootAdminAuthorizationRequired',
      'deviceAuthorizationProofRequired',
      'deviceKeyStoredLocallyRequired',
      'delegatedAuthorizationStoredLocallyRequired',
      'companionPassportPairingRequired',
      'recoveryPhraseOnTvAllowed',
      'recoveryRootOnTvAllowed',
      'rootAdminKeyOnTvAllowed',
      'rootAuthorityOnTvAllowed',
      'webviewSecretCustodyAllowed',
      'rawCapabilityToReactAllowed',
      'androidKeystoreAdapterAdded',
      'tvDeviceKeyGenerationAdded',
      'delegatedAuthorizationTransferAdded',
      'authorizationProofValidationAdded',
      'nativeCommandAdded',
      'tvUiAdded',
    ]) {
      assert.ok(
        source.includes(marker),
        marker,
      );
    }

    for (const forbidden of [
      '@tauri-apps/',
      'fetch(',
      'invoke(',
      'localStorage',
      'sessionStorage',
      'indexedDB',
      'AndroidKeyStore',
      'KeyPairGenerator',
      'Signature.getInstance',
      'Cipher.getInstance',
      'navigator.',
      'window.',
      'document.',
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        forbidden,
      );
    }
  },
);
