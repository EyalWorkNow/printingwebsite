import he, { type AdminDict } from "./he";
import en from "./en";
import de from "./de";
import fr from "./fr";
import es from "./es";
import it from "./it";
import ar from "./ar";
import type { Locale } from "../config";

// Admin UI language: chosen in the admin header, remembered in a cookie (independent of the shop's URL language).
export const ADMIN_DICTS: Record<Locale, AdminDict> = { he, en, de, fr, es, it, ar };
export const ADMIN_LANG_COOKIE = "dfus_admin_lang";
export type { AdminDict };

/** Sets <html lang/dir> from the cookie before paint (the admin root layout is static Hebrew/RTL). */
export const ADMIN_LANG_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${ADMIN_LANG_COOKIE}=(\\w+)/),l=m&&m[1];if(l&&/^(en|de|fr|es|it|ar)$/.test(l)){var h=document.documentElement;h.lang=l;h.dir=l==="ar"?"rtl":"ltr"}}catch(e){}})()`;
