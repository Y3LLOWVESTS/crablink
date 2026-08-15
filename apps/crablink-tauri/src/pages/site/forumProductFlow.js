/**
 * RO:WHAT — FINAL_BETA Phase 15 Forum creator-workspace navigation context.
 * RO:WHY — Joins the Forum Site experience to existing Post and Comment publishers without creating Forum publication authority.
 * RO:INTERACTS — PostPage, CommentPage, forumModel, existing typed Post/Comment draft models.
 * RO:INVARIANTS — context is one-shot and optional; only canonical named Site, .post thread, and .post/.comment parent URLs are accepted.
 * RO:SECURITY — session navigation context only; never public Forum truth, publication truth, moderation truth, ROC truth, or ledger truth.
 * RO:TEST — forumProductFlow.test.mjs.
 */

export const FORUM_PRODUCT_CONTEXT_SCHEMA =
  'crablink.forum-product-context.v1';

export const FORUM_THREAD_INTENT_SCHEMA =
  'crablink.forum-thread-intent.v1';

export const FORUM_REPLY_INTENT_SCHEMA =
  'crablink.forum-reply-intent.v1';

const CONTEXT_KEY =
  'crablink.forum.product-context.v1';

const THREAD_INTENT_KEY =
  'crablink.forum.thread-intent.v1';

const REPLY_INTENT_KEY =
  'crablink.forum.reply-intent.v1';

const MAX_REMEMBERED_THREADS =
  64;

const NAMED_SITE_PATTERN =
  /^crab:\/\/[a-z0-9][a-z0-9_-]{0,62}$/u;

const POST_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.post$/u;

const COMMENT_URL_PATTERN =
  /^crab:\/\/[0-9a-f]{64}\.comment$/u;

const CATEGORY_PATTERN =
  /^[a-z0-9][a-z0-9_-]{0,31}$/u;

export class ForumProductFlowError extends Error {
  constructor(
    message,
    reason =
      'forum_product_flow_error',
  ) {
    super(
      String(
        message ||
          'Forum product-flow validation failed.',
      ),
    );

    this.name =
      'ForumProductFlowError';

    this.reason =
      reason;
  }
}

export function beginForumThreadIntent(
  {
    siteCrabUrl,
    creatorDisplay =
      '',
    category =
      'general',
  },
  storage =
    resolveSessionStorage(),
) {
  const site =
    normalizeSite(
      siteCrabUrl,
    );

  const normalizedCategory =
    normalizeCategory(
      category,
    );

  const previous =
    readForumProductContext(
      storage,
    );

  const context =
    freeze({
      schema:
        FORUM_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        clean(
          creatorDisplay,
        ),

      category:
        normalizedCategory,

      latestThreadCrabUrl:
        previous?.siteCrabUrl ===
          site
          ? previous.latestThreadCrabUrl
          : '',

      threadCrabUrls:
        previous?.siteCrabUrl ===
          site
          ? previous.threadCrabUrls
          : [],
    });

  const intent =
    freeze({
      schema:
        FORUM_THREAD_INTENT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        context.creatorDisplay,

      category:
        normalizedCategory,
    });

  writeJson(
    storage,
    CONTEXT_KEY,
    context,
  );

  writeJson(
    storage,
    THREAD_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeForumThreadIntent(
  storage =
    resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      THREAD_INTENT_KEY,
    );

  removeItem(
    storage,
    THREAD_INTENT_KEY,
  );

  if (
    raw == null
  ) {
    return null;
  }

  return normalizeThreadIntent(
    raw,
  );
}

export function applyForumThreadIntent(
  baseDraft,
  intent,
) {
  const draft =
    {
      ...(
        baseDraft ||
        {}
      ),
    };

  if (
    intent == null
  ) {
    return draft;
  }

  const normalized =
    normalizeThreadIntent(
      intent,
    );

  return {
    ...draft,

    siteContextCrabUrl:
      normalized.siteCrabUrl,

    creatorDisplay:
      normalized.creatorDisplay ||
      clean(
        draft.creatorDisplay,
      ),

    tags:
      mergeTags(
        draft.tags,
        [
          'forum',
          `forum-category:${normalized.category}`,
        ],
      ),
  };
}

export function rememberPublishedForumThread(
  {
    siteCrabUrl,
    threadCrabUrl,
  },
  storage =
    resolveSessionStorage(),
) {
  const site =
    normalizeSite(
      siteCrabUrl,
    );

  const thread =
    normalizePost(
      threadCrabUrl,
      'invalid_forum_thread_url',
    );

  const previous =
    readForumProductContext(
      storage,
    );

  if (
    previous &&
    previous.siteCrabUrl !==
      site
  ) {
    throw new ForumProductFlowError(
      'Published Forum thread Site does not match the active Forum context.',
      'forum_site_context_mismatch',
    );
  }

  const remembered =
    normalizeThreadList(
      [
        thread,
        ...(
          previous?.threadCrabUrls ||
          []
        ),
      ],
    );

  const context =
    freeze({
      schema:
        FORUM_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        site,

      creatorDisplay:
        clean(
          previous?.creatorDisplay,
        ),

      category:
        normalizeCategory(
          previous?.category ||
            'general',
        ),

      latestThreadCrabUrl:
        thread,

      threadCrabUrls:
        remembered,
    });

  writeJson(
    storage,
    CONTEXT_KEY,
    context,
  );

  return context;
}

export function beginForumReplyIntent(
  {
    siteCrabUrl,
    threadCrabUrl,
    parentCrabUrl,
    creatorDisplay =
      '',
  },
  storage =
    resolveSessionStorage(),
) {
  const site =
    normalizeSite(
      siteCrabUrl,
    );

  const thread =
    normalizePost(
      threadCrabUrl,
      'invalid_forum_thread_url',
    );

  const parent =
    normalizeReplyParent(
      parentCrabUrl ||
        thread,
    );

  if (
    POST_URL_PATTERN.test(
      parent,
    ) &&
    parent !==
      thread
  ) {
    throw new ForumProductFlowError(
      'Forum direct reply Post parent must equal the thread root.',
      'forum_reply_parent_thread_mismatch',
    );
  }

  const context =
    readForumProductContext(
      storage,
    );

  if (
    context &&
    context.siteCrabUrl !==
      site
  ) {
    throw new ForumProductFlowError(
      'Forum reply Site does not match active Forum context.',
      'forum_site_context_mismatch',
    );
  }

  const intent =
    freeze({
      schema:
        FORUM_REPLY_INTENT_SCHEMA,

      siteCrabUrl:
        site,

      threadCrabUrl:
        thread,

      parentCrabUrl:
        parent,

      creatorDisplay:
        clean(
          creatorDisplay ||
            context?.creatorDisplay,
        ),
    });

  writeJson(
    storage,
    REPLY_INTENT_KEY,
    intent,
  );

  return intent;
}

export function consumeForumReplyIntent(
  storage =
    resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      REPLY_INTENT_KEY,
    );

  removeItem(
    storage,
    REPLY_INTENT_KEY,
  );

  if (
    raw == null
  ) {
    return null;
  }

  return normalizeReplyIntent(
    raw,
  );
}

