import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fromPrice, liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { ProductCard } from "@/components/product-card";

export const generateStaticParams = async () => (await getCatalog()).categories.map((c) => ({ slug: c.id }));

export async function generateMetadata({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const c = (await getCatalog()).categories.find((x) => x.id === slug);
  return c ? { title: `${c.name} — דפוס`, description: c.desc } : {};
}

// Suspense: params are URL data — keeps client navigations instant (shell renders while the slug resolves)
export default function CategoryPage({ params }: PageProps<"/c/[slug]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl border bg-card" />}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  const cat = await getCatalog();
  const c = cat.categories.find((x) => x.id === slug);
  if (!c) notFound();
  const items = liveProducts(cat).filter((p) => p.category === c.id);
  return (
    <div className="space-y-8">
      <nav aria-label="פירורי לחם" className="text-sm text-muted-foreground"><Link href="/" className="inline-block py-1.5 hover:text-foreground">דף הבית</Link> / <span className="text-foreground/80">{c.name}</span></nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{c.name}</h1>
        <p className="text-muted-foreground">{c.desc}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
    </div>
  );
}
