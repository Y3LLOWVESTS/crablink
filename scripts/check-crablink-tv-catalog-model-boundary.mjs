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
      `Missing Phase 8A source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const model =
  read(
    'apps/crablink-tv/src/catalog/tvCatalogModel.js',
  );

const tests =
  read(
    'apps/crablink-tv/src/catalog/tvCatalogModel.test.mjs',
  );

const tvScripts =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  ).scripts ?? {};

const rootScripts =
  JSON.parse(
    read(
      'package.json',
    ),
  ).scripts ?? {};

for (
  const marker
  of [
    'TV_CATALOG_SCHEMA',
    'TV_CATALOG_MAX_RAILS',
    'TV_CATALOG_MAX_ITEMS_PER_RAIL',
    'TV_CATALOG_VIEW_KIND',
    'normalizeTvCatalogResponse',
    'createTvCatalogLoadingView',
    'createTvCatalogUnavailableView',
    'projectTvCatalogResponse',
    'resolveTvRouteInput(',
    'requireCrabScheme: true',
    'TV_ROUTE_RESULT_KIND.NOT_FOUND',
    'Object.freeze',
  ]
) {
  if (
    !model.includes(
      marker,
    )
  ) {
    throw new Error(
      `Catalog model missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'loading view is immutable and contains no fake rails',
    'valid backend catalog is normalized and deeply frozen',
    'empty rails are omitted and produce truthful empty state',
    'unknown schema and rail identifiers fail closed',
    'foreign and unsupported card routes fail closed',
    'creator and content kinds must match canonical route ownership',
    'thumbnail must be a canonical image route and progress is bounded',
    'unavailable state is typed sanitized and non-authoritative',
  ]
) {
  if (
    !tests.includes(
      marker,
    )
  ) {
    throw new Error(
      `Catalog test missing: ${marker}`,
    );
  }
}

if (
  tvScripts[
    'test:catalog-model'
  ] !==
    'node --test src/catalog/tvCatalogModel.test.mjs' ||

  tvScripts[
    'check:catalog-model'
  ] !==
    'node ../../scripts/check-crablink-tv-catalog-model-boundary.mjs'
) {
  throw new Error(
    'TV catalog scripts are missing.',
  );
}

for (
  const command
  of [
    'npm run test:catalog-model',
    'npm run check:catalog-model',
  ]
) {
  if (
    !String(
      tvScripts.check || '',
    ).includes(
      command,
    )
  ) {
    throw new Error(
      `TV acceptance chain missing: ${command}`,
    );
  }
}

if (
  rootScripts[
    'tv:catalog-model:test'
  ] !==
    'npm --prefix apps/crablink-tv run test:catalog-model' ||

  rootScripts[
    'tv:catalog-model:check'
  ] !==
    'node scripts/check-crablink-tv-catalog-model-boundary.mjs'
) {
  throw new Error(
    'Root catalog commands are missing.',
  );
}

for (
  const [
    label,
    pattern,
  ]
  of [
    [
      'network',
      /\bfetch\s*\(/,
    ],

    [
      'Tauri invoke',
      /\binvoke\s*\(/,
    ],

    [
      'storage',
      /\b(localStorage|sessionStorage|indexedDB)\b/,
    ],

    [
      'wallet',
      /\bwallet\w*\s*\(/i,
    ],

    [
      'ledger',
      /\bledger\w*\s*\(/i,
    ],

    [
      'receipt',
      /\breceipt\w*\s*\(/i,
    ],

    [
      'reward',
      /\breward\w*\s*\(/i,
    ],

    [
      'ROC',
      /\broc\w*\s*\(/i,
    ],
  ]
) {
  if (
    pattern.test(
      model,
    )
  ) {
    throw new Error(
      `Catalog model acquired forbidden ${label} authority.`,
    );
  }
}

if (
  /sample|placeholder.*rail|mock.*catalog/i.test(
    model,
  )
) {
  throw new Error(
    'Production catalog model contains sample-data acceptance.',
  );
}

console.log(
  'CrabLink TV typed catalog-model boundary passed.',
);

console.log(
  'States: loading, unavailable, malformed, empty, and ready.',
);

console.log(
  'Rails: backend-derived only; empty rails omitted; unknown rails rejected.',
);

console.log(
  'Cards: canonical crab:// routes, bounded text, image-only thumbnails, bounded progress.',
);

console.log(
  'Network, invoke, storage, wallet, ledger, receipt, reward, and ROC authority: absent.',
);

console.log(
  'PHASE8A_CATALOG_MODEL=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE8A_READONLY_CATALOG_PORT',
);
