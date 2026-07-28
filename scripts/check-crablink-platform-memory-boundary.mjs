#!/usr/bin/env node
/**
 * RO:WHAT — Validates deterministic test-only CrabLink memory adapters.
 * RO:WHY — Phase 4 must end with portable fixtures that cannot invent backend truth.
 * RO:INTERACTS — @crablink/platform memory exports, contracts, package scripts, and production apps.
 * RO:INVARIANTS — immutable snapshots, fail-closed defaults, no production memory imports.
 * RO:SECURITY — no pairing, session, accepted receipt, paid unlock, balance, wallet, ledger, or finality authority.
 * RO:TEST — npm run platform:memory:check.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '..',
);

const paths = {
  platformPackage:
    'packages/crablink-platform/package.json',
  rootPackage:
    'package.json',
  index:
    'packages/crablink-platform/src/index.js',
  receipts:
    'packages/crablink-platform/src/contracts/receiptsPort.js',
  snapshot:
    'packages/crablink-platform/src/memory/memorySnapshot.js',
  adapters:
    'packages/crablink-platform/src/memory/memoryAdapters.js',
  compatibility:
    'packages/crablink-platform/src/memory/memorySettingsAdapter.js',
  memoryIndex:
    'packages/crablink-platform/src/memory/index.js',
  tests:
    'packages/crablink-platform/src/memory/memoryAdapters.test.mjs',
  makeCodebundle:
    'scripts/make_codebundle.sh',
  codebundleBoundary:
    'scripts/check-crablink-tv-codebundle-boundary.mjs',
};

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing memory-adapter source: ${relativePath}`,
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
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} is missing: ${fragment}`,
      );
    }
  }
}

function walkSource(directory) {
  const output = [];

  for (
    const entry of
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    )
  ) {
    const absolutePath =
      path.join(directory, entry.name);

    if (entry.isDirectory()) {
      output.push(
        ...walkSource(absolutePath),
      );
      continue;
    }

    if (
      /\.(?:js|jsx|mjs)$/u.test(
        entry.name,
      )
    ) {
      output.push(absolutePath);
    }
  }

  return output;
}

const platformPackage =
  JSON.parse(
    read(paths.platformPackage),
  );

const rootPackage =
  JSON.parse(
    read(paths.rootPackage),
  );

const index = read(paths.index);
const receipts = read(paths.receipts);
const snapshot = read(paths.snapshot);
const adapters = read(paths.adapters);
const compatibility =
  read(paths.compatibility);
const memoryIndex =
  read(paths.memoryIndex);
const tests = read(paths.tests);
const makeCodebundle =
  read(paths.makeCodebundle);
const codebundleBoundary =
  read(paths.codebundleBoundary);

requireFragments(
  'receipt contract',
  receipts,
  [
    'createMethodPort',
    'createReceiptsPort',
    "'listRecentReceipts'",
  ],
);

requireFragments(
  'memory snapshot',
  snapshot,
  [
    'cloneMemoryValue',
    'freezeMemorySnapshot',
    'Object.freeze',
    'memory values cannot contain cycles',
  ],
);

requireFragments(
  'memory adapters',
  adapters,
  [
    'createMemorySettingsAdapter',
    'createMemoryGatewayProfileAdapter',
    'createMemoryDiagnosticsAdapter',
    'createMemoryReceiptDisplayAdapter',
    'paired: false',
    'sessionPresent: false',
    'accepted: false',
    'paidEntitlementAuthority: false',
    'finalityAuthority: false',
  ],
);

requireFragments(
  'memory compatibility export',
  compatibility,
  [
    'createMemorySettingsAdapter',
    "from './memoryAdapters.js'",
  ],
);

requireFragments(
  'memory public entry',
  memoryIndex,
  [
    'createMemorySettingsAdapter',
    'createMemoryGatewayProfileAdapter',
    'createMemoryDiagnosticsAdapter',
    'createMemoryReceiptDisplayAdapter',
    'freezeMemorySnapshot',
  ],
);

requireFragments(
  'platform contract entry',
  index,
  [
    'createReceiptsPort',
  ],
);

for (const testName of [
  'memory settings snapshots are immutable and isolated',
  'memory settings writes replace state without retaining caller references',
  'memory gateway profiles default to unconfigured without pairing or session',
  'memory diagnostics remain client only and native unavailable',
  'memory receipt fixtures are immutable display-only models',
  'memory adapters reject unsupported data and backend authority claims',
]) {
  if (!tests.includes(testName)) {
    throw new Error(
      `Memory-adapter test is missing: ${testName}`,
    );
  }
}

const memorySources = [
  receipts,
  snapshot,
  adapters,
  compatibility,
  memoryIndex,
].join('\n');

for (
  const [
    label,
    pattern,
  ] of [
    [
      'Tauri API',
      /@tauri-apps\/api/u,
    ],
    [
      'Chrome API',
      /\bchrome\./u,
    ],
    [
      'native invocation',
      /\binvoke\s*\(/u,
    ],
    [
      'network fetch',
      /\bfetch\s*\(/u,
    ],
    [
      'local storage',
      /\blocalStorage\b/u,
    ],
    [
      'session storage',
      /\bsessionStorage\b/u,
    ],
    [
      'DOM window',
      /\bwindow\b/u,
    ],
    [
      'DOM document',
      /\bdocument\b/u,
    ],
  ]
) {
  if (pattern.test(memorySources)) {
    throw new Error(
      `Memory adapters contain forbidden ${label}.`,
    );
  }
}

const scripts =
  platformPackage.scripts ?? {};

if (
  scripts['test:memory'] !==
  'node --test src/memory/memoryAdapters.test.mjs'
) {
  throw new Error(
    'Platform memory test command is missing.',
  );
}

if (
  scripts['check:memory-boundary'] !==
  'node ../../scripts/check-crablink-platform-memory-boundary.mjs'
) {
  throw new Error(
    'Platform memory boundary command is missing.',
  );
}

if (
  scripts['check:memory'] !==
  'npm run test:memory && npm run check:memory-boundary'
) {
  throw new Error(
    'Platform memory acceptance command is missing.',
  );
}

if (
  scripts.check !==
  'npm run test && npm run test:catalog && npm run check:boundary && npm run check:catalog-boundary && npm run check:memory'
) {
  throw new Error(
    'Platform full acceptance command is missing.',
  );
}

if (
  platformPackage.exports?.[
    './memory'
  ] !==
  './src/memory/index.js'
) {
  throw new Error(
    'Platform memory export is missing.',
  );
}

if (
  platformPackage.exports?.[
    './receipts'
  ] !==
  './src/contracts/receiptsPort.js'
) {
  throw new Error(
    'Platform receipts export is missing.',
  );
}

if (
  rootPackage.scripts?.[
    'platform:memory:check'
  ] !==
  'npm --prefix packages/crablink-platform run check:memory'
) {
  throw new Error(
    'Root memory acceptance command is missing.',
  );
}

const productionRoots = [
  path.join(
    root,
    'apps/crablink-tauri/src',
  ),
  path.join(
    root,
    'apps/crablink-tv/src',
  ),
];

const memoryImportPattern =
  /(?:@crablink\/platform\/memory|packages\/crablink-platform\/src\/memory)/u;

for (const productionRoot of productionRoots) {
  for (
    const sourcePath of
    walkSource(productionRoot)
  ) {
    const source =
      fs.readFileSync(
        sourcePath,
        'utf8',
      );

    if (
      memoryImportPattern.test(source)
    ) {
      throw new Error(
        `Production source imports memory adapters: ${sourcePath}`,
      );
    }
  }
}

for (const requiredPath of [
  'scripts/check-crablink-platform-memory-boundary.mjs',
  'packages/crablink-platform/src/memory/memorySnapshot.js',
  'packages/crablink-platform/src/memory/memoryAdapters.js',
  'packages/crablink-platform/src/memory/memoryAdapters.test.mjs',
]) {
  if (
    !makeCodebundle.includes(
      requiredPath,
    ) &&
    !codebundleBoundary.includes(
      requiredPath,
    )
  ) {
    throw new Error(
      `Future codebundle coverage is missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink deterministic memory-adapter boundary passed.',
);

console.log(
  'Adapters: settings, gateway profile, diagnostics, and receipt display fixtures.',
);

console.log(
  'Defaults: unconfigured, unpaired, sessionless, native-unavailable, and receipt-empty.',
);

console.log(
  'Snapshots: cloned, deeply frozen, and isolated from caller mutation.',
);

console.log(
  'Production desktop and TV source do not import the memory adapter package.',
);

console.log(
  'Pairing, sessions, accepted receipts, paid unlocks, balances, wallet, ledger, ROC, and finality authority remain absent.',
);
