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
      `Missing Phase 16E3B3C source: ${relativePath}`,
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

function rejectPatterns(
  label,
  source,
  patterns,
) {
  for (
    const pattern
    of patterns
  ) {
    if (
      pattern.test(
        source,
      )
    ) {
      throw new Error(
        `${label} contains forbidden pattern: ${pattern}`,
      );
    }
  }
}

const runner =
  read(
    'scripts/run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh',
  );

const predecessor =
  read(
    'scripts/check-crablink-tv-native-passport-phase16e3b3b-explicit-request-lifecycle-lock-boundary.mjs',
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
  'Phase 16E3B3C predecessor',
  predecessor,
  [
    'NATIVE_PASSPORT_PHASE16E3B3B_EXPLICIT_REQUEST_AND_LIFECYCLE_LOCK=GREEN',
    'EXPLICIT_NATIVE_REQUEST=MENU_OR_F1',
    'EXPLICIT_NATIVE_LOCK=INFO_OR_F2',
    'BACKGROUND_LOCK=CONNECTED',
    'SUSPENSION_LOCK=CONNECTED',
    'AUTOMATIC_STARTUP_PROMPT=NO',
    'AUTOMATIC_STARTUP_UNLOCK=NO',
  ],
);

requireFragments(
  'Phase 16E3B3C device contract',
  runner,
  [
    'expected_device_os="Android 14"',
    'expected_device_build="rk3539_box_32-user 14 UTT2.241219.001"',
    'expected_abi="armeabi-v7a"',
    'INSTALLATION_METHOD=USB',
    'ADB_REQUIRED=NO',
    'MENU or F1 = explicit PIN enrollment/unlock',
    'INFO or F2 = explicit operational lock',
  ],
);

requireFragments(
  'Phase 16E3B3C APK precheck',
  runner,
  [
    'app-universal-debug.apk',
    'unzip -t',
    'lib/armeabi-v7a/libcrablink_tv_lib.so',
    'UNEXPECTED_ARM64_NATIVE_LIBRARY_PRESENT',
    'shasum -a 256',
    'APK_PRECHECK=GREEN',
  ],
);

requireFragments(
  'Phase 16E3B3C interactive truth boundary',
  runner,
  [
    'record_result()',
    'IFS= read -r result',
    'Enter PASS or FAIL:',
    'FAILURE_COUNT=$failure_count',
    'FIRST_FAILURE=$first_failure',
    'ANDROID_RUNTIME_EXECUTION=PHYSICAL_DEVICE_ATTEMPTED',
  ],
);

const requiredObservations = [
  'APK_INSTALLED_BY_USB',
  'APP_LAUNCHED_ON_RECORDED_ANDROID_TV',
  'STARTUP_PIN_PROMPT_ABSENT',
  'STARTUP_SILENT_UNLOCK_ABSENT',
  'EXPLICIT_ENROLLMENT_PROMPT_MENU_OR_F1',
  'PIN_CONFIRMATION_REQUIRED',
  'MISMATCHED_CONFIRMATION_FAILS_CLOSED',
  'ENROLLMENT_AUTOMATIC_UNLOCK_ABSENT',
  'EXPLICIT_UNLOCK_PROMPT_MENU_OR_F1',
  'CANCEL_REMAINS_LOCKED',
  'WRONG_PIN_REMAINS_LOCKED',
  'CORRECT_PIN_FLOW_STABLE',
  'EXPLICIT_LOCK_INFO_OR_F2',
  'BACKGROUND_RESUME_FAILS_CLOSED',
  'RELAUNCH_FAILS_CLOSED',
  'WEBVIEW_PIN_FORM_ABSENT',
  'VISIBLE_SECRET_DISCLOSURE_ABSENT',
];

for (
  const observation
  of requiredObservations
) {
  const occurrences =
    runner
      .split(
        observation,
      )
      .length -
    1;

  if (
    occurrences <
    1
  ) {
    throw new Error(
      `Phase 16E3B3C observation missing: ${observation}`,
    );
  }
}

requireFragments(
  'Phase 16E3B3C honest scope',
  runner,
  [
    'ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE_ONLY',
    'OPERATIONAL_UNLOCK_PROOF=DEFERRED_TO_PHASE16F',
    'REVOCATION_RUNTIME_PROOF=DEFERRED_TO_PHASE16F',
    'FORBIDDEN_AUTHORITY_MATRIX=DEFERRED_TO_PHASE16F',
    'PHASE16E3B3C_ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE',
    'PHASE16_COMPLETE=NO',
    'NEXT_PATCH=NATIVE_PASSPORT_PHASE16F1_REDACTED_STATUS_SURFACE',
  ],
);

requireFragments(
  'Phase 16E3B3C plan-only posture',
  runner,
  [
    'if [ "$mode" = "--plan" ]',
    'NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=NOT_RUN',
    'ANDROID_RUNTIME_EXECUTION=NOT_RUN',
    'PLAN_ONLY=YES',
    'NO_RUNTIME_CLAIM=YES',
  ],
);

rejectPatterns(
  'Phase 16E3B3C forbidden automation',
  runner,
  [
    /\badb\s+(?:shell|install|push|pull|logcat)\b/u,
    /\bAUTO_PASS\b/u,
    /\bASSUME_PASS\b/u,
    /\bDEFAULT_PASS\b/u,
    /result=["']PASS["']/u,
    /private[_ -]?key/iu,
    /recovery[_ -]?phrase/iu,
    /raw[_ -]?capability/iu,
  ],
);

if (
  tvPackage.scripts[
    'check:native-passport-phase16e3b3c-device-runtime-acceptance'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3C TV checker script mismatch',
  );
}

if (
  tvPackage.scripts[
    'accept:native-passport-phase16e3b3c-device-runtime'
  ] !==
  'bash ../../scripts/run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh'
) {
  throw new Error(
    'Phase 16E3B3C TV acceptance script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b3c:device-runtime:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B3C root checker script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b3c:device-runtime:accept'
  ] !==
  'bash scripts/run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh'
) {
  throw new Error(
    'Phase 16E3B3C root acceptance script mismatch',
  );
}

for (
  const selectedFile
  of [
    'run-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance.sh',
    'check-crablink-tv-native-passport-phase16e3b3c-device-runtime-acceptance-boundary.mjs',
  ]
) {
  if (
    !codebundle.includes(
      selectedFile,
    )
  ) {
    throw new Error(
      `Phase 16E3B3C file absent from future codebundle selection: ${selectedFile}`,
    );
  }
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B3C physical-device acceptance-runner boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE_RUNNER=GREEN',
);

console.log(
  'PHYSICAL_DEVICE_ACCEPTANCE=NOT_RUN_BY_BOUNDARY',
);

console.log(
  'ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE',
);

console.log(
  'INSTALLATION_METHOD=USB',
);

console.log(
  'ADB_REQUIRED=NO',
);

console.log(
  'AUTOMATIC_PASS=FORBIDDEN',
);

console.log(
  'OPERATIONAL_UNLOCK_PROOF=DEFERRED_TO_PHASE16F',
);

console.log(
  'REVOCATION_RUNTIME_PROOF=DEFERRED_TO_PHASE16F',
);

console.log(
  'FORBIDDEN_AUTHORITY_RUNTIME_PROOF=DEFERRED_TO_PHASE16F',
);

console.log(
  'PHASE16_COMPLETE=NO',
);

console.log(
  'NEXT_ACTION=RUN_PHYSICAL_DEVICE_ACCEPTANCE_SEPARATELY',
);
