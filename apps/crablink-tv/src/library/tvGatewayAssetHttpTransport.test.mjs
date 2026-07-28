import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS,
  createTvGatewayAssetHttpTransport,
} from './tvGatewayAssetHttpTransport.js';

const OPTIONS =
  Object.freeze({
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
  });

function headers(entries = {}) {
  const normalized =
    new Map(
      Object.entries(entries).map(
        ([key, value]) => [
          key.toLowerCase(),
          String(value),
        ],
      ),
    );

  return Object.freeze({
    get(name) {
      return normalized.get(
        String(name).toLowerCase(),
      ) ?? null;
    },
  });
}

test('gateway HTTP transport uses fixed anonymous no-store GET requests', async () => {
  const calls = [];

  const transport =
    createTvGatewayAssetHttpTransport({
      async fetchImpl(
        url,
        options,
      ) {
        calls.push({
          url,
          options,
        });

        return Object.freeze({
          ok: true,

          headers:
            headers({
              'content-length': 17,
            }),

          async text() {
            return '{"verified":true}';
          },
        });
      },
    });

  const result =
    await transport.fetchJson(
      'https://gateway.example/tv/assets/manifest',
      OPTIONS,
    );

  assert.deepEqual(
    result,
    {
      verified: true,
    },
  );

  assert.deepEqual(
    calls,
    [
      {
        url:
          'https://gateway.example/tv/assets/manifest',

        options:
          OPTIONS,
      },
    ],
  );

  await assert.rejects(
    transport.fetchJson(
      'file:///private/manifest.json',
      OPTIONS,
    ),
    /TV_GATEWAY_HTTP_SCHEME_REJECTED/u,
  );

  await assert.rejects(
    transport.fetchJson(
      'https://user:secret@gateway.example/manifest',
      OPTIONS,
    ),
    /TV_GATEWAY_HTTP_CREDENTIALS_REJECTED/u,
  );
});

test('gateway HTTP transport rejects bad responses and bounds asset bytes', async () => {
  const oversized =
    createTvGatewayAssetHttpTransport({
      async fetchImpl() {
        return Object.freeze({
          ok: true,

          headers:
            headers({
              'content-length':
                TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS
                  .MAX_ASSET_BYTES + 1,
            }),

          async arrayBuffer() {
            throw new Error(
              'oversize body must not be read',
            );
          },
        });
      },
    });

  await assert.rejects(
    oversized.fetchBytes(
      'https://gateway.example/tv/assets/content',
      OPTIONS,
    ),
    /TV_GATEWAY_HTTP_BODY_TOO_LARGE/u,
  );

  const rejectedStatus =
    createTvGatewayAssetHttpTransport({
      async fetchImpl() {
        return Object.freeze({
          ok: false,
          headers: headers(),
        });
      },
    });

  await assert.rejects(
    rejectedStatus.fetchBytes(
      'https://gateway.example/tv/assets/content',
      OPTIONS,
    ),
    /TV_GATEWAY_HTTP_STATUS_REJECTED/u,
  );

  const bytes =
    Uint8Array.from([
      1,
      2,
      3,
      4,
    ]);

  const ready =
    createTvGatewayAssetHttpTransport({
      async fetchImpl() {
        return Object.freeze({
          ok: true,

          headers:
            headers({
              'content-length':
                bytes.byteLength,
            }),

          async arrayBuffer() {
            return bytes.buffer.slice(0);
          },
        });
      },
    });

  const result =
    await ready.fetchBytes(
      'http://192.168.1.50:8090/tv/assets/content',
      OPTIONS,
    );

  assert.equal(
    result instanceof Uint8Array,
    true,
  );

  assert.deepEqual(
    [...result],
    [
      1,
      2,
      3,
      4,
    ],
  );
});
