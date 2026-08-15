import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  DEFAULT_COMMENT_DRAFT,
} from '../comment/commentDraftModel.js';

import {
  DEFAULT_POST_DRAFT,
} from '../post/postDraftModel.js';

import {
  FORUM_PRODUCT_CONTEXT_SCHEMA,
  FORUM_REPLY_INTENT_SCHEMA,
  FORUM_THREAD_INTENT_SCHEMA,
  ForumProductFlowError,
  applyForumReplyIntent,
  applyForumThreadIntent,
  beginForumReplyIntent,
  beginForumThreadIntent,
  consumeForumReplyIntent,
  consumeForumThreadIntent,
  readForumProductContext,
  rememberPublishedForumThread,
} from './forumProductFlow.js';

const SITE =
  'crab://rusty-forum';

const OTHER_SITE =
  'crab://other-forum';

const POST_A =
  `crab://${'a'.repeat(64)}.post`;

const POST_B =
  `crab://${'b'.repeat(64)}.post`;

const COMMENT_A =
  `crab://${'c'.repeat(64)}.comment`;

const IMAGE_A =
  `crab://${'d'.repeat(64)}.image`;

class MemorySessionStorage {
  constructor() {
    this.values =
      new Map();
  }

  getItem(
    key,
  ) {
    return this.values.has(
      key,
    )
      ? this.values.get(
          key,
        )
      : null;
  }

  setItem(
    key,
    value,
  ) {
    this.values.set(
      key,
      String(
        value,
      ),
    );
  }

  removeItem(
    key,
  ) {
    this.values.delete(
      key,
    );
  }

  clear() {
    this.values.clear();
  }
}

function storage() {
  return new MemorySessionStorage();
}

test(
  'phase15a3a locks Forum product navigation schemas',
  () => {
    assert.equal(
      FORUM_PRODUCT_CONTEXT_SCHEMA,
      'crablink.forum-product-context.v1',
    );

    assert.equal(
      FORUM_THREAD_INTENT_SCHEMA,
      'crablink.forum-thread-intent.v1',
    );

    assert.equal(
      FORUM_REPLY_INTENT_SCHEMA,
      'crablink.forum-reply-intent.v1',
    );
  },
);

test(
  'phase15a3a Forum thread intent is one-shot while product context remains',
  () => {
    const memory =
      storage();

    beginForumThreadIntent(
      {
        siteCrabUrl:
          SITE,

        creatorDisplay:
          '@alice',

        category:
          'development',
      },
      memory,
    );

    const intent =
      consumeForumThreadIntent(
        memory,
      );

    assert.equal(
      intent.siteCrabUrl,
      SITE,
    );

    assert.equal(
      intent.category,
      'development',
    );

    assert.equal(
      consumeForumThreadIntent(
        memory,
      ),
      null,
    );

    assert.equal(
      readForumProductContext(
        memory,
      ).siteCrabUrl,
      SITE,
    );
  },
);

test(
  'phase15a3a remote path-like and invalid Forum Site contexts fail closed',
  () => {
    for (
      const invalid
      of [
        'https://example.com',
        'crab://rusty-forum/path',
        'crab://',
      ]
    ) {
      assert.throws(
        () =>
          beginForumThreadIntent(
            {
              siteCrabUrl:
                invalid,
            },
            storage(),
          ),

        (
          error,
        ) => {
          assert.equal(
            error instanceof
              ForumProductFlowError,
            true,
          );

          assert.equal(
            error.reason,
            'invalid_forum_site_url',
          );

          return true;
        },
      );
    }
  },
);

test(
  'phase15a3a Forum thread intent prefills existing Post draft without creating new publication fields',
  () => {
    const memory =
      storage();

    const intent =
      beginForumThreadIntent(
        {
          siteCrabUrl:
            SITE,

          creatorDisplay:
            '@alice',

          category:
            'development',
        },
        memory,
      );

    const draft =
      applyForumThreadIntent(
        DEFAULT_POST_DRAFT,
        intent,
      );

    assert.equal(
      draft.siteContextCrabUrl,
      SITE,
    );

    assert.equal(
      draft.creatorDisplay,
      '@alice',
    );

    assert.equal(
      draft.tags.includes(
        'forum',
      ),
      true,
    );

    assert.equal(
      draft.tags.includes(
        'forum-category:development',
      ),
      true,
    );

    assert.equal(
      Object.hasOwn(
        draft,
        'forumThreadId',
      ),
      false,
    );
  },
);

test(
  'phase15a3a only canonical backend-shaped Post URLs can be remembered as Forum threads',
  () => {
    const memory =
      storage();

    beginForumThreadIntent(
      {
        siteCrabUrl:
          SITE,
      },
      memory,
    );

    rememberPublishedForumThread(
      {
        siteCrabUrl:
          SITE,

        threadCrabUrl:
          POST_A,
      },
      memory,
    );

    rememberPublishedForumThread(
      {
        siteCrabUrl:
          SITE,

        threadCrabUrl:
          POST_B,
      },
      memory,
    );

    rememberPublishedForumThread(
      {
        siteCrabUrl:
          SITE,

        threadCrabUrl:
          POST_A,
      },
      memory,
    );

    const context =
      readForumProductContext(
        memory,
      );

    assert.equal(
      context.latestThreadCrabUrl,
      POST_A,
    );

    assert.deepEqual(
      context.threadCrabUrls,
      [
        POST_A,
        POST_B,
      ],
    );

    assert.throws(
      () =>
        rememberPublishedForumThread(
          {
            siteCrabUrl:
              SITE,

            threadCrabUrl:
              IMAGE_A,
          },
          memory,
        ),

      (
        error,
      ) =>
        error.reason ===
          'invalid_forum_thread_url',
    );
  },
);

