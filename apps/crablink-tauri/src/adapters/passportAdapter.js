/**
 * RO:WHAT — React-safe adapter for desktop Native Passport Tauri commands.
 * RO:WHY — Phase 15AB gives UI code a narrow command boundary without raw invoke, PIN arguments, or secret custody.
 * RO:INTERACTS — platform/tauriPlatform.js and fixed Rust Passport commands, including DeviceKey possession, username-capability issuance, and protected username/profile claim.
 * RO:INVARIANTS — fixed command names only; no dynamic command dispatch; protected claim forwards public profile intent only; PIN/root/device/capability/proof authority stays native; command DTOs remain redacted display truth.
 * RO:SECURITY — never serializes PINs, VMKs, vault bytes, platform factors, recovery-root material, private keys, seed phrases, raw capabilities, wallet mutation, or ledger mutation.
 * RO:TEST — src/adapters/passportAdapter.test.mjs.
 */

import { callTauri } from '../platform/tauriPlatform.js';

export const PASSPORT_ADAPTER_PHASE_LABEL =
  'NATIVE_PASSPORT_PHASE15AB_DESKTOP_PASSPORT_COMMAND_ADAPTERS';

export const PASSPORT_COMMANDS = Object.freeze({
  status: 'passport_status',
  create: 'passport_create',
  lock: 'passport_lock',
  unlockOperational: 'passport_unlock_operational',
  unlockRoot: 'passport_unlock_root',
  registerRoot: 'passport_register_root',
  authorizeDevice: 'passport_authorize_device',
  verifyDevicePossession:
    'passport_verify_device_possession',
  issueUsernameCapability:
    'passport_issue_username_capability',
  claimUsername:
    'passport_claim_username',
  recoveryCeremony:
    'passport_recovery_ceremony',
  clear: 'passport_clear',
});

export const PASSPORT_SAFE_ABSENT_VALUE = 'ABSENT';
export const PASSPORT_SAFE_REDACTED_VALUE = 'REDACTED';

const STATUS_DEFAULTS = Object.freeze({
  schema: 'crablink.native-passport.status.v1',
  commandName: PASSPORT_COMMANDS.status,
  sourcePhaseLabel: 'UNKNOWN',
  state: 'unavailable',
  capabilityState: 'absent',
  passportIdentifier: PASSPORT_SAFE_ABSENT_VALUE,
  deviceIdentifier: PASSPORT_SAFE_ABSENT_VALUE,
  usernameHandle: PASSPORT_SAFE_ABSENT_VALUE,
  capabilityMaterial: PASSPORT_SAFE_ABSENT_VALUE,
  redacted: true,
  nativeRuntimeReady: false,
  developmentIdentityCompatibilityOnly: true,
  readOnly: true,
  unlockPerformed: false,
  platformSealerAccessed: false,
  runtimeIoPerformed: false,
  storageMutated: false,
  walletOrLedgerMutated: false,
});

const RECOVERY_CEREMONY_DEFAULTS =
  Object.freeze({
    schema:
      'crablink.native-passport.recovery-ceremony.v1',
    commandName:
      PASSPORT_COMMANDS.recoveryCeremony,
    sourcePhaseLabel: 'UNKNOWN',
    state: 'unavailable',
    shown: false,
    acknowledged: false,
    redacted: true,
    recoveryFingerprint:
      PASSPORT_SAFE_ABSENT_VALUE,
    nativeSecureSurfaceRequested: false,
    wordsReturnedToWebview: false,
    secretMaterialReturned: false,
    recoveryRootExported: false,
    walletOrLedgerMutated: false,
  });

const USERNAME_CLAIM_DEFAULTS =
  Object.freeze({
    schema:
      'crablink.native-passport.username-claim-command.v1',
    commandName:
      PASSPORT_COMMANDS.claimUsername,
    sourcePhaseLabel: 'UNKNOWN',
    state: 'username_claim_rejected',
    username: '',
    handle: '',
    profileCrabUrl: '',
    backendConfirmed: false,
    redacted: true,
    walletOrLedgerMutated: false,
  });

const COMMAND_DEFAULTS = Object.freeze({
  schema: 'crablink.native-passport.command.v1',
  commandName: 'passport_unknown',
  sourcePhaseLabel: 'UNKNOWN',
  state: 'unavailable',
  redacted: true,
  nativeSecureInputRequested: false,
  pinReceivedFromWebview: false,
  secretMaterialReturned: false,
  sessionChanged: false,
  encryptedVaultMutated: false,
  platformMaterialMutated: false,
  recoveryRootUnsealed: false,
  walletOrLedgerMutated: false,
});

