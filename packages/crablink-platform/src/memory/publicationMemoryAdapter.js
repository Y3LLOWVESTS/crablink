/**
 * RO:WHAT — Deterministic test-only memory adapter for creator publication reads.
 * RO:WHY — Profile and feed behavior needs immutable fixtures without Tauri, Chrome, network, or backend processes.
 * RO:INTERACTS — publicationPort and memorySnapshot helpers.
 * RO:INVARIANTS — constructor snapshots fixtures; every read returns an isolated immutable snapshot.
 * RO:SECURITY — no publication mutation, economic truth, paid unlock, relationship authority, or backend finality.
 * RO:TEST — publicationMemoryAdapter.test.mjs.
 */

// FINAL_BETA_PHASE6C1_MEMORY_PUBLICATION_ADAPTER_V1

import {
  createPublicationPort,
} from '../contracts/publicationPort.js';

import {
  cloneMemoryValue,
  freezeMemorySnapshot,
} from './memorySnapshot.js';

const EMPTY_PAGE =
  Object.freeze({
    schema:
      'crablink.publication-page.v1',
    items:
      Object.freeze([]),
    nextCursor:
      null,
    hasMore:
      false,
  });

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9_-]{2,31}$/u;

const PUBLICATION_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function createMemoryPublicationAdapter(
  fixtures = {},
) {
  const source =
    requireRecord(
      fixtures,
      'publication fixtures',
    );

  const pages =
    cloneMemoryValue(
      requireRecord(
        source.pages || {},
        'publication page fixtures',
      ),
    );

  const publications =
    cloneMemoryValue(
      requireRecord(
        source.publications || {},
        'publication detail fixtures',
      ),
    );

  return createPublicationPort({
    async listCreatorPublications(
      request = {},
    ) {
      const normalized =
        normalizeListRequest(
          request,
        );

      const page =
        Object.hasOwn(
          pages,
          normalized.username,
        )
          ? pages[normalized.username]
          : EMPTY_PAGE;

      return freezeMemorySnapshot(
        page,
      );
    },

    async getCreatorPublication(
      request = {},
    ) {
      const normalized =
        normalizeDetailRequest(
          request,
        );

      const key =
        `${normalized.username}/${normalized.publicationId}`;

      if (
        Object.hasOwn(
          publications,
          key,
        ) === false
      ) {
        return null;
      }

      return freezeMemorySnapshot(
        publications[key],
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
