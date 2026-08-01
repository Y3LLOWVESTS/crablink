/**
 * RO:WHAT — Defines the deterministic delegated-Passport policy contract for
 * CrabLink TV.
 *
 * RO:WHY — Android TV must begin from a bounded read-only device contract
 * before native key generation, Android Keystore persistence, root-admin
 * authorization, proof handling, or UI integration is implemented.
 *
 * RO:INTERACTS — Shared CrabLink onboarding contract and future Android TV
 * native Passport adapter.
 *
 * RO:INVARIANTS — TV never receives recovery material, root authority,
 * WebView secret custody, raw capabilities, wallet authority, ledger
 * authority, publishing authority, node authority, or operator authority.
 *
 * RO:SECURITY — This module contains public policy labels only. It performs
 * no key generation, signing, verification, persistence, command invocation,
 * network access, authorization transfer, or capability issuance.
 */

import {
  ONBOARDING_CONTRACT_VERSION,
  ONBOARDING_CUSTODY_INVARIANTS,
  ONBOARDING_PLATFORM_FAMILIES,
  getOnboardingPlatformUiContract,
} from '../../../../packages/crablink-core/src/onboardingContract.js';

export const TV_DELEGATED_PASSPORT_SCHEMA =
  'crablink.tv.delegated-passport.v1';

export const TV_DELEGATED_PASSPORT_DEVICE_CLASS =
  'tv_read_only';

export const TV_DELEGATED_PASSPORT_AUTHORIZATION_MODE =
  'root-signed-device-authorization';

export const TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK =
  'unauthenticated_read_only';

export const TV_DELEGATED_PASSPORT_STATES =
  Object.freeze({
    READY:
      'contract_ready',

    REJECTED:
      'rejected',
  });

export const TV_DELEGATED_PASSPORT_READ_SCOPES =
  Object.freeze([
    'identity.read',
    'catalog.read',
    'content.read',
    'entitlement.read',
    'receipts.read',
    'confirmed_roc.read',
    'capability.revoke_self',
  ]);

export const TV_DELEGATED_PASSPORT_FORBIDDEN_SCOPES =
  Object.freeze([
    'identity.device.authorize',
    'identity.device.revoke',
    'identity.username.claim',
    'identity.username.transfer',
    'identity.username.release',
    'identity.profile.update',
    'content.publish',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
    'reward.issue',
    'node.control',
    'operator.admin',
    'capability.delegate_unbounded',
    'bridge.settle',
    'staking.open',
  ]);

const allowedScopeSet =
  new Set(
    TV_DELEGATED_PASSPORT_READ_SCOPES,
  );

export function reviewTvDelegatedPassportContract({
  platformFamily =
    ONBOARDING_PLATFORM_FAMILIES.TV,

  requestedScopes =
    TV_DELEGATED_PASSPORT_READ_SCOPES,

  companionPassportPairingRequired =
    false,

  recoveryPhraseRequested =
    false,

  recoveryRootRequested =
    false,

  rootAdminKeyRequested =
    false,

  rootAuthorityRequested =
    false,

  webviewSecretCustodyRequested =
    false,

  rawCapabilityToReactRequested =
    false,

  mutatingAuthorityRequested =
    false,
} = {}) {
  if (
    platformFamily !==
    ONBOARDING_PLATFORM_FAMILIES.TV
  ) {
    return rejectContract(
      'platform_family_rejected',
    );
  }

  const tvUi =
    getOnboardingPlatformUiContract(
      platformFamily,
    );

  if (
    ONBOARDING_CUSTODY_INVARIANTS
      .localPassportCustodyRequired !==
      true ||

    ONBOARDING_CUSTODY_INVARIANTS
      .webviewPinCustodyAllowed !==
      false ||

    ONBOARDING_CUSTODY_INVARIANTS
      .webviewRecoveryCustodyAllowed !==
      false ||

    ONBOARDING_CUSTODY_INVARIANTS
      .serverPassportSecretCustodyAllowed !==
      false ||

    tvUi.companionDeviceRequired !==
      false ||

    tvUi.qrImportRequired !==
      false
  ) {
    return rejectContract(
      'shared_contract_mismatch',
    );
  }

  if (companionPassportPairingRequired) {
    return rejectContract(
      'companion_passport_pairing_rejected',
    );
  }

  if (recoveryPhraseRequested) {
    return rejectContract(
      'recovery_phrase_rejected',
    );
  }

  if (recoveryRootRequested) {
    return rejectContract(
      'recovery_root_rejected',
    );
  }

  if (rootAdminKeyRequested) {
    return rejectContract(
      'root_admin_key_rejected',
    );
  }

  if (rootAuthorityRequested) {
    return rejectContract(
      'root_authority_rejected',
    );
  }

  if (webviewSecretCustodyRequested) {
    return rejectContract(
      'webview_secret_custody_rejected',
    );
  }

  if (rawCapabilityToReactRequested) {
    return rejectContract(
      'raw_capability_rejected',
    );
  }

  if (mutatingAuthorityRequested) {
    return rejectContract(
      'mutating_authority_rejected',
    );
  }

  const scopeReview =
    reviewRequestedScopes(
      requestedScopes,
    );

  if (!scopeReview.ok) {
    return rejectContract(
      scopeReview.code,
    );
  }

  return createContractResult({
    state:
      TV_DELEGATED_PASSPORT_STATES.READY,

    code:
      'tv_delegated_contract_ready',

    requestedScopes:
      scopeReview.scopes,
  });
}

