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
      `Missing Phase 16E2 source: ${relativePath}`,
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

const prompt =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportNativePinPrompt.kt',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
  );

const lifecycle =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_native_pin_lifecycle.rs',
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
  'Phase 16E2 Android PIN prompt',
  prompt,
  [
    'class TvPassportNativePinPrompt',
    'TvPassportNativePinVerifier',
    'TvPassportNativePinVerification',
    'TvPassportNativePinOutcome',
    'TvPassportNativePinPromptReceipt',
    'crablink.tv.native-pin-prompt.v1',
    'AlertDialog',
    'EditText',
    'TYPE_NUMBER_VARIATION_PASSWORD',
    'FLAG_SECURE',
    'CharArray',
    'editable.clear()',
    'pin.fill(',
    'PromptUnavailable',
    'WrongPin',
    'Cancelled',
    'pinStored =',
    'pinReturnedToWebview =',
    'privateMaterialExported =',
    'recoveryRootPresent =',
    'rootAdminKeyPresent =',
    'rawAuthorizationReturned =',
    'rawCapabilityReturned =',
    'operationallyUnlocked =',
    'proofSigningActivated =',
  ],
);

rejectFragments(
  'Phase 16E2 Android PIN prompt',
  prompt,
  [
    'WebView',
    'evaluateJavascript',
    '@JavascriptInterface',
    'window.',
    'localStorage',
    'sessionStorage',
    'SharedPreferences',
    'putString(',
    'input.text.toString()',
    'String(pin)',
    'pin.concatToString()',
    'pin.joinToString(',
    'recoveryPhrase',
    'recoveryRootBytes',
    'rootPrivateKey',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

requireFragments(
  'Phase 16E2 MainActivity ownership',
  mainActivity,
  [
    'TvPassportNativePinPrompt(',
    'passportNativePinPromptForNativeRuntime',
  ],
);

if (
  mainActivity.includes(
    '.requestUnlock(',
  )
) {
  throw new Error(
    'Phase 16E2 must not automatically invoke operational unlock',
  );
}

requireFragments(
  'Phase 16E2 ProGuard posture',
  proguard,
  [
    'TvPassportNativePinPrompt',
    'TvPassportNativePinVerifier',
    'TvPassportNativePinPromptReceipt',
  ],
);

requireFragments(
  'Phase 16E1 predecessor',
  lifecycle,
  [
    'TvNativePinLifecycleRuntime',
    'record_native_pin_result',
    'phase16e1_restart_hydration_always_begins_locked',
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
          (match) =>
            match[1],
        ),
    ),
  ];

if (
  commands.length !== 8 ||
  commands.some(
    (command) =>
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
    'check:native-passport-phase16e2-android-pin-prompt'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e2-android-pin-prompt-boundary.mjs'
) {
  throw new Error(
    'Phase 16E2 TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e2:android-pin-prompt:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e2-android-pin-prompt-boundary.mjs'
) {
  throw new Error(
    'Phase 16E2 root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e2-android-pin-prompt-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E2 boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E2 Android PIN prompt boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E2_ANDROID_PIN_PROMPT=GREEN',
);

console.log(
  'PIN_SURFACE=ANDROID_NATIVE_ONLY',
);

console.log(
  'PIN_RETURNED_TO_WEBVIEW=NO',
);

console.log(
  'PIN_STORED=NO',
);

console.log(
  'AUTOMATIC_UNLOCK_INVOCATION=NOT_ADDED',
);

console.log(
  'DEVICE_MATERIAL_UNSEAL=NOT_ADDED',
);

console.log(
  'DEVICE_PROOF_SIGNING_RUNTIME=LOCKED_PENDING_PHASE16E3',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);
