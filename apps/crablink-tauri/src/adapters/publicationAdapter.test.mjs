import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readFile,
} from 'node:fs/promises';

import {
  createPublicationAdapter,
} from './publicationAdapter.js';

function gatewayFixture(
  responder,
) {
  const calls = [];

  return {
    calls,
    client: {
      async request(
        path,
        options,
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
    },
  };
}

test(
  'phase6c1 desktop publication list uses the public gateway route',
  async () => {
    const expected = {
      schema:
        'crablink.publication-page.v1',
      items: [],
      nextCursor:
        'p_00000002',
      hasMore:
        true,
    };

    const gateway =
      gatewayFixture(
        async () => ({
          ok: true,
          status: 200,
          data: expected,
        }),
      );

    const adapter =
      createPublicationAdapter(
        gateway.client,
      );

    const result =
      await adapter.listCreatorPublications({
        username:
          'rusty_crab',
        cursor:
          'p_00000001',
        limit:
          20,
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
      '/creators/rusty_crab/publications?cursor=p_00000001&limit=20',
    );

    assert.equal(
      gateway.calls[0].options.label,
      'Creator publications',
    );
  },
);

test(
  'phase6c1 desktop publication detail uses the public gateway route',
  async () => {
    const expected = {
      schema:
        'crablink.publication-summary.v1',
      publicationId:
        'publication-001',
    };

    const gateway =
      gatewayFixture(
        async () => ({
          ok: true,
          status: 200,
          data: expected,
        }),
      );

    const adapter =
      createPublicationAdapter(
        gateway.client,
      );

    const result =
      await adapter.getCreatorPublication({
        username:
          'rusty_crab',
        publicationId:
          'publication-001',
      });

    assert.equal(
      result,
      expected,
    );

    assert.equal(
      gateway.calls[0].path,
      '/creators/rusty_crab/publications/publication-001',
    );
  },
);

test(
  'phase6c1 desktop publication adapter defaults to bounded page size',
  async () => {
    const gateway =
      gatewayFixture(
        async () => ({
          data: {
            schema:
              'crablink.publication-page.v1',
            items: [],
            nextCursor: null,
            hasMore: false,
          },
        }),
      );

    const adapter =
      createPublicationAdapter(
        gateway.client,
      );

    await adapter.listCreatorPublications({
      username:
        'rusty_crab',
    });

    assert.equal(
      gateway.calls[0].path,
      '/creators/rusty_crab/publications?limit=20',
    );
  },
);

test(
  'phase6c1 desktop publication requests fail before transport when malformed',
  async () => {
    const gateway =
      gatewayFixture(
        async () => ({
          data: {},
        }),
      );

    const adapter =
      createPublicationAdapter(
        gateway.client,
      );

    await assert.rejects(
      adapter.listCreatorPublications({
        username:
          '../rusty_crab',
      }),
      /publication username is invalid/,
    );

    await assert.rejects(
      adapter.listCreatorPublications({
        username:
          'rusty_crab',
        limit:
          51,
      }),
      /publication limit/,
    );

    await assert.rejects(
      adapter.getCreatorPublication({
        username:
          'rusty_crab',
        publicationId:
          'bad%id',
      }),
      /publication identifier is invalid/,
    );

    assert.equal(
      gateway.calls.length,
      0,
    );
  },
);

test(
  'phase6c1 desktop publication adapter preserves gateway errors',
  async () => {
    const expectedError =
      Object.assign(
        new Error(
          'gateway unavailable',
        ),
        {
          status: 502,
          reason:
            'omnigate_connect',
          retryable:
            true,
        },
      );

    const gateway =
      gatewayFixture(
        async () => {
          throw expectedError;
        },
      );

    const adapter =
      createPublicationAdapter(
        gateway.client,
      );

    await assert.rejects(
      adapter.listCreatorPublications({
        username:
          'rusty_crab',
      }),
      (error) =>
        error === expectedError,
    );
  },
);

test(
  'phase6c1 desktop publication adapter is proxy-only and non-authoritative',
  async () => {
    const source =
      await readFile(
        new URL(
          './publicationAdapter.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (const required of [
      'createPublicationPort',
      'gateway.request',
      '/creators/',
      '/publications',
      'limit',
      'cursor',
    ]) {
      assert.equal(
        source.includes(
          required,
        ),
        true,
        `missing publication adapter fragment: ${required}`,
      );
    }

    for (const forbidden of [
      '/v1/index/',
      'svcIndex',
      'svc_index',
      'omnigate.request',
      'publishCreatorPublication',
      'walletMutation',
      'ledgerMutation',
      'receiptAuthority',
      'paidEntitlementAuthority',
      'followMutation',
      'settlementAuthority',
      'privateKey',
      'recoveryPhrase',
      'capabilityToken',
    ]) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden publication adapter authority: ${forbidden}`,
      );
    }
  },
);
