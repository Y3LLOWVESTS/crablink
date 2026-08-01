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
      `Missing Phase 16E3B2A source: ${relativePath}`,
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

const verifier =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportNativePinVerifierStore.kt',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

requireFragments(
  'Phase 16E3B2A verified ticket',
  verifier,
  [
    'pendingVerifiedTicket',
    'pendingVerifiedTicketExpiresAtElapsedMs',
    'VERIFIED_TICKET_BYTES',
    'VERIFIED_TICKET_LIFETIME_MS',
    'issueVerifiedTicket(',
    'consumeVerifiedPinTicketForNative',
    'clearPendingVerifiedTicket',
    'secureRandom.nextBytes(',
    'ticket?.fill(',
    'return ByteArray(',
  ],
);

rejectFragments(
  'Phase 16E3B2A verified ticket',
  verifier,
  [
    'String(pin)',
    'pin.concatToString()',
    'pin.joinToString(',
    'SharedPreferences',
    'Base64',
    '@JavascriptInterface',
    'evaluateJavascript',
    'localStorage',
    'sessionStorage',
  ],
);

if (
  mainActivity.includes(
    '.requestUnlock(',
  ) ||
  mainActivity.includes(
    '.enroll(',
  ) ||
  mainActivity.includes(
    '.verify(',
  ) ||
  mainActivity.includes(
    'unlockOperationalRuntimeAfterVerifiedNativePin',
  )
) {
  throw new Error(
    'Phase 16E3B2A must not invoke prompt, enrollment, verification, or operational unlock',
  );
}

if (
  jni.includes(
    'unlockOperationalRuntimeAfterVerifiedNativePin',
  ) ||
  jni.includes(
    'consumeVerifiedPinTicketForNative',
  ) ||
  jni.includes(
    'unsealStoredDeviceKeyForNative',
  ) ||
  jni.includes(
    'unsealStoredNarrowCapabilityForNative',
  )
) {
  throw new Error(
    'Phase 16E3B2A must not add JNI or material-unseal handoff',
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

console.log(
  'CrabLink TV Native Passport Phase 16E3B2A verified-ticket boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B2A_VERIFIED_TICKET=GREEN',
);

console.log(
  'VERIFIED_PIN_TICKET=SHORT_LIVED_CONSUME_ONCE_MEMORY_ONLY',
);

console.log(
  'VERIFIED_PIN_TICKET_BYTES=32',
);

console.log(
  'VERIFIED_PIN_TICKET_LIFETIME_MS=10000',
);

console.log(
  'VERIFIED_PIN_TICKET_PERSISTED=NO',
);

console.log(
  'PROMPT_INVOCATION=NOT_ADDED',
);

console.log(
  'DEVICE_MATERIAL_UNSEAL=NOT_ADDED',
);

console.log(
  'CAPABILITY_UNSEAL=NOT_ADDED',
);

console.log(
  'JNI_OPERATIONAL_UNLOCK_HANDOFF=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B2B_KEYSTORE_UNSEAL_AND_JNI_HANDOFF',
);
