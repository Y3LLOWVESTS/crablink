import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(appRoot, relativePath),
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const gatewayFetchModel =
  read('src/library/tvGatewayAssetFetchModel.js');

const app =
  read('src/app/TvApp.jsx');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const verifiedRenderModel =
  read('src/library/tvLibraryVerifiedAssetRenderModel.js');

const executableGatewayFetchModel =
  stripComments(gatewayFetchModel);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

test('gateway asset fetch model builds fixed manifest and content evidence parts', () => {
  for (const fragment of [
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
  ]) {
    assert.equal(
      gatewayFetchModel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('gateway asset fetch uses explicit injected transport rather than global fetch', () => {
  for (const fragment of [
    'transport.fetchJson',
    'transport.fetchBytes',
    'assetBytes',
    'gateway-response-awaiting-native-asset-verification',
  ]) {
    assert.equal(
      gatewayFetchModel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
  ]) {
    assert.doesNotMatch(
      executableGatewayFetchModel,
      forbidden,
    );
  }
});

test('React surfaces do not consume gateway asset fetch yet', () => {
  for (const forbidden of [
    /\btvGatewayAssetFetchModel\b/u,
    /\bprojectTvGatewayAssetFetchRequest\b/u,
    /\breadTvGatewayAssetEvidence\b/u,
    /\bfetchJson\b/u,
    /\bfetchBytes\b/u,
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
  ]) {
    assert.doesNotMatch(
      executableApp,
      forbidden,
    );

    assert.doesNotMatch(
      executablePanel,
      forbidden,
    );
  }
});

test('verified render model remains downstream of native verification only', () => {
  assert.equal(
    verifiedRenderModel.includes('projectTvLibraryVerifiedAssetRender'),
    true,
  );

  assert.equal(
    verifiedRenderModel.includes('verification.verified !== true'),
    true,
  );

  assert.equal(
    verifiedRenderModel.includes('readTvGatewayAssetEvidence'),
    false,
  );
});
