import { Upload, Eye, Truck } from "lucide-react";
import { ProductGrid } from "@/components/product-grid";
import { Configurator } from "@/components/configurator";
import { Chat } from "@/components/chat";
import { GlowCard } from "@/components/glow-card";

const STEPS = [
  { icon: Upload, t: "מעלים גרפיקה", d: "PNG, JPG, SVG או PDF — עד 20MB." },
  { icon: Eye, t: "רואים מוקאפ", d: "תצוגה מקדימה על המוצר עוד לפני ההזמנה." },
  { icon: Truck, t: "מקבלים עד הבית", d: "3–5 ימי עסקים, משלוח חינם מעל ₪500." },
];

export default function Home() {
  return (
    <>
    <main className="mx-auto max-w-6xl space-y-24 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight">דפוס<span className="text-neutral-500">.</span></span>
        <nav className="flex gap-6 text-sm text-neutral-400">
          <a href="#products" className="hover:text-white">מוצרים</a>
          <a href="#order" className="hover:text-white">הצעת מחיר</a>
        </nav>
      </header>

      <section className="space-y-6 pt-10 text-center">
        <h1 className="text-4xl font-bold text-balance md:text-6xl">מדפיסים את מה שדמיינת.<br /><span className="text-neutral-500">עד הבית.</span></h1>
        <p className="mx-auto max-w-xl text-neutral-400 md:text-lg">בוחרים מוצר, מעלים גרפיקה, רואים מוקאפ ומקבלים הצעת מחיר מיידית — באתר או בשיחה עם נציג ה-AI שלנו.</p>
        <a href="#order" className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-black">להצעת מחיר</a>
      </section>

      <section id="products" className="scroll-mt-8 space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">מה מדפיסים היום?</h2>
        <ProductGrid />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {STEPS.map(({ icon: I, t, d }, i) => (
          <GlowCard key={t} inner="space-y-3">
            <div className="flex items-center gap-3"><span className="text-sm text-neutral-500">0{i + 1}</span><I className="h-5 w-5 text-neutral-400" /></div>
            <h3 className="text-lg font-semibold">{t}</h3>
            <p className="text-sm text-neutral-400">{d}</p>
          </GlowCard>
        ))}
      </section>

      <section id="order" className="scroll-mt-8 space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">הצעת מחיר והזמנה</h2>
        <Configurator />
      </section>

      <footer className="border-t py-8 text-center text-sm text-neutral-500">© דפוס · מחירים כוללים מע״מ בסיכום · לשאלות — לחצו על הצ׳אט</footer>
    </main>
    <Chat />
    </>
  );
}
