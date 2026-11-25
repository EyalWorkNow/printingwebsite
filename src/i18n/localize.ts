import type { Catalog, CatalogText, Market, ProductionId, ShippingId, Tier } from "@/lib/catalog";

// Catalog localization: every customer-facing catalog string has a stable key; translations are flat key→text maps
// (src/i18n/catalog/<lang>.json). Missing keys (e.g. a product the admin added later) fall back to English, then Hebrew.
//   cat.<id>.name / .desc · p.<id>.name / .desc / .d<i> · o.<pid>.<oid> · v.<pid>.<oid>.<vid> · prod.<id> · ship.<id>.label / .desc
export function catalogStrings(cat: Catalog): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cat.categories) { out[`cat.${c.id}.name`] = c.name; out[`cat.${c.id}.desc`] = c.desc; }
  for (const p of cat.products) {
    out[`p.${p.id}.name`] = p.name; out[`p.${p.id}.desc`] = p.desc;
    p.details.forEach((d, i) => { out[`p.${p.id}.d${i}`] = d; });
    for (const o of p.options) {
      out[`o.${p.id}.${o.id}`] = o.title;
      for (const v of o.values) out[`v.${p.id}.${o.id}.${v.id}`] = v.title;
    }
  }
  for (const [id, v] of Object.entries(cat.production)) out[`prod.${id}`] = v.label;
  for (const [id, v] of Object.entries(cat.shipping)) { out[`ship.${id}.label`] = v.label; out[`ship.${id}.desc`] = v.desc; }
  return out;
}

/** Market pricing: catalog prices are ₪ before VAT; a market multiplies them by fx × a per-product level and
 *  replaces shipping (price/threshold in the market currency). */
export type MarketPricing = {
  market: Market;
  fx: number;                                   // ₪ → market currency
  level: number;                                // default price level vs Israel (1 = same purchasing price)
  byProduct?: Record<string, number>;           // per-product level (overrides `level`)
  shipping: Partial<Record<ShippingId, { price?: number; freeFrom?: number; days?: number; active?: boolean }>>;
  adj?: number;                                 // owner's whole-market adjustment (0.1 = +10%)
  productAdj?: Record<string, number>;          // owner's per-product adjustment
};

const scale = (t: Tier[] | undefined, k: number): Tier[] | undefined => t?.map(([f, u]) => [f, u * k]);

export function localizeCatalog(cat: Catalog, strings: Record<string, string>, fallback: Record<string, string>, t: CatalogText, pricing?: MarketPricing): Catalog {
  const s = (key: string, he: string) => strings[key] ?? fallback[key] ?? he;
  const k = (id: string) => (pricing ? pricing.fx * (pricing.byProduct?.[id] ?? pricing.level) * (1 + (pricing.adj ?? 0)) * (1 + (pricing.productAdj?.[id] ?? 0)) : 1);
  return {
    categories: cat.categories.map((c) => ({ ...c, name: s(`cat.${c.id}.name`, c.name), desc: s(`cat.${c.id}.desc`, c.desc) })),
    products: cat.products.map((p) => ({
      ...p,
      name: s(`p.${p.id}.name`, p.name), desc: s(`p.${p.id}.desc`, p.desc),
      details: p.details.map((d, i) => s(`p.${p.id}.d${i}`, d)),
      base: scale(p.base, k(p.id))!, setup: p.setup && p.setup * k(p.id),
      options: p.options.map((o) => ({
        ...o, title: s(`o.${p.id}.${o.id}`, o.title),
        values: o.values.map((v) => ({ ...v, title: s(`v.${p.id}.${o.id}.${v.id}`, v.title), tiers: scale(v.tiers, k(p.id)) })),
      })),
    })),
    production: Object.fromEntries(Object.entries(cat.production).map(([id, v]) => [id, { ...v, label: s(`prod.${id}`, v.label) }])) as Catalog["production"],
    shipping: Object.fromEntries(Object.entries(cat.shipping).map(([id, v]) => {
      const o = pricing?.shipping[id as ShippingId];
      return [id, { ...v, label: s(`ship.${id}.label`, v.label), desc: s(`ship.${id}.desc`, v.desc), ...(o ?? {}), active: v.active === false ? false : o?.active ?? v.active }];
    })) as Catalog["shipping"],
    market: pricing?.market ?? cat.market,
    t,
  };
}

export type { ProductionId };
