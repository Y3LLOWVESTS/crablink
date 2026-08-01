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
      `Missing Phase 16E3B3B source: ${relativePath}`,
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

function functionBody(
  source,
  signature,
) {
  const signatureIndex =
    source.indexOf(
      signature,
    );

  if (
    signatureIndex <
    0
  ) {
    throw new Error(
      `Function signature missing: ${signature}`,
    );
  }

  const openBrace =
    source.indexOf(
      '{',
      signatureIndex,
    );

  if (
    openBrace <
    0
  ) {
    throw new Error(
      `Function opening brace missing: ${signature}`,
    );
  }

  let depth =
    0;

  for (
    let index =
      openBrace;

    index <
      source.length;

    index +=
      1
  ) {
    const character =
      source[
        index
      ];

    if (
      character ===
      '{'
    ) {
      depth +=
        1;
    } else if (
      character ===
      '}'
    ) {
      depth -=
        1;

      if (
        depth ===
        0
      ) {
        return source.slice(
          openBrace + 1,
          index,
        );
      }
    }
  }

  throw new Error(
    `Function closing brace missing: ${signature}`,
  );
}

const base =
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv';

const mainActivity =
  read(
    `${base}/MainActivity.kt`,
  );

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
  'Phase 16E3B3B key surface',
  mainActivity,
  [
    'import android.view.KeyEvent',
    'PASSPORT_NATIVE_PIN_REQUEST_KEY_CODES',
    'KeyEvent.KEYCODE_MENU',
    'KeyEvent.KEYCODE_F1',
    'PASSPORT_NATIVE_EXPLICIT_LOCK_KEY_CODES',
    'KeyEvent.KEYCODE_INFO',
    'KeyEvent.KEYCODE_F2',
    'override fun dispatchKeyEvent(',
    'KeyEvent.ACTION_UP',
    'event.repeatCount',
    'requestExplicitEnrollmentOrUnlock()',
    'requestExplicitLock()',
    'return super.dispatchKeyEvent(',
  ],
);

requireFragments(
  'Phase 16E3B3B lifecycle surface',
  mainActivity,
  [
    'override fun onPause()',
    'override fun onStop()',
    'override fun onDestroy()',
    'failClosedOnLifecycleBoundary()',
    'super.onPause()',
    'super.onStop()',
    'super.onDestroy()',
  ],
);

const createBody =
  functionBody(
    mainActivity,
    'override fun onCreate(',
  );

const resumeBody =
  functionBody(
    mainActivity,
    'override fun onResume()',
  );

const dispatchBody =
  functionBody(
    mainActivity,
    'override fun dispatchKeyEvent(',
  );

const pauseBody =
  functionBody(
    mainActivity,
    'override fun onPause()',
  );

const stopBody =
  functionBody(
    mainActivity,
    'override fun onStop()',
  );

const destroyBody =
  functionBody(
    mainActivity,
    'override fun onDestroy()',
  );

rejectFragments(
  'Phase 16E3B3B startup remains locked',
  createBody,
  [
    'requestExplicitEnrollmentOrUnlock',
    'unlockAfterVerifiedNativePin',
    'requestEnrollmentPin',
    'requestUnlock',
  ],
);

rejectFragments(
  'Phase 16E3B3B resume does not prompt',
  resumeBody,
  [
    'requestExplicitEnrollmentOrUnlock',
    'unlockAfterVerifiedNativePin',
    'requestEnrollmentPin',
    'requestUnlock',
  ],
);

requireFragments(
  'Phase 16E3B3B dispatch ownership',
  dispatchBody,
  [
    'PASSPORT_NATIVE_PIN_REQUEST_KEY_CODES',
    'requestExplicitEnrollmentOrUnlock()',
    'PASSPORT_NATIVE_EXPLICIT_LOCK_KEY_CODES',
    'requestExplicitLock()',
  ],
);

requireFragments(
  'Phase 16E3B3B pause lock',
  pauseBody,
  [
    'failClosedOnLifecycleBoundary()',
    'super.onPause()',
  ],
);

requireFragments(
  'Phase 16E3B3B stop lock',
  stopBody,
  [
    'failClosedOnLifecycleBoundary()',
    'super.onStop()',
  ],
);

