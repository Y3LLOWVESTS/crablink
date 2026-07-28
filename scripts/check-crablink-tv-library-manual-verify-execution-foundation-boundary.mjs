#!/usr/bin/env node
/**
 * RO:WHAT — Validates the Phase 9J bounded manual-verification execution foundation.
 * RO:WHY — Gateway HTTP and execution locking must be proven before React consumes them.
 * RO:INTERACTS — tvGatewayAssetFetchModel, tvLibraryAssetVerifyFlow, reviewed gateway profile port, and fixed manifest adapter injection.
 * RO:INVARIANTS — fixed anonymous GETs; bounded bodies; reviewed origin; one execution at a time; no raw evidence returned.
 * RO:SECURITY — no direct Tauri import, storage, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — focused transport and execution tests plus this boundary.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(absolutePath)
  ) {
    throw new Error(
      `Missing Phase 9J foundation source: ${relativePath}`,
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
      !source.includes(fragment)
    ) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function stripComments(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//gu,
      '',
    )
    .replace(
      /^\s*\/\/[!/]?.*$/gmu,
      '',
    );
}

const transport =
  read(
    'apps/crablink-tv/src/library/' +
    'tvGatewayAssetHttpTransport.js',
  );

const transportTest =
  read(
    'apps/crablink-tv/src/library/' +
    'tvGatewayAssetHttpTransport.test.mjs',
  );

const execution =
  read(
    'apps/crablink-tv/src/library/' +
    'tvLibraryManualVerifyExecution.js',
  );

const executionTest =
  read(
    'apps/crablink-tv/src/library/' +
    'tvLibraryManualVerifyExecution.test.mjs',
  );

const phase9hBoundary =
  read(
    'scripts/' +
    'check-crablink-tv-library-asset-verify-flow-boundary.mjs',
  );

const phase9iBoundary =
  read(
    'scripts/' +
    'check-crablink-tv-library-verify-ui-boundary.mjs',
  );

const tvPackage =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  );

const rootPackage =
  JSON.parse(
    read('package.json'),
  );

const makeCodebundle =
  read(
    'scripts/make_codebundle.sh',
  );

const codebundleBoundary =
  read(
    'scripts/' +
    'check-crablink-tv-codebundle-boundary.mjs',
  );

const executableTransport =
  stripComments(transport);

const executableExecution =
  stripComments(execution);

requireFragments(
  'gateway HTTP transport',
  transport,
  [
    'TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS',
    'createTvGatewayAssetHttpTransport',
    'tvGatewayAssetHttpTransport',
    'globalThis.fetch',
    "method: 'GET'",
    "credentials: 'omit'",
    "cache: 'no-store'",
    "redirect: 'error'",
    'MAX_MANIFEST_BYTES',
    'MAX_ASSET_BYTES',
  ],
);

requireFragments(
  'gateway HTTP transport tests',
  transportTest,
  [
    'gateway HTTP transport uses fixed anonymous no-store GET requests',
    'gateway HTTP transport rejects bad responses and bounds asset bytes',
  ],
);

requireFragments(
  'manual verify execution',
  execution,
  [
    'TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA',
    'TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE',
    'createIdleTvLibraryManualVerifyExecution',
    'createRunningTvLibraryManualVerifyExecution',
    'runTvLibraryManualVerifyExecution',
    'createTvLibraryManualVerifyExecutionLock',
    'gatewayProfilePort',
    'readGatewayProfile',
    'runTvLibraryAssetVerifyFlow',
    'gatewayOrigin:',
    'gateway.origin',
    'TV_LIBRARY_MANUAL_VERIFY_DUPLICATE_REQUEST',
  ],
);

requireFragments(
  'manual verify execution tests',
  executionTest,
  [
    'manual verify execution constants and idle running views are explicit',
    'manual verify execution composes reviewed gateway profile and verify flow',
    'manual verify execution fails closed for gateway and flow rejection',
    'manual verify execution lock rejects duplicate requests and releases',
  ],
);

requireFragments(
  'Phase 9 predecessor markers',
  phase9hBoundary +
    phase9iBoundary,
  [
    'PHASE9H_LIBRARY_ASSET_VERIFY_FLOW=GREEN',
    'PHASE9I_LIBRARY_VERIFY_UI=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (
  const [label, source]
  of [
    [
      'gateway HTTP transport',
      executableTransport,
    ],
    [
      'manual verify execution',
      executableExecution,
    ],
  ]
) {
  for (
    const [
      forbiddenLabel,
      pattern,
    ]
    of [
      [
        'dynamic invoke',
        /\binvoke\s*\(/u,
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
        'indexedDB',
        /\bindexedDB\b/u,
      ],
      [
        'wallet authority',
        /\bwallet\b/iu,
      ],
      [
        'ledger authority',
        /\bledger\b/iu,
      ],
      [
        'receipt authority',
        /\breceipt\b/iu,
      ],
      [
        'reward authority',
        /\breward\b/iu,
      ],
      [
        'ROC authority',
        /\broc\b/iu,
      ],
      [
        'entitlement authority',
        /\bentitlement\b/iu,
      ],
      [
        'finality authority',
        /\bfinality\b/iu,
      ],
    ]
  ) {
    if (
      pattern.test(source)
    ) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

if (
  executableExecution.includes(
    'tauriTvAdapter',
  ) ||
  executableExecution.includes(
    'tvAssetManifestAdapter',
  )
) {
  throw new Error(
    'Manual execution must consume injected ports rather than import Tauri adapters.',
  );
}

const tvScripts =
  tvPackage.scripts ?? {};

const expectedTvScripts =
  Object.freeze({
    'test:gateway-asset-http-transport':
      'node --test src/library/tvGatewayAssetHttpTransport.test.mjs',

    'test:library-manual-verify-execution':
      'node --test src/library/tvLibraryManualVerifyExecution.test.mjs',

    'check:library-manual-verify-execution-foundation':
      'node ../../scripts/check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs',
  });

for (
  const [name, command]
  of Object.entries(
    expectedTvScripts,
  )
) {
  if (
    tvScripts[name] !== command
  ) {
    throw new Error(
      `TV Phase 9J foundation script missing or incorrect: ${name}`,
    );
  }
}

for (
  const step
  of [
    'npm run test:gateway-asset-http-transport',
    'npm run test:library-manual-verify-execution',
    'npm run check:library-manual-verify-execution-foundation',
  ]
) {
  if (
    !String(
      tvScripts.check ?? '',
    ).includes(step)
  ) {
    throw new Error(
      `TV check chain missing Phase 9J foundation step: ${step}`,
    );
  }
}

const rootScripts =
  rootPackage.scripts ?? {};

const expectedRootScripts =
  Object.freeze({
    'tv:gateway-asset-http-transport:test':
      'npm --prefix apps/crablink-tv run test:gateway-asset-http-transport',

    'tv:library-manual-verify-execution:test':
      'npm --prefix apps/crablink-tv run test:library-manual-verify-execution',

    'tv:library-manual-verify-execution-foundation:check':
      'npm --prefix apps/crablink-tv run check:library-manual-verify-execution-foundation',
  });

for (
  const [name, command]
  of Object.entries(
    expectedRootScripts,
  )
) {
  if (
    rootScripts[name] !== command
  ) {
    throw new Error(
      `Root Phase 9J foundation script missing or incorrect: ${name}`,
    );
  }
}

for (
  const requiredPath
  of [
    'apps/crablink-tv/src/library/tvGatewayAssetHttpTransport.js',
    'apps/crablink-tv/src/library/tvGatewayAssetHttpTransport.test.mjs',
    'apps/crablink-tv/src/library/tvLibraryManualVerifyExecution.js',
    'apps/crablink-tv/src/library/tvLibraryManualVerifyExecution.test.mjs',
    'scripts/check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs',
  ]
) {
  if (
    !makeCodebundle.includes(
      requiredPath,
    ) &&
    !codebundleBoundary.includes(
      requiredPath,
    )
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV manual verify execution foundation boundary passed.',
);

console.log(
  'Transport: fixed anonymous no-store GETs with redirect rejection and bounded JSON/byte bodies.',
);

console.log(
  'Execution: reviewed gateway origin, injected Phase 9H flow, no raw evidence return, and duplicate-request lock.',
);

console.log(
  'React handoff: owned and validated by the Phase 9J v4B boundary; foundation injection and authority limits remain unchanged.',
);

console.log(
  'PHASE9J_V4A_MANUAL_VERIFY_EXECUTION_FOUNDATION=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
