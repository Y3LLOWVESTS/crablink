import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_RESOURCE_MODE_STORAGE_KEY,
  TV_THEME_STORAGE_KEY,
  TV_VERIFICATION_ENABLED_STORAGE_KEY,
  describeTvResourceMode,
  readTvPreferences,
  resolveTvTheme,
  writeTvResourceMode,
  writeTvThemeMode,
  writeVerificationEnabled,
} from './tvPreferences.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(
      Object.entries(entries),
    );
  }

  getItem(key) {
    return this.values.has(key)
      ? this.values.get(key)
      : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

test('first run defaults to dark balanced participation', () => {
  assert.deepEqual(
    readTvPreferences(new MemoryStorage()),
    {
      themeMode: 'dark',
      resourceMode: 'balanced',
      verificationEnabled: true,
    },
  );
});

test('invalid stored values fail closed to safe defaults', () => {
  const storage = new MemoryStorage({
    [TV_THEME_STORAGE_KEY]: 'neon',
    [TV_RESOURCE_MODE_STORAGE_KEY]:
      'unbounded',
    [TV_VERIFICATION_ENABLED_STORAGE_KEY]:
      'unknown',
  });

  assert.deepEqual(
    readTvPreferences(storage),
    {
      themeMode: 'dark',
      resourceMode: 'balanced',
      verificationEnabled: true,
    },
  );
});

test('theme resolution follows system only in system mode', () => {
  assert.equal(
    resolveTvTheme('system', true),
    'dark',
  );

  assert.equal(
    resolveTvTheme('system', false),
    'light',
  );

  assert.equal(
    resolveTvTheme('dark', false),
    'dark',
  );
});

test('writes and rereads supported preferences', () => {
  const storage = new MemoryStorage();

  writeTvThemeMode(storage, 'light');
  writeTvResourceMode(
    storage,
    'plugged-in',
  );
  writeVerificationEnabled(
    storage,
    false,
  );

  assert.deepEqual(
    readTvPreferences(storage),
    {
      themeMode: 'light',
      resourceMode: 'plugged-in',
      verificationEnabled: false,
    },
  );
});

test('resource descriptions remain bounded and truthful', () => {
  for (const mode of [
    'low',
    'balanced',
    'plugged-in',
  ]) {
    const description =
      describeTvResourceMode(mode);

    assert.match(
      description,
      /bounded verification/i,
    );

    assert.doesNotMatch(
      description,
      /guaranteed|unlimited|confirmed ROC/i,
    );
  }
});
