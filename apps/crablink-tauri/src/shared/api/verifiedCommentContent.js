import {
  callTauri,
} from '../../platform/tauriPlatform.js';

import {
  hashB3Bytes,
} from './b3ByteHashClient.js';

/**
 * Read-only verified Comment hydration.
 *
 * Durable relation evidence identifies the expected immutable content.
 * Exact bytes are fetched through the existing Tauri gateway bridge,
 * hashed before decoding or parsing, and accepted only when the resolved
 * B3 CID matches the durable relation CID.
 */

export const MAX_VERIFIED_COMMENT_CONTENT_BYTES =
  1_048_576;

export const VERIFIED_COMMENT_CONTENT_SCHEMA =
  'crablink.imageboard-verified-comment-content.v1';

const COMMENT_CONTENT_SCHEMA =
  'ron.comment-content.v1';

const COMMENT_FORMAT =
  'text/plain; charset=utf-8';

const FETCH_RESPONSE_SCHEMA =
  'crablink.tauri.asset-bytes-fetch-response.v1';

const B3_CID_PATTERN =
  /^b3:[0-9a-f]{64}$/u;

const COMMENT_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.comment$/u;

export class VerifiedCommentContentError extends Error {
  constructor(
    message,
    reason =
      'verified_comment_content_error',
  ) {
    super(
      String(
        message ||
          'Verified Comment hydration failed.',
      ),
    );

    this.name =
      'VerifiedCommentContentError';

    this.reason =
      reason;
  }
}

export function createVerifiedCommentContentHydrator({
  fetchBytes =
    fetchCommentBytesThroughNativeGateway,

  hashBytes =
    hashB3Bytes,
} = {}) {
  if (
    typeof fetchBytes !==
      'function'
  ) {
    throw new VerifiedCommentContentError(
      'Verified Comment hydration requires a byte fetch function.',
      'missing_comment_byte_fetch',
    );
  }

  if (
    typeof hashBytes !==
      'function'
  ) {
    throw new VerifiedCommentContentError(
      'Verified Comment hydration requires a B3 hash function.',
      'missing_comment_b3_hash',
    );
  }

  return Object.freeze({
    hydrate:
      async (
        reply,
      ) => {
        const evidence =
          validateReplyEvidence(
            reply,
          );

        let rawFetch;

        try {
          rawFetch =
            await fetchBytes({
              expectedContentCid:
                evidence.expectedContentCid,

              route:
                evidence.objectRoute,

              maxBytes:
                MAX_VERIFIED_COMMENT_CONTENT_BYTES,
            });
        } catch (error) {
          throw new VerifiedCommentContentError(
            error?.message ||
              'Comment bytes could not be fetched.',
            'comment_content_fetch_failed',
          );
        }

        const fetched =
          validateFetchResponse(
            rawFetch,
            evidence.objectRoute,
          );

        let hashResult;

        try {
          hashResult =
            await hashBytes(
              fetched.bodyBytes,
            );
        } catch (error) {
          throw new VerifiedCommentContentError(
            error?.message ||
              'Comment bytes could not be B3 verified.',
            'comment_content_hash_failed',
          );
        }

        const resolvedContentCid =
          String(
            hashResult?.cid ??
              '',
          ).trim();

        if (
          resolvedContentCid !==
            evidence.expectedContentCid
        ) {
          throw new VerifiedCommentContentError(
            'Fetched Comment bytes do not match the durable relation content CID.',
            'comment_content_cid_mismatch',
          );
        }

        const envelope =
          parseVerifiedCommentEnvelope(
            fetched.bodyBytes,
          );

        validateCommentEnvelopeTruth(
          envelope,
          evidence,
        );

        return Object.freeze({
          schema:
            VERIFIED_COMMENT_CONTENT_SCHEMA,

          crabUrl:
            evidence.crabUrl,

          body:
            envelope.body,

          expectedContentCid:
            evidence.expectedContentCid,

          resolvedContentCid,

          contentVerified:
            true,

          bytes:
            fetched.bodyBytes.length,

          contentType:
            fetched.contentType,

          route:
            fetched.route,
        });
      },
  });
}

const defaultHydrator =
  createVerifiedCommentContentHydrator();

export async function hydrateVerifiedCommentContent(
  reply,
) {
  return defaultHydrator.hydrate(
    reply,
  );
}

async function fetchCommentBytesThroughNativeGateway({
  route,
  maxBytes,
}) {
  return callTauri(
    'fetch_asset_bytes_gateway',
    {
      request:
        {
          route,

          accept:
            'application/json,application/octet-stream;q=0.9,*/*;q=0.1',

          maxBytes,
        },
    },
  );
}

