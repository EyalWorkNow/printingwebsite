import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { readCatalog } from "@/lib/catalog-store";
import { AdminHeader } from "@/components/admin-header";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { CategoriesEditor } from "@/components/admin/categories-editor";
import { Spinner } from "@/components/admin/common";
import { adminI18n } from "@/i18n/admin/server";

export default function Settings() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="catalog" />
      <Suspense fallback={<Spinner />}><Body /></Suspense>
    </main>
  );
}

async function Body() {
  await connection();
  const [cat, { t }] = await Promise.all([readCatalog(), adminI18n()]);
  return <div className="space-y-6"><nav className="text-sm text-muted-foreground"><Link href="/admin/catalog" className="inline-block py-1.5 hover:text-foreground">{t.nav.catalog}</Link> / <span className="text-foreground/80">{t.settings.breadcrumb}</span></nav><CategoriesEditor catalog={cat} /><SettingsEditor catalog={cat} /></div>;
}
