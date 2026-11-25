"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { MOCKUPS, type Category } from "@/lib/catalog";
import { createProduct } from "@/app/admin/catalog/actions";
import { GlowCard } from "@/components/glow-card";
import { fill } from "@/lib/catalog";
import { useAdmin } from "@/i18n/admin/client";

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-foreground/50";

export function NewProduct({ categories }: { categories: Category[] }) {
  const { t } = useAdmin();
  const T = t.newProduct;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", id: "", category: categories[0]?.id ?? "", mockup: "card" });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: k === "id" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") : e.target.value });

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"><Plus className="h-4 w-4" /> {T.open}</button>;
  return (
    <GlowCard className="h-auto" inner="space-y-4">
      <h2 className="font-semibold">{T.title}</h2>
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await createProduct(f);
        if (r.ok) router.push(`/admin/catalog/${r.id}`); else setErrors(r.errors);
      }); }}>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.name}</span><input required value={f.name} onChange={set("name")} className={input} placeholder={T.namePh} /></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.id}</span><input required value={f.id} onChange={set("id")} className={input} dir="ltr" placeholder="fridge-magnet" pattern="[a-z0-9][a-z0-9-]*" /></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.category}</span><select value={f.category} onChange={set("category")} className={input}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.mockup}</span><select value={f.mockup} onChange={set("mockup")} className={input}>{MOCKUPS.map(([m]) => <option key={m} value={m}>{t.mockups[m as keyof typeof t.mockups]}</option>)}</select></label>
        <p className="text-xs text-muted-foreground sm:col-span-4">{fill(T.hint, { id: f.id || "…" })}</p>
        {errors.map((x) => <p key={x} className="text-sm text-red-600 dark:text-red-400 sm:col-span-4" role="alert">{x}</p>)}
        <div className="flex gap-3 sm:col-span-4">
          <button disabled={pending} className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />} {T.create}</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">{T.cancel}</button>
        </div>
      </form>
    </GlowCard>
  );
}
