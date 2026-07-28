import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

import {
  TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA,
  TV_LIBRARY_ASSET_VERIFY_FLOW_STATE,
  createIdleTvLibraryAssetVerifyFlow,
  runTvLibraryAssetVerifyFlow,
} from './tvLibraryAssetVerifyFlow.js';

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

function manifest({
  assetKind = 'image',
  hash = HASH,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.asset-manifest.v1',
    assetKind,
    renderKind: assetKind,
    crabUrl:
      `crab://${hash}.${assetKind}`,
    contentCid:
      `b3:${hash}`,
    contentType:
      assetKind === 'image'
        ? 'image/png'
        : 'text/markdown; charset=utf-8',
    contentLength: 4,
    maxVerifiedAssetBytes: 4_194_304,
  });
}

function transport({
  bytes = Uint8Array.from([1, 2, 3, 4]),
  manifestBody = manifest(),
} = {}) {
  return Object.freeze({
    async fetchJson() {
      return manifestBody;
    },
    async fetchBytes() {
      return bytes;
    },
  });
}

function adapter({
  verified = true,
  assetKind = 'image',
  hash = HASH,
} = {}) {
  return Object.freeze({
    async checkAssetManifest(request) {
      assert.equal(
        request.manifest.contentCid,
        `b3:${hash}`,
      );

      assert.deepEqual(
        Array.from(request.assetBytes),
        [1, 2, 3, 4],
      );

      return Object.freeze({
        schema:
          'crablink.tv.asset-manifest-check-result.v1',
        verified,
        renderKind: assetKind,
        assetKind,
        crabUrl:
          `crab://${hash}.${assetKind}`,
        contentCid:
          `b3:${hash}`,
        contentType:
          assetKind === 'image'
            ? 'image/png'
            : 'text/markdown; charset=utf-8',
        contentLength: 4,
        maxVerifiedAssetBytes: 4_194_304,
      });
    },
  });
}

test('verify flow constants and idle view are explicit and immutable', () => {
  assert.equal(
    TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA,
    'crablink.tv.library-asset-verify-flow.v1',
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_ASSET_VERIFY_FLOW_STATE),
    true,
  );

  const idle =
    createIdleTvLibraryAssetVerifyFlow();

  assert.equal(
    idle.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.IDLE,
  );

  assert.equal(idle.ready, false);
  assert.equal(Object.isFrozen(idle), true);
});

test('verify flow composes gateway evidence native check and render projection', async () => {
  const result =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
      transport: transport(),
      manifestAdapter: adapter(),
    });

  assert.equal(
    result.schema,
    TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA,
  );

  assert.equal(
    result.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.READY,
  );

  assert.equal(result.ready, true);
  assert.equal(result.request.assetKind, 'image');
  assert.equal(result.evidence.contentLength, 4);
  assert.equal(result.verification.verified, true);

  assert.equal(
    result.renderView.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
  );

  assert.equal(result.renderView.assetKind, 'image');
  assert.equal(result.renderView.cid, `b3:${HASH}`);
  assert.equal(Object.isFrozen(result), true);
});

test('verify flow accepts article render facts through the same bounded path', async () => {
  const result =
    await runTvLibraryAssetVerifyFlow({
      detailView:
        detail({
          assetKind: 'article',
        }),
      gatewayOrigin:
        'http://127.0.0.1:8090',
      transport:
        transport({
          manifestBody:
            manifest({
              assetKind: 'article',
            }),
        }),
      manifestAdapter:
        adapter({
          assetKind: 'article',
        }),
    });

  assert.equal(
    result.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.READY,
  );

  assert.equal(result.renderView.renderKind, 'article');
  assert.equal(result.renderView.assetKind, 'article');
});

test('verify flow fails closed before native verification when gateway request or evidence is bad', async () => {
  const badOrigin =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'file:///tmp/not-allowed',
      transport: transport(),
      manifestAdapter: adapter(),
    });

  assert.equal(
    badOrigin.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
  );

  const noTransport =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
      manifestAdapter: adapter(),
    });

  assert.equal(
    noTransport.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
  );
});

test('verify flow fails closed for missing native adapter native failures and mismatched render results', async () => {
  const noAdapter =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
      transport: transport(),
    });

  assert.equal(
    noAdapter.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
  );

  const nativeFailure =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
      transport: transport(),
      manifestAdapter: {
        async checkAssetManifest() {
          throw new Error('native unavailable');
        },
      },
    });

  assert.equal(
    nativeFailure.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
  );

  const mismatch =
    await runTvLibraryAssetVerifyFlow({
      detailView: detail(),
      gatewayOrigin:
        'https://gateway.example.test',
      transport: transport(),
      manifestAdapter:
        adapter({
          assetKind: 'article',
        }),
    });

  assert.equal(
    mismatch.state,
    TV_LIBRARY_ASSET_VERIFY_FLOW_STATE.REJECTED,
  );

  assert.equal(
    mismatch.renderView.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED,
  );
});
