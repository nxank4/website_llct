"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "llct-theme-preference";

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  
  // Đọc từ localStorage trước
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  
  // Nếu không có, dùng system preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo theme ngay từ đầu để tránh flash
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Apply theme ngay khi component mount
  useEffect(() => {
    setMounted(true);
    const initialTheme = getInitialTheme();
    setThemeState(initialTheme);
    applyThemeClass(initialTheme);
  }, []);

  // Sync theme với localStorage và DOM khi theme thay đổi
  useEffect(() => {
    if (!mounted) return;
    applyThemeClass(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, mounted]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return context;
}

