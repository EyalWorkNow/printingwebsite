"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { catalogErrors, PRODUCTION_IDS, SHIPPING_IDS, type Catalog } from "@/lib/catalog";
import { useAdmin } from "@/i18n/admin/client";
import { saveSettings } from "@/app/admin/catalog/actions";
import { GlowCard } from "@/components/glow-card";

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-foreground/50";
const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
const show = (n: number) => (Number.isNaN(n) ? "" : String(n));

export function SettingsEditor({ catalog }: { catalog: Catalog }) {
  const { t } = useAdmin();
  const T = t.settings;
  const [production, setProduction] = useState(() => structuredClone(catalog.production));
  const [shipping, setShipping] = useState(() => structuredClone(catalog.shipping));
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; errors?: string[] }>();
  const errors = catalogErrors({ ...catalog, production, shipping }, t.errors);

  const save = () => start(async () => {
    const r = await saveSettings(production, shipping);
    setStatus(r.ok ? { ok: true } : { ok: false, errors: r.errors });
  });

  return (
    <div className="space-y-6">
      <GlowCard className="h-auto" inner="space-y-4">
        <h2 className="font-semibold">{T.production}</h2>
        <p className="text-xs text-muted-foreground">{T.productionHint}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {PRODUCTION_IDS.map((id) => { const x = production[id]; const set = (patch: Partial<typeof x>) => { setStatus(undefined); setProduction({ ...production, [id]: { ...x, ...patch } }); }; return (
            <div key={id} className="grid grid-cols-3 gap-2 rounded-xl border p-3">
              <label className="space-y-1 text-xs text-muted-foreground">{T.name}<input value={x.label} onChange={(e) => set({ label: e.target.value })} className={input} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">{T.days}<input type="number" min={0} value={show(x.days)} onChange={(e) => set({ days: num(e.target.value) })} className={input} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">{T.pct}<input type="number" step={1} value={show(Math.round(x.pct * 1000) / 10)} onChange={(e) => set({ pct: num(e.target.value) / 100 })} className={input} /></label>
            </div>); })}
        </div>
      </GlowCard>

      <GlowCard className="h-auto" inner="space-y-4">
        <h2 className="font-semibold">{T.shipping}</h2>
        <p className="text-xs text-muted-foreground">{T.shippingHint}</p>
        <div className="space-y-3">
          {SHIPPING_IDS.map((id) => { const x = shipping[id]; const set = (patch: Partial<typeof x>) => { setStatus(undefined); setShipping({ ...shipping, [id]: { ...x, ...patch } }); }; return (
            <div key={id} className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-6 ${x.active === false ? "opacity-60" : ""}`}>
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">{T.name}<input value={x.label} onChange={(e) => set({ label: e.target.value })} className={input} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">{T.price}<input type="number" min={0} step="0.01" value={show(x.price)} onChange={(e) => set({ price: num(e.target.value) })} className={input} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">{T.days}<input type="number" min={0} value={show(x.days)} onChange={(e) => set({ days: num(e.target.value) })} className={input} /></label>
              <label className="space-y-1 text-xs text-muted-foreground">{T.freeFrom}<input type="number" min={0} value={show(x.freeFrom)} onChange={(e) => set({ freeFrom: num(e.target.value) })} className={input} /></label>
              <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="accent-foreground" checked={x.active !== false} onChange={(e) => set({ active: e.target.checked })} /> {T.active}</label>
              <label className="space-y-1 text-xs text-muted-foreground sm:col-span-6">{T.desc}<input value={x.desc} onChange={(e) => set({ desc: e.target.value })} className={input} /></label>
            </div>); })}
        </div>
      </GlowCard>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={pending || errors.length > 0} className="flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 font-medium text-background disabled:opacity-40">{pending && <Loader2 className="h-4 w-4 animate-spin" />} {T.save}</button>
        {status?.ok && <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400" role="status"><Check className="h-4 w-4" /> {T.saved}</p>}
        {[...errors, ...(status?.errors ?? [])].map((e) => <p key={e} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400" role="alert"><AlertTriangle className="h-4 w-4" />{e}</p>)}
      </div>
    </div>
  );
}
