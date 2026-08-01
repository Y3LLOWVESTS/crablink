/**
 * RO:WHAT — Platform-neutral CrabLink onboarding state, DTO, custody, port, and presentation contract.
 * RO:WHY — Desktop, mobile, tablet, TV, and future clients must implement one wallet-like local-custody onboarding model.
 * RO:INTERACTS — CrabLink clients, platform adapters, native Passport runtimes, redacted onboarding storage, and shared tests.
 * RO:INVARIANTS — no platform API, storage implementation, cloud login, server secret custody, WebView secret custody, wallet mutation, ledger mutation, capability issuance, or default companion-device pairing.
 * RO:SECURITY — only redacted public onboarding progress crosses this boundary; PINs, recovery words, roots, VMKs, private keys, and platform-sealer material never belong here.
 * RO:TEST — onboardingContract.test.mjs and desktop onboardingCrossPlatformContract.test.mjs.
 */

export const ONBOARDING_CONTRACT_VERSION = 1;

export const ONBOARDING_SCHEMA =
  "crablink.onboarding.v1";

export const ONBOARDING_DTO_FIELDS =
  deepFreeze(
    [
  "schema",
  "state",
  "completed",
  "username",
  "usernameAvailability",
  "devAvailabilityBypassed",
  "passportState",
  "recoveryPhraseAcknowledged",
  "pinSetupComplete",
  "profileSetup",
  "createdAt",
  "updatedAt"
],
  );

export const ONBOARDING_STATES =
  deepFreeze(
    {
  "NOT_STARTED": "not_started",
  "WELCOME": "welcome",
  "USERNAME_ENTRY": "username_entry",
  "USERNAME_CHECKING": "username_checking",
  "USERNAME_AVAILABLE": "username_available",
  "USERNAME_BYPASSED_FOR_DEV": "username_bypassed_for_dev",
  "PASSPORT_CREATE_REQUESTED": "passport_create_requested",
  "PASSPORT_CREATED_LOCKED": "passport_created_locked",
  "RECOVERY_PHRASE_REQUIRED": "recovery_phrase_required",
  "RECOVERY_PHRASE_ACKNOWLEDGED": "recovery_phrase_acknowledged",
  "PIN_SETUP_REQUIRED": "pin_setup_required",
  "PIN_SETUP_COMPLETE": "pin_setup_complete",
  "PROFILE_SETUP": "profile_setup",
  "PROFILE_SKIPPED": "profile_skipped",
  "PROFILE_SAVED": "profile_saved",
  "COMPLETE": "complete",
  "BLOCKED": "blocked",
  "ERROR": "error"
},
  );

export const USERNAME_AVAILABILITY =
  deepFreeze(
    {
  "UNKNOWN": "unknown",
  "AVAILABLE": "available",
  "UNAVAILABLE": "unavailable",
  "BYPASSED_FOR_DEV": "bypassed_for_dev"
},
  );

export const PASSPORT_STATES =
  deepFreeze(
    {
  "NO_PASSPORT": "no_passport",
  "CREATED_LOCKED": "created_locked",
  "OPERATIONAL_UNLOCKED": "operational_unlocked",
  "UNAVAILABLE": "unavailable"
},
  );

export const PROFILE_SETUP_STATES =
  deepFreeze(
    {
  "PENDING": "pending",
  "SKIPPED": "skipped",
  "SAVED": "saved"
},
  );

export const ONBOARDING_PLATFORM_FAMILIES =
  deepFreeze({
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    TABLET: 'tablet',
    TV: 'tv',
  });

export const ONBOARDING_PLATFORM_PORT_METHODS =
  deepFreeze([
    'readNativePassportStatus',
    'createNativePassport',
    'beginNativeRecoveryCeremony',
    'unlockNativePassportOperational',
    'clearNativePassport',
    'readOnboardingState',
    'writeOnboardingState',
    'resetOnboardingState',
  ]);

export const ONBOARDING_CUSTODY_INVARIANTS =
  deepFreeze({
    localPassportCustodyRequired: true,
    nativePinSurfaceRequired: true,
    nativeRecoverySurfaceRequired: true,
    webviewPinCustodyAllowed: false,
    webviewRecoveryCustodyAllowed: false,
    cloudLoginAllowed: false,
    cloudSecretStorageAllowed: false,
    serverPassportSecretCustodyAllowed: false,
    backendIssuedIdentityAuthorityAllowed: false,
    companionDevicePairingRequired: false,
    walletOrLedgerMutationAllowed: false,
    capabilityIssuanceAllowed: false,
  });

