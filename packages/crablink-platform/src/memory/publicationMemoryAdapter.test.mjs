import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryPublicationAdapter,
} from './index.js';

function pageFixture() {
  return {
    schema:
      'crablink.publication-page.v1',
    items: [
      {
        schema:
          'crablink.publication-summary.v1',
        publicationId:
          'publication-001',
        creator: {
          username:
            'rusty_crab',
        },
      },
    ],
    nextCursor:
      'p_00000001',
    hasMore:
      true,
  };
}

test(
  'phase6c1 memory publication adapter defaults to empty public reads',
  async () => {
    const adapter =
      createMemoryPublicationAdapter();

    assert.deepEqual(
      await adapter.listCreatorPublications({
        username:
          'rusty_crab',
      }),
      {
        schema:
          'crablink.publication-page.v1',
        items: [],
        nextCursor: null,
        hasMore: false,
      },
    );

    assert.equal(
      await adapter.getCreatorPublication({
        username:
          'rusty_crab',
        publicationId:
          'missing',
      }),
      null,
    );
  },
);

test(
  'phase6c1 memory publication fixtures are immutable and isolated',
  async () => {
    const page =
      pageFixture();

    const detail =
      page.items[0];

    const adapter =
      createMemoryPublicationAdapter({
        pages: {
          rusty_crab:
            page,
        },
        publications: {
          'rusty_crab/publication-001':
            detail,
        },
      });

    page.items[0].publicationId =
      'caller-mutated';

    detail.creator.username =
      'caller_mutated';

    const readPage =
      await adapter.listCreatorPublications({
        username:
          'rusty_crab',
        limit:
          20,
      });

    const readDetail =
      await adapter.getCreatorPublication({
        username:
          'rusty_crab',
        publicationId:
          'publication-001',
      });

    assert.equal(
      readPage.items[0].publicationId,
      'publication-001',
    );

    assert.equal(
      readDetail.creator.username,
      'rusty_crab',
    );

    assert.equal(
      Object.isFrozen(readPage),
      true,
    );

    assert.equal(
      Object.isFrozen(readPage.items),
      true,
    );

    assert.equal(
      Object.isFrozen(readDetail),
      true,
    );
  },
);

test(
  'phase6c1 memory publication adapter isolates creators and details',
  async () => {
    const adapter =
      createMemoryPublicationAdapter({
        pages: {
          rusty_crab:
            pageFixture(),
        },
        publications: {
          'rusty_crab/publication-001':
            pageFixture().items[0],
        },
      });

    const otherPage =
      await adapter.listCreatorPublications({
        username:
          'other_crab',
      });

    const otherDetail =
      await adapter.getCreatorPublication({
        username:
          'other_crab',
        publicationId:
          'publication-001',
      });

    assert.equal(
      otherPage.items.length,
      0,
    );

    assert.equal(
      otherDetail,
      null,
    );
  },
);

test(
  'phase6c1 memory publication requests fail closed when malformed',
  async () => {
    const adapter =
      createMemoryPublicationAdapter();

    await assert.rejects(
      adapter.listCreatorPublications({
        username:
          '../rusty_crab',
      }),
      /publication username is invalid/,
    );

    await assert.rejects(
      adapter.listCreatorPublications({
        username:
          'rusty_crab',
        limit:
          51,
      }),
      /publication limit/,
    );

    await assert.rejects(
      adapter.getCreatorPublication({
        username:
          'rusty_crab',
        publicationId:
          'bad%id',
      }),
      /publication identifier is invalid/,
    );
  },
);

test(
  'phase6c1 memory publication adapter exposes no mutation authority',
  () => {
    const adapter =
      createMemoryPublicationAdapter();

    assert.deepEqual(
      Object.keys(adapter),
      [
        'listCreatorPublications',
        'getCreatorPublication',
      ],
    );

    assert.equal(
      adapter.publish,
      undefined,
    );

    assert.equal(
      adapter.follow,
      undefined,
    );

    assert.equal(
      adapter.unlockPaidContent,
      undefined,
    );
  },
);
