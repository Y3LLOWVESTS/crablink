/**
 * RO:WHAT — Desktop CrabLink adapter for bounded creator-publication reads through svc-gateway.
 * RO:WHY — Route-owned profile and feed UI needs typed read methods rather than arbitrary gateway requests.
 * RO:INTERACTS — GatewayClient.request, publicationPort, and public svc-gateway publication routes.
 * RO:INVARIANTS — gateway only; bounded paths and cursor query; backend response data passes through unchanged.
 * RO:SECURITY — no direct svc-index or Omnigate call, no publish, wallet, ledger, receipt, entitlement, follow, or settlement authority.
 * RO:TEST — publicationAdapter.test.mjs.
 */

// FINAL_BETA_PHASE6C1_DESKTOP_PUBLICATION_ADAPTER_V1

import {
  createPublicationPort,
} from '../../../../packages/crablink-platform/src/index.js';

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9_-]{2,31}$/u;

const PUBLICATION_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function createPublicationAdapter(
  gatewayClient,
) {
  const gateway =
    requireGatewayClient(
      gatewayClient,
    );

  return createPublicationPort({
    async listCreatorPublications(
      request = {},
    ) {
      const normalized =
        normalizeListRequest(
          request,
        );

      const path =
        `/creators/${encodeURIComponent(
          normalized.username,
        )}/publications`;

      const query =
        new URLSearchParams();

      if (normalized.cursor) {
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
          `${path}?${query.toString()}`,
          {
            label:
              'Creator publications',
          },
        );

      return responseData(
        response,
        'creator publication page',
      );
    },

    async getCreatorPublication(
      request = {},
    ) {
      const normalized =
        normalizeDetailRequest(
          request,
        );

      const path =
        `/creators/${encodeURIComponent(
          normalized.username,
        )}/publications/${encodeURIComponent(
          normalized.publicationId,
        )}`;

      const response =
        await gateway.request(
          path,
          {
            label:
              'Creator publication',
          },
        );

      return responseData(
        response,
        'creator publication detail',
      );
    },
  });
}

function normalizeListRequest(
  request,
) {
  const source =
    requireRecord(
      request,
      'publication list request',
    );

  return Object.freeze({
    username:
      normalizeUsername(
        source.username,
      ),
    cursor:
      normalizeCursor(
        source.cursor,
      ),
    limit:
      normalizeLimit(
        source.limit,
      ),
  });
}

function normalizeDetailRequest(
  request,
) {
  const source =
    requireRecord(
      request,
      'publication detail request',
    );

  return Object.freeze({
    username:
      normalizeUsername(
        source.username,
      ),
    publicationId:
      normalizePublicationId(
        source.publicationId,
      ),
  });
}

function requireGatewayClient(
  value,
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    typeof value.request !== 'function'
  ) {
    throw new TypeError(
      'publication adapter requires GatewayClient.request',
    );
  }

  return value;
}

function requireRecord(
  value,
  label,
) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new TypeError(
      `${label} requires a plain record`,
    );
  }

  return value;
}

function normalizeUsername(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    USERNAME_PATTERN.test(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      'publication username is invalid',
    );
  }

  return normalized;
}

function normalizePublicationId(
  value,
) {
  const normalized =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    PUBLICATION_ID_PATTERN.test(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      'publication identifier is invalid',
    );
  }

  return normalized;
}

function normalizeCursor(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value !== 'string'
  ) {
    throw new TypeError(
      'publication cursor requires text',
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    /[\u0000-\u001f\u007f]/u.test(
      normalized,
    )
  ) {
    throw new TypeError(
      'publication cursor is invalid',
    );
  }

  return normalized;
}

function normalizeLimit(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return 20;
  }

  if (
    Number.isInteger(value) === false ||
    value < 1 ||
    value > 50
  ) {
    throw new TypeError(
      'publication limit must be an integer from 1 through 50',
    );
  }

  return value;
}

function responseData(
  response,
  label,
) {
  if (
    response === null ||
    typeof response !== 'object' ||
    Object.hasOwn(
      response,
      'data',
    ) === false
  ) {
    throw new TypeError(
      `${label} response is missing data`,
    );
  }

  return response.data;
}
