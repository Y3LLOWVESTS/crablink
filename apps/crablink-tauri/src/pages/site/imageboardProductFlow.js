/**
 * RO:WHAT — Session-only Imageboard product navigation context.
 * RO:WHY — Connects named Imageboard Sites to existing Image and Comment workspaces without inventing publication authority.
 * RO:INTERACTS — SitePage, ImagePage, ImagePublishFlow, CommentPage.
 * RO:INVARIANTS — intents are one-shot; only canonical named Sites and typed Images are accepted; remembered threads are bounded.
 * RO:SECURITY — sessionStorage is navigation memory only and is never publication, Site, B3, wallet, ledger, moderation, or index truth.
 * RO:TEST — imageboardProductFlow.test.mjs.
 */

export const IMAGEBOARD_PRODUCT_CONTEXT_SCHEMA =
  'crablink.imageboard-product-context.v1';

export const IMAGEBOARD_THREAD_INTENT_SCHEMA =
  'crablink.imageboard-thread-intent.v1';

export const IMAGEBOARD_REPLY_INTENT_SCHEMA =
  'crablink.imageboard-reply-intent.v1';

const CONTEXT_KEY =
  'crablink.imageboard.context.v1';

const THREAD_INTENT_KEY =
  'crablink.imageboard.thread-intent.v1';

const REPLY_INTENT_KEY =
  'crablink.imageboard.reply-intent.v1';

const MAX_REMEMBERED_THREADS =
  50;

export class ImageboardProductFlowError extends Error {
  constructor(
    message,
    reason =
      'imageboard_product_flow_error',
  ) {
    super(
      message,
    );

    this.name =
      'ImageboardProductFlowError';

    this.reason =
      reason;
  }
}

