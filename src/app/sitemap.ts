import type { MetadataRoute } from "next";
import { liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";

const site = process.env.SITE_URL ?? "http://localhost:3007";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cat = await getCatalog();
  return [
    ...["", "/products", "/faq", "/about", "/contact", "/terms", "/privacy", "/cancellation", "/accessibility"].map((p) => ({ url: `${site}${p}` })),
    ...cat.categories.map((c) => ({ url: `${site}/c/${c.id}` })),
    ...liveProducts(cat).map((p) => ({ url: `${site}/p/${p.id}`, images: p.image ? [`${site}${p.image}`] : undefined })),
  ];
}
