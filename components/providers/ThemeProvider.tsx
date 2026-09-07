"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyTheme, getPreferredTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start from the same fixed value the server rendered ("light",
  // since the server has no DOM/localStorage to read). ThemeScript already
  // sets the *real* theme on <html> before hydration to avoid a flash, but
  // seeding this state from that already-mutated DOM here would make the
  // client's first render diverge from the server's and trigger a hydration
  // mismatch. The effect below corrects `theme` to the real value right
  // after mount instead, which is a normal state update, not a hydration diff.
  const [theme, setThemeState] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial =
      document.documentElement.dataset.theme === "dark" || document.documentElement.dataset.theme === "light"
        ? (document.documentElement.dataset.theme as Theme)
        : getPreferredTheme();
    applyTheme(initial);
    setThemeState(initial);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      const next: Theme = event.matches ? "dark" : "light";
      applyTheme(next);
      setThemeState(next);
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      ready,
      setTheme(next) {
        applyTheme(next);
        setThemeState(next);
      },
      toggleTheme() {
        const next: Theme = theme === "dark" ? "light" : "dark";
        applyTheme(next);
        setThemeState(next);
      }
    }),
    [theme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