export function beginImageboardThreadIntent({
  siteCrabUrl,
  creatorDisplay = '',
  category = 'general',
} = {}) {
  const context =
    normalizeContext({
      siteCrabUrl,
      creatorDisplay,
      category,
      threads: [],
    });

  writeStorage(
    CONTEXT_KEY,
    context,
  );

  const intent =
    deepFreeze({
      schema:
        IMAGEBOARD_THREAD_INTENT_SCHEMA,

      siteCrabUrl:
        context.siteCrabUrl,

      creatorDisplay:
        context.creatorDisplay,

      category:
        context.category,
    });

  writeStorage(
    THREAD_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeImageboardThreadIntent() {
  return consumeIntent(
    THREAD_INTENT_KEY,
    IMAGEBOARD_THREAD_INTENT_SCHEMA,
  );
}

export function applyImageboardThreadIntent(
  baseDraft,
  intent,
) {
  if (
    intent ===
      null ||
    intent ===
      undefined
  ) {
    return baseDraft;
  }

  const normalized =
    normalizeThreadIntent(
      intent,
    );

  return deepFreeze({
    ...(baseDraft || {}),

    creatorDisplay:
      normalized.creatorDisplay ||
      String(
        baseDraft?.creatorDisplay ??
        '',
      ),

    linkedSiteCrabUrl:
      normalized.siteCrabUrl,

    tags:
      mergeTags(
        baseDraft?.tags,
        [
          'imageboard',
          `board:${normalized.category}`,
        ],
      ),
  });
}

export function readImageboardProductContext() {
  const raw =
    readStorage(
      CONTEXT_KEY,
    );

  if (
    raw ===
      null
  ) {
    return null;
  }

  try {
    return normalizeContext(
      raw,
    );
  } catch (_error) {
    removeStorage(
      CONTEXT_KEY,
    );

    return null;
  }
}

export function rememberPublishedImageboardThread({
  siteCrabUrl,
  imageCrabUrl,
  creatorDisplay = '',
  category = 'general',
  contentCid = '',
} = {}) {
  const normalizedSite =
    normalizeNamedSiteCrabUrl(
      siteCrabUrl,
    );

  const normalizedImage =
    normalizeImageCrabUrl(
      imageCrabUrl,
    );

  const current =
    readImageboardProductContext();

  if (
    current &&
    current.siteCrabUrl !==
      normalizedSite
  ) {
    throw new ImageboardProductFlowError(
      'Published Imageboard thread does not match the active board.',
      'site_context_mismatch',
    );
  }

  const thread =
    deepFreeze({
      imageCrabUrl:
        normalizedImage,

      siteCrabUrl:
        normalizedSite,

      creatorDisplay:
        clean(
          creatorDisplay,
        ),

      category:
        normalizeCategory(
          category,
        ),

      contentCid:
        normalizeOptionalB3Cid(
          contentCid,
        ),
    });

  const existing =
    Array.isArray(
      current?.threads,
    )
      ? current.threads
      : [];

  const threads =
    [
      thread,

      ...existing.filter(
        (candidate) =>
          candidate.imageCrabUrl !==
          normalizedImage,
      ),
    ].slice(
      0,
      MAX_REMEMBERED_THREADS,
    );

  const next =
    normalizeContext({
      siteCrabUrl:
        normalizedSite,

      creatorDisplay:
        clean(
          creatorDisplay,
        ) ||
        current?.creatorDisplay ||
        '',

      category:
        normalizeCategory(
          category,
        ),

      threads,
    });

  writeStorage(
    CONTEXT_KEY,
    next,
  );

  return thread;
}

export function beginImageboardReplyIntent({
  siteCrabUrl,
  imageCrabUrl,
  creatorDisplay = '',
} = {}) {
  const normalizedSite =
    normalizeNamedSiteCrabUrl(
      siteCrabUrl,
    );

  const normalizedImage =
    normalizeImageCrabUrl(
      imageCrabUrl,
    );

  const current =
    readImageboardProductContext();

  if (
    current &&
    current.siteCrabUrl !==
      normalizedSite
  ) {
    throw new ImageboardProductFlowError(
      'Imageboard reply Site does not match the active board.',
      'reply_site_context_mismatch',
    );
  }

  const intent =
    deepFreeze({
      schema:
        IMAGEBOARD_REPLY_INTENT_SCHEMA,

      siteCrabUrl:
        normalizedSite,

      imageCrabUrl:
        normalizedImage,

      creatorDisplay:
        clean(
          creatorDisplay,
        ),
    });

  writeStorage(
    REPLY_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeImageboardReplyIntent() {
  const raw =
    consumeIntent(
      REPLY_INTENT_KEY,
      IMAGEBOARD_REPLY_INTENT_SCHEMA,
    );

  if (
    raw ===
      null
  ) {
    return null;
  }

  return normalizeReplyIntent(
    raw,
  );
}

export function applyImageboardReplyIntent(
  baseDraft,
  intent,
) {
  if (
    intent ===
      null ||
    intent ===
      undefined
  ) {
    return baseDraft;
  }

  const normalized =
    normalizeReplyIntent(
      intent,
    );

  return deepFreeze({
    ...(baseDraft || {}),

    creatorDisplay:
      normalized.creatorDisplay ||
      String(
        baseDraft?.creatorDisplay ??
        '',
      ),

    siteContextCrabUrl:
      normalized.siteCrabUrl,

    parentCrabUrl:
      normalized.imageCrabUrl,

    threadContextCrabUrl:
      normalized.imageCrabUrl,

    tags:
      mergeTags(
        baseDraft?.tags,
        [
          'imageboard',
          'image-reply',
        ],
      ),
  });
}

export function normalizeImageboardSiteCrabUrl(
  value,
) {
  return normalizeNamedSiteCrabUrl(
    value,
  );
}

export function normalizeImageboardImageCrabUrl(
  value,
) {
  return normalizeImageCrabUrl(
    value,
  );
}

function normalizeThreadIntent(
  raw,
) {
  if (
    raw?.schema !==
    IMAGEBOARD_THREAD_INTENT_SCHEMA
  ) {
    throw new ImageboardProductFlowError(
      'Invalid Imageboard thread intent schema.',
      'invalid_thread_intent_schema',
    );
  }

  return deepFreeze({
    schema:
      IMAGEBOARD_THREAD_INTENT_SCHEMA,

    siteCrabUrl:
      normalizeNamedSiteCrabUrl(
        raw.siteCrabUrl,
      ),

    creatorDisplay:
      clean(
        raw.creatorDisplay,
      ),

    category:
      normalizeCategory(
        raw.category,
      ),
  });
}

function normalizeReplyIntent(
  raw,
) {
  if (
    raw?.schema !==
    IMAGEBOARD_REPLY_INTENT_SCHEMA
  ) {
    throw new ImageboardProductFlowError(
      'Invalid Imageboard reply intent schema.',
      'invalid_reply_intent_schema',
    );
  }

  return deepFreeze({
    schema:
      IMAGEBOARD_REPLY_INTENT_SCHEMA,

    siteCrabUrl:
      normalizeNamedSiteCrabUrl(
        raw.siteCrabUrl,
      ),

    imageCrabUrl:
      normalizeImageCrabUrl(
        raw.imageCrabUrl,
      ),

    creatorDisplay:
      clean(
        raw.creatorDisplay,
      ),
  });
}

function normalizeContext(
  raw,
) {
  if (
    raw?.schema &&
    raw.schema !==
      IMAGEBOARD_PRODUCT_CONTEXT_SCHEMA
  ) {
    throw new ImageboardProductFlowError(
      'Invalid Imageboard context schema.',
      'invalid_context_schema',
    );
  }

  const threads =
    Array.isArray(
      raw?.threads,
    )
      ? raw.threads
          .map(
            (thread) => {
              try {
                return {
                  imageCrabUrl:
                    normalizeImageCrabUrl(
                      thread.imageCrabUrl,
                    ),

                  siteCrabUrl:
                    normalizeNamedSiteCrabUrl(
                      thread.siteCrabUrl,
                    ),

                  creatorDisplay:
                    clean(
                      thread.creatorDisplay,
                    ),

                  category:
                    normalizeCategory(
                      thread.category,
                    ),

                  contentCid:
                    normalizeOptionalB3Cid(
                      thread.contentCid,
                    ),
                };
              } catch (_error) {
                return null;
              }
            },
          )
          .filter(
            Boolean,
          )
          .slice(
            0,
            MAX_REMEMBERED_THREADS,
          )
      : [];

  return deepFreeze({
    schema:
      IMAGEBOARD_PRODUCT_CONTEXT_SCHEMA,

    siteCrabUrl:
      normalizeNamedSiteCrabUrl(
        raw?.siteCrabUrl,
      ),

    creatorDisplay:
      clean(
        raw?.creatorDisplay,
      ),

    category:
      normalizeCategory(
        raw?.category,
      ),

    threads,
  });
}

function consumeIntent(
  key,
  schema,
) {
  const raw =
    readStorage(
      key,
    );

  removeStorage(
    key,
  );

  if (
    raw ===
      null ||
    raw?.schema !==
      schema
  ) {
    return null;
  }

  return raw;
}

function normalizeNamedSiteCrabUrl(
  value,
) {
  const normalized =
    clean(
      value,
    )
      .toLowerCase();

  if (
    /^crab:\/\/[a-z0-9_.-]{1,80}$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  throw new ImageboardProductFlowError(
    'Imageboard requires a canonical named crab:// Site URL.',
    'invalid_site_crab_url',
  );
}

function normalizeImageCrabUrl(
  value,
) {
  const normalized =
    clean(
      value,
    )
      .toLowerCase();

  if (
    /^crab:\/\/[a-f0-9]{64}\.image$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  throw new ImageboardProductFlowError(
    'Imageboard thread requires a canonical typed Image crab URL.',
    'invalid_image_crab_url',
  );
}

function normalizeOptionalB3Cid(
  value,
) {
  const normalized =
    clean(
      value,
    )
      .toLowerCase();

  if (
    normalized ===
    ''
  ) {
    return '';
  }

  if (
    /^b3:[a-f0-9]{64}$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  throw new ImageboardProductFlowError(
    'Imageboard thread content CID must be canonical B3.',
    'invalid_content_cid',
  );
}

function normalizeCategory(
  value,
) {
  const normalized =
    clean(
      value ||
      'general',
    )
      .toLowerCase();

  if (
    /^[a-z0-9][a-z0-9_-]{0,31}$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  throw new ImageboardProductFlowError(
    'Imageboard category is invalid.',
    'invalid_category',
  );
}

function mergeTags(
  input,
  additions,
) {
  return [
    ...String(
      input ??
      '',
    )
      .split(',')
      .map(
        (tag) =>
          tag.trim(),
      )
      .filter(
        Boolean,
      ),

    ...additions,
  ]
    .filter(
      (
        tag,
        index,
        all,
      ) =>
        all.indexOf(
          tag,
        ) ===
        index,
    )
    .join(
      ', ',
    );
}

function readStorage(
  key,
) {
  try {
    const raw =
      globalThis
        ?.sessionStorage
        ?.getItem?.(
          key,
        );

    if (
      !raw
    ) {
      return null;
    }

    return JSON.parse(
      raw,
    );
  } catch (_error) {
    return null;
  }
}

function writeStorage(
  key,
  value,
) {
  try {
    globalThis
      ?.sessionStorage
      ?.setItem?.(
        key,
        JSON.stringify(
          value,
        ),
      );
  } catch (_error) {
    // Navigation context is optional and non-authoritative.
  }
}

function removeStorage(
  key,
) {
  try {
    globalThis
      ?.sessionStorage
      ?.removeItem?.(
        key,
      );
  } catch (_error) {
    // Navigation context is optional and non-authoritative.
  }
}

function clean(
  value,
) {
  return String(
    value ??
    '',
  ).trim();
}

function deepFreeze(
  value,
) {
  if (
    value &&
    typeof value ===
      'object' &&
    Object.isFrozen(
      value,
    ) ===
      false
  ) {
    for (
      const child
      of Object.values(
        value,
      )
    ) {
      deepFreeze(
        child,
      );
    }

    Object.freeze(
      value,
    );
  }

  return value;
}
