import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  readTvPreferences,
  resolveTvTheme,
  writeTvResourceMode,
  writeTvThemeMode,
  writeVerificationEnabled,
} from './tvPreferences.js';

const SYSTEM_THEME_QUERY =
  '(prefers-color-scheme: dark)';

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function getSystemDark() {
  try {
    return (
      globalThis.matchMedia?.(
        SYSTEM_THEME_QUERY,
      )?.matches ?? false
    );
  } catch {
    return false;
  }
}

export function useTvPreferences() {
  const [preferences, setPreferences] =
    useState(() =>
      readTvPreferences(getStorage()),
    );

  const [systemDark, setSystemDark] =
    useState(getSystemDark);

  useEffect(() => {
    const mediaQuery =
      globalThis.matchMedia?.(
        SYSTEM_THEME_QUERY,
      );

    if (!mediaQuery) {
      return undefined;
    }

    function handleSystemTheme(event) {
      setSystemDark(Boolean(event.matches));
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener(
        'change',
        handleSystemTheme,
      );

      return () => {
        mediaQuery.removeEventListener(
          'change',
          handleSystemTheme,
        );
      };
    }

    mediaQuery.addListener?.(
      handleSystemTheme,
    );

    return () => {
      mediaQuery.removeListener?.(
        handleSystemTheme,
      );
    };
  }, []);

  const resolvedTheme = resolveTvTheme(
    preferences.themeMode,
    systemDark,
  );

  useEffect(() => {
    document.documentElement.dataset.themeMode =
      preferences.themeMode;

    document.documentElement.dataset.theme =
      resolvedTheme;

    document.documentElement.style.colorScheme =
      resolvedTheme;
  }, [
    preferences.themeMode,
    resolvedTheme,
  ]);

  const setThemeMode = useCallback(
    (nextMode) => {
      const themeMode = writeTvThemeMode(
        getStorage(),
        nextMode,
      );

      setPreferences((current) => ({
        ...current,
        themeMode,
      }));
    },
    [],
  );

  const setResourceMode = useCallback(
    (nextMode) => {
      const resourceMode =
        writeTvResourceMode(
          getStorage(),
          nextMode,
        );

      setPreferences((current) => ({
        ...current,
        resourceMode,
      }));
    },
    [],
  );

  const setVerificationEnabled =
    useCallback((nextValue) => {
      const verificationEnabled =
        writeVerificationEnabled(
          getStorage(),
          nextValue,
        );

      setPreferences((current) => ({
        ...current,
        verificationEnabled,
      }));
    }, []);

  return {
    preferences: {
      ...preferences,
      resolvedTheme,
      systemDark,
    },
    setThemeMode,
    setResourceMode,
    setVerificationEnabled,
  };
}