function validateReplyEvidence(
  rawReply,
) {
  const reply =
    requirePlainObject(
      rawReply,
      'Imageboard relation reply',
      'invalid_comment_relation_reply',
    );

  const b3 =
    requirePlainObject(
      reply.b3,
      'Imageboard relation B3 evidence',
      'invalid_comment_relation_b3',
    );

  const expectedContentCid =
    String(
      b3.expectedContentCid ??
        '',
    ).trim();

  if (
    B3_CID_PATTERN.test(
      expectedContentCid,
    ) ===
      false
  ) {
    throw new VerifiedCommentContentError(
      'Imageboard relation does not contain canonical expected Comment B3 evidence.',
      'invalid_expected_comment_content_cid',
    );
  }

  if (
    b3.contentVerified !==
      false ||
    (
      b3.resolvedContentCid !==
        null &&
      b3.resolvedContentCid !==
        undefined
    )
  ) {
    throw new VerifiedCommentContentError(
      'Imageboard relation must enter hydration in an unverified state.',
      'comment_relation_not_unverified',
    );
  }

  const crabUrl =
    String(
      reply.crabUrl ??
        '',
    )
      .trim()
      .toLowerCase();

  if (
    COMMENT_URL_PATTERN.test(
      crabUrl,
    ) ===
      false
  ) {
    throw new VerifiedCommentContentError(
      'Imageboard relation Comment URL is invalid.',
      'invalid_comment_crab_url',
    );
  }

  const expectedCrabUrl =
    `crab://${expectedContentCid.slice(
      3,
    )}.comment`;

  if (
    crabUrl !==
      expectedCrabUrl
  ) {
    throw new VerifiedCommentContentError(
      'Imageboard relation Comment URL does not match its content CID.',
      'comment_url_content_cid_mismatch',
    );
  }

  return Object.freeze({
    expectedContentCid,

    crabUrl,

    siteCrabUrl:
      requiredString(
        reply.siteCrabUrl,
        'missing_comment_site',
      ),

    parentCrabUrl:
      requiredString(
        reply.parentCrabUrl,
        'missing_comment_parent',
      ),

    threadCrabUrl:
      requiredString(
        reply.threadCrabUrl,
        'missing_comment_thread',
      ),

    objectRoute:
      `/o/${expectedContentCid}`,
  });
}

function validateFetchResponse(
  raw,
  expectedRoute,
) {
  const response =
    requirePlainObject(
      raw,
      'Native Comment byte response',
      'invalid_comment_fetch_response',
    );

  if (
    String(
      response.schema ??
        '',
    ).trim() !==
      FETCH_RESPONSE_SCHEMA
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response schema is invalid.',
      'invalid_comment_fetch_schema',
    );
  }

  if (
    String(
      response.method ??
        '',
    )
      .trim()
      .toUpperCase() !==
      'GET'
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response method is invalid.',
      'invalid_comment_fetch_method',
    );
  }

  const route =
    String(
      response.route ??
        '',
    ).trim();

  if (
    route !==
      expectedRoute
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response route does not match the requested object.',
      'comment_fetch_route_mismatch',
    );
  }

  const status =
    Number(
      response.status,
    );

  if (
    response.ok !==
      true ||
    Number.isSafeInteger(
      status,
    ) ===
      false ||
    status <
      200 ||
    status >=
      300
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response was not successful.',
      'comment_fetch_not_successful',
    );
  }

  const bodyBytes =
    normalizeExactBytes(
      response.bodyBytes ??
        response.body_bytes,
    );

  if (
    bodyBytes.length ===
      0
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response is empty.',
      'empty_comment_content_bytes',
    );
  }

  if (
    bodyBytes.length >
      MAX_VERIFIED_COMMENT_CONTENT_BYTES
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte response exceeds the reviewed text-content bound.',
      'comment_content_bytes_too_large',
    );
  }

  const reportedBytes =
    Number(
      response.bytes,
    );

  if (
    Number.isSafeInteger(
      reportedBytes,
    ) ===
      false ||
    reportedBytes !==
      bodyBytes.length
  ) {
    throw new VerifiedCommentContentError(
      'Native Comment byte count does not match the returned bytes.',
      'comment_fetch_byte_count_mismatch',
    );
  }

  return Object.freeze({
    route,

    contentType:
      String(
        response.contentType ??
          response.content_type ??
          '',
      ).trim(),

    bodyBytes,
  });
}

function parseVerifiedCommentEnvelope(
  bodyBytes,
) {
  let text;

  try {
    text =
      new TextDecoder(
        'utf-8',
        {
          fatal:
            true,
        },
      ).decode(
        new Uint8Array(
          bodyBytes,
        ),
      );
  } catch {
    throw new VerifiedCommentContentError(
      'Verified Comment bytes are not valid UTF-8.',
      'invalid_comment_content_utf8',
    );
  }

  let parsed;

  try {
    parsed =
      JSON.parse(
        text,
      );
  } catch {
    throw new VerifiedCommentContentError(
      'Verified Comment bytes are not valid JSON.',
      'invalid_comment_content_json',
    );
  }

  return requirePlainObject(
    parsed,
    'Verified Comment envelope',
    'invalid_comment_content_envelope',
  );
}

