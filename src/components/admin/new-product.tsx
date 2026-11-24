"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { MOCKUPS, type Category } from "@/lib/catalog";
import { createProduct } from "@/app/admin/catalog/actions";
import { GlowCard } from "@/components/glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400";

export function NewProduct({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", id: "", category: categories[0]?.id ?? "", mockup: "card" });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: k === "id" ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") : e.target.value });

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"><Plus className="h-4 w-4" /> מוצר חדש</button>;
  return (
    <GlowCard className="h-auto" inner="space-y-4">
      <h2 className="font-semibold">מוצר חדש</h2>
      <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
        const r = await createProduct(f);
        if (r.ok) router.push(`/admin/catalog/${r.id}`); else setErrors(r.errors);
      }); }}>
        <label className="space-y-1 text-sm"><span className="text-neutral-400">שם המוצר</span><input required value={f.name} onChange={set("name")} className={input} placeholder="למשל: מגנט למקרר" /></label>
        <label className="space-y-1 text-sm"><span className="text-neutral-400">כתובת באנגלית</span><input required value={f.id} onChange={set("id")} className={input} dir="ltr" placeholder="fridge-magnet" pattern="[a-z0-9][a-z0-9-]*" /></label>
        <label className="space-y-1 text-sm"><span className="text-neutral-400">קטגוריה</span><select value={f.category} onChange={set("category")} className={input}>{categories.map((c) => <option key={c.id} value={c.id} className="bg-neutral-900">{c.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="text-neutral-400">צורת הדמיה</span><select value={f.mockup} onChange={set("mockup")} className={input}>{MOCKUPS.map(([m, t]) => <option key={m} value={m} className="bg-neutral-900">{t}</option>)}</select></label>
        <p className="text-xs text-neutral-500 sm:col-span-4">הכתובת תהיה /p/{f.id || "…"} ולא ניתנת לשינוי. המוצר נוצר מוסתר — משלימים מחירים, אפשרויות ותמונה ואז מפעילים.</p>
        {errors.map((x) => <p key={x} className="text-sm text-red-400 sm:col-span-4" role="alert">{x}</p>)}
        <div className="flex gap-3 sm:col-span-4">
          <button disabled={pending} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />} יצירה והמשך לעריכה</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">ביטול</button>
        </div>
      </form>
    </GlowCard>
  );
}
