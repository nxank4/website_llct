/**
 * Internationalization utilities
 * Supports dynamic imports for code splitting and optimal performance
 */

export type Locale = "vi" | "en";

export const DEFAULT_LOCALE: Locale = "vi";
export const SUPPORTED_LOCALES: Locale[] = ["vi", "en"];

export const LOCALE_NAMES: Record<Locale, string> = {
  vi: "Tiếng Việt",
  en: "English",
};

// Dictionary type - will be inferred from JSON files
export type Dictionary = typeof import("@/locales/vi.json");

// Cache for loaded dictionaries to avoid re-importing
const dictionaryCache: Partial<Record<Locale, Dictionary>> = {};

/**
 * Get dictionary for a specific locale
 * Uses dynamic imports for code splitting - only loads the dictionary when needed
 * Caches loaded dictionaries for performance
 */
export async function getDictionary(locale: Locale = DEFAULT_LOCALE): Promise<Dictionary> {
  // Return cached dictionary if available
  if (dictionaryCache[locale]) {
    return dictionaryCache[locale]!;
  }

  // Validate locale
  const validLocale: Locale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;

  try {
    // Dynamic import for code splitting
    const dictionary = await import(`@/locales/${validLocale}.json`);
    dictionaryCache[validLocale] = dictionary.default as Dictionary;
    return dictionary.default as Dictionary;
  } catch (error) {
    console.error(`Failed to load dictionary for locale: ${validLocale}`, error);
    // Fallback to default locale
    if (validLocale !== DEFAULT_LOCALE) {
      return getDictionary(DEFAULT_LOCALE);
    }
    // If default locale also fails, return empty object
    return {} as Dictionary;
  }
}

/**
 * Get dictionary synchronously (for client-side use with pre-loaded dictionaries)
 * This is used when dictionary is already loaded in context
 */
export function getDictionarySync(
  locale: Locale,
  dictionaries: Partial<Record<Locale, Dictionary>>
): Dictionary {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE] || ({} as Dictionary);
}

/**
 * Get locale from localStorage or browser preferences
 */
export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = window.localStorage.getItem("preferred-locale");
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Try to detect from browser
  if (typeof navigator !== "undefined") {
    const browserLang = navigator.language.split("-")[0];
    if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
      return browserLang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Store locale preference
 */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("preferred-locale", locale);
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

