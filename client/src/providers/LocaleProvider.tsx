"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { getDictionary, getStoredLocale, setStoredLocale, type Locale, type Dictionary } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  dictionary: Dictionary | null;
  isLoading: boolean;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      return getStoredLocale();
    }
    return "vi";
  });
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dictionary when locale changes
  useEffect(() => {
    let mounted = true;

    const loadDictionary = async () => {
      setIsLoading(true);
      try {
        const dict = await getDictionary(locale);
        if (mounted) {
          setDictionary(dict);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load dictionary:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadDictionary();

    return () => {
      mounted = false;
    };
  }, [locale]);

  // Update document lang attribute
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Set locale and persist to localStorage
  const setLocale = useCallback(async (newLocale: Locale) => {
    setLocaleState(newLocale);
    setStoredLocale(newLocale);
    // Dictionary will be loaded by the useEffect above
  }, []);

  // Translation function with nested key support (e.g., "common.save" -> dictionary.common.save)
  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (!dictionary) {
        return fallback || key;
      }

      const keys = key.split(".");
      let value: unknown = dictionary;

      for (const k of keys) {
        if (value && typeof value === "object" && value !== null && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return fallback || key;
        }
      }

      return typeof value === "string" ? value : fallback || key;
    },
    [dictionary]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      dictionary,
      isLoading,
      t,
    }),
    [locale, setLocale, dictionary, isLoading, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