export function normalizePassportStatusDto(dto) {
  const value = dto && typeof dto === 'object' ? dto : {};

  return {
    ...STATUS_DEFAULTS,
    schema: stringOrDefault(value.schema, STATUS_DEFAULTS.schema),
    commandName: stringOrDefault(value.commandName, STATUS_DEFAULTS.commandName),
    sourcePhaseLabel: stringOrDefault(
      value.sourcePhaseLabel,
      STATUS_DEFAULTS.sourcePhaseLabel,
    ),
    state: stringOrDefault(value.state, STATUS_DEFAULTS.state),
    capabilityState: stringOrDefault(
      value.capabilityState,
      STATUS_DEFAULTS.capabilityState,
    ),
    passportIdentifier: safePassportDisplayValue(value.passportIdentifier),
    deviceIdentifier: safePassportDisplayValue(value.deviceIdentifier),
    usernameHandle: safePassportDisplayValue(value.usernameHandle),
    capabilityMaterial: safePassportDisplayValue(value.capabilityMaterial),
    redacted: value.redacted !== false,
    nativeRuntimeReady: value.nativeRuntimeReady === true,
    developmentIdentityCompatibilityOnly:
      value.developmentIdentityCompatibilityOnly !== false,
    readOnly: value.readOnly !== false,
    unlockPerformed: false,
    platformSealerAccessed: false,
    runtimeIoPerformed: false,
    storageMutated: false,
    walletOrLedgerMutated: false,
  };
}

export function normalizePassportCommandDto(dto, commandName) {
  const value = dto && typeof dto === 'object' ? dto : {};

  return {
    ...COMMAND_DEFAULTS,
    schema: stringOrDefault(value.schema, COMMAND_DEFAULTS.schema),
    commandName: stringOrDefault(value.commandName, commandName),
    sourcePhaseLabel: stringOrDefault(
      value.sourcePhaseLabel,
      COMMAND_DEFAULTS.sourcePhaseLabel,
    ),
    state: stringOrDefault(value.state, COMMAND_DEFAULTS.state),
    redacted: value.redacted !== false,
    nativeSecureInputRequested: value.nativeSecureInputRequested === true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    sessionChanged: value.sessionChanged === true,
    encryptedVaultMutated: value.encryptedVaultMutated === true,
    platformMaterialMutated: value.platformMaterialMutated === true,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
  };
}

export function normalizePassportUsernameClaimDto(
  dto,
) {
  const value =
    dto && typeof dto === 'object'
      ? dto
      : {};

  const state =
    stringOrDefault(
      value.state,
      USERNAME_CLAIM_DEFAULTS.state,
    );

  const backendConfirmed =
    state === 'username_claimed' &&
    value.backendConfirmed === true;

  return {
    ...USERNAME_CLAIM_DEFAULTS,
    schema: stringOrDefault(
      value.schema,
      USERNAME_CLAIM_DEFAULTS.schema,
    ),
    commandName: stringOrDefault(
      value.commandName,
      USERNAME_CLAIM_DEFAULTS.commandName,
    ),
    sourcePhaseLabel: stringOrDefault(
      value.sourcePhaseLabel,
      USERNAME_CLAIM_DEFAULTS
        .sourcePhaseLabel,
    ),
    state,
    username:
      backendConfirmed
        ? stringOrDefault(
            value.username,
            '',
          )
        : '',
    handle:
      backendConfirmed
        ? stringOrDefault(
            value.handle,
            '',
          )
        : '',
    profileCrabUrl:
      backendConfirmed
        ? stringOrDefault(
            value.profileCrabUrl,
            '',
          )
        : '',
    backendConfirmed,
    redacted: true,
    walletOrLedgerMutated: false,
  };
}

