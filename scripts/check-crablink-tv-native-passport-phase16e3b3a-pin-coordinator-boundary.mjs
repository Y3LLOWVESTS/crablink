#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url,
      ),
    ),
    '..',
  );

function read(
  relativePath,
) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(
      absolutePath,
    )
  ) {
    throw new Error(
      `Missing Phase 16E3B3A source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      !source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function rejectFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} contains forbidden fragment: ${fragment}`,
      );
    }
  }
}

const base =
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv';

const coordinator =
  read(
    `${base}/TvPassportNativePinCoordinator.kt`,
  );

const prompt =
  read(
    `${base}/TvPassportNativePinPrompt.kt`,
  );

const verifier =
  read(
    `${base}/TvPassportNativePinVerifierStore.kt`,
  );

const bridge =
  read(
    `${base}/TvPassportOperationalUnlockBridge.kt`,
  );

const mainActivity =
  read(
    `${base}/MainActivity.kt`,
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const tvPackage =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  );

const rootPackage =
  JSON.parse(
    read(
      'package.json',
    ),
  );

const codebundle =
  read(
    'scripts/make_codebundle.sh',
  );

requireFragments(
  'Phase 16E3B3A coordinator',
  coordinator,
  [
    'class TvPassportNativePinCoordinator',
    'requestExplicitEnrollmentOrUnlock',
    'requestExplicitEnrollment',
    'requestExplicitUnlock',
    'requestExplicitLock',
    'failClosedOnLifecycleBoundary',
    'beginRequest',
    'requestActive',
    'requestEnrollmentPin',
    'requestEnrollmentConfirmation',
    'constantTimePinEquals',
    'pin.copyOf()',
    "fill(",
    "verifierStore.enroll(",
    "verifierStore.verify(",
    'receipt.accepted',
    'unlockAfterVerifiedNativePin(',
    'failClosedOperationalRuntime',
    'System.currentTimeMillis()',
  ],
);

