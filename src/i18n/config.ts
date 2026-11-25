// Languages + markets. Hebrew lives at the site root (/p/…); every other language has its own path (/en/p/…),
// so a localized link can be sent to customers. Each language maps to one market: currency, VAT, weekend, shipping
// and a price level matched to that market (see markets.ts).
export const LOCALES = ["he", "en", "de", "fr", "es", "it", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "he";
export const isLocale = (x: unknown): x is Locale => typeof x === "string" && (LOCALES as readonly string[]).includes(x);

export const LOCALE_META: Record<Locale, { name: string; dir: "rtl" | "ltr"; intl: string; og: string; country: string }> = {
  he: { name: "עברית", dir: "rtl", intl: "he-IL", og: "he_IL", country: "IL" },
  en: { name: "English", dir: "ltr", intl: "en-US", og: "en_US", country: "US" },
  de: { name: "Deutsch", dir: "ltr", intl: "de-DE", og: "de_DE", country: "DE" },
  fr: { name: "Français", dir: "ltr", intl: "fr-FR", og: "fr_FR", country: "FR" },
  es: { name: "Español", dir: "ltr", intl: "es-ES", og: "es_ES", country: "ES" },
  it: { name: "Italiano", dir: "ltr", intl: "it-IT", og: "it_IT", country: "IT" },
  ar: { name: "العربية", dir: "rtl", intl: "ar-AE-u-nu-latn", og: "ar_AE", country: "AE" },
};

/** Site path for a locale: Hebrew has no prefix. `p` starts with "/" (may carry #hash / ?query). */
export const localePath = (l: Locale, p: string) => (l === DEFAULT_LOCALE ? p : `/${l}${p === "/" ? "" : p.startsWith("/#") ? p.slice(1) : p}`);
