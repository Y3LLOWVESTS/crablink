import {
  callTauri,
} from '../../platform/tauriPlatform.js';

/**
 * Generic exact-byte BLAKE3 bridge.
 *
 * This surface owns only local byte hashing through the reviewed Tauri
 * command boundary. It does not fetch content, parse asset semantics,
 * create typed crab URLs, compare expected CIDs, or mutate network state.
 */

export const MAX_B3_BYTE_HASH_BYTES =
  12 * 1024 * 1024;

const B3_HASH_PATTERN =
  /^[0-9a-f]{64}$/u;

const B3_RESPONSE_SCHEMA =
  'crablink.tauri.b3-byte-hash-response.v1';

export class B3ByteHashBridgeError extends Error {
  constructor(
    message,
    reason =
      'b3_byte_hash_bridge_error',
  ) {
    super(
      String(
        message ||
          'B3 byte hash bridge failed.',
      ),
    );

    this.name =
      'B3ByteHashBridgeError';

    this.reason =
      reason;
  }
}

export function createB3ByteHashBridge(
  invokeCommand =
    callTauri,
) {
  if (
    typeof invokeCommand ===
      'function'
  ) {
    void 0;
  } else {
    throw new B3ByteHashBridgeError(
      'B3 byte hash bridge requires an invoke function.',
      'missing_b3_hash_invoke',
    );
  }

  return Object.freeze({
    hashBytes:
      async (
        rawBytes,
      ) => {
        const bodyBytes =
          normalizeBodyBytes(
            rawBytes,
          );

        let response;

        try {
          response =
            await invokeCommand(
              'hash_b3_bytes',
              {
                request:
                  {
                    bodyBytes,
                  },
              },
            );
        } catch (error) {
          throw new B3ByteHashBridgeError(
            error?.message ||
              'Native B3 byte hashing failed.',
            'native_b3_hash_failed',
          );
        }

        return validateHashResponse(
          response,
          bodyBytes.length,
        );
      },
  });
}

const defaultBridge =
  createB3ByteHashBridge();

export async function hashB3Bytes(
  bytes,
) {
  return defaultBridge.hashBytes(
    bytes,
  );
}

function normalizeBodyBytes(
  rawBytes,
) {
  let bytes;

  if (
    rawBytes instanceof
      Uint8Array
  ) {
    bytes =
      Array.from(
        rawBytes,
      );
  } else if (
    Array.isArray(
      rawBytes,
    )
  ) {
    bytes =
      Array.from(
        rawBytes,
      );
  } else if (
    rawBytes instanceof
      ArrayBuffer
  ) {
    bytes =
      Array.from(
        new Uint8Array(
          rawBytes,
        ),
      );
  } else {
    throw new B3ByteHashBridgeError(
      'B3 byte hash input must be exact byte data.',
      'invalid_b3_hash_bytes',
    );
  }

  if (
    bytes.length ===
      0
  ) {
    throw new B3ByteHashBridgeError(
      'B3 byte hash requires non-empty bytes.',
      'empty_b3_hash_bytes',
    );
  }

  if (
    bytes.length >
      MAX_B3_BYTE_HASH_BYTES
  ) {
    throw new B3ByteHashBridgeError(
      'B3 byte hash exceeds the native 12 MiB bridge limit.',
      'b3_hash_bytes_too_large',
    );
  }

  for (
    const value
    of bytes
  ) {
    if (
      Number.isInteger(
        value,
      ) ===
        false ||
      value <
        0 ||
      value >
        255
    ) {
      throw new B3ByteHashBridgeError(
        'B3 byte hash input contains an invalid byte.',
        'invalid_b3_hash_byte',
      );
    }
  }

  return bytes;
}

function validateHashResponse(
  raw,
  expectedBytes,
) {
  if (
    raw ===
      null ||
    typeof raw !==
      'object' ||
    Array.isArray(
      raw,
    )
  ) {
    throw new B3ByteHashBridgeError(
      'Native B3 byte hash response is malformed.',
      'invalid_b3_hash_response',
    );
  }

  const schema =
    String(
      raw.schema ??
        '',
    ).trim();

  const hash =
    String(
      raw.hash ??
        '',
    ).trim();

  const cid =
    String(
      raw.cid ??
        '',
    ).trim();

  const bytes =
    Number(
      raw.bytes,
    );

  if (
    schema !==
      B3_RESPONSE_SCHEMA
  ) {
    throw new B3ByteHashBridgeError(
      'Native B3 byte hash response schema is invalid.',
      'invalid_b3_hash_response_schema',
    );
  }

  if (
    B3_HASH_PATTERN.test(
      hash,
    ) ===
      false
  ) {
    throw new B3ByteHashBridgeError(
      'Native B3 byte hash response contains an invalid hash.',
      'invalid_b3_hash_response_hash',
    );
  }

  if (
    cid !==
      `b3:${hash}`
  ) {
    throw new B3ByteHashBridgeError(
      'Native B3 byte hash response CID does not match its hash.',
      'invalid_b3_hash_response_cid',
    );
  }

  if (
    Number.isSafeInteger(
      bytes,
    ) ===
      false ||
    bytes !==
      expectedBytes
  ) {
    throw new B3ByteHashBridgeError(
      'Native B3 byte hash response byte count does not match the request.',
      'invalid_b3_hash_response_bytes',
    );
  }

  return Object.freeze({
    schema,

    bytes,

    hash,

    cid,
  });
}
