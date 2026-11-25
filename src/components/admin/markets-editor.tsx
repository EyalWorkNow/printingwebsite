"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertTriangle, ExternalLink, EyeOff } from "lucide-react";
import { fill, type MarketAdjust } from "@/lib/catalog";
import { LOCALE_META, type Locale } from "@/i18n/config";
import { useAdmin } from "@/i18n/admin/client";
import { saveMarket } from "@/app/admin/catalog/actions";
import { GlowCard } from "@/components/glow-card";

export type MarketRow = {
  lang: Exclude<Locale, "he">; currency: string; vat: number; intl: string; fxDefault: number; saved: MarketAdjust;
  products: { id: string; name: string; active: boolean; from: number }[]; // `from` = saved "from" price incl. local tax
};

const input = "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-foreground/50";
const pct = (f?: number) => (f ? String(Math.round(f * 1000) / 10) : "");
const frac = (s: string) => (s.trim() === "" ? 0 : Number(s) / 100);

/** Exchange rate, whole-market % and per-product % for one shop language; prices preview live (scaled from the saved ones). */
export function MarketsEditor({ rows }: { rows: MarketRow[] }) {
  const { t, intl } = useAdmin();
  const T = t.markets;
  const router = useRouter();
  const [lang, setLang] = useState(rows[0].lang);
  const row = rows.find((r) => r.lang === lang)!;
  const [fx, setFx] = useState(() => Object.fromEntries(rows.map((r) => [r.lang, r.saved.fx ? String(r.saved.fx) : ""])) as Record<string, string>);
  const [adj, setAdj] = useState(() => Object.fromEntries(rows.map((r) => [r.lang, pct(r.saved.adj)])) as Record<string, string>);
  const [prod, setProd] = useState(() => Object.fromEntries(rows.map((r) => [r.lang, Object.fromEntries(Object.entries(r.saved.products ?? {}).map(([k, v]) => [k, pct(v)]))])) as Record<string, Record<string, string>>);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; errors?: string[] }>();

  const fmt = (d: number) => new Intl.NumberFormat(intl, { style: "currency", currency: row.currency, minimumFractionDigits: 0, maximumFractionDigits: d });
  const money = { format: (n: number) => fmt(n < 0.1 ? 4 : 2).format(n) }; // sub-cent unit prices (bulk paper) keep 4 decimals, like the shop
  const fxNow = Number(fx[lang]) > 0 ? Number(fx[lang]) : row.fxDefault, fxWas = row.saved.fx ?? row.fxDefault;
  const factor = (id: string) => (fxNow / fxWas) * ((1 + frac(adj[lang])) / (1 + (row.saved.adj ?? 0))) * ((1 + frac(prod[lang]?.[id] ?? "")) / (1 + (row.saved.products?.[id] ?? 0)));
  const bad = [fx[lang] && !(Number(fx[lang]) > 0), ...[adj[lang], ...Object.values(prod[lang] ?? {})].map((v) => v.trim() !== "" && !(Number(v) > -90 && Number(v) <= 500))].some(Boolean);

  const save = () => start(async () => {
    const products = Object.fromEntries(Object.entries(prod[lang] ?? {}).map(([k, v]) => [k, frac(v)]).filter(([, v]) => v));
    const r = await saveMarket(lang, { ...(Number(fx[lang]) > 0 ? { fx: Number(fx[lang]) } : {}), adj: frac(adj[lang]), products });
    setStatus(r.ok ? { ok: true } : { ok: false, errors: r.errors });
    if (r.ok) router.refresh();
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{T.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{T.intro}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {rows.map((r) => (
          <button key={r.lang} type="button" role="tab" aria-selected={r.lang === lang} onClick={() => { setLang(r.lang); setStatus(undefined); }} lang={r.lang}
            className={`rounded-full border px-3 py-1 text-sm ${r.lang === lang ? "border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {LOCALE_META[r.lang].name} <span className="text-muted-foreground">{r.currency}</span>
          </button>
        ))}
      </div>

      <GlowCard className="h-auto" inner="grid gap-4 sm:grid-cols-4">
        <div className="space-y-1 text-sm"><p className="text-muted-foreground">{T.currency}</p><p className="py-1.5 font-medium">{row.currency}</p></div>
        <div className="space-y-1 text-sm"><p className="text-muted-foreground">{T.vat}</p><p className="py-1.5 font-medium">{row.vat ? `${Math.round(row.vat * 100)}%` : T.noVat}</p></div>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.fx}</span>
          <input type="number" step="0.0001" min={0} value={fx[lang]} placeholder={String(row.fxDefault)} onChange={(e) => { setStatus(undefined); setFx({ ...fx, [lang]: e.target.value }); }} className={input} dir="ltr" />
          <span className="text-xs text-muted-foreground">{fill(T.fxDefault, { x: `${row.fxDefault} ${row.currency}` })}</span></label>
        <label className="space-y-1 text-sm"><span className="text-muted-foreground">{T.adj}</span>
          <input type="number" step="1" value={adj[lang]} placeholder="0" onChange={(e) => { setStatus(undefined); setAdj({ ...adj, [lang]: e.target.value }); }} className={input} dir="ltr" /></label>
      </GlowCard>

      <GlowCard className="h-auto" inner="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr className="border-b">
            <th className="p-3 text-start font-normal">{T.product}</th><th className="p-3 text-end font-normal">{T.fromPrice}</th><th className="w-32 p-3 text-start font-normal">{T.productAdj}</th>
          </tr></thead>
          <tbody>
            {row.products.map((p) => (
              <tr key={p.id} id={p.id} className="border-b last:border-0 target:bg-foreground/5">
                <td className="p-3">{p.name} {!p.active && <span className="ms-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><EyeOff className="h-3 w-3" /> {T.hiddenProduct}</span>}</td>
                <td className="p-3 text-end font-medium" dir="ltr">{money.format(p.from * factor(p.id))}</td>
                <td className="p-3"><input type="number" step="1" value={prod[lang]?.[p.id] ?? ""} placeholder="0" aria-label={`${T.productAdj} · ${p.name}`}
                  onChange={(e) => { setStatus(undefined); setProd({ ...prod, [lang]: { ...prod[lang], [p.id]: e.target.value } }); }} className={input} dir="ltr" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlowCard>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={save} disabled={pending || bad} className="flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 font-medium text-background disabled:opacity-40">{pending && <Loader2 className="h-4 w-4 animate-spin" />} {T.save}</button>
        <button type="button" onClick={() => { setStatus(undefined); setFx({ ...fx, [lang]: "" }); setAdj({ ...adj, [lang]: "" }); setProd({ ...prod, [lang]: {} }); }} className="rounded-lg border px-4 py-2.5 text-sm">{T.reset}</button>
        <a href={`/${lang}`} target="_blank" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /> {T.open}</a>
        {status?.ok && <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400" role="status"><Check className="h-4 w-4" /> {fill(T.saved, { x: LOCALE_META[lang].name })}</p>}
        {status?.errors?.map((e) => <p key={e} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400" role="alert"><AlertTriangle className="h-4 w-4" />{e}</p>)}
      </div>
    </div>
  );
}
