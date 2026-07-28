import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_GATEWAY_ASSET_EVIDENCE_SCHEMA,
  TV_GATEWAY_ASSET_FETCH_LIMITS,
  TV_GATEWAY_ASSET_FETCH_SCHEMA,
  TV_GATEWAY_ASSET_FETCH_STATE,
  createIdleTvGatewayAssetFetch,
  projectTvGatewayAssetFetchRequest,
  readTvGatewayAssetEvidence,
} from './tvGatewayAssetFetchModel.js';

const HASH = 'a'.repeat(64);

function detail({
  assetKind = 'image',
  hash = HASH,
} = {}) {
  return Object.freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.READY,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
  });
}

test('gateway fetch constants and idle projection are explicit and immutable', () => {
  assert.equal(
    TV_GATEWAY_ASSET_FETCH_SCHEMA,
    'crablink.tv.gateway-asset-fetch.v1',
  );

  assert.equal(
    TV_GATEWAY_ASSET_EVIDENCE_SCHEMA,
    'crablink.tv.gateway-asset-evidence.v1',
  );

  assert.equal(
    Object.isFrozen(TV_GATEWAY_ASSET_FETCH_STATE),
    true,
  );

  assert.equal(
    Object.isFrozen(TV_GATEWAY_ASSET_FETCH_LIMITS),
    true,
  );

  const idle =
    createIdleTvGatewayAssetFetch();

  assert.equal(
    idle.state,
    TV_GATEWAY_ASSET_FETCH_STATE.IDLE,
  );

  assert.equal(idle.ready, false);
  assert.equal(Object.isFrozen(idle), true);
});

test('gateway fetch request binds active Library identifiers to fixed gateway parts', () => {
  const request =
    projectTvGatewayAssetFetchRequest({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
    });

  assert.equal(
    request.schema,
    TV_GATEWAY_ASSET_FETCH_SCHEMA,
  );

  assert.equal(
    request.state,
    TV_GATEWAY_ASSET_FETCH_STATE.READY,
  );

  assert.equal(request.ready, true);
  assert.equal(request.method, 'GET');
  assert.equal(request.credentialsMode, 'omit');
  assert.equal(request.cacheMode, 'no-store');
  assert.equal(request.redirectMode, 'error');
  assert.equal(request.assetKind, 'image');
  assert.equal(request.canonicalCrabUrl, `crab://${HASH}.image`);
  assert.equal(request.cid, `b3:${HASH}`);

  assert.equal(
    request.manifestUrl,
    `https://gateway.example.test/tv/assets/manifest?crabUrl=crab%3A%2F%2F${HASH}.image&cid=b3%3A${HASH}&assetKind=image`,
  );

  assert.equal(
    request.assetUrl,
    `https://gateway.example.test/tv/assets/content?crabUrl=crab%3A%2F%2F${HASH}.image&cid=b3%3A${HASH}&assetKind=image`,
  );

  assert.equal(Object.isFrozen(request), true);
});

test('gateway fetch request rejects unsafe origins and unsupported details', () => {
  for (const gatewayOrigin of [
    '',
    'file:///tmp/asset',
    'https://user:pass@gateway.example.test',
    'https://gateway.example.test/path',
    'https://gateway.example.test?x=1',
    'https://gateway.example.test#frag',
  ]) {
    const request =
      projectTvGatewayAssetFetchRequest({
        detailView: detail(),
        gatewayOrigin,
      });

    assert.equal(
      request.state,
      TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
    );
  }

  for (const detailView of [
    null,
    Object.freeze({
      kind: TV_LIBRARY_ASSET_DETAIL_KIND.REJECTED,
    }),
    detail({
      assetKind: 'video',
    }),
  ]) {
    const request =
      projectTvGatewayAssetFetchRequest({
        detailView,
        gatewayOrigin:
          'https://gateway.example.test',
      });

    assert.equal(
      request.state,
      TV_GATEWAY_ASSET_FETCH_STATE.IDLE,
    );
  }
});

test('gateway evidence uses explicit transport and keeps bytes bounded for native verification', async () => {
  const calls = [];

  const request =
    projectTvGatewayAssetFetchRequest({
      detailView: detail({
        assetKind: 'article',
      }),
      gatewayOrigin:
        'http://127.0.0.1:8090',
    });

  const evidence =
    await readTvGatewayAssetEvidence({
      request,
      transport: {
        async fetchJson(url, options) {
          calls.push([
            'json',
            url,
            options,
          ]);

          return Object.freeze({
            schema:
              'crablink.tv.asset-manifest.v1',
            contentCid:
              request.cid,
          });
        },
        async fetchBytes(url, options) {
          calls.push([
            'bytes',
            url,
            options,
          ]);

          return Uint8Array.from([
            1,
            2,
            3,
            4,
          ]);
        },
      },
    });

  assert.equal(
    evidence.schema,
    TV_GATEWAY_ASSET_EVIDENCE_SCHEMA,
  );

  assert.equal(
    evidence.state,
    TV_GATEWAY_ASSET_FETCH_STATE.READY,
  );

  assert.equal(evidence.ready, true);
  assert.equal(evidence.contentLength, 4);
  assert.deepEqual(
    Array.from(evidence.assetBytes),
    [
      1,
      2,
      3,
      4,
    ],
  );

  assert.equal(calls.length, 2);

  for (const [, , options] of calls) {
    assert.deepEqual(
      options,
      {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      },
    );
  }
});

test('gateway evidence fails closed for bad request transport errors and oversized bytes', async () => {
  const badRequest =
    await readTvGatewayAssetEvidence();

  assert.equal(
    badRequest.state,
    TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
  );

  const noTransport =
    await readTvGatewayAssetEvidence({
      request:
        projectTvGatewayAssetFetchRequest({
          detailView: detail(),
          gatewayOrigin:
            'https://gateway.example.test',
        }),
    });

  assert.equal(
    noTransport.state,
    TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
  );

  const oversized =
    await readTvGatewayAssetEvidence({
      request:
        projectTvGatewayAssetFetchRequest({
          detailView: detail(),
          gatewayOrigin:
            'https://gateway.example.test',
        }),
      transport: {
        async fetchJson() {
          return {};
        },
        async fetchBytes() {
          return new Array(
            TV_GATEWAY_ASSET_FETCH_LIMITS.MAX_ASSET_BYTES + 1,
          ).fill(1);
        },
      },
    });

  assert.equal(
    oversized.state,
    TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
  );

  const transportFailed =
    await readTvGatewayAssetEvidence({
      request:
        projectTvGatewayAssetFetchRequest({
          detailView: detail(),
          gatewayOrigin:
            'https://gateway.example.test',
        }),
      transport: {
        async fetchJson() {
          throw new Error('offline');
        },
        async fetchBytes() {
          return [
            1,
          ];
        },
      },
    });

  assert.equal(
    transportFailed.state,
    TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
  );
});
