import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_IMAGE_DRAFT,
} from '../image/imageDraftModel.js';

import {
  DEFAULT_COMMENT_DRAFT,
  buildCommentManifestDraft,
  getCommentCompleteness,
} from '../comment/commentDraftModel.js';

import {
  IMAGEBOARD_PRODUCT_CONTEXT_SCHEMA,
  IMAGEBOARD_REPLY_INTENT_SCHEMA,
  IMAGEBOARD_THREAD_INTENT_SCHEMA,
  applyImageboardReplyIntent,
  applyImageboardThreadIntent,
  beginImageboardReplyIntent,
  beginImageboardThreadIntent,
  consumeImageboardReplyIntent,
  consumeImageboardThreadIntent,
  readImageboardProductContext,
  rememberPublishedImageboardThread,
} from './imageboardProductFlow.js';

const SITE =
  'crab://picture-board';

const IMAGE_A =
  `crab://${'a'.repeat(64)}.image`;

const IMAGE_B =
  `crab://${'b'.repeat(64)}.image`;

const VIDEO_A =
  `crab://${'c'.repeat(64)}.video`;

const CONTENT_A =
  `b3:${'d'.repeat(64)}`;

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

globalThis.sessionStorage =
  new MemorySessionStorage();

test.beforeEach(
  () => {
    globalThis
      .sessionStorage
      .clear();
  },
);

test(
  'Phase 14A3 locks Imageboard product navigation schemas',
  () => {
    assert.equal(
      IMAGEBOARD_PRODUCT_CONTEXT_SCHEMA,
      'crablink.imageboard-product-context.v1',
    );

    assert.equal(
      IMAGEBOARD_THREAD_INTENT_SCHEMA,
      'crablink.imageboard-thread-intent.v1',
    );

    assert.equal(
      IMAGEBOARD_REPLY_INTENT_SCHEMA,
      'crablink.imageboard-reply-intent.v1',
    );
  },
);

test(
  'Phase 14A3 thread intent remembers named Imageboard context',
  () => {
    const intent =
      beginImageboardThreadIntent({
        siteCrabUrl:
          SITE,

        creatorDisplay:
          '@alice',

        category:
          'art',
      });

    assert.equal(
      intent.siteCrabUrl,
      SITE,
    );

    assert.equal(
      intent.category,
      'art',
    );

    assert.equal(
      readImageboardProductContext()
        .siteCrabUrl,
      SITE,
    );
  },
);

test(
  'Phase 14A3 thread intent is one-shot while board context remains',
  () => {
    beginImageboardThreadIntent({
      siteCrabUrl:
        SITE,
    });

    assert.equal(
      consumeImageboardThreadIntent()
        .siteCrabUrl,
      SITE,
    );

    assert.equal(
      consumeImageboardThreadIntent(),
      null,
    );

    assert.equal(
      readImageboardProductContext()
        .siteCrabUrl,
      SITE,
    );
  },
);

test(
  'Phase 14A3 remote or path-like board contexts fail closed',
  () => {
    for (
      const siteCrabUrl
      of [
        'https://example.com',
        'crab://picture-board/thread',
        'crab://',
      ]
    ) {
      assert.throws(
        () =>
          beginImageboardThreadIntent({
            siteCrabUrl,
          }),
      );
    }
  },
);

test(
  'Phase 14A3 Image workspace prefill uses existing linkedSiteCrabUrl field',
  () => {
    const intent =
      beginImageboardThreadIntent({
        siteCrabUrl:
          SITE,

        creatorDisplay:
          '@alice',

        category:
          'photography',
      });

    const draft =
      applyImageboardThreadIntent(
        DEFAULT_IMAGE_DRAFT,
        intent,
      );

    assert.equal(
      draft.linkedSiteCrabUrl,
      SITE,
    );

    assert.equal(
      draft.creatorDisplay,
      '@alice',
    );

    assert.equal(
      draft.tags.includes(
        'imageboard',
      ),
      true,
    );

    assert.equal(
      draft.tags.includes(
        'board:photography',
      ),
      true,
    );
  },
);

test(
  'Phase 14A3 only canonical backend-shaped Image URLs are remembered as threads',
  () => {
    const first =
      rememberPublishedImageboardThread({
        siteCrabUrl:
          SITE,

        imageCrabUrl:
          IMAGE_A,

        contentCid:
          CONTENT_A,
      });

    assert.equal(
      first.imageCrabUrl,
      IMAGE_A,
    );

    assert.equal(
      first.contentCid,
      CONTENT_A,
    );

    assert.throws(
      () =>
        rememberPublishedImageboardThread({
          siteCrabUrl:
            SITE,

          imageCrabUrl:
            VIDEO_A,
        }),
    );
  },
);

