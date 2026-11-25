import { cacheTag } from "next/cache";
import { DEFAULT_CATALOG, fill, money, type Catalog } from "./catalog";
import type { Locale } from "@/i18n/config";
import { db, HAS_DB } from "./db";

// The live catalog: the newest row of catalog_versions in the business database (every admin save adds a row, so the
// whole history is kept), otherwise the built-in defaults.
// Cached under the "catalog" tag — the admin save action calls updateTag("catalog").
export const CATALOG_TAG = "catalog";

export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  return readCatalog();
}

/** The live catalog for a locale: translated texts + that market's prices, currency, VAT and shipping. */
export async function getLocalizedCatalog(lang: Locale): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  return localized(await readCatalog(), lang);
}

/** Pure part (also used by the chat/order API, which can't use the cache): base catalog → locale's catalog. */
export async function localized(base: Catalog, lang: Locale): Promise<Catalog> {
  const [{ DICTS, CATALOG_STRINGS }, { marketPricing }, { localizeCatalog }] = await Promise.all([import("@/i18n/dicts"), import("@/i18n/markets"), import("@/i18n/localize")]);
  const d = DICTS[lang], pricing = lang === "he" ? undefined : marketPricing(lang, base.markets?.[lang]);
  const cat = localizeCatalog(base, CATALOG_STRINGS[lang], CATALOG_STRINGS.en, d.catalog, pricing);
  const fmt = money(cat);
  for (const [id, sh] of Object.entries(cat.shipping)) sh.desc = fill(d.shipDesc[id as keyof typeof d.shipDesc] ?? sh.desc, { freeFrom: fmt(sh.freeFrom) });
  return cat;
}

/** Uncached read — for the admin editor and for saving. */
export async function readCatalog(): Promise<Catalog> {
  if (!HAS_DB) return DEFAULT_CATALOG; // ponytail: no database (e.g. a fresh deploy) → built-in catalog, read-only
  const sql = await db();
  const [row] = await sql<{ data: Catalog }[]>`select data from catalog_versions order by id desc limit 1`;
  if (!row) return DEFAULT_CATALOG;
  const saved = row.data;
  // products added to the code later still show up; saved edits win for products that exist in the saved version
  const ids = new Set(saved.products.map((p) => p.id));
  return { ...DEFAULT_CATALOG, ...saved, products: [...saved.products, ...DEFAULT_CATALOG.products.filter((p) => !ids.has(p.id))] };
}

/** Saves a new version (older versions stay in catalog_versions as history). */
export async function writeCatalog(next: Catalog) {
  const sql = await db();
  const clean = { ...next, market: undefined, t: undefined }; // never persist a localized view
  await sql`insert into catalog_versions (data) values (${sql.json(JSON.parse(JSON.stringify(clean)))})`;
}