export const ONBOARDING_PLATFORM_UI_CONTRACT =
  deepFreeze({
    desktop: {
      usernameInputMode:
        'keyboard_and_pointer',

      securePinSurface:
        'platform_native',

      recoveryDisplaySurface:
        'platform_native',

      profileInputMode:
        'keyboard_and_pointer',

      companionDeviceRequired:
        false,

      qrImportRequired:
        false,
    },

    mobile: {
      usernameInputMode:
        'touch_keyboard',

      securePinSurface:
        'platform_native',

      recoveryDisplaySurface:
        'platform_native',

      profileInputMode:
        'touch_keyboard',

      companionDeviceRequired:
        false,

      qrImportRequired:
        false,
    },

    tablet: {
      usernameInputMode:
        'touch_or_keyboard',

      securePinSurface:
        'platform_native',

      recoveryDisplaySurface:
        'platform_native',

      profileInputMode:
        'touch_or_keyboard',

      companionDeviceRequired:
        false,

      qrImportRequired:
        false,
    },

    tv: {
      usernameInputMode:
        'remote_friendly',

      securePinSurface:
        'platform_native',

      recoveryDisplaySurface:
        'tv_safe_native',

      profileInputMode:
        'remote_friendly_or_skip',

      companionDeviceRequired:
        false,

      qrImportRequired:
        false,

      optionalImportPath:
        'later_explicit_feature',
    },
  });

export const ONBOARDING_PORTABLE_SEQUENCE =
  deepFreeze([
    ONBOARDING_STATES.WELCOME,
    ONBOARDING_STATES.USERNAME_ENTRY,
    ONBOARDING_STATES.USERNAME_CHECKING,
    ONBOARDING_STATES.USERNAME_AVAILABLE,
    ONBOARDING_STATES.PASSPORT_CREATE_REQUESTED,
    ONBOARDING_STATES.PASSPORT_CREATED_LOCKED,
    ONBOARDING_STATES.RECOVERY_PHRASE_REQUIRED,
    ONBOARDING_STATES.RECOVERY_PHRASE_ACKNOWLEDGED,
    ONBOARDING_STATES.PIN_SETUP_REQUIRED,
    ONBOARDING_STATES.PIN_SETUP_COMPLETE,
    ONBOARDING_STATES.PROFILE_SETUP,
    ONBOARDING_STATES.PROFILE_SAVED,
    ONBOARDING_STATES.COMPLETE,
  ]);

const ONBOARDING_STATE_VALUES =
  new Set(
    Object.values(
      ONBOARDING_STATES,
    ),
  );

const USERNAME_AVAILABILITY_VALUES =
  new Set(
    Object.values(
      USERNAME_AVAILABILITY,
    ),
  );

const PASSPORT_STATE_VALUES =
  new Set(
    Object.values(
      PASSPORT_STATES,
    ),
  );

const PROFILE_SETUP_VALUES =
  new Set(
    Object.values(
      PROFILE_SETUP_STATES,
    ),
  );

const PLATFORM_FAMILY_VALUES =
  new Set(
    Object.values(
      ONBOARDING_PLATFORM_FAMILIES,
    ),
  );

const COMPLETION_USERNAME_STATES =
  new Set([
    USERNAME_AVAILABILITY.AVAILABLE,
    USERNAME_AVAILABILITY
      .BYPASSED_FOR_DEV,
  ]);

const COMPLETION_PASSPORT_STATES =
  new Set([
    PASSPORT_STATES.CREATED_LOCKED,
    PASSPORT_STATES
      .OPERATIONAL_UNLOCKED,
  ]);

const COMPLETION_PROFILE_STATES =
  new Set([
    PROFILE_SETUP_STATES.SKIPPED,
    PROFILE_SETUP_STATES.SAVED,
  ]);

