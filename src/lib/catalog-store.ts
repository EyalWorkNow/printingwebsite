import { cacheTag } from "next/cache";
import { DEFAULT_CATALOG, fill, money, type Catalog } from "./catalog";
import type { Locale } from "@/i18n/config";
import { read, write, writeJson } from "./storage";

// The live catalog: catalog.json in storage (Blob or data/) if the admin saved one, otherwise the built-in defaults.
// Cached under the "catalog" tag — the admin save action calls updateTag("catalog").
const FILE = "catalog.json";
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
  const [{ DICTS, CATALOG_STRINGS }, { MARKETS }, { localizeCatalog }] = await Promise.all([import("@/i18n/dicts"), import("@/i18n/markets"), import("@/i18n/localize")]);
  const d = DICTS[lang], pricing = lang === "he" ? undefined : MARKETS[lang];
  const cat = localizeCatalog(base, CATALOG_STRINGS[lang], CATALOG_STRINGS.en, d.catalog, pricing);
  const fmt = money(cat);
  for (const [id, sh] of Object.entries(cat.shipping)) sh.desc = fill(d.shipDesc[id as keyof typeof d.shipDesc] ?? sh.desc, { freeFrom: fmt(sh.freeFrom) });
  return cat;
}

/** Uncached read — for the admin editor and for saving. */
export async function readCatalog(): Promise<Catalog> {
  const raw = await read(FILE);
  if (!raw) return DEFAULT_CATALOG;
  const saved = JSON.parse(raw.toString("utf8")) as Catalog;
  // products added to the code later still show up; saved edits win for products that exist in the file
  const ids = new Set(saved.products.map((p) => p.id));
  return { ...DEFAULT_CATALOG, ...saved, products: [...saved.products, ...DEFAULT_CATALOG.products.filter((p) => !ids.has(p.id))] };
}

let chain = Promise.resolve(); // ponytail: in-process lock; two admins saving at the same second on different instances → last write wins
export async function writeCatalog(next: Catalog) {
  const job = chain.then(async () => {
    const prev = await read(FILE);
    if (prev) await write(`catalog-history/${new Date().toISOString().replace(/[:.]/g, "-")}.json`, prev, { contentType: "application/json" }); // every save keeps the previous version
    await writeJson(FILE, next);
  });
  chain = job.catch(() => {});
  await job;
}
