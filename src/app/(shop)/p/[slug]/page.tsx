import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { findProduct, fromPrice, ils, liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { ProductWizard } from "@/components/product-wizard";
import { ProductCard } from "@/components/product-card";

export const generateStaticParams = async () => liveProducts(await getCatalog()).map((p) => ({ slug: p.id }));

export async function generateMetadata({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const cat = await getCatalog();
  const p = findProduct(cat, slug);
  return p ? { title: `${p.name} — דפוס`, description: `${p.desc}. החל מ־${ils(fromPrice(cat, p))} ליח׳ כולל מע״מ.` } : {};
}

// Suspense: params are URL data — keeps client navigations instant (shell renders while the slug resolves)
export default function ProductPage({ params }: PageProps<"/p/[slug]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl border bg-card" />}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const { slug } = await params;
  const cat = await getCatalog();
  const p = liveProducts(cat).find((x) => x.id === slug);
  if (!p) notFound();
  const c = cat.categories.find((x) => x.id === p.category)!;
  const more = liveProducts(cat).filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  return (
    <div className="space-y-10">
      <nav aria-label="פירורי לחם" className="text-sm text-muted-foreground">
        <Link href="/" className="inline-block py-1.5 hover:text-foreground">דף הבית</Link> / <Link href={`/c/${c.id}`} className="inline-block py-1.5 hover:text-foreground">{c.name}</Link> / <span className="text-foreground/80">{p.name}</span>
      </nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{p.name}</h1>
        <p className="text-muted-foreground">{p.desc} · החל מ־{ils(fromPrice(cat, p))} ליח׳ כולל מע״מ · מינימום {p.qty.min.toLocaleString("he-IL")} יח׳</p>
      </header>
      <ProductWizard productId={p.id} />
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">פרטים על המוצר</h2>
        <ul className="grid gap-2 text-sm text-foreground/80 sm:grid-cols-2">{p.details.map((d) => <li key={d} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{d}</li>)}</ul>
      </section>
      {more.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">עוד ב{c.name}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{more.map((x) => <li key={x.id}><ProductCard p={x} from={fromPrice(cat, x)} /></li>)}</ul>
        </section>
      )}
    </div>
  );
}