test(
  'phase15a3a direct Forum reply intent carries exact Site Post root and parent',
  () => {
    const memory =
      storage();

    beginForumThreadIntent(
      {
        siteCrabUrl:
          SITE,

        creatorDisplay:
          '@alice',
      },
      memory,
    );

    const intent =
      beginForumReplyIntent(
        {
          siteCrabUrl:
            SITE,

          threadCrabUrl:
            POST_A,

          parentCrabUrl:
            POST_A,
        },
        memory,
      );

    assert.equal(
      intent.siteCrabUrl,
      SITE,
    );

    assert.equal(
      intent.threadCrabUrl,
      POST_A,
    );

    assert.equal(
      intent.parentCrabUrl,
      POST_A,
    );

    assert.equal(
      intent.creatorDisplay,
      '@alice',
    );
  },
);

test(
  'phase15a3a nested Forum reply may parent a Comment while retaining Post thread root',
  () => {
    const intent =
      beginForumReplyIntent(
        {
          siteCrabUrl:
            SITE,

          threadCrabUrl:
            POST_A,

          parentCrabUrl:
            COMMENT_A,
        },
        storage(),
      );

    assert.equal(
      intent.parentCrabUrl,
      COMMENT_A,
    );

    assert.equal(
      intent.threadCrabUrl,
      POST_A,
    );
  },
);

test(
  'phase15a3a Forum reply intent rejects non-Post thread roots and unsupported parents',
  () => {
    assert.throws(
      () =>
        beginForumReplyIntent(
          {
            siteCrabUrl:
              SITE,

            threadCrabUrl:
              IMAGE_A,

            parentCrabUrl:
              IMAGE_A,
          },
          storage(),
        ),

      (
        error,
      ) =>
        error.reason ===
          'invalid_forum_thread_url',
    );

    assert.throws(
      () =>
        beginForumReplyIntent(
          {
            siteCrabUrl:
              SITE,

            threadCrabUrl:
              POST_A,

            parentCrabUrl:
              IMAGE_A,
          },
          storage(),
        ),

      (
        error,
      ) =>
        error.reason ===
          'invalid_forum_reply_parent_url',
    );
  },
);

test(
  'phase15a3a Forum reply intent becomes a complete existing Comment context draft',
  () => {
    const memory =
      storage();

    const intent =
      beginForumReplyIntent(
        {
          siteCrabUrl:
            SITE,

          threadCrabUrl:
            POST_A,

          parentCrabUrl:
            COMMENT_A,

          creatorDisplay:
            '@alice',
        },
        memory,
      );

    const consumed =
      consumeForumReplyIntent(
        memory,
      );

    const draft =
      applyForumReplyIntent(
        DEFAULT_COMMENT_DRAFT,
        consumed,
      );

    assert.equal(
      draft.siteContextCrabUrl,
      SITE,
    );

    assert.equal(
      draft.threadContextCrabUrl,
      POST_A,
    );

    assert.equal(
      draft.parentCrabUrl,
      COMMENT_A,
    );

    assert.equal(
      draft.creatorDisplay,
      '@alice',
    );

    assert.equal(
      draft.tags.includes(
        'forum-reply',
      ),
      true,
    );

    assert.equal(
      consumeForumReplyIntent(
        memory,
      ),
      null,
    );
  },
);

test(
  'phase15a3a active Forum Site context prevents cross-Site reply handoff',
  () => {
    const memory =
      storage();

    beginForumThreadIntent(
      {
        siteCrabUrl:
          SITE,
      },
      memory,
    );

    assert.throws(
      () =>
        beginForumReplyIntent(
          {
            siteCrabUrl:
              OTHER_SITE,

            threadCrabUrl:
              POST_A,

            parentCrabUrl:
              POST_A,
          },
          memory,
        ),

      (
        error,
      ) =>
        error.reason ===
          'forum_site_context_mismatch',
    );
  },
);

test(
  'phase15a3a Post workspace consumes Forum thread intent through existing draft authority',
  async () => {
    const source =
      await readFile(
        new URL(
          '../post/PostPage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'consumeForumThreadIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'applyForumThreadIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'initialDraft,',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/forum/post',
      ),
      false,
    );
  },
);

test(
  'phase15a3a Comment workspace layers Forum reply intent after existing Blog and Imageboard context',
  async () => {
    const source =
      await readFile(
        new URL(
          '../comment/CommentPage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'consumeForumReplyIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'applyForumReplyIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'imageboardInitialDraft',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'forumInitialDraft',
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/forum/comment',
      ),
      false,
    );
  },
);