function reviewRequestedScopes(
  requestedScopes,
) {
  if (
    !Array.isArray(requestedScopes) ||
    requestedScopes.length === 0
  ) {
    return {
      ok: false,

      code:
        'scope_set_rejected',
    };
  }

  const normalizedScopes =
    [];

  const seen =
    new Set();

  for (const scope of requestedScopes) {
    if (
      typeof scope !== 'string' ||
      !scope ||
      scope.trim() !== scope
    ) {
      return {
        ok: false,

        code:
          'scope_shape_rejected',
      };
    }

    if (seen.has(scope)) {
      return {
        ok: false,

        code:
          'duplicate_scope_rejected',
      };
    }

    if (!allowedScopeSet.has(scope)) {
      return {
        ok: false,

        code:
          'scope_not_allowed',
      };
    }

    seen.add(scope);
    normalizedScopes.push(scope);
  }

  return {
    ok: true,

    scopes:
      Object.freeze(
        normalizedScopes,
      ),
  };
}

function rejectContract(
  code,
) {
  return createContractResult({
    state:
      TV_DELEGATED_PASSPORT_STATES.REJECTED,

    code,

    requestedScopes:
      Object.freeze([]),
  });
}

function createContractResult({
  state,
  code,
  requestedScopes,
}) {
  return Object.freeze({
    schema:
      TV_DELEGATED_PASSPORT_SCHEMA,

    sharedContractVersion:
      ONBOARDING_CONTRACT_VERSION,

    state,
    code,

    platformFamily:
      ONBOARDING_PLATFORM_FAMILIES.TV,

    deviceClass:
      TV_DELEGATED_PASSPORT_DEVICE_CLASS,

    authorizationMode:
      TV_DELEGATED_PASSPORT_AUTHORIZATION_MODE,

    invalidAuthorizationFallback:
      TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,

    requestedScopes,

    rootAdminAuthorizationRequired:
      true,

    deviceAuthorizationProofRequired:
      true,

    deviceKeyStoredLocallyRequired:
      true,

    delegatedAuthorizationStoredLocallyRequired:
      true,

    companionPassportPairingRequired:
      false,

    localPassportCustodyRequired:
      true,

    nativePinSurfaceRequired:
      true,

    recoveryPhraseOnTvAllowed:
      false,

    recoveryRootOnTvAllowed:
      false,

    rootAdminKeyOnTvAllowed:
      false,

    rootAuthorityOnTvAllowed:
      false,

    webviewSecretCustodyAllowed:
      false,

    rawCapabilityToReactAllowed:
      false,

    walletOrLedgerAuthorityAllowed:
      false,

    publishingAuthorityAllowed:
      false,

    usernameMutationAuthorityAllowed:
      false,

    deviceAdministrationAuthorityAllowed:
      false,

    nodeOrOperatorAuthorityAllowed:
      false,

    revokedAuthorizationFallback:
      TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,

    expiredAuthorizationFallback:
      TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,

    unknownAuthorizationFallback:
      TV_DELEGATED_PASSPORT_INVALID_AUTHORIZATION_FALLBACK,

    enrollmentExecutionAdded:
      false,

    androidKeystoreAdapterAdded:
      false,

    tvDeviceKeyGenerationAdded:
      false,

    delegatedAuthorizationTransferAdded:
      false,

    authorizationProofValidationAdded:
      false,

    capabilityIssuanceAdded:
      false,

    nativeCommandAdded:
      false,

    tvUiAdded:
      false,
  });
}