test(
  'Phase 14A3 remembered Imageboard threads dedupe canonically',
  () => {
    rememberPublishedImageboardThread({
      siteCrabUrl:
        SITE,

      imageCrabUrl:
        IMAGE_A,
    });

    rememberPublishedImageboardThread({
      siteCrabUrl:
        SITE,

      imageCrabUrl:
        IMAGE_B,
    });

    rememberPublishedImageboardThread({
      siteCrabUrl:
        SITE,

      imageCrabUrl:
        IMAGE_A,
    });

    assert.deepEqual(
      readImageboardProductContext()
        .threads
        .map(
          (thread) =>
            thread.imageCrabUrl,
        ),
      [
        IMAGE_A,
        IMAGE_B,
      ],
    );
  },
);

test(
  'Phase 14A3 reply intent carries named board and typed Image root',
  () => {
    beginImageboardThreadIntent({
      siteCrabUrl:
        SITE,
    });

    const intent =
      beginImageboardReplyIntent({
        siteCrabUrl:
          SITE,

        imageCrabUrl:
          IMAGE_A,

        creatorDisplay:
          '@alice',
      });

    assert.equal(
      intent.imageCrabUrl,
      IMAGE_A,
    );

    assert.equal(
      consumeImageboardReplyIntent()
        .siteCrabUrl,
      SITE,
    );

    assert.equal(
      consumeImageboardReplyIntent(),
      null,
    );
  },
);

test(
  'Phase 14A3 reply intent rejects non-Image thread roots',
  () => {
    assert.throws(
      () =>
        beginImageboardReplyIntent({
          siteCrabUrl:
            SITE,

          imageCrabUrl:
            VIDEO_A,
        }),
    );
  },
);

test(
  'Phase 14A3 Imageboard reply prefill becomes a complete Comment draft',
  () => {
    const draft =
      applyImageboardReplyIntent(
        {
          ...DEFAULT_COMMENT_DRAFT,

          body:
            'Reply to the image thread.',

          creatorDisplay:
            '@alice',
        },
        {
          schema:
            IMAGEBOARD_REPLY_INTENT_SCHEMA,

          siteCrabUrl:
            SITE,

          imageCrabUrl:
            IMAGE_A,

          creatorDisplay:
            '@alice',
        },
      );

    assert.equal(
      draft.parentCrabUrl,
      IMAGE_A,
    );

    assert.equal(
      draft.threadContextCrabUrl,
      IMAGE_A,
    );

    assert.equal(
      getCommentCompleteness(
        draft,
      ),
      100,
    );

    assert.equal(
      buildCommentManifestDraft(
        draft,
      )
        .linked_assets
        .parent_crab_url,
      IMAGE_A,
    );
  },
);

test(
  'Phase 14A3 non-reviewed Video parent still fails Comment completeness',
  () => {
    const completeness =
      getCommentCompleteness({
        ...DEFAULT_COMMENT_DRAFT,

        body:
          'Reply',

        creatorDisplay:
          '@alice',

        siteContextCrabUrl:
          SITE,

        parentCrabUrl:
          VIDEO_A,
      });

    assert.notEqual(
      completeness,
      100,
    );
  },
);

test(
  'Phase 14A3 Site workspace uses only existing Image route for thread creation',
  async () => {
    const source =
      await readFile(
        new URL(
          './SitePage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'beginImageboardThreadIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "'crab://image'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/imageboard/publish',
      ),
      false,
    );
  },
);

test(
  'Phase 14A3 Image publish flow remembers only backend-returned original and exposes Comment handoff',
  async () => {
    const source =
      await readFile(
        new URL(
          '../image/ImagePublishFlow.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      source.includes(
        'extractImageAssetUrl',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'rememberPublishedImageboardThread',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'originalCrabUrl',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'Reply to Thread',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "'crab://comment'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/imageboard/',
      ),
      false,
    );
  },
);

test(
  'Phase 14A3 Comment workspace consumes Imageboard intent and labels Image parents honestly',
  async () => {
    const page =
      await readFile(
        new URL(
          '../comment/CommentPage.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    const draft =
      await readFile(
        new URL(
          '../comment/CommentDraft.jsx',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      page.includes(
        'consumeImageboardReplyIntent',
      ),
      true,
    );

    assert.equal(
      page.includes(
        'applyImageboardReplyIntent',
      ),
      true,
    );

    assert.equal(
      draft.includes(
        'Parent image/article/post/comment crab URL',
      ),
      true,
    );
  },
);
