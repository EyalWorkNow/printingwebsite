"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Check, AlertTriangle } from "lucide-react";
import type { Catalog, Category } from "@/lib/catalog";
import { saveCategories } from "@/app/admin/catalog/actions";
import { GlowCard } from "@/components/glow-card";
import { ImageField } from "./image-field";

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400";

export function CategoriesEditor({ catalog }: { catalog: Catalog }) {
  const [list, setList] = useState<Category[]>(() => structuredClone(catalog.categories));
  const [isNew, setIsNew] = useState<Set<number>>(new Set());
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; errors?: string[] }>();
  const up = (i: number, patch: Partial<Category>) => { setStatus(undefined); setList(list.map((c, k) => (k === i ? { ...c, ...patch } : c))); };
  const used = (id: string) => catalog.products.filter((p) => p.category === id).length;

  return (
    <GlowCard className="h-auto" inner="space-y-4">
      <h2 className="font-semibold">קטגוריות</h2>
      <ul className="space-y-3">
        {list.map((c, i) => (
          <li key={i} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_16rem]">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-neutral-400">שם<input value={c.name} onChange={(e) => up(i, { name: e.target.value })} className={input} /></label>
              <label className="space-y-1 text-xs text-neutral-400">כתובת באנגלית
                <input value={c.id} disabled={!isNew.has(i)} dir="ltr" onChange={(e) => up(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className={`${input} disabled:opacity-50`} /></label>
              <label className="space-y-1 text-xs text-neutral-400 sm:col-span-2">תיאור<input value={c.desc} onChange={(e) => up(i, { desc: e.target.value })} className={input} /></label>
              <p className="text-xs text-neutral-500 sm:col-span-2">{used(c.id)} מוצרים{!used(c.id) && <button type="button" onClick={() => { setList(list.filter((_, k) => k !== i)); setStatus(undefined); }} className="ms-3 inline-flex items-center gap-1 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> מחיקה</button>}</p>
            </div>
            <ImageField value={c.image} onChange={(url) => up(i, { image: url })} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => { setIsNew(new Set([...isNew, list.length])); setList([...list, { id: "", name: "", desc: "" }]); }} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white"><Plus className="h-4 w-4" /> קטגוריה חדשה</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveCategories(list); setStatus(r.ok ? { ok: true } : { ok: false, errors: r.errors }); if (r.ok) setIsNew(new Set()); })}
          className="ms-auto flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-40">{pending && <Loader2 className="h-4 w-4 animate-spin" />} שמירת קטגוריות</button>
      </div>
      {status?.ok && <p className="flex items-center gap-2 text-sm text-emerald-400" role="status"><Check className="h-4 w-4" /> נשמר</p>}
      {status?.errors?.map((e) => <p key={e} className="flex items-center gap-2 text-sm text-amber-400" role="alert"><AlertTriangle className="h-4 w-4" />{e}</p>)}
    </GlowCard>
  );
}
