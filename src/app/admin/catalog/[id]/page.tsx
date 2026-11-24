import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { readCatalog } from "@/lib/catalog-store";
import { AdminHeader } from "@/components/admin-header";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "עריכת מוצר — דפוס", robots: { index: false } };

export default function EditProduct({ params }: PageProps<"/admin/catalog/[id]">) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}><Body params={params} /></Suspense>
    </main>
  );
}

async function Body({ params }: { params: PageProps<"/admin/catalog/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const cat = await readCatalog();
  if (!cat.products.some((p) => p.id === id)) notFound();
  return <ProductEditor catalog={cat} id={id} />;
}