function validateCommentEnvelopeTruth(
  envelope,
  evidence,
) {
  requireExactString(
    envelope.schema,
    COMMENT_CONTENT_SCHEMA,
    'invalid_comment_content_schema',
  );

  requireExactString(
    envelope.kind,
    'comment',
    'invalid_comment_content_kind',
  );

  requireExactString(
    envelope.asset_kind,
    'comment',
    'invalid_comment_asset_kind',
  );

  requireExactString(
    envelope.format,
    COMMENT_FORMAT,
    'invalid_comment_content_format',
  );

  if (
    typeof envelope.body !==
      'string' ||
    envelope.body.length ===
      0
  ) {
    throw new VerifiedCommentContentError(
      'Verified Comment body is empty or invalid.',
      'invalid_comment_content_body',
    );
  }

  const relations =
    requirePlainObject(
      envelope.relations,
      'Verified Comment relations',
      'invalid_comment_content_relations',
    );

  requireExactString(
    relations.site,
    evidence.siteCrabUrl,
    'comment_content_site_mismatch',
  );

  requireExactString(
    relations.parent,
    evidence.parentCrabUrl,
    'comment_content_parent_mismatch',
  );

  requireExactString(
    relations.target,
    evidence.parentCrabUrl,
    'comment_content_target_mismatch',
  );

  requireExactString(
    relations.thread,
    evidence.threadCrabUrl,
    'comment_content_thread_mismatch',
  );

  const siteConnection =
    requirePlainObject(
      envelope.site_connection,
      'Verified Comment site connection',
      'invalid_comment_site_connection',
    );

  if (
    siteConnection.required !==
      true
  ) {
    throw new VerifiedCommentContentError(
      'Verified Comment Site connection is invalid.',
      'invalid_comment_site_connection_required',
    );
  }

  requireExactString(
    siteConnection.relation,
    'comment_on_site',
    'invalid_comment_site_connection_relation',
  );

  requireExactString(
    siteConnection.crab_url,
    evidence.siteCrabUrl,
    'comment_site_connection_mismatch',
  );

  const parentReference =
    requirePlainObject(
      envelope.parent_reference,
      'Verified Comment parent reference',
      'invalid_comment_parent_reference',
    );

  requireExactString(
    parentReference.relation,
    'comment_parent',
    'invalid_comment_parent_reference_relation',
  );

  requireExactString(
    parentReference.crab_url,
    evidence.parentCrabUrl,
    'comment_parent_reference_mismatch',
  );

  const threadReference =
    requirePlainObject(
      envelope.thread_reference,
      'Verified Comment thread reference',
      'invalid_comment_thread_reference',
    );

  requireExactString(
    threadReference.relation,
    'thread_context',
    'invalid_comment_thread_reference_relation',
  );

  requireExactString(
    threadReference.crab_url,
    evidence.threadCrabUrl,
    'comment_thread_reference_mismatch',
  );

  const createdAtMs =
    Number(
      envelope.created_at_ms,
    );

  if (
    Number.isSafeInteger(
      createdAtMs,
    ) ===
      false ||
    createdAtMs <=
      0
  ) {
    throw new VerifiedCommentContentError(
      'Verified Comment creation time is invalid.',
      'invalid_comment_created_at',
    );
  }
}

function normalizeExactBytes(
  raw,
) {
  let bytes;

  if (
    raw instanceof
      Uint8Array
  ) {
    bytes =
      Array.from(
        raw,
      );
  } else if (
    raw instanceof
      ArrayBuffer
  ) {
    bytes =
      Array.from(
        new Uint8Array(
          raw,
        ),
      );
  } else if (
    Array.isArray(
      raw,
    )
  ) {
    bytes =
      Array.from(
        raw,
      );
  } else {
    throw new VerifiedCommentContentError(
      'Native Comment response does not contain exact byte data.',
      'invalid_comment_content_bytes',
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
      throw new VerifiedCommentContentError(
        'Native Comment response contains an invalid byte.',
        'invalid_comment_content_byte',
      );
    }
  }

  return Object.freeze(
    bytes,
  );
}

function requirePlainObject(
  raw,
  label,
  reason,
) {
  if (
    raw &&
    typeof raw ===
      'object' &&
    Array.isArray(
      raw,
    ) ===
      false
  ) {
    return raw;
  }

  throw new VerifiedCommentContentError(
    `${label} must be an object.`,
    reason,
  );
}

function requiredString(
  raw,
  reason,
) {
  const value =
    String(
      raw ??
        '',
    ).trim();

  if (
    value.length >
      0
  ) {
    return value;
  }

  throw new VerifiedCommentContentError(
    'Required durable Comment relation value is missing.',
    reason,
  );
}

function requireExactString(
  raw,
  expected,
  reason,
) {
  if (
    String(
      raw ??
        '',
    ).trim() ===
      expected
  ) {
    return;
  }

  throw new VerifiedCommentContentError(
    'Verified Comment envelope disagrees with required durable truth.',
    reason,
  );
}
