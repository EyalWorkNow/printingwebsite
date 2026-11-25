import type { MetadataRoute } from "next";
import { liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { LOCALES, localePath } from "@/i18n/config";

const site = process.env.SITE_URL ?? "http://localhost:3007";

// Every page in every language, each with hreflang alternates to its translations.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cat = await getCatalog();
  const paths = [
    "/", "/products", "/faq", "/about", "/contact", "/terms", "/privacy", "/cancellation", "/accessibility",
    ...cat.categories.map((c) => `/c/${c.id}`),
    ...liveProducts(cat).map((p) => `/p/${p.id}`),
  ];
  const languages = (p: string) => Object.fromEntries(LOCALES.map((l) => [l, `${site}${localePath(l, p)}`]));
  return paths.flatMap((p) => LOCALES.map((l) => ({ url: `${site}${localePath(l, p)}`, alternates: { languages: languages(p) } })));
}
