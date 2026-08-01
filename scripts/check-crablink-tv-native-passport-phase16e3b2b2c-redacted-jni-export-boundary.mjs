#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing Phase 16E3B2B2C source: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireAll(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function rejectAll(label, source, fragments) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(`${label} contains forbidden fragment: ${fragment}`);
    }
  }
}

const bridge = read(
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportOperationalUnlockBridge.kt',
);
const activity = read(
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
);
const jni = read(
  'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
);
const materialPort = read(
  'apps/crablink-tv/src-tauri/src/passport_android_operational_material_port.rs',
);
const unlock = read(
  'apps/crablink-tv/src-tauri/src/passport_tv_operational_unlock.rs',
);
const proguard = read(
  'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
);
const predecessor = read(
  'scripts/check-crablink-tv-native-passport-phase16e3b2b2b-jni-material-port-boundary.mjs',
);
const lib = read(
  'apps/crablink-tv/src-tauri/src/lib.rs',
);
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const codebundle = read('scripts/make_codebundle.sh');

requireAll('Kotlin bridge', bridge, [
  'class TvPassportOperationalUnlockBridge(',
  'external fun unlockAfterVerifiedNativePin(',
  'nowMs: Long',
  'consumeVerifiedPinTicketForNative',
  'unsealStoredDeviceKeyForNative',
  'unsealStoredNarrowCapabilityForNative',
]);

rejectAll('Kotlin bridge', bridge, [
  'pin: String',
  'pin: CharArray',
  'password',
  'recoveryPhrase',
  'rootPrivateKey',
  'import android.webkit.WebView',
  'JSONObject',
  'Log.',
]);

const nativeDeclarationCount = (
  bridge.match(/external fun unlockAfterVerifiedNativePin\(/gu) ?? []
).length;

if (nativeDeclarationCount !== 1) {
  throw new Error(
    `Expected one Kotlin native declaration, found ${nativeDeclarationCount}`,
  );
}

requireAll('MainActivity ownership', activity, [
  'private val tvPassportOperationalUnlockBridge by',
  'TvPassportOperationalUnlockBridge(',
  'passportOperationalUnlockBridgeForNativeRuntime',
]);

rejectAll('MainActivity invocation', activity, [
  '.unlockAfterVerifiedNativePin(',
  '.requestUnlock(',
  '.enroll(',
  '.verify(',
]);

const exportName =
  'Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin';

requireAll('Rust JNI export', jni, [
  exportName,
  'TvAndroidOperationalUnlockExportError',
  'TvAndroidOperationalUnlockExportReceiptV1',
  'TvAndroidOperationalUnlockExportFailureV1',
  'unlock_operational_runtime_from_verified_ticket',
  'unlock_after_consumed_verified_ticket',
  'operational_unlock_receipt_is_reviewed',
  'clear_operational_unlock_jni_exception',
  'fail_closed_global_operational_unlock',
  'catch_unwind',
  'state: "operationally_unlocked"',
  'state: "failed_closed"',
  '"operational_unlock_jni_exception"',
  '"operational_unlock_receipt_rejected"',
  '"native_panic_blocked"',
  'webview_secret_returned: false',
]);

const exportCount = (jni.match(new RegExp(exportName, 'gu')) ?? []).length;

if (exportCount !== 1) {
  throw new Error(`Expected one Rust JNI export, found ${exportCount}`);
}

const successStructStart = jni.indexOf(
  'struct TvAndroidOperationalUnlockExportReceiptV1',
);
const exportErrorStart = jni.indexOf(
  'enum TvAndroidOperationalUnlockExportError',
);
const redactedStructs = jni.slice(successStructStart, exportErrorStart);

rejectAll('Serialized receipt structs', redactedStructs, [
  'device_key_bytes',
  'capability_bytes',
  'ticket_bytes',
  'pin_bytes',
  'recovery_phrase',
  'root_private_key',
  'ciphertext',
  'authorization_payload',
]);

requireAll('Global fail-closed helper', unlock, [
  'pub(crate) fn fail_closed_global_operational_unlock',
  'global_tv_operational_unlock_runtime()',
  'global_tv_authority_runtime()',
  'TvLifecycleLockReason::Manual',
]);

requireAll('Material-port reuse', materialPort, [
  'consumeVerifiedPinTicketForNative',
  'unsealStoredDeviceKeyForNative',
  'unsealStoredNarrowCapabilityForNative',
  'drop(verified_ticket);',
  'Zeroizing<Vec<u8>>',
]);

requireAll('ProGuard', proguard, [
  'TvPassportOperationalUnlockBridge',
  'unlockAfterVerifiedNativePin(long)',
  'consumeVerifiedPinTicketForNative()',
  'unsealStoredDeviceKeyForNative()',
  'unsealStoredNarrowCapabilityForNative()',
]);

requireAll('Successor-aware predecessor', predecessor, [
  'const successorExport =',
  'const successorExportPresent =',
  'JNI_EXPORT=OWNED_BY_PHASE16E3B2B2C',
]);

const commands = [
  ...new Set(
    [...lib.matchAll(/commands::[a-z_]+::(tv_[a-z_]+)/gu)]
      .map((match) => match[1]),
  ),
];

if (
  commands.length !== 8 ||
  commands.some((command) => command.includes('passport'))
) {
  throw new Error(`TV command allowlist changed: ${commands.join(',')}`);
}

const expectedTv =
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b2b2c-redacted-jni-export-boundary.mjs';
const expectedRoot =
  'node scripts/check-crablink-tv-native-passport-phase16e3b2b2c-redacted-jni-export-boundary.mjs';

if (
  tvPackage.scripts[
    'check:native-passport-phase16e3b2b2c-redacted-jni-export'
  ] !== expectedTv
) {
  throw new Error('TV package script mismatch');
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b2b2c:redacted-jni-export:check'
  ] !== expectedRoot
) {
  throw new Error('Root package script mismatch');
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b2b2c-redacted-jni-export-boundary.mjs',
  )
) {
  throw new Error('Boundary absent from future codebundle selection');
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B2B2C redacted JNI-export boundary passed.',
);
console.log(
  'NATIVE_PASSPORT_PHASE16E3B2B2C_REDACTED_JNI_EXPORT=GREEN',
);
console.log('JNI_EXPORT_COUNT=1');
console.log('PIN_ARGUMENT_CROSSES_JNI=NO');
console.log('VERIFIED_TICKET_CONSUME_ONCE=REUSED');
console.log('JAVA_SECRET_ARRAY_ZEROIZATION=REUSED');
console.log('RUST_SECRET_ZEROIZATION=REUSED');
console.log('SUCCESS_RECEIPT=REDACTED');
console.log('FAILURE_RECEIPT=REDACTED_FAILED_CLOSED');
console.log('JNI_PANIC_CONTAINMENT=ADDED');
console.log('JNI_PENDING_EXCEPTION_CLEAR=ADDED');
console.log('GLOBAL_FAIL_CLOSED_LOCK=ADDED');
console.log('MAIN_ACTIVITY_OWNS_OPERATIONAL_BRIDGE=YES');
console.log('PROMPT_INVOCATION=NOT_ADDED');
console.log('PIN_ENROLLMENT_INVOCATION=NOT_ADDED');
console.log('AUTOMATIC_STARTUP_UNLOCK=NOT_ADDED');
console.log('PUBLIC_TAURI_COMMAND=NOT_ADDED');
console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3_PIN_ENROLLMENT_AND_PROMPT_INVOCATION',
);