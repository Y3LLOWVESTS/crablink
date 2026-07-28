#!/usr/bin/env node
/**
 * RO:WHAT — Validates CrabLink TV Phase 9G gateway asset evidence fetch.
 * RO:WHY — Manifest JSON and asset bytes must be fetched in a bounded transport lane before native verification.
 * RO:INTERACTS — tvGatewayAssetFetchModel, Library detail identifiers, Phase 9F render projection, package scripts.
 * RO:INVARIANTS — gateway request is bound to active Library canonical URL, B3 CID, and asset kind.
 * RO:SECURITY — no global fetch, storage persistence, React auto-fetch, native invoke, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-gateway-asset-fetch-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9G source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

const gatewayFetchModel =
  read('apps/crablink-tv/src/library/tvGatewayAssetFetchModel.js');

const gatewayFetchModelTest =
  read('apps/crablink-tv/src/library/tvGatewayAssetFetchModel.test.mjs');

const gatewayFetchSourceTest =
  read('apps/crablink-tv/src/library/TvGatewayAssetFetch.source.test.mjs');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const phase9fBoundary =
  read('scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs');

const phase9eBoundary =
  read('scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executableGatewayFetchModel =
  stripComments(gatewayFetchModel);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

requireFragments(
  'gateway asset fetch model',
  gatewayFetchModel,
  [
    'TV_GATEWAY_ASSET_FETCH_SCHEMA',
    'TV_GATEWAY_ASSET_EVIDENCE_SCHEMA',
    'TV_GATEWAY_ASSET_FETCH_STATE',
    'TV_GATEWAY_ASSET_FETCH_LIMITS',
    'createIdleTvGatewayAssetFetch',
    'projectTvGatewayAssetFetchRequest',
    'readTvGatewayAssetEvidence',
    '/tv/assets/${part}',
    "part: 'manifest'",
    "part: 'content'",
    'canonicalCrabUrl',
    'cid',
    'assetKind',
    "credentialsMode: 'omit'",
    "cacheMode: 'no-store'",
    "redirectMode: 'error'",
    'transport.fetchJson',
    'transport.fetchBytes',
    'assetBytes',
    'gateway-response-awaiting-native-asset-verification',
  ],
);

requireFragments(
  'gateway asset fetch model tests',
  gatewayFetchModelTest,
  [
    'gateway fetch constants and idle projection are explicit and immutable',
    'gateway fetch request binds active Library identifiers to fixed gateway parts',
    'gateway fetch request rejects unsafe origins and unsupported details',
    'gateway evidence uses explicit transport and keeps bytes bounded for native verification',
    'gateway evidence fails closed for bad request transport errors and oversized bytes',
  ],
);

requireFragments(
  'gateway asset fetch source tests',
  gatewayFetchSourceTest,
  [
    'gateway asset fetch model builds fixed manifest and content evidence parts',
    'gateway asset fetch uses explicit injected transport rather than global fetch',
    'React surfaces do not consume gateway asset fetch yet',
    'verified render model remains downstream of native verification only',
  ],
);

requireFragments(
  'Phase 9F successor marker',
  phase9fBoundary,
  [
    'PHASE9F_LIBRARY_VERIFIED_ASSET_RENDER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9E successor marker',
  phase9eBoundary,
  [
    'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (const [label, source] of [
  ['gateway asset fetch model', executableGatewayFetchModel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['wallet authority', /\bwallet\b/iu],
    ['ledger authority', /\bledger\b/iu],
    ['receipt authority', /\breceipt\b/iu],
    ['reward authority', /\breward\b/iu],
    ['ROC authority', /\broc\b/iu],
    ['entitlement authority', /\bentitlement\b/iu],
    ['finality authority', /\bfinality\b/iu],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

for (const [label, source] of [
  ['TV app executable surface', executableApp],
  ['Library detail panel executable surface', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['gateway fetch model import', /\btvGatewayAssetFetchModel\b/u],
    ['gateway fetch request projection', /\bprojectTvGatewayAssetFetchRequest\b/u],
    ['gateway evidence read', /\breadTvGatewayAssetEvidence\b/u],
    ['transport fetchJson', /\bfetchJson\b/u],
    ['transport fetchBytes', /\bfetchBytes\b/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['global fetch', /\bfetch\s*\(/u],
    ['raw asset bytes field', /\b(?:rawBytes|assetBytes)\b/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} consumed Phase 9G before integration ownership: ${forbiddenLabel}.`,
      );
    }
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:gateway-asset-fetch'] !==
  'node --test src/library/tvGatewayAssetFetchModel.test.mjs'
) {
  throw new Error(
    'TV gateway asset fetch model test script is missing or incorrect.',
  );
}

if (
  tvScripts['test:gateway-asset-fetch-source'] !==
  'node --test src/library/TvGatewayAssetFetch.source.test.mjs'
) {
  throw new Error(
    'TV gateway asset fetch source test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:gateway-asset-fetch'] !==
  'node ../../scripts/check-crablink-tv-gateway-asset-fetch-boundary.mjs'
) {
  throw new Error(
    'TV gateway asset fetch boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:gateway-asset-fetch',
  'npm run test:gateway-asset-fetch-source',
  'npm run check:gateway-asset-fetch',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain does not include ${step}.`,
    );
  }
}

if (
  rootScripts['tv:gateway-asset-fetch:test'] !==
  'npm --prefix apps/crablink-tv run test:gateway-asset-fetch'
) {
  throw new Error(
    'Root gateway asset fetch model test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:gateway-asset-fetch-source:test'] !==
  'npm --prefix apps/crablink-tv run test:gateway-asset-fetch-source'
) {
  throw new Error(
    'Root gateway asset fetch source test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:gateway-asset-fetch:check'] !==
  'npm --prefix apps/crablink-tv run check:gateway-asset-fetch'
) {
  throw new Error(
    'Root gateway asset fetch boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/tvGatewayAssetFetchModel.js',
  'apps/crablink-tv/src/library/tvGatewayAssetFetchModel.test.mjs',
  'apps/crablink-tv/src/library/TvGatewayAssetFetch.source.test.mjs',
  'scripts/check-crablink-tv-gateway-asset-fetch-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV gateway asset fetch boundary passed.',
);

console.log(
  'Transport: manifest JSON and asset bytes are read through explicit injected gateway transport only.',
);

console.log(
  'Binding: gateway request is bound to active Library canonical URL, B3 CID, and asset kind.',
);

console.log(
  'Authority: React auto-fetch, native verification-flow integration is owned by Phase 9H; rendering, storage, wallet, ledger, receipt, reward, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9G_TV_GATEWAY_ASSET_FETCH=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
