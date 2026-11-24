"use server";

import { headers } from "next/headers";
import { updateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { DEFAULT_CATALOG, PRODUCTION_IDS, SHIPPING_IDS, catalogErrors, mergeProductEdit, type Catalog, type Product, type Production, type Shipping } from "@/lib/catalog";
import { readCatalog, writeCatalog, CATALOG_TAG } from "@/lib/catalog-store";

type Result = { ok: true } | { ok: false; errors: string[] };

// actions are reachable outside the proxy matcher — re-verify auth in every one
async function guard() {
  if (!isAdmin((await headers()).get("authorization"))) throw new Error("unauthorized");
}

async function commit(next: Catalog): Promise<Result> {
  const errors = catalogErrors(next);
  if (errors.length) return { ok: false, errors };
  await writeCatalog(next);
  updateTag(CATALOG_TAG); // site, cart and AI chat see the new prices on the next request
  return { ok: true };
}

export async function saveProduct(edit: Product): Promise<Result> {
  await guard();
  const cat = await readCatalog();
  const cur = cat.products.find((p) => p.id === edit?.id);
  if (!cur) return { ok: false, errors: ["מוצר לא נמצא"] };
  return commit({ ...cat, products: cat.products.map((p) => (p.id === cur.id ? mergeProductEdit(cur, edit) : p)) });
}

export async function resetProduct(id: string): Promise<Result> {
  await guard();
  const cat = await readCatalog();
  const def = DEFAULT_CATALOG.products.find((p) => p.id === id);
  if (!def) return { ok: false, errors: ["מוצר לא נמצא"] };
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
