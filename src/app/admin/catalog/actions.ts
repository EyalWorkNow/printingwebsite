"use server";

import { updateTag } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { DEFAULT_CATALOG, PRODUCTION_IDS, SHIPPING_IDS, MOCKUPS, catalogErrors, fill, mergeProductEdit, newProduct, isId, isImage, type Catalog, type Category, type MarketAdjust, type Mockup, type Product, type Production, type Shipping } from "@/lib/catalog";
import { LOCALES } from "@/i18n/config";
import { adminI18n } from "@/i18n/admin/server";
import { readCatalog, writeCatalog, CATALOG_TAG } from "@/lib/catalog-store";

type Result = { ok: true; id?: string } | { ok: false; errors: string[] };

// actions are reachable outside the proxy matcher — re-verify auth in every one
async function guard() {
  if (!await isAdmin()) throw new Error("unauthorized");
  return (await adminI18n()).t.errors;
}

async function commit(next: Catalog): Promise<Result> {
  const errors = catalogErrors(next, (await adminI18n()).t.errors);
  if (errors.length) return { ok: false, errors };
  await writeCatalog(next);
  updateTag(CATALOG_TAG); // site, cart and AI chat see the new prices on the next request
  return { ok: true };
}

export async function saveProduct(edit: Product): Promise<Result> {
  const E = await guard();
  const cat = await readCatalog();
  const cur = cat.products.find((p) => p.id === edit?.id);
  if (!cur) return { ok: false, errors: [E.productNotFound] };
  return commit({ ...cat, products: cat.products.map((p) => (p.id === cur.id ? mergeProductEdit(cur, edit) : p)) });
}

export async function resetProduct(id: string): Promise<Result> {
  const E = await guard();
  const cat = await readCatalog();
  const def = DEFAULT_CATALOG.products.find((p) => p.id === id);
  if (!def) return { ok: false, errors: [E.productNotFound] };
  return commit({ ...cat, products: cat.products.map((p) => (p.id === id ? def : p)) });
}

export async function saveSettings(production: Record<string, Production>, shipping: Record<string, Shipping>): Promise<Result> {
  await guard();
  const cat = await readCatalog();
  const n = (x: unknown) => Number(x);
  const s = (x: unknown, max: number) => String(x ?? "").slice(0, max);
  return commit({
    ...cat,
    production: Object.fromEntries(PRODUCTION_IDS.map((id) => [id, { label: s(production?.[id]?.label, 20), days: n(production?.[id]?.days), pct: n(production?.[id]?.pct) }])) as Catalog["production"],
    shipping: Object.fromEntries(SHIPPING_IDS.map((id) => { const x = shipping?.[id]; return [id, { label: s(x?.label, 30), desc: s(x?.desc, 80), price: n(x?.price), days: n(x?.days), freeFrom: n(x?.freeFrom), active: x?.active !== false }]; })) as Catalog["shipping"],
  });
}

/** New blank product, or a copy of `from`. Starts hidden so it can be finished before customers see it. */
export async function createProduct(input: { id: string; name: string; category: string; mockup: string; from?: string }): Promise<Result> {
  const E = await guard();
  const cat = await readCatalog();
  const id = String(input?.id ?? "").trim().toLowerCase();
  if (!isId(id)) return { ok: false, errors: [E.badId] };
  if (cat.products.some((p) => p.id === id)) return { ok: false, errors: [fill(E.idTaken, { id })] };
  const src = input.from ? cat.products.find((p) => p.id === input.from) : undefined;
  const name = String(input?.name ?? "").trim().slice(0, 80);
  const p: Product = src
    ? { ...structuredClone(src), id, name: name || `${src.name} (copy)`, active: false }
    : newProduct(id, name, String(input.category), (MOCKUPS.some(([m]) => m === input.mockup) ? input.mockup : "card") as Mockup);
  const r = await commit({ ...cat, products: [...cat.products, p] });
  return r.ok ? { ok: true, id } : r;
}

/** Only products added in the admin can be deleted — built-in ones can be hidden instead. */
export async function deleteProduct(id: string): Promise<Result> {
  const E = await guard();
  if (DEFAULT_CATALOG.products.some((p) => p.id === id)) return { ok: false, errors: [E.builtinDelete] };
  const cat = await readCatalog();
  return commit({ ...cat, products: cat.products.filter((p) => p.id !== id) });
}

export async function saveCategories(list: Category[]): Promise<Result> {
  const E = await guard();
  const cat = await readCatalog();
  const categories = (Array.isArray(list) ? list.slice(0, 20) : []).map((c) => ({
    id: String(c?.id ?? "").trim().toLowerCase(), name: String(c?.name ?? "").trim().slice(0, 40), desc: String(c?.desc ?? "").trim().slice(0, 160),
    ...(isImage(c?.image) ? { image: c.image } : {}),
  }));
  if (new Set(categories.map((c) => c.id)).size !== categories.length) return { ok: false, errors: [E.dupCategory] };
  return commit({ ...cat, categories });
}

/** Owner's adjustments for one market (shop language): exchange rate, whole-market %, per-product % (fractions: 0.1 = +10%). */
export async function saveMarket(lang: string, adj: MarketAdjust): Promise<Result> {
  const E = await guard();
  const ok = (x: unknown, lo: number, hi: number) => typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi;
  if (lang === "he" || !LOCALES.includes(lang as never)) return { ok: false, errors: [E.badMarket] };
  const cat = await readCatalog();
  const products: Record<string, number> = {};
  for (const [id, v] of Object.entries(adj?.products ?? {})) {
    if (!cat.products.some((p) => p.id === id) || !ok(v, -0.9, 5)) return { ok: false, errors: [E.badMarket] };
    if (v) products[id] = v;
  }
  if ((adj?.fx !== undefined && !ok(adj.fx, 0.0001, 1000)) || (adj?.adj !== undefined && !ok(adj.adj, -0.9, 5))) return { ok: false, errors: [E.badMarket] };
  const clean: MarketAdjust = { ...(adj.fx ? { fx: adj.fx } : {}), ...(adj.adj ? { adj: adj.adj } : {}), ...(Object.keys(products).length ? { products } : {}) };
  return commit({ ...cat, markets: { ...cat.markets, [lang]: clean } });
}
