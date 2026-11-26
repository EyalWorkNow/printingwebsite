import { JsonLd, breadcrumbLd, itemListLd, pageMeta } from "@/lib/seo";
import { localePath } from "@/i18n/config";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fromPrice, liveProducts } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { ProductCard } from "@/components/product-card";
import { getI18n, getLocale } from "@/i18n/server";

export const generateStaticParams = async () => (await getLocalizedCatalog(await getLocale())).categories.map((c) => ({ slug: c.id }));

export async function generateMetadata({ params }: PageProps<"/[lang]/c/[slug]">) {
  const { slug } = await params;
  const { lang, d } = await getI18n();
  const c = (await getLocalizedCatalog(lang)).categories.find((x) => x.id === slug);
  return c ? pageMeta(lang, `/c/${c.id}`, { title: `${c.name} — ${d.meta.titleSuffix}`, description: c.desc, image: c.image }) : {};
}

// Suspense: params are URL data — keeps client navigations instant (shell renders while the slug resolves)
export default function CategoryPage({ params }: PageProps<"/[lang]/c/[slug]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl border bg-card" />}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/[lang]/c/[slug]">["params"] }) {
  const { slug } = await params;
  const { lang, d, href } = await getI18n();
  const cat = await getLocalizedCatalog(lang);
  const c = cat.categories.find((x) => x.id === slug);
  if (!c) notFound();
  const items = liveProducts(cat).filter((p) => p.category === c.id);
  return (
    <div className="space-y-8">
      <JsonLd data={breadcrumbLd([[d.nav.home, localePath(lang, "/")], [c.name, localePath(lang, `/c/${c.id}`)]])} />
      <JsonLd data={itemListLd(items, lang)} />
      <nav aria-label={d.nav.breadcrumbs} className="text-sm text-muted-foreground"><Link href={href("/")} className="inline-block py-1.5 hover:text-foreground">{d.nav.home}</Link> / <span className="text-foreground/80">{c.name}</span></nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{c.name}</h1>
        <p className="text-muted-foreground">{c.desc}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
    </div>
  );
}
