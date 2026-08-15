import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

const postPublishFlowUrl =
  new URL(
    '../post/PostPublishFlow.jsx',
    import.meta.url,
  );

async function readPostPublishFlow() {
  return readFile(
    postPublishFlowUrl,
    'utf8',
  );
}

test(
  'phase15a3b Forum thread recording occurs only after existing backend Post publish succeeds',
  async () => {
    const source =
      await readPostPublishFlow();

    const publishIndex =
      source.indexOf(
        'const response = await postClient.publishPost',
      );

    const dataIndex =
      source.indexOf(
        'const data = firstObject(response?.data, response);',
        publishIndex,
      );

    const urlIndex =
      source.indexOf(
        'const crabUrl = extractPostAssetUrl(data);',
        dataIndex,
      );

    const rememberIndex =
      source.indexOf(
        'rememberPublishedForumThread',
        urlIndex,
      );

    assert.equal(
      publishIndex >=
        0,
      true,
    );

    assert.equal(
      dataIndex >
        publishIndex,
      true,
    );

    assert.equal(
      urlIndex >
        dataIndex,
      true,
    );

    assert.equal(
      rememberIndex >
        urlIndex,
      true,
    );
  },
);

test(
  'phase15a3b Forum mode requires exact active Site context plus Forum draft tag',
  async () => {
    const source =
      await readPostPublishFlow();

    assert.equal(
      source.includes(
        'readForumProductContext',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'forumContext.siteCrabUrl ===',
      ),
      true,
    );

    assert.equal(
      source.includes(
        ".includes(\n        'forum'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        'const forumThreadMode',
      ),
      true,
    );
  },
);

test(
  'phase15a3b successful Forum recording suppresses normal delayed Post auto-open',
  async () => {
    const source =
      await readPostPublishFlow();

    assert.equal(
      source.includes(
        'forumThread ===\n          null',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'window.setTimeout',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'Forum thread ready:',
      ),
      true,
    );
  },
);

test(
  'phase15a3b Reply to Thread uses existing Comment workspace with exact published Post root',
  async () => {
    const source =
      await readPostPublishFlow();

    assert.equal(
      source.includes(
        'Reply to Thread',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'beginForumReplyIntent',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'parentCrabUrl:\n            threadCrabUrl',
      ),
      true,
    );

    assert.equal(
      source.includes(
        "app.navigate(\n          'crab://comment'",
      ),
      true,
    );
  },
);

test(
  'phase15a3b Forum reply handoff clears delayed Post navigation timer before navigation',
  async () => {
    const source =
      await readPostPublishFlow();

    const handlerIndex =
      source.indexOf(
        'function replyToPublishedForumThread()',
      );

    const clearIndex =
      source.indexOf(
        'window.clearTimeout',
        handlerIndex,
      );

    const intentIndex =
      source.indexOf(
        'beginForumReplyIntent',
        handlerIndex,
      );

    const navigateIndex =
      source.indexOf(
        "'crab://comment'",
        handlerIndex,
      );

    assert.equal(
      handlerIndex >=
        0,
      true,
    );

    assert.equal(
      clearIndex >
        handlerIndex,
      true,
    );

    assert.equal(
      intentIndex >
        clearIndex,
      true,
    );

    assert.equal(
      navigateIndex >
        intentIndex,
      true,
    );
  },
);

test(
  'phase15a3b keeps existing Post publisher and adds no Forum backend publication route',
  async () => {
    const source =
      await readPostPublishFlow();

    assert.equal(
      source.includes(
        "route: '/assets/post'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        '/forum/',
      ),
      false,
    );

    assert.equal(
      source.includes(
        'postClient.publishPost',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'createForumPublisher',
      ),
      false,
    );
  },
);
