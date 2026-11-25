import { lang as rootLang } from "next/root-params";
import { DEFAULT_LOCALE, LOCALE_META, isLocale, localePath, type Locale } from "./config";
import { DICTS, type Dict } from "./dicts";
import { fill } from "@/lib/catalog";

/** Current locale from the [lang] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const l = await rootLang();
  return isLocale(l) ? l : DEFAULT_LOCALE;
}

export type I18n = { lang: Locale; d: Dict; dir: "rtl" | "ltr"; href: (p: string) => string; f: typeof fill };
export const i18nFor = (lang: Locale): I18n => ({ lang, d: DICTS[lang], dir: LOCALE_META[lang].dir, href: (p) => localePath(lang, p), f: fill });
export const getI18n = async () => i18nFor(await getLocale());