export function assertPortableOnboardingRecord(
  record,
) {
  if (!isPlainObject(record)) {
    throw new TypeError(
      'Portable onboarding record must be a plain object.',
    );
  }

  const actualFields =
    Object.keys(record).sort();

  const expectedFields =
    [...ONBOARDING_DTO_FIELDS].sort();

  if (
    actualFields.length !==
      expectedFields.length ||
    actualFields.some(
      (field, index) =>
        field !==
        expectedFields[index],
    )
  ) {
    throw new TypeError(
      'Portable onboarding record fields do not match the frozen redacted DTO.',
    );
  }

  if (
    record.schema !==
    ONBOARDING_SCHEMA
  ) {
    throw new TypeError(
      'Portable onboarding schema is invalid.',
    );
  }

  if (
    !ONBOARDING_STATE_VALUES.has(
      record.state,
    )
  ) {
    throw new TypeError(
      'Portable onboarding state is invalid.',
    );
  }

  if (
    typeof record.completed !==
      'boolean' ||
    typeof record.devAvailabilityBypassed !==
      'boolean' ||
    typeof record.recoveryPhraseAcknowledged !==
      'boolean' ||
    typeof record.pinSetupComplete !==
      'boolean'
  ) {
    throw new TypeError(
      'Portable onboarding flags must be boolean.',
    );
  }

  if (
    typeof record.username !==
    'string'
  ) {
    throw new TypeError(
      'Portable onboarding username must be a string.',
    );
  }

  if (
    !USERNAME_AVAILABILITY_VALUES.has(
      record.usernameAvailability,
    )
  ) {
    throw new TypeError(
      'Portable onboarding username availability is invalid.',
    );
  }

  if (
    !PASSPORT_STATE_VALUES.has(
      record.passportState,
    )
  ) {
    throw new TypeError(
      'Portable onboarding Passport state is invalid.',
    );
  }

  if (
    !PROFILE_SETUP_VALUES.has(
      record.profileSetup,
    )
  ) {
    throw new TypeError(
      'Portable onboarding profile state is invalid.',
    );
  }

  if (
    !isIsoTimestamp(
      record.createdAt,
    ) ||
    !isIsoTimestamp(
      record.updatedAt,
    )
  ) {
    throw new TypeError(
      'Portable onboarding timestamps must be canonical ISO-8601 values.',
    );
  }

  if (
    record.state ===
      ONBOARDING_STATES.COMPLETE &&
    !record.completed
  ) {
    throw new TypeError(
      'Complete onboarding state requires completed truth.',
    );
  }

  if (record.completed) {
    if (
      record.state !==
      ONBOARDING_STATES.COMPLETE
    ) {
      throw new TypeError(
        'Completed onboarding must use the complete state.',
      );
    }

    if (!record.username) {
      throw new TypeError(
        'Completed onboarding requires a username decision.',
      );
    }

    if (
      !COMPLETION_USERNAME_STATES.has(
        record.usernameAvailability,
      )
    ) {
      throw new TypeError(
        'Completed onboarding requires an accepted username decision.',
      );
    }

    if (
      !COMPLETION_PASSPORT_STATES.has(
        record.passportState,
      )
    ) {
      throw new TypeError(
        'Completed onboarding requires a created local Passport.',
      );
    }

    if (
      !record.recoveryPhraseAcknowledged
    ) {
      throw new TypeError(
        'Completed onboarding requires recovery acknowledgement.',
      );
    }

    if (!record.pinSetupComplete) {
      throw new TypeError(
        'Completed onboarding requires native PIN setup completion.',
      );
    }

    if (
      !COMPLETION_PROFILE_STATES.has(
        record.profileSetup,
      )
    ) {
      throw new TypeError(
        'Completed onboarding requires a saved or skipped profile decision.',
      );
    }
  }

  return Object.freeze({
    ...record,
  });
}

export function assertOnboardingPlatformFamily(
  platformFamily,
) {
  if (
    !PLATFORM_FAMILY_VALUES.has(
      platformFamily,
    )
  ) {
    throw new TypeError(
      'Unsupported onboarding platform family.',
    );
  }

  return platformFamily;
}

export function getOnboardingPlatformUiContract(
  platformFamily,
) {
  const family =
    assertOnboardingPlatformFamily(
      platformFamily,
    );

  return ONBOARDING_PLATFORM_UI_CONTRACT[
    family
  ];
}

function isIsoTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    return false;
  }

  const date =
    new Date(value);

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    date.toISOString() === value
  );
}

function isPlainObject(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) ===
      Object.prototype
  );
}

function deepFreeze(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested);
  }

  return Object.freeze(value);
}
