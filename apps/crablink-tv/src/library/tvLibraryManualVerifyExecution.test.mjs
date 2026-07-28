import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_ASSET_VERIFY_FLOW_STATE,
} from './tvLibraryAssetVerifyFlow.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

import {
  TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA,
  TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE,
  captureTvLibraryManualVerifyExecutionTarget,
  createIdleTvLibraryManualVerifyExecution,
  createRunningTvLibraryManualVerifyExecution,
  createTvLibraryManualVerifyExecutionLock,
  isCurrentTvLibraryManualVerifyExecutionTarget,
  runTvLibraryManualVerifyExecution,
} from './tvLibraryManualVerifyExecution.js';

const HASH =
  'a'.repeat(64);

const DETAIL =
  Object.freeze({
    kind:
      TV_LIBRARY_ASSET_DETAIL_KIND.READY,

    assetKind:
      'image',

    canonicalCrabUrl:
      `crab://${HASH}.image`,

    cid:
      `b3:${HASH}`,
  });

const READY_RENDER =
  Object.freeze({
    kind:
      TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND
        .READY,

    verified:
      true,

    renderKind:
      'image',

    canonicalCrabUrl:
      DETAIL.canonicalCrabUrl,

    cid:
      DETAIL.cid,
  });

const GATEWAY_PROFILE_PORT =
  Object.freeze({
    async readGatewayProfile() {
      return Object.freeze({
        schema:
          'crablink.tv.gateway-profile.v1',

        state:
          'ready',

        origin:
          'http://192.168.1.50:8090',
      });
    },
  });

test('manual verify execution constants and idle running views are explicit', () => {
  assert.equal(
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA,
    'crablink.tv.library-manual-verify-execution.v1',
  );

  assert.equal(
    Object.isFrozen(
      TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE,
    ),
    true,
  );

  const idle =
    createIdleTvLibraryManualVerifyExecution();

  assert.equal(
    idle.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .IDLE,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );

  const running =
    createRunningTvLibraryManualVerifyExecution({
      detailView:
        DETAIL,
    });

  assert.equal(
    running.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .RUNNING,
  );
});

test('manual verify execution composes reviewed gateway profile and verify flow', async () => {
  const calls = [];

  const result =
    await runTvLibraryManualVerifyExecution({
      detailView:
        DETAIL,

      gatewayProfilePort:
        GATEWAY_PROFILE_PORT,

      transport:
        Object.freeze({
          fetchJson() {},
          fetchBytes() {},
        }),

      manifestAdapter:
        Object.freeze({
          checkAssetManifest() {},
        }),

      async runVerifyFlow(input) {
        calls.push(input);

        return Object.freeze({
          state:
            TV_LIBRARY_ASSET_VERIFY_FLOW_STATE
              .READY,

          ready:
            true,

          renderView:
            READY_RENDER,
        });
      },
    });

  assert.equal(
    result.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .READY,
  );

  assert.equal(
    result.ready,
    true,
  );

  assert.equal(
    result.renderView,
    READY_RENDER,
  );

  assert.equal(
    calls.length,
    1,
  );

  assert.equal(
    calls[0].gatewayOrigin,
    'http://192.168.1.50:8090',
  );

  assert.equal(
    Object.hasOwn(
      result,
      'evidence',
    ),
    false,
  );

  assert.equal(
    Object.hasOwn(
      result,
      'assetBytes',
    ),
    false,
  );
});

test('manual verify execution fails closed for gateway and flow rejection', async () => {
  const badGateway =
    await runTvLibraryManualVerifyExecution({
      detailView:
        DETAIL,

      gatewayProfilePort:
        Object.freeze({
          async readGatewayProfile() {
            return Object.freeze({
              schema:
                'crablink.tv.gateway-profile.v1',

              state:
                'invalid',

              origin:
                null,

              errorCode:
                'gateway_profile_invalid',
            });
          },
        }),

      async runVerifyFlow() {
        throw new Error(
          'flow must not run',
        );
      },
    });

  assert.equal(
    badGateway.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .REJECTED,
  );

  assert.equal(
    badGateway.code,
    'gateway_profile_invalid',
  );

  const flowRejected =
    await runTvLibraryManualVerifyExecution({
      detailView:
        DETAIL,

      gatewayProfilePort:
        GATEWAY_PROFILE_PORT,

      async runVerifyFlow() {
        return Object.freeze({
          state:
            TV_LIBRARY_ASSET_VERIFY_FLOW_STATE
              .REJECTED,

          ready:
            false,

          code:
            'TV_LIBRARY_ASSET_VERIFY_FLOW_NATIVE_CHECK_FAILED',

          message:
            'Native asset manifest verification failed.',

          renderView:
            Object.freeze({
              kind:
                TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND
                  .REJECTED,

              message:
                'Native verification rejected the asset.',
            }),
        });
      },
    });

  assert.equal(
    flowRejected.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .REJECTED,
  );

  assert.equal(
    flowRejected.renderView.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND
      .REJECTED,
  );
});


test('manual verify execution target rejects stale Library detail replacement', () => {
  const target =
    captureTvLibraryManualVerifyExecutionTarget({
      detailView:
        DETAIL,
    });

  assert.equal(
    Object.isFrozen(target),
    true,
  );

  assert.equal(
    isCurrentTvLibraryManualVerifyExecutionTarget({
      target,
      detailView:
        DETAIL,
    }),
    true,
  );

  assert.equal(
    isCurrentTvLibraryManualVerifyExecutionTarget({
      target,
      detailView:
        Object.freeze({
          ...DETAIL,
          canonicalCrabUrl:
            `crab://${'b'.repeat(64)}.image`,
          cid:
            `b3:${'b'.repeat(64)}`,
        }),
    }),
    false,
  );
});

test('manual verify execution lock rejects duplicate requests and releases', async () => {
  let release;

  const deferred =
    new Promise((resolve) => {
      release = resolve;
    });

  const lock =
    createTvLibraryManualVerifyExecutionLock({
      async execute() {
        await deferred;

        return Object.freeze({
          schema:
            TV_LIBRARY_MANUAL_VERIFY_EXECUTION_SCHEMA,

          state:
            TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
              .READY,

          ready:
            true,

          code:
            'TV_LIBRARY_MANUAL_VERIFY_READY',

          message:
            'ready',

          renderView:
            READY_RENDER,
        });
      },
    });

  const first =
    lock.run({
      detailView:
        DETAIL,
    });

  assert.equal(
    lock.isRunning(),
    true,
  );

  const duplicate =
    await lock.run({
      detailView:
        DETAIL,
    });

  assert.equal(
    duplicate.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .BLOCKED,
  );

  assert.equal(
    duplicate.code,
    'TV_LIBRARY_MANUAL_VERIFY_DUPLICATE_REQUEST',
  );

  release();

  const completed =
    await first;

  assert.equal(
    completed.state,
    TV_LIBRARY_MANUAL_VERIFY_EXECUTION_STATE
      .READY,
  );

  assert.equal(
    lock.isRunning(),
    false,
  );
});
