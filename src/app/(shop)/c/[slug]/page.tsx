import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";

export const generateStaticParams = () => CATEGORIES.map((c) => ({ slug: c.id }));

export async function generateMetadata({ params }: PageProps<"/c/[slug]">) {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.id === slug);
  return c ? { title: `${c.name} — דפוס`, description: c.desc } : {};
}

// Suspense: params are URL data — keeps client navigations instant (shell renders while the slug resolves)
export default function CategoryPage({ params }: PageProps<"/c/[slug]">) {
  return <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl border bg-neutral-950" />}><Body params={params} /></Suspense>;
}

async function Body({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  const c = CATEGORIES.find((x) => x.id === slug);
  if (!c) notFound();
  const items = PRODUCTS.filter((p) => p.category === c.id);
  return (
    <div className="space-y-8">
      <nav aria-label="פירורי לחם" className="text-sm text-neutral-500"><Link href="/" className="hover:text-white">דף הבית</Link> / <span className="text-neutral-300">{c.name}</span></nav>
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{c.name}</h1>
        <p className="text-neutral-400">{c.desc}</p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p.id}><ProductCard p={p} /></li>)}</ul>
    </div>
  );
}