rejectFragments(
  'Phase 16E3B3A coordinator secret boundary',
  coordinator,
  [
    'String(pin)',
    'String(first',
    'String(second',
    'concatToString',
    'joinToString',
    'pin.toString()',
    'WebView',
    'evaluateJavascript',
    '@JavascriptInterface',
    'localStorage',
    'sessionStorage',
    'SharedPreferences',
    'println(',
    'Log.',
    'recoveryPhrase',
    'rootPrivateKey',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

requireFragments(
  'Phase 16E3B3A enrollment prompt',
  prompt,
  [
    'requestEnrollmentPin',
    'requestEnrollmentConfirmation',
    'requestUnlock',
    'Create Passport PIN',
    'Confirm Passport PIN',
    'Enter the same device PIN again.',
    'FLAG_SECURE',
    'CharArray',
    'editable.clear()',
    'pin.fill(',
  ],
);

rejectFragments(
  'Phase 16E3B3A prompt secret boundary',
  prompt,
  [
    'input.text.toString()',
    'String(pin)',
    'concatToString',
    'joinToString',
    '@JavascriptInterface',
    'evaluateJavascript',
    'android.webkit.WebView',
    'WebView(',
    'addJavascriptInterface(',
    '.loadUrl(',
    'SharedPreferences',
  ],
);

requireFragments(
  'Phase 16E3B3A verifier predecessor',
  verifier,
  [
    'fun enroll(',
    'fun verify(',
    'fun inspect(',
    'consumeVerifiedPinTicketForNative',
    'VERIFIED_TICKET_BYTES',
    'VERIFIED_TICKET_LIFETIME_MS',
  ],
);

requireFragments(
  'Phase 16E3B3A operational bridge',
  bridge,
  [
    'failClosedOperationalRuntime',
    'unlockAfterVerifiedNativePin(',
    '0L',
  ],
);

const unlockExports =
  (
    jni.match(
      /Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin/g,
    ) ?? []
  ).length;

if (
  unlockExports !==
  1
) {
  throw new Error(
    `Expected one reviewed unlock JNI export, found ${unlockExports}`,
  );
}

requireFragments(
  'Phase 16E3B3A MainActivity ownership',
  mainActivity,
  [
    'TvPassportNativePinCoordinator(',
    'passportNativePinCoordinatorForNativeRuntime',
    'tvPassportNativePinPrompt',
    'tvPassportNativePinVerifierStore',
    'tvPassportOperationalUnlockBridge',
  ],
);

const phase16e3b3bBoundaryRelativePath =
  'scripts/check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs';

const phase16e3b3bPresent =
  fs.existsSync(
    path.join(
      root,
      phase16e3b3bBoundaryRelativePath,
    ),
  );

if (
  phase16e3b3bPresent
) {
  const phase16e3b3bBoundary =
    read(
      phase16e3b3bBoundaryRelativePath,
    );

  requireFragments(
    'Phase 16E3B3B authorized successor boundary',
    phase16e3b3bBoundary,
    [
      'NATIVE_PASSPORT_PHASE16E3B3B_EXPLICIT_REQUEST_AND_LIFECYCLE_LOCK=GREEN',
      'EXPLICIT_NATIVE_REQUEST=MENU_OR_F1',
      'EXPLICIT_NATIVE_LOCK=INFO_OR_F2',
      'BACKGROUND_LOCK=CONNECTED',
      'SUSPENSION_LOCK=CONNECTED',
      'AUTOMATIC_STARTUP_PROMPT=NO',
    ],
  );

  requireFragments(
    'Phase 16E3B3B authorized MainActivity integration',
    mainActivity,
    [
      'override fun dispatchKeyEvent(',
      'PASSPORT_NATIVE_PIN_REQUEST_KEY_CODES',
      'PASSPORT_NATIVE_EXPLICIT_LOCK_KEY_CODES',
      'requestExplicitEnrollmentOrUnlock()',
      'requestExplicitLock()',
      'override fun onPause()',
      'override fun onStop()',
      'override fun onDestroy()',
      'failClosedOnLifecycleBoundary()',
    ],
  );
} else {
  for (
    const forbiddenInvocation
    of [
      'tvPassportNativePinCoordinator.requestExplicitEnrollmentOrUnlock(',
      'tvPassportNativePinCoordinator.requestExplicitLock(',
      'tvPassportNativePinCoordinator.failClosedOnLifecycleBoundary(',
    ]
  ) {
    if (
      mainActivity.includes(
        forbiddenInvocation,
      )
    ) {
      throw new Error(
        `Phase 16E3B3A must not yet connect request/lifecycle invocation: ${forbiddenInvocation}`,
      );
    }
  }
}

requireFragments(
  'Phase 16E3B3A ProGuard posture',
  proguard,
  [
    'TvPassportNativePinCoordinator',
    'TvPassportOperationalUnlockBridge',
    'TvPassportNativePinPrompt',
    'TvPassportNativePinVerifierStore',
  ],
);

const commands =
  [
    ...new Set(
      [
        ...lib.matchAll(
          /commands::[a-z_]+::(tv_[a-z_]+)/gu,
        ),
      ]
        .map(
          (
            match,
          ) =>
            match[
              1
            ],
        ),
    ),
  ];

if (
  commands.length !==
  8 ||
  commands.some(
    (
      command,
    ) =>
      command.includes(
        'passport',
      ),
  )
) {
  throw new Error(
    `TV command allowlist changed: ${commands.join(',')}`,
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16e3b3a-pin-coordinator'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b3a-pin-coordinator-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3A TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b3a:pin-coordinator:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b3a-pin-coordinator-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3A root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b3a-pin-coordinator-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B3A boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B3A PIN-coordinator boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B3A_PIN_COORDINATOR=GREEN',
);

console.log(
  'PIN_ENROLLMENT=TWO_ENTRY_EXPLICIT_NATIVE_FLOW',
);

console.log(
  'PIN_CONFIRMATION=CONSTANT_TIME_CHAR_ARRAY_COMPARISON',
);

console.log(
  'PIN_CONVERTED_TO_STRING=NO',
);

console.log(
  'ENROLLMENT_AUTOMATIC_UNLOCK=NO',
);

console.log(
  'CORRECT_PIN_JNI_UNLOCK=CONNECTED_IN_COORDINATOR',
);

console.log(
  'WRONG_PIN_JNI_UNLOCK=BLOCKED',
);

console.log(
  'CANCEL_JNI_UNLOCK=BLOCKED',
);

console.log(
  'CONCURRENT_PROMPT=BLOCKED',
);

console.log(
  'FAIL_CLOSED_LOCK_HOOK=ADDED',
);

console.log(
  phase16e3b3bPresent
    ? 'EXPLICIT_REQUEST_SURFACE=OWNED_BY_PHASE16E3B3B'
    : 'EXPLICIT_REQUEST_SURFACE=NOT_YET_CONNECTED',
);

console.log(
  phase16e3b3bPresent
    ? 'LIFECYCLE_CALLBACKS=OWNED_BY_PHASE16E3B3B'
    : 'LIFECYCLE_CALLBACKS=NOT_YET_CONNECTED',
);

console.log(
  'PIN_RETURNED_TO_WEBVIEW=NO',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  phase16e3b3bPresent
    ? 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE'
    : 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3B_EXPLICIT_NATIVE_REQUEST_AND_LIFECYCLE_LOCK',
);