export function applyForumReplyIntent(
  baseDraft,
  intent,
) {
  const draft =
    {
      ...(
        baseDraft ||
        {}
      ),
    };

  if (
    intent == null
  ) {
    return draft;
  }

  const normalized =
    normalizeReplyIntent(
      intent,
    );

  return {
    ...draft,

    siteContextCrabUrl:
      normalized.siteCrabUrl,

    parentCrabUrl:
      normalized.parentCrabUrl,

    threadContextCrabUrl:
      normalized.threadCrabUrl,

    creatorDisplay:
      normalized.creatorDisplay ||
      clean(
        draft.creatorDisplay,
      ),

    tags:
      mergeTags(
        draft.tags,
        [
          'forum',
          'forum-reply',
        ],
      ),
  };
}

export function readForumProductContext(
  storage =
    resolveSessionStorage(),
) {
  const raw =
    readJson(
      storage,
      CONTEXT_KEY,
    );

  if (
    raw == null
  ) {
    return null;
  }

  try {
    return freeze({
      schema:
        FORUM_PRODUCT_CONTEXT_SCHEMA,

      siteCrabUrl:
        normalizeSite(
          raw.siteCrabUrl,
        ),

      creatorDisplay:
        clean(
          raw.creatorDisplay,
        ),

      category:
        normalizeCategory(
          raw.category ||
            'general',
        ),

      latestThreadCrabUrl:
        raw.latestThreadCrabUrl
          ? normalizePost(
              raw.latestThreadCrabUrl,
              'invalid_forum_thread_url',
            )
          : '',

      threadCrabUrls:
        normalizeThreadList(
          raw.threadCrabUrls,
        ),
    });
  } catch (_error) {
    return null;
  }
}

function normalizeThreadIntent(
  raw,
) {
  if (
    raw?.schema !==
      FORUM_THREAD_INTENT_SCHEMA
  ) {
    throw new ForumProductFlowError(
      'Forum thread intent schema is invalid.',
      'invalid_forum_thread_intent',
    );
  }

  return freeze({
    schema:
      FORUM_THREAD_INTENT_SCHEMA,

    siteCrabUrl:
      normalizeSite(
        raw.siteCrabUrl,
      ),

    creatorDisplay:
      clean(
        raw.creatorDisplay,
      ),

    category:
      normalizeCategory(
        raw.category ||
          'general',
      ),
  });
}

