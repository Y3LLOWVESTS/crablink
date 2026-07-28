/**
 * RO:WHAT — Safe local persistence adapter for CrabLink's redacted onboarding state.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; first-run progress must survive restart without persisting secret material.
 * RO:INTERACTS — onboardingModel.js, WebView localStorage, memory fallback, future route gate and reset UI.
 * RO:INVARIANTS — exact onboarding DTO only; corrupted or unknown state fails back to welcome; no backend, wallet, ledger, or Passport authority.
 * RO:METRICS — none.
 * RO:CONFIG — storage key crablink.onboarding.v1.
 * RO:SECURITY — PINs, seed words, roots, keys, VMKs, capabilities, and platform sealer material are rejected by the model before serialization.
 * RO:TEST — onboardingStorage.test.mjs.
 */

import {
  assertSafeOnboardingState,
  createInitialOnboardingState,
  validateOnboardingState,
} from './onboardingModel.js';

export const ONBOARDING_STORAGE_KEY =
  'crablink.onboarding.v1';

const memoryFallbackStorage = new Map();

export function createOnboardingStorageAdapter({
  storage = createDefaultOnboardingStorage(),
  storageKey = ONBOARDING_STORAGE_KEY,
} = {}) {
  const safeStorage =
    requireStorageBackend(storage);

  const safeStorageKey =
    requireStorageKey(storageKey);

  async function readOnboardingState({
    now,
  } = {}) {
    const raw = safeStorage.getItem(
      safeStorageKey,
    );

    if (
      raw === null ||
      raw === undefined ||
      raw === ''
    ) {
      return migrateAbsentState({ now });
    }

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      return recoverCorruptedState({ now });
    }

    const validation =
      validateOnboardingState(parsed);

    if (!validation.ok) {
      return recoverCorruptedState({ now });
    }

    return cloneSafeState(parsed);
  }

  async function writeOnboardingState(
    state,
  ) {
    const safeState = cloneSafeState(state);

    safeStorage.setItem(
      safeStorageKey,
      JSON.stringify(safeState),
    );

    return cloneSafeState(safeState);
  }

  async function clearOnboardingState() {
    safeStorage.removeItem(safeStorageKey);

    return Object.freeze({
      ok: true,
      cleared: true,
      storageKey: safeStorageKey,
    });
  }

  async function resetOnboardingState({
    now,
  } = {}) {
    safeStorage.removeItem(safeStorageKey);

    const initial =
      createInitialOnboardingState({
        now,
      });

    return writeOnboardingState(initial);
  }

  async function migrateAbsentState({
    now,
  } = {}) {
    const initial =
      createInitialOnboardingState({
        now,
      });

    return writeOnboardingState(initial);
  }

  async function recoverCorruptedState({
    now,
  } = {}) {
    safeStorage.removeItem(safeStorageKey);

    const initial =
      createInitialOnboardingState({
        now,
      });

    return writeOnboardingState(initial);
  }

  return Object.freeze({
    storageKey: safeStorageKey,
    readOnboardingState,
    writeOnboardingState,
    clearOnboardingState,
    resetOnboardingState,
  });
}

export const onboardingStorage =
  createOnboardingStorageAdapter();

export function readOnboardingState(
  options,
) {
  return onboardingStorage.readOnboardingState(
    options,
  );
}

export function writeOnboardingState(
  state,
) {
  return onboardingStorage.writeOnboardingState(
    state,
  );
}

export function clearOnboardingState() {
  return onboardingStorage.clearOnboardingState();
}

export function resetOnboardingState(
  options,
) {
  return onboardingStorage.resetOnboardingState(
    options,
  );
}

function createDefaultOnboardingStorage() {
  return Object.freeze({
    getItem(key) {
      const localStorage =
        getBrowserLocalStorage();

      if (localStorage) {
        try {
          const value =
            localStorage.getItem(key);

          if (value !== null) {
            return value;
          }
        } catch (_error) {
          // The memory fallback remains available when WebView storage is blocked.
        }
      }

      return memoryFallbackStorage.has(key)
        ? memoryFallbackStorage.get(key)
        : null;
    },

    setItem(key, value) {
      const serialized = String(value);
      const localStorage =
        getBrowserLocalStorage();

      let storedInBrowser = false;

      if (localStorage) {
        try {
          localStorage.setItem(
            key,
            serialized,
          );

          storedInBrowser = true;
        } catch (_error) {
          // The memory fallback preserves the redacted state for this process.
        }
      }

      if (!storedInBrowser) {
        memoryFallbackStorage.set(
          key,
          serialized,
        );
      } else {
        memoryFallbackStorage.delete(key);
      }
    },

    removeItem(key) {
      const localStorage =
        getBrowserLocalStorage();

      if (localStorage) {
        try {
          localStorage.removeItem(key);
        } catch (_error) {
          // Continue clearing the process-local fallback.
        }
      }

      memoryFallbackStorage.delete(key);
    },
  });
}

function getBrowserLocalStorage() {
  try {
    const storage =
      globalThis.localStorage;

    if (
      storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function'
    ) {
      return storage;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function requireStorageBackend(storage) {
  if (
    !storage ||
    typeof storage !== 'object' ||
    typeof storage.getItem !== 'function' ||
    typeof storage.setItem !== 'function' ||
    typeof storage.removeItem !== 'function'
  ) {
    throw new TypeError(
      'Onboarding storage requires getItem, setItem, and removeItem.',
    );
  }

  return storage;
}

function requireStorageKey(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new TypeError(
      'Onboarding storage key must be non-empty text.',
    );
  }

  return value.trim();
}

function cloneSafeState(state) {
  assertSafeOnboardingState(state);

  const clone = JSON.parse(
    JSON.stringify(state),
  );

  assertSafeOnboardingState(clone);

  return Object.freeze(clone);
}
