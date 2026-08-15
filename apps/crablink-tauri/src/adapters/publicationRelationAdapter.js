/**
 * RO:WHAT — CrabLink desktop read-only adapter for durable publication relations.
 * RO:WHY — FINAL_BETA Phase 14 needs Imageboard replies to come from the reviewed public gateway relation route rather than session navigation memory.
 * RO:INTERACTS — GatewayClient.request and svc-gateway GET /publication-relations.
 * RO:INVARIANTS — typed parent crab URL required; cursor stays opaque; limit is bounded to backend contract; response data passes through unchanged.
 * RO:SECURITY — gateway only; no direct Omnigate, svc-index, publication mutation, wallet, ledger, receipt, entitlement, follow, settlement, QuickChain, ROX, or Solana authority.
 * RO:TEST — publicationRelationAdapter.test.mjs.
 */

// FINAL_BETA_PHASE14A6E1_DESKTOP_RELATION_ADAPTER_V1

const DEFAULT_RELATION_LIMIT =
  50;

const MAX_RELATION_LIMIT =
  100;

const MAX_CURSOR_LENGTH =
  128;

const TYPED_CRAB_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.[a-z][a-z0-9_-]{0,31}$/u;

export function createPublicationRelationAdapter(
  gatewayClient,
) {
  const gateway =
    requireGatewayClient(
      gatewayClient,
    );

  return Object.freeze({
    async listPublicationRelations(
      request = {},
    ) {
      const normalized =
        normalizeListRequest(
          request,
        );

      const query =
        new URLSearchParams();

      query.set(
        'parentCrabUrl',
        normalized
          .parentCrabUrl,
      );

      if (
        normalized.cursor
      ) {
        query.set(
          'cursor',
          normalized.cursor,
        );
      }

      query.set(
        'limit',
        String(
          normalized.limit,
        ),
      );

      const response =
        await gateway.request(
          `/publication-relations?${query.toString()}`,
          {
            label:
              'Publication relations',
          },
        );

      if (
        response &&
        typeof response ===
          'object' &&
        Object.prototype
          .hasOwnProperty
          .call(
            response,
            'data',
          )
      ) {
        return response.data;
      }

      if (
        response &&
        typeof response ===
          'object' &&
        Object.prototype
          .hasOwnProperty
          .call(
            response,
            'body',
          )
      ) {
        return response.body;
      }

      return response;
    },
  });
}

function normalizeListRequest(
  request,
) {
  const source =
    request &&
    typeof request ===
      'object' &&
    Array.isArray(
      request,
    ) === false
      ? request
      : {};

  const parentCrabUrl =
    String(
      source.parentCrabUrl ||
        '',
    )
      .trim()
      .toLowerCase();

  if (
    TYPED_CRAB_URL_PATTERN
      .test(
        parentCrabUrl,
      ) === false
  ) {
    throw new TypeError(
      'Publication relation read requires a canonical typed parent crab URL.',
    );
  }

  const cursor =
    source.cursor ===
      null ||
    source.cursor ===
      undefined
      ? ''
      : String(
          source.cursor,
        )
          .trim();

  if (
    cursor.length >
      MAX_CURSOR_LENGTH
  ) {
    throw new TypeError(
      'Publication relation cursor exceeds the supported bound.',
    );
  }

  const limit =
    source.limit ===
      null ||
    source.limit ===
      undefined
      ? DEFAULT_RELATION_LIMIT
      : Number(
          source.limit,
        );

  if (
    Number.isSafeInteger(
      limit,
    ) === false ||
    limit < 1 ||
    limit >
      MAX_RELATION_LIMIT
  ) {
    throw new TypeError(
      'Publication relation limit must be an integer from 1 through 100.',
    );
  }

  return Object.freeze({
    parentCrabUrl,
    cursor,
    limit,
  });
}

function requireGatewayClient(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    typeof value.request ===
      'function'
  ) {
    return value;
  }

  throw new TypeError(
    'publication relation adapter requires GatewayClient.request',
  );
}