export function normalizeRecoveryCeremonyDto(
  dto,
) {
  const value =
    dto && typeof dto === 'object'
      ? dto
      : {};

  const normalizedState =
    stringOrDefault(
      value.state,
      RECOVERY_CEREMONY_DEFAULTS.state,
    );

  const recoveryFingerprint =
    safePassportDisplayValue(
      value.recoveryFingerprint,
    );

  const persistedAcknowledgement =
    normalizedState ===
      'already_acknowledged' &&
    value.shown === false &&
    value.acknowledged === true &&
    value.redacted !== false &&
    recoveryFingerprint ===
      PASSPORT_SAFE_REDACTED_VALUE &&
    value.nativeSecureSurfaceRequested ===
      false &&
    value.wordsReturnedToWebview === false &&
    value.secretMaterialReturned === false &&
    value.recoveryRootExported === false &&
    value.walletOrLedgerMutated === false;

  const unsafePersistedAcknowledgement =
    normalizedState ===
      'already_acknowledged' &&
    !persistedAcknowledgement;

  return {
    ...RECOVERY_CEREMONY_DEFAULTS,
    schema: stringOrDefault(
      value.schema,
      RECOVERY_CEREMONY_DEFAULTS.schema,
    ),
    commandName: stringOrDefault(
      value.commandName,
      RECOVERY_CEREMONY_DEFAULTS
        .commandName,
    ),
    sourcePhaseLabel: stringOrDefault(
      value.sourcePhaseLabel,
      RECOVERY_CEREMONY_DEFAULTS
        .sourcePhaseLabel,
    ),
    state:
      unsafePersistedAcknowledgement
        ? 'unavailable'
        : normalizedState,
    shown:
      persistedAcknowledgement
        ? false
        : unsafePersistedAcknowledgement
          ? false
          : value.shown === true,
    acknowledged:
      persistedAcknowledgement
        ? true
        : unsafePersistedAcknowledgement
          ? false
          : value.acknowledged === true,
    redacted: value.redacted !== false,
    recoveryFingerprint:
      unsafePersistedAcknowledgement
        ? PASSPORT_SAFE_ABSENT_VALUE
        : recoveryFingerprint,
    nativeSecureSurfaceRequested:
      persistedAcknowledgement
        ? false
        : unsafePersistedAcknowledgement
          ? false
          : value.nativeSecureSurfaceRequested ===
            true,
    alreadyAcknowledged:
      persistedAcknowledgement,
    repeatDisplayRejected:
      persistedAcknowledgement,
    wordsReturnedToWebview: false,
    secretMaterialReturned: false,
    recoveryRootExported: false,
    walletOrLedgerMutated: false,
  };
}
export async function readNativePassportStatus() {
  const dto = await callTauri(PASSPORT_COMMANDS.status);

  return normalizePassportStatusDto(dto);
}

export async function createNativePassport() {
  return runPassportCommand(PASSPORT_COMMANDS.create);
}

export async function lockNativePassport() {
  return runPassportCommand(PASSPORT_COMMANDS.lock);
}

export async function unlockNativePassportOperational() {
  return runPassportCommand(PASSPORT_COMMANDS.unlockOperational);
}

export async function confirmNativePassportRoot() {
  return runPassportCommand(PASSPORT_COMMANDS.unlockRoot);
}

export async function registerNativePassportRoot() {
  return runPassportCommand(PASSPORT_COMMANDS.registerRoot);
}

export async function authorizeNativePassportDevice() {
  return runPassportCommand(PASSPORT_COMMANDS.authorizeDevice);
}

export async function verifyNativePassportDevicePossession() {
  return runPassportCommand(
    PASSPORT_COMMANDS.verifyDevicePossession,
  );
}

export async function issueNativePassportUsernameCapability() {
  return runPassportCommand(
    PASSPORT_COMMANDS.issueUsernameCapability,
  );
}

export async function claimNativePassportUsername(
  profileIntent = {},
) {
  const input =
    profileIntent &&
    typeof profileIntent === 'object'
      ? profileIntent
      : {};

  const safeIntent = {
    requested_username:
      typeof input.requestedUsername === 'string'
        ? input.requestedUsername
        : '',
    display_name:
      optionalPublicProfileText(
        input.displayName,
      ),
    bio:
      optionalPublicProfileText(
        input.bio,
      ),
    avatar_image:
      optionalPublicProfileText(
        input.avatarImage,
      ),
  };

  const dto = await callTauri(
    PASSPORT_COMMANDS.claimUsername,
    {
      intent: safeIntent,
    },
  );

  return normalizePassportUsernameClaimDto(
    dto,
  );
}

export async function beginNativePassportRecoveryCeremony() {
  const dto = await callTauri(
    PASSPORT_COMMANDS.recoveryCeremony,
  );

  return normalizeRecoveryCeremonyDto(dto);
}

export async function clearNativePassport() {
  return runPassportCommand(PASSPORT_COMMANDS.clear);
}

async function runPassportCommand(commandName) {
  const dto = await callTauri(commandName);

  return normalizePassportCommandDto(dto, commandName);
}

function optionalPublicProfileText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function stringOrDefault(value, fallback) {
  if (typeof value !== 'string') return fallback;

  const trimmed = value.trim();

  return trimmed || fallback;
}

function safePassportDisplayValue(value) {
  const normalized = stringOrDefault(value, PASSPORT_SAFE_ABSENT_VALUE);

  if (
    normalized === PASSPORT_SAFE_ABSENT_VALUE ||
    normalized === PASSPORT_SAFE_REDACTED_VALUE
  ) {
    return normalized;
  }

  return PASSPORT_SAFE_REDACTED_VALUE;
}