function normalizeReplyIntent(
  raw,
) {
  if (
    raw?.schema !==
      FORUM_REPLY_INTENT_SCHEMA
  ) {
    throw new ForumProductFlowError(
      'Forum reply intent schema is invalid.',
      'invalid_forum_reply_intent',
    );
  }

  const thread =
    normalizePost(
      raw.threadCrabUrl,
      'invalid_forum_thread_url',
    );

  const parent =
    normalizeReplyParent(
      raw.parentCrabUrl,
    );

  if (
    POST_URL_PATTERN.test(
      parent,
    ) &&
    parent !==
      thread
  ) {
    throw new ForumProductFlowError(
      'Forum direct reply Post parent must equal the thread root.',
      'forum_reply_parent_thread_mismatch',
    );
  }

  return freeze({
    schema:
      FORUM_REPLY_INTENT_SCHEMA,

    siteCrabUrl:
      normalizeSite(
        raw.siteCrabUrl,
      ),

    threadCrabUrl:
      thread,

    parentCrabUrl:
      parent,

    creatorDisplay:
      clean(
        raw.creatorDisplay,
      ),
  });
}

function normalizeSite(
  raw,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    NAMED_SITE_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumProductFlowError(
    'Forum navigation requires an exact named crab:// Site URL.',
    'invalid_forum_site_url',
  );
}

function normalizePost(
  raw,
  reason,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    POST_URL_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumProductFlowError(
    'Forum thread root must be a canonical typed Post URL.',
    reason,
  );
}

function normalizeReplyParent(
  raw,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    POST_URL_PATTERN.test(
      value,
    ) ||
    COMMENT_URL_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumProductFlowError(
    'Forum reply parent must be a canonical Post or Comment URL.',
    'invalid_forum_reply_parent_url',
  );
}

function normalizeCategory(
  raw,
) {
  const value =
    clean(
      raw,
    ).toLowerCase();

  if (
    CATEGORY_PATTERN.test(
      value,
    )
  ) {
    return value;
  }

  throw new ForumProductFlowError(
    'Forum category is invalid.',
    'invalid_forum_category',
  );
}

function normalizeThreadList(
  raw,
) {
  if (
    Array.isArray(
      raw,
    ) ===
      false
  ) {
    return [];
  }

  const output =
    [];

  for (
    const candidate
    of raw
  ) {
    let thread;

    try {
      thread =
        normalizePost(
          candidate,
          'invalid_forum_thread_url',
        );
    } catch (_error) {
      continue;
    }

    if (
      output.includes(
        thread,
      ) ===
        false
    ) {
      output.push(
        thread,
      );
    }

    if (
      output.length >=
        MAX_REMEMBERED_THREADS
    ) {
      break;
    }
  }

  return output;
}

function mergeTags(
  raw,
  additions,
) {
  const tags =
    String(
      raw ||
      '',
    )
      .split(',')
      .map(
        (tag) =>
          tag.trim(),
      )
      .filter(
        Boolean,
      );

  for (
    const addition
    of additions
  ) {
    if (
      tags.includes(
        addition,
      ) ===
        false
    ) {
      tags.push(
        addition,
      );
    }
  }

  return tags.join(
    ', ',
  );
}

function resolveSessionStorage() {
  try {
    return globalThis
      .sessionStorage ??
      null;
  } catch (_error) {
    return null;
  }
}

function readJson(
  storage,
  key,
) {
  if (
    storage == null ||
    typeof storage.getItem !==
      'function'
  ) {
    return null;
  }

  try {
    const value =
      storage.getItem(
        key,
      );

    return value
      ? JSON.parse(
          value,
        )
      : null;
  } catch (_error) {
    return null;
  }
}

function writeJson(
  storage,
  key,
  value,
) {
  if (
    storage == null ||
    typeof storage.setItem !==
      'function'
  ) {
    return;
  }

  try {
    storage.setItem(
      key,
      JSON.stringify(
        value,
      ),
    );
  } catch (_error) {
    // Optional session navigation context never becomes authority.
  }
}

function removeItem(
  storage,
  key,
) {
  if (
    storage == null ||
    typeof storage.removeItem !==
      'function'
  ) {
    return;
  }

  try {
    storage.removeItem(
      key,
    );
  } catch (_error) {
    // Optional session navigation context never becomes authority.
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

function freeze(
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
    Object.freeze(
      value,
    );

    for (
      const child
      of Object.values(
        value,
      )
    ) {
      freeze(
        child,
      );
    }
  }

  return value;
}
