import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPublicationPort,
} from '../index.js';

test(
  'phase6c1 publication port exposes exactly two immutable reads',
  () => {
    const listCreatorPublications =
      async () => ({
        schema:
          'crablink.publication-page.v1',
      });

    const getCreatorPublication =
      async () => ({
        schema:
          'crablink.publication-summary.v1',
      });

    const port =
      createPublicationPort({
        listCreatorPublications,
        getCreatorPublication,
        publish:
          async () => undefined,
        follow:
          async () => undefined,
      });

    assert.deepEqual(
      Object.keys(port),
      [
        'listCreatorPublications',
        'getCreatorPublication',
      ],
    );

    assert.equal(
      port.listCreatorPublications,
      listCreatorPublications,
    );

    assert.equal(
      port.getCreatorPublication,
      getCreatorPublication,
    );

    assert.equal(
      Object.isFrozen(port),
      true,
    );

    assert.equal(
      port.publish,
      undefined,
    );

    assert.equal(
      port.follow,
      undefined,
    );
  },
);

test(
  'phase6c1 publication port fails closed when either read is absent',
  () => {
    assert.throws(
      () =>
        createPublicationPort({
          listCreatorPublications:
            async () => undefined,
        }),
      /publication port requires getCreatorPublication/,
    );

    assert.throws(
      () =>
        createPublicationPort({
          getCreatorPublication:
            async () => undefined,
        }),
      /publication port requires listCreatorPublications/,
    );
  },
);

test(
  'phase6c1 publication port construction performs no reads',
  () => {
    let calls = 0;

    createPublicationPort({
      listCreatorPublications:
        async () => {
          calls += 1;
        },
      getCreatorPublication:
        async () => {
          calls += 1;
        },
    });

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  'phase6c1 publication port preserves adapter results and errors',
  async () => {
    const page =
      Object.freeze({
        schema:
          'crablink.publication-page.v1',
        items: Object.freeze([]),
        nextCursor: null,
        hasMore: false,
      });

    const expectedError =
      new Error(
        'publication transport failed',
      );

    const port =
      createPublicationPort({
        listCreatorPublications:
          async () => page,
        getCreatorPublication:
          async () => {
            throw expectedError;
          },
      });

    assert.equal(
      await port.listCreatorPublications(),
      page,
    );

    await assert.rejects(
      port.getCreatorPublication(),
      (error) =>
        error === expectedError,
    );
  },
);
