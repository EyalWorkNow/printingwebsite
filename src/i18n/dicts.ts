import type { Locale } from "./config";
import type { Dict } from "./dict/he";
import he from "./dict/he";
import en from "./dict/en";
import de from "./dict/de";
import fr from "./dict/fr";
import es from "./dict/es";
import it from "./dict/it";
import ar from "./dict/ar";
import heCat from "./catalog/he.json";
import enCat from "./catalog/en.json";
import deCat from "./catalog/de.json";
import frCat from "./catalog/fr.json";
import esCat from "./catalog/es.json";
import itCat from "./catalog/it.json";
import arCat from "./catalog/ar.json";

// All dictionaries are bundled server-side (small); client components receive only their locale's dictionary.
export const DICTS: Record<Locale, Dict> = { he, en, de, fr, es, it, ar };
export const CATALOG_STRINGS: Record<Locale, Record<string, string>> = { he: heCat, en: enCat, de: deCat, fr: frCat, es: esCat, it: itCat, ar: arCat };
export type { Dict };
