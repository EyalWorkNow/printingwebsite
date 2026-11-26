import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, localePath, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dicts";
import { fromPrice, type Catalog, type Category, type Product } from "./catalog";
import { BUSINESS } from "./content";
import { SITE_URL } from "./env";

// SEO in one place: per-page metadata (canonical + hreflang + Open Graph + Twitter) and schema.org JSON-LD.
// Every language is its own market (currency/VAT), so hreflang uses language-COUNTRY codes; x-default = Hebrew.

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);
export const hreflang = (l: Locale) => `${l}-${LOCALE_META[l].country}`;
const DEFAULT_IMAGE = "/img/set-flatlay.webp";

/** Metadata for one page. `path` is the language-neutral path ("/", "/p/mug"). */
export function pageMeta(lang: Locale, path: string, m: { title: string; description?: string; image?: string; noindex?: boolean; type?: "website" | "article" }): Metadata {
  const d = DICTS[lang], url = localePath(lang, path), images = [{ url: m.image ?? DEFAULT_IMAGE, alt: m.title }];
  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical: url,
      languages: { ...Object.fromEntries(LOCALES.map((l) => [hreflang(l), localePath(l, path)])), "x-default": localePath(DEFAULT_LOCALE, path) },
    },
    openGraph: {
      type: m.type ?? "website", url, title: m.title, description: m.description, siteName: d.meta.brand, images,
      locale: LOCALE_META[lang].og, alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => LOCALE_META[l].og),
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: images.map((i) => i.url) },
    robots: m.noindex ? { index: false, follow: true } : undefined,
  };
}

/** <script type="application/ld+json"> — "<" escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const ORG = `${SITE_URL}/#org`;
const ctx = (graph: object[]) => ({ "@context": "https://schema.org", "@graph": graph });

/** Business + website (every shop page). Contact fields appear once they're filled in lib/content.ts. */
export function siteLd(lang: Locale) {
  const d = DICTS[lang];
  return ctx([
    {
      "@type": "OnlineStore", "@id": ORG, name: d.meta.brand, alternateName: BUSINESS.brand, url: abs("/"), logo: abs("/icon.svg"),
      description: d.meta.description, image: abs(DEFAULT_IMAGE),
      ...(BUSINESS.legalName && { legalName: BUSINESS.legalName }),
      ...(BUSINESS.email && { email: BUSINESS.email }),
      ...(BUSINESS.phone && { telephone: BUSINESS.phone }),
      ...(BUSINESS.address && { address: { "@type": "PostalAddress", streetAddress: BUSINESS.address, addressCountry: "IL" } }),
      ...(BUSINESS.companyId && { vatID: BUSINESS.companyId }),
    },
    { "@type": "WebSite", "@id": `${abs(localePath(lang, "/"))}#website`, url: abs(localePath(lang, "/")), name: d.meta.brand, description: d.meta.description, inLanguage: hreflang(lang), publisher: { "@id": ORG } },
  ]);
}

export function breadcrumbLd(items: [name: string, path: string][]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })) };
}

/** Product with its lowest unit price (incl. local tax) as an AggregateOffer in the market's currency. */
export function productLd(cat: Catalog, p: Product, lang: Locale, c?: Category) {
  const url = abs(localePath(lang, `/p/${p.id}`)), low = fromPrice(cat, p);
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`, sku: p.id, name: p.name, description: p.desc, url,
    ...(p.image && { image: [abs(p.image)] }),
    ...(c && { category: c.name }),
    brand: { "@type": "Brand", name: DICTS[lang].meta.brand },
    ...(low > 0 && {
      offers: {
        "@type": "AggregateOffer", priceCurrency: cat.market?.currency ?? "ILS", lowPrice: low, offerCount: p.qty.presets.length,
        availability: "https://schema.org/InStock", itemCondition: "https://schema.org/NewCondition", url, seller: { "@id": ORG },
      },
    }),
  };
}

export function itemListLd(products: Product[], lang: Locale) {
  return {
    "@context": "https://schema.org", "@type": "ItemList", numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: abs(localePath(lang, `/p/${p.id}`)), name: p.name })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) };
}
