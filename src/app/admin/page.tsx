import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronDown, Download, MessageCircle, Globe } from "lucide-react";
import { listOrders, STATUSES, type Order } from "@/lib/orders";
import { ils } from "@/lib/catalog";
import { GlowCard } from "@/components/glow-card";
import { updateStatus } from "./actions";

export const metadata = { title: "ניהול הזמנות — דפוס", robots: { index: false } };

const TONE: Record<Order["status"], string> = {
  "התקבלה": "border-sky-700 text-sky-300", "בהכנה": "border-amber-700 text-amber-300",
  "נשלחה": "border-emerald-700 text-emerald-300", "בוטלה": "border-neutral-700 text-neutral-500",
};
const date = (iso: string) => new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" });

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold">דפוס<span className="text-neutral-500">.</span> <span className="text-base font-normal text-neutral-400">ניהול הזמנות</span></span>
        <Link href="/" className="text-sm text-neutral-400 hover:text-white">לאתר ←</Link>
      </header>
      <Suspense fallback={<p className="text-neutral-500">טוען הזמנות…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Orders({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await connection();
  const { status, q } = (await searchParams) as { status?: string; q?: string };
  const all = (await listOrders()).reverse(); // newest first
  const term = q?.trim();
  const shown = all.filter((o) => (!status || o.status === status) && (!term || [o.id, o.customer.name, o.customer.phone, o.customer.city].some((v) => v.includes(term))));
  const live = all.filter((o) => o.status !== "בוטלה");

  const stats = [
    { t: "סה״כ הזמנות", v: all.length.toLocaleString("he-IL") },
    { t: "פתוחות (התקבלה + בהכנה)", v: all.filter((o) => o.status === "התקבלה" || o.status === "בהכנה").length.toLocaleString("he-IL") },
    { t: "מחזור (ללא בוטלו)", v: ils(live.reduce((s, o) => s + o.quote.total, 0)) },
  ];
  const href = (s?: string) => `/admin?${new URLSearchParams({ ...(s && { status: s }), ...(term && { q: term }) })}`;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <GlowCard key={s.t} inner="space-y-2"><p className="text-sm text-neutral-400">{s.t}</p><p className="text-3xl font-semibold">{s.v}</p></GlowCard>
        ))}
      </section>

      <section className="flex flex-wrap items-center gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link key={s ?? "all"} href={href(s)} className={`rounded-full border px-3 py-1 text-sm ${status === s ? "border-white text-white" : "text-neutral-400 hover:text-white"}`}>
            {s ?? "הכל"} <span className="text-neutral-500">{s ? all.filter((o) => o.status === s).length : all.length}</span>
          </Link>
        ))}
        <form className="ms-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={term} placeholder="חיפוש: מספר, שם, טלפון, עיר" className="w-64 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus:border-neutral-400" />
        </form>
      </section>

      {shown.length === 0 ? <p className="py-16 text-center text-neutral-500">אין הזמנות להצגה</p> : (
        <ul className="space-y-3">
          {shown.map((o) => (
            <li key={o.id}>
              <details className="group rounded-2xl border bg-neutral-950 open:border-neutral-600">
                <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-x-4 gap-y-1 p-4 text-sm md:grid-cols-[8rem_1fr_1fr_7rem_6rem_5.5rem_1rem]">
                  <span className="font-mono text-neutral-300">{o.id}</span>
                  <span className="font-medium">{o.customer.name} <span className="text-neutral-500">· {o.customer.city}</span></span>
                  <span className="text-neutral-400">{o.quote.quantity.toLocaleString("he-IL")} × {o.quote.productName}</span>
                  <span className="font-semibold">{ils(o.quote.total)}</span>
                  <span className="text-xs text-neutral-500">{date(o.createdAt)}</span>
                  <span className={`w-fit rounded-full border px-2 py-0.5 text-xs ${TONE[o.status]}`}>{o.status}</span>
                  <ChevronDown className="hidden h-4 w-4 text-neutral-500 transition group-open:rotate-180 md:block" />
                </summary>
                <div className="grid gap-6 border-t p-4 text-sm md:grid-cols-3">
                  <dl className="space-y-1.5">
                    <dt className="text-xs text-neutral-500">לקוח</dt>
                    <dd>{o.customer.name}</dd>
                    <dd><a href={`tel:${o.customer.phone}`} className="underline-offset-2 hover:underline" dir="ltr">{o.customer.phone}</a></dd>
                    {o.customer.email && <dd><a href={`mailto:${o.customer.email}`} className="hover:underline">{o.customer.email}</a></dd>}
                    <dd>{o.customer.address}, {o.customer.city}</dd>
                    {o.customer.notes && <dd className="text-neutral-400">הערות: {o.customer.notes}</dd>}
                    <dd className="flex items-center gap-1.5 pt-1 text-xs text-neutral-500">{o.source === "chat" ? <><MessageCircle className="h-3.5 w-3.5" /> הוזמן בצ׳אט AI</> : <><Globe className="h-3.5 w-3.5" /> הוזמן באתר</>}</dd>
                  </dl>
                  <dl className="grid h-fit grid-cols-2 gap-y-1.5">
                    <dt className="col-span-2 text-xs text-neutral-500">פירוט מחיר</dt>
                    <dt className="text-neutral-400">מוצר</dt><dd>{o.quote.productName} · {o.quote.size}</dd>
                    <dt className="text-neutral-400">כמות × מחיר</dt><dd>{o.quote.quantity.toLocaleString("he-IL")} × {ils(o.quote.unitPrice)}</dd>
                    {o.quote.setup > 0 && <><dt className="text-neutral-400">הכנה לדפוס</dt><dd>{ils(o.quote.setup)}</dd></>}
                    <dt className="text-neutral-400">משלוח</dt><dd>{o.quote.shipping ? ils(o.quote.shipping) : "חינם"}</dd>
                    <dt className="text-neutral-400">מע״מ</dt><dd>{ils(o.quote.vat)}</dd>
                    <dt className="font-semibold">סה״כ</dt><dd className="font-semibold">{ils(o.quote.total)}</dd>
                  </dl>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs text-neutral-500">גרפיקה</p>
                      {o.artwork ? (
                        <>
                          {!o.artwork.endsWith(".pdf") && (
                            // eslint-disable-next-line @next/next/no-img-element -- auth-protected file, not for next/image
                            <img src={`/api/admin/file/${o.artwork}`} alt={`גרפיקה להזמנה ${o.id}`} className="max-h-40 rounded-lg border bg-neutral-900 object-contain" loading="lazy" />
                          )}
                          <a href={`/api/admin/file/${o.artwork}`} download={`${o.id}.${o.artwork.split(".").pop()}`} className="inline-flex items-center gap-1.5 text-neutral-300 hover:text-white"><Download className="h-4 w-4" /> הורדת קובץ</a>
                        </>
                      ) : <p className="text-amber-400">טרם הועלתה גרפיקה</p>}
                    </div>
                    <form action={updateStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <select name="status" defaultValue={o.status} aria-label="סטטוס הזמנה" className="rounded-lg border border-input bg-transparent px-2 py-1.5">
                        {STATUSES.map((s) => <option key={s} className="bg-neutral-900">{s}</option>)}
                      </select>
                      <button className="rounded-lg bg-white px-3 py-1.5 font-medium text-black">עדכון סטטוס</button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
