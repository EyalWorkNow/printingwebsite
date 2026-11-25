import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_META, isLocale } from "../config";
import { ADMIN_DICTS, ADMIN_LANG_COOKIE } from "./index";

/** Admin language from the cookie (Hebrew by default). Dynamic — call inside a Suspense boundary. */
export async function adminI18n() {
  const c = (await cookies()).get(ADMIN_LANG_COOKIE)?.value;
  const lang = isLocale(c) ? c : DEFAULT_LOCALE;
  return { lang, t: ADMIN_DICTS[lang], intl: LOCALE_META[lang].intl, dir: LOCALE_META[lang].dir };
}
