import { Suspense } from "react";
import { connection } from "next/server";
import { readCatalog } from "@/lib/catalog-store";
import { AdminHeader } from "@/components/admin-header";
import { SettingsEditor } from "@/components/admin/settings-editor";

export const metadata = { title: "ייצור ומשלוחים — דפוס", robots: { index: false } };

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
  return <SettingsEditor catalog={await readCatalog()} />;
}
