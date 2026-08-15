import assert from 'node:assert/strict';
import test from 'node:test';

import {
  B3ByteHashBridgeError,
  MAX_B3_BYTE_HASH_BYTES,
  createB3ByteHashBridge,
} from './b3ByteHashClient.js';

const HASH =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function responseFor(
  bytes,
) {
  return {
    schema:
      'crablink.tauri.b3-byte-hash-response.v1',

    bytes,

    hash:
      HASH,

    cid:
      `b3:${HASH}`,
  };
}

test(
  'phase14a6f2 forwards exact bytes only to the generic native b3 command',
  async () => {
    const calls =
      [];

    const bridge =
      createB3ByteHashBridge(
        async (
          command,
          args,
        ) => {
          calls.push({
            command,
            args,
          });

          return responseFor(
            args.request.bodyBytes.length,
          );
        },
      );

    const result =
      await bridge.hashBytes(
        new Uint8Array([
          0,
          1,
          2,
          127,
          128,
          255,
        ]),
      );

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].command,
      'hash_b3_bytes',
    );

    assert.deepEqual(
      calls[0].args,
      {
        request:
          {
            bodyBytes:
              [
                0,
                1,
                2,
                127,
                128,
                255,
              ],
          },
      },
    );

    assert.deepEqual(
      result,
      responseFor(
        6,
      ),
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );
  },
);

test(
  'phase14a6f2 accepts plain arrays and ArrayBuffer without changing byte order',
  async () => {
    const observed =
      [];

    const bridge =
      createB3ByteHashBridge(
        async (
          command,
          args,
        ) => {
          assert.equal(
            command,
            'hash_b3_bytes',
          );

          observed.push(
            args.request.bodyBytes,
          );

          return responseFor(
            args.request.bodyBytes.length,
          );
        },
      );

    await bridge.hashBytes([
      9,
      8,
      7,
    ]);

    const buffer =
      new Uint8Array([
        6,
        5,
        4,
      ]).buffer;

    await bridge.hashBytes(
      buffer,
    );

    assert.deepEqual(
      observed,
      [
        [
          9,
          8,
          7,
        ],
        [
          6,
          5,
          4,
        ],
      ],
    );
  },
);

test(
  'phase14a6f2 rejects invalid empty and oversized bytes before native invoke',
  async () => {
    let calls =
      0;

    const bridge =
      createB3ByteHashBridge(
        async () => {
          calls +=
            1;

          return responseFor(
            1,
          );
        },
      );

    const cases =
      [
        null,
        [],
        [
          -1,
        ],
        [
          256,
        ],
        [
          1.5,
        ],
        new Uint8Array(
          MAX_B3_BYTE_HASH_BYTES +
            1,
        ),
      ];

    for (
      const value
      of cases
    ) {
      await assert.rejects(
        bridge.hashBytes(
          value,
        ),
        B3ByteHashBridgeError,
      );
    }

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  'phase14a6f2 rejects malformed or internally inconsistent native hash responses',
  async () => {
    const malformed =
      [
        null,

        {
          ...responseFor(
            3,
          ),
          schema:
            'wrong.schema',
        },

        {
          ...responseFor(
            3,
          ),
          hash:
            'abc',
          cid:
            'b3:abc',
        },

        {
          ...responseFor(
            3,
          ),
          cid:
            `b3:${'f'.repeat(64)}`,
        },

        {
          ...responseFor(
            3,
          ),
          bytes:
            4,
        },
      ];

    for (
      const response
      of malformed
    ) {
      const bridge =
        createB3ByteHashBridge(
          async () =>
            response,
        );

      await assert.rejects(
        bridge.hashBytes([
          1,
          2,
          3,
        ]),
        B3ByteHashBridgeError,
      );
    }
  },
);

test(
  'phase14a6f2 exposes read-only hash authority and wraps native failures',
  async () => {
    const bridge =
      createB3ByteHashBridge(
        async (
          command,
        ) => {
          assert.equal(
            command,
            'hash_b3_bytes',
          );

          throw new Error(
            'native hash unavailable',
          );
        },
      );

    assert.deepEqual(
      Object.keys(
        bridge,
      ),
      [
        'hashBytes',
      ],
    );

    assert.equal(
      Object.isFrozen(
        bridge,
      ),
      true,
    );

    await assert.rejects(
      bridge.hashBytes([
        42,
      ]),
      (
        error,
      ) => {
        assert.equal(
          error instanceof
            B3ByteHashBridgeError,
          true,
        );

        assert.equal(
          error.reason,
          'native_b3_hash_failed',
        );

        assert.equal(
          error.message,
          'native hash unavailable',
        );

        return true;
      },
    );
  },
);
