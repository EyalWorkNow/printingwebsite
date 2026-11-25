import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { findProduct, fromPrice, liveProducts, money, num } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { ProductWizard } from "@/components/product-wizard";
import { ProductCard } from "@/components/product-card";
import { getI18n, getLocale } from "@/i18n/server";

export const generateStaticParams = async () => liveProducts(await getLocalizedCatalog(await getLocale())).map((p) => ({ slug: p.id }));

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">) {
  const { slug } = await params;
  const { lang, d, f } = await getI18n();
  const cat = await getLocalizedCatalog(lang);
  const p = findProduct(cat, slug);
  return p ? { title: `${p.name} — ${d.meta.titleSuffix}`, description: f(d.product.metaDesc, { desc: p.desc, price: money(cat)(fromPrice(cat, p)), vatShort: d.vat.short }) } : {};
}

// Suspense: params are URL data — keeps client navigations instant (shell renders while the slug resolves)
export default function ProductPage({ params }: PageProps<"/[lang]/p/[slug]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl border bg-card" />}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/[lang]/p/[slug]">["params"] }) {
  const { slug } = await params;
  const { lang, d, href, f } = await getI18n();
  const cat = await getLocalizedCatalog(lang);
  const p = liveProducts(cat).find((x) => x.id === slug);
  if (!p) notFound();
  const c = cat.categories.find((x) => x.id === p.category)!;
  const more = liveProducts(cat).filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  return (
    <div className="space-y-10">
      <nav aria-label={d.nav.breadcrumbs} className="text-sm text-muted-foreground">
        <Link href={href("/")} className="inline-block py-1.5 hover:text-foreground">{d.nav.home}</Link> / <Link href={href(`/c/${c.id}`)} className="inline-block py-1.5 hover:text-foreground">{c.name}</Link> / <span className="text-foreground/80">{p.name}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{p.name}</h1>
        <p className="text-muted-foreground">{f(d.product.summary, { desc: p.desc, price: money(cat)(fromPrice(cat, p)), vatShort: d.vat.short, min: num(cat, p.qty.min) })}</p>
      </header>
      <ProductWizard productId={p.id} />
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{d.product.details}</h2>
        <ul className="grid gap-2 text-sm text-foreground/80 sm:grid-cols-2">{p.details.map((x) => <li key={x} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{x}</li>)}</ul>
      </section>
      {more.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">{f(d.product.moreIn, { category: c.name })}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{more.map((x) => <li key={x.id}><ProductCard p={x} from={fromPrice(cat, x)} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
