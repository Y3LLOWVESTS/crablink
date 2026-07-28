import assert from 'node:assert/strict';
import test from 'node:test';

import { createCatalogPort } from '../index.js';

test('catalog port exposes exactly one immutable read method', () => {
  const readCatalog = async () => ({ state: 'ready' });
  const port = createCatalogPort({
    readCatalog,
    hiddenAuthority: async () => true,
  });

  assert.deepEqual(Object.keys(port), ['readCatalog']);
  assert.equal(Object.isFrozen(port), true);
  assert.equal(port.readCatalog, readCatalog);
  assert.equal(port.hiddenAuthority, undefined);
});

test('catalog port fails closed when readCatalog is absent', () => {
  assert.throws(
    () => createCatalogPort({}),
    /catalog port requires readCatalog/,
  );
});

test('catalog port construction performs no read', () => {
  let calls = 0;
  createCatalogPort({
    readCatalog: async () => {
      calls += 1;
      return { state: 'ready' };
    },
  });
  assert.equal(calls, 0);
});

test('catalog port preserves adapter results without inventing success', async () => {
  const expected = Object.freeze({
    state: 'unavailable',
    reason: 'gateway_unavailable',
  });
  const port = createCatalogPort({ readCatalog: async () => expected });
  assert.equal(await port.readCatalog(), expected);
});

test('catalog port preserves adapter errors', async () => {
  const expectedError = new Error('catalog transport failed');
  const port = createCatalogPort({
    readCatalog: async () => {
      throw expectedError;
    },
  });
  await assert.rejects(
    port.readCatalog(),
    (error) => error === expectedError,
  );
});
