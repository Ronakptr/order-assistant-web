import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCompanyScopedItem,
  migrateLegacyCompanyScopedItem,
  setCompanyScopedItem,
} from "../utils/companyScopedStorage";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "order-assistant-theme";

function readStoredTheme() {
  return (
    getCompanyScopedItem(THEME_STORAGE_KEY) ||
    migrateLegacyCompanyScopedItem(THEME_STORAGE_KEY) ||
    "light"
  );
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    setCompanyScopedItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);

    window.dispatchEvent(
      new CustomEvent("order-assistant-theme-updated", {
        detail: { theme },
      })
    );
  }, [theme]);

  useEffect(() => {
    const handleAuthChanged = () => {
      setTheme(readStoredTheme());
    };

    window.addEventListener("oa-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("oa-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () =>
        setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
