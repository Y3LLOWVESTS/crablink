/**
 * RO:WHAT — React theme provider for the CrabLink full-tab browser.
 * RO:WHY — App Integration; Concerns: DX; applies one uniform light/dark/system theme across all crab:// pages.
 * RO:INTERACTS — themeStore.js, themeTokens.css, Shell, TopBar, route-owned pages.
 * RO:INVARIANTS — light mode is default; theme is local UI state only; no backend truth or secrets.
 * RO:METRICS — none.
 * RO:CONFIG — local theme mode: light, dark, or system.
 * RO:SECURITY — no PII, wallet authority, or tokens stored in theme state.
 * RO:TEST — npm run build; manual light/dark/system visual smoke.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getSystemTheme,
  readThemeMode,
  resolveThemeMode,
  subscribeSystemTheme,
  writeThemeMode,
} from './themeStore.js';

const ThemeContext = createContext(null);

export default function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => readThemeMode());
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const resolvedTheme = resolveThemeMode(mode, systemTheme);

  useEffect(() => subscribeSystemTheme(setSystemTheme), []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.dataset.themeMode = mode;
  }, [mode, resolvedTheme]);

  function setMode(nextMode) {
    setModeState(writeThemeMode(nextMode));
  }

  function toggleTheme() {
    setMode(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      systemTheme,
      setMode,
      toggleTheme,
    }),
    [mode, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