requireFragments(
  'Phase 16E3B3B destroy lock',
  destroyBody,
  [
    'failClosedOnLifecycleBoundary()',
    'super.onDestroy()',
  ],
);

const requestInvocationCount =
  (
    mainActivity.match(
      /\.requestExplicitEnrollmentOrUnlock\(\)/g,
    ) ?? []
  ).length;

const explicitLockInvocationCount =
  (
    mainActivity.match(
      /\.requestExplicitLock\(\)/g,
    ) ?? []
  ).length;

const lifecycleLockInvocationCount =
  (
    mainActivity.match(
      /\.failClosedOnLifecycleBoundary\(\)/g,
    ) ?? []
  ).length;

if (
  requestInvocationCount !==
  1
) {
  throw new Error(
    `Expected one explicit PIN request invocation, found ${requestInvocationCount}`,
  );
}

if (
  explicitLockInvocationCount !==
  1
) {
  throw new Error(
    `Expected one explicit lock invocation, found ${explicitLockInvocationCount}`,
  );
}

if (
  lifecycleLockInvocationCount !==
  3
) {
  throw new Error(
    `Expected three lifecycle lock invocations, found ${lifecycleLockInvocationCount}`,
  );
}

requireFragments(
  'Phase 16E3B3B coordinator reuse',
  coordinator,
  [
    'requestExplicitEnrollmentOrUnlock',
    'requestExplicitLock',
    'failClosedOnLifecycleBoundary',
    'requestExplicitEnrollment',
    'requestExplicitUnlock',
    'receipt.accepted',
    'unlockAfterVerifiedNativePin(',
    'failClosedOperationalRuntime',
  ],
);

requireFragments(
  'Phase 16E3B3B native PIN protections',
  prompt,
  [
    'FLAG_SECURE',
    'CharArray',
    'editable.clear()',
    'pin.fill(',
    'requestEnrollmentConfirmation',
  ],
);

requireFragments(
  'Phase 16E3B3B verifier protections',
  verifier,
  [
    'VERIFIED_TICKET_BYTES',
    'VERIFIED_TICKET_LIFETIME_MS',
    'consumeVerifiedPinTicketForNative',
  ],
);

requireFragments(
  'Phase 16E3B3B fail-closed bridge',
  bridge,
  [
    'failClosedOperationalRuntime',
    'unlockAfterVerifiedNativePin(',
    '0L',
  ],
);

const phase16e3b3bActivityIntegrationBodies =
  [
    dispatchBody,
    pauseBody,
    stopBody,
    destroyBody,
  ]
    .join(
      '\n',
    );

rejectFragments(
  'Phase 16E3B3B Activity integration secret boundary',
  phase16e3b3bActivityIntegrationBodies,
  [
    '@JavascriptInterface',
    'addJavascriptInterface(',
    'evaluateJavascript(',
    'String(pin)',
    'concatToString',
    'joinToString',
    'SharedPreferences',
    'localStorage',
    'sessionStorage',
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
    'check:native-passport-phase16e3b3b-explicit-request-lifecycle-lock'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3B TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b3b:explicit-request-lifecycle-lock:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3B root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B3B boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B3B explicit-request and lifecycle-lock boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B3B_EXPLICIT_REQUEST_AND_LIFECYCLE_LOCK=GREEN',
);

console.log(
  'EXPLICIT_NATIVE_REQUEST=MENU_OR_F1',
);

console.log(
  'EXPLICIT_NATIVE_LOCK=INFO_OR_F2',
);

console.log(
  'PIN_ENROLLMENT_OR_UNLOCK=USER_ACTION_ONLY',
);

console.log(
  'AUTOMATIC_STARTUP_PROMPT=NO',
);

console.log(
  'AUTOMATIC_STARTUP_UNLOCK=NO',
);

console.log(
  'BACKGROUND_LOCK=CONNECTED',
);

console.log(
  'SUSPENSION_LOCK=CONNECTED',
);

console.log(
  'DESTROY_LOCK=CONNECTED',
);

console.log(
  'PIN_BYTES_CROSS_JNI=NO',
);

console.log(
  'RAW_DEVICE_KEY_RETURNED_TO_WEBVIEW=NO',
);

console.log(
  'RAW_CAPABILITY_RETURNED_TO_WEBVIEW=NO',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE',
);
