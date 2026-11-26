import { SITE_URL } from "@/lib/env";
import type { MetadataRoute } from "next";
import { liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { DEFAULT_LOCALE, LOCALES, localePath } from "@/i18n/config";
import { hreflang } from "@/lib/seo";

const site = SITE_URL;

// Every page in every language, each with hreflang alternates to its translations.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cat = await getCatalog();
  const paths = [
    "/", "/products", "/faq", "/about", "/contact", "/terms", "/privacy", "/cancellation", "/accessibility",
    ...cat.categories.map((c) => `/c/${c.id}`),
    ...liveProducts(cat).map((p) => `/p/${p.id}`),
  ];
  const languages = (p: string) => ({ ...Object.fromEntries(LOCALES.map((l) => [hreflang(l), `${site}${localePath(l, p)}`])), "x-default": `${site}${localePath(DEFAULT_LOCALE, p)}` });
  // product/category photos listed with their page (Google Images)
  const image = (p: string) => {
    const id = p.split("/")[2], src = p.startsWith("/p/") ? cat.products.find((x) => x.id === id)?.image : p.startsWith("/c/") ? cat.categories.find((x) => x.id === id)?.image : undefined;
    return src ? [`${site}${src}`] : undefined;
  };
  const priority = (p: string) => (p === "/" ? 1 : p === "/products" || p.startsWith("/c/") ? 0.9 : p.startsWith("/p/") ? 0.8 : 0.4);
  return paths.flatMap((p) => LOCALES.map((l) => ({ url: `${site}${localePath(l, p)}`, alternates: { languages: languages(p) }, images: image(p), priority: priority(p), changeFrequency: p.startsWith("/p/") || p.startsWith("/c/") ? "weekly" as const : "monthly" as const })));
}
