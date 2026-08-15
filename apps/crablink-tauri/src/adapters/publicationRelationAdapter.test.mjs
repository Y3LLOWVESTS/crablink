import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPublicationRelationAdapter,
} from './publicationRelationAdapter.js';

const IMAGE_PARENT =
  `crab://${'a'.repeat(64)}.image`;

function gatewayFixture(
  responder,
) {
  const calls =
    [];

  return {
    calls,

    client:
      Object.freeze({
        async request(
          path,
          options = {},
        ) {
          calls.push({
            path,
            options,
          });

          return responder(
            path,
            options,
          );
        },
      }),
  };
}

test(
  'phase14a6e1 relation adapter uses the public gateway route with parent cursor and limit',
  async () => {
    const expected =
      {
        schema:
          'crablink.publication-relation-page.v1',

        items:
          [],

        nextCursor:
          'r_00000002',

        hasMore:
          true,
      };

    const gateway =
      gatewayFixture(
        async () => ({
          ok:
            true,

          status:
            200,

          data:
            expected,
        }),
      );

    const adapter =
      createPublicationRelationAdapter(
        gateway.client,
      );

    const result =
      await adapter
        .listPublicationRelations({
          parentCrabUrl:
            IMAGE_PARENT,

          cursor:
            'r_00000001',

          limit:
            25,
        });

    assert.equal(
      result,
      expected,
    );

    assert.equal(
      gateway.calls.length,
      1,
    );

    assert.equal(
      gateway.calls[0].path,
      `/publication-relations?parentCrabUrl=${encodeURIComponent(
        IMAGE_PARENT,
      )}&cursor=r_00000001&limit=25`,
    );

    assert.equal(
      gateway.calls[0]
        .options
        .label,
      'Publication relations',
    );
  },
);

test(
  'phase14a6e1 relation adapter defaults to fifty and omits an absent cursor',
  async () => {
    const expected =
      {
        schema:
          'crablink.publication-relation-page.v1',

        items:
          [],

        nextCursor:
          null,

        hasMore:
          false,
      };

    const gateway =
      gatewayFixture(
        async () => ({
          body:
            expected,
        }),
      );

    const adapter =
      createPublicationRelationAdapter(
        gateway.client,
      );

    const result =
      await adapter
        .listPublicationRelations({
          parentCrabUrl:
            IMAGE_PARENT,
        });

    assert.equal(
      result,
      expected,
    );

    assert.equal(
      gateway.calls.length,
      1,
    );

    assert.equal(
      gateway.calls[0].path,
      `/publication-relations?parentCrabUrl=${encodeURIComponent(
        IMAGE_PARENT,
      )}&limit=50`,
    );

    assert.equal(
      gateway.calls[0]
        .path
        .includes(
          'cursor=',
        ),
      false,
    );
  },
);

test(
  'phase14a6e1 relation adapter rejects invalid parent and limit before transport',
  async () => {
    const gateway =
      gatewayFixture(
        async () => ({
          data:
            null,
        }),
      );

    const adapter =
      createPublicationRelationAdapter(
        gateway.client,
      );

    const invalidRequests =
      [
        {},

        {
          parentCrabUrl:
            'crab://picture-board',
        },

        {
          parentCrabUrl:
            IMAGE_PARENT,

          limit:
            0,
        },

        {
          parentCrabUrl:
            IMAGE_PARENT,

          limit:
            101,
        },

        {
          parentCrabUrl:
            IMAGE_PARENT,

          limit:
            1.5,
        },

        {
          parentCrabUrl:
            IMAGE_PARENT,

          cursor:
            'r'.repeat(
              129,
            ),
        },
      ];

    for (
      const request
      of invalidRequests
    ) {
      await assert.rejects(
        async () =>
          adapter
            .listPublicationRelations(
              request,
            ),

        TypeError,
      );
    }

    assert.equal(
      gateway.calls.length,
      0,
    );
  },
);

test(
  'phase14a6e1 relation adapter is immutable and exposes read authority only',
  () => {
    assert.throws(
      () =>
        createPublicationRelationAdapter(
          null,
        ),

      /GatewayClient\.request/,
    );

    const gateway =
      gatewayFixture(
        async () => ({
          data:
            null,
        }),
      );

    const adapter =
      createPublicationRelationAdapter(
        gateway.client,
      );

    assert.deepEqual(
      Object.keys(
        adapter,
      ),
      [
        'listPublicationRelations',
      ],
    );

    assert.equal(
      Object.isFrozen(
        adapter,
      ),
      true,
    );

    assert.equal(
      adapter.publish,
      undefined,
    );

    assert.equal(
      adapter.write,
      undefined,
    );

    assert.equal(
      adapter.follow,
      undefined,
    );

    assert.equal(
      adapter.pay,
      undefined,
    );

    assert.equal(
      gateway.calls.length,
      0,
    );
  },
);
