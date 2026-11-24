import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { readCatalog } from "@/lib/catalog-store";
import { AdminHeader } from "@/components/admin-header";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { CategoriesEditor } from "@/components/admin/categories-editor";

export const metadata = { title: "קטגוריות, ייצור ומשלוחים — דפוס", robots: { index: false } };

export default function Settings() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<p className="text-neutral-500">טוען…</p>}><Body /></Suspense>
    </main>
  );
}

async function Body() {
  await connection();
  const cat = await readCatalog();
  return <div className="space-y-6"><nav className="text-sm text-neutral-500"><Link href="/admin/catalog" className="hover:text-white">מוצרים ומחירים</Link> / <span className="text-neutral-300">קטגוריות, זמני ייצור ומשלוחים</span></nav><CategoriesEditor catalog={cat} /><SettingsEditor catalog={cat} /></div>;
}
