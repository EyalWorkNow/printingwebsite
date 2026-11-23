import { Upload, Eye, Truck, MessageCircle } from "lucide-react";
import { Mockup } from "@/components/mockup";
import { ProductGrid } from "@/components/product-grid";
import { Configurator } from "@/components/configurator";
import { Chat } from "@/components/chat";
import { GlowCard } from "@/components/glow-card";

const STEPS = [
  { icon: Upload, t: "מעלים גרפיקה", d: "PNG, JPG, SVG או PDF — עד 20MB." },
  { icon: Eye, t: "רואים מוקאפ", d: "תצוגה מקדימה על המוצר עוד לפני ההזמנה." },
  { icon: Truck, t: "מקבלים עד הבית", d: "3–5 ימי עסקים, משלוח חינם מעל ₪500." },
];

// sample artwork for the hero mockups
const SAMPLE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dd7bbb"/><stop offset=".35" stop-color="#d79f1e"/><stop offset=".7" stop-color="#5a922c"/><stop offset="1" stop-color="#4c7894"/></linearGradient></defs><circle cx="150" cy="130" r="70" fill="url(#g)"/><text x="150" y="250" text-anchor="middle" font-family="Arial" font-weight="700" font-size="44" fill="#111">STUDIO</text></svg>`)}`;

const FAQ = [
  { q: "באילו פורמטים אפשר להעלות קבצים?", a: "PNG, JPG, WEBP, SVG או PDF עד 20MB. לתוצאה הכי חדה — PDF או SVG, או תמונה ב-300 DPI במידת ההדפסה. המערכת תתריע אם הרזולוציה נמוכה." },
  { q: "מתי אקבל את ההזמנה?", a: "3–5 ימי עסקים מרגע אישור הגרפיקה, עם משלוח עד הבית לכל הארץ. משלוח חינם בהזמנות מעל ₪500 לפני מע״מ." },
  { q: "איך משלמים?", a: "אחרי שההזמנה נקלטת אנחנו בודקים את הקובץ ומתקשרים לאישור ולתשלום. לא מחייבים לפני שראיתם שהכל תקין." },
  { q: "המחיר באתר סופי?", a: "כן. המחיר כולל הכנה לדפוס, משלוח ומע״מ, וזהה בין המחשבון באתר לבין נציג ה-AI בצ׳אט." },
  { q: "אין לי קובץ מוכן — מה עושים?", a: "אפשר להזמין ולשלוח את הגרפיקה אחר כך בצ׳אט. נחכה לקובץ לפני שנתחיל לייצר." },
  { q: "אפשר לבטל?", a: "כל עוד ההזמנה לא נכנסה לייצור — כן, בלי עלות. כתבו לנו בצ׳אט עם מספר ההזמנה." },
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
          <a href="#faq" className="hover:text-white">שאלות</a>
        </nav>
      </header>

      <section className="grid items-center gap-10 pt-6 lg:grid-cols-2">
        <div className="space-y-6 text-center lg:text-right">
          <h1 className="text-4xl font-bold text-balance md:text-6xl">מדפיסים את מה שדמיינת.<br /><span className="text-neutral-500">עד הבית.</span></h1>
          <p className="mx-auto max-w-xl text-neutral-400 md:text-lg lg:mx-0">בוחרים מוצר, מעלים גרפיקה, רואים מוקאפ ומקבלים הצעת מחיר מיידית — באתר או בשיחה עם נציג ה-AI שלנו.</p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="#order" className="rounded-lg bg-white px-6 py-3 font-medium text-black">להצעת מחיר</a>
            <a href="#chat" className="flex items-center gap-2 rounded-lg border px-6 py-3 font-medium text-neutral-200 hover:border-neutral-500"><MessageCircle className="h-4 w-4" /> שיחה עם נציג AI</a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <GlowCard className="col-span-2 h-56" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-64"><Mockup kind="card" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
          <GlowCard className="h-44" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-40"><Mockup kind="mug" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
          <GlowCard className="h-44" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-40"><Mockup kind="shirt" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
        </div>
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

      <section id="faq" className="scroll-mt-8 space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">שאלות נפוצות</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <GlowCard key={f.q} inner="p-0">
              <details className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-neutral-500 transition group-open:rotate-45">+</span></summary>
                <p className="pt-3 text-sm leading-relaxed text-neutral-400">{f.a}</p>
              </details>
            </GlowCard>
          ))}
        </div>
      </section>

      <footer className="grid gap-8 border-t py-10 text-sm text-neutral-400 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-bold text-white">דפוס<span className="text-neutral-500">.</span></p>
          <p>בית דפוס דיגיטלי — מהקובץ שלך עד הדלת.</p>
        </div>
        <nav className="flex flex-col gap-2" aria-label="ניווט תחתון">
          <a href="#products" className="hover:text-white">מוצרים</a>
          <a href="#order" className="hover:text-white">הצעת מחיר והזמנה</a>
          <a href="#faq" className="hover:text-white">שאלות נפוצות</a>
          <a href="#chat" className="hover:text-white">שיחה עם נציג AI</a>
        </nav>
        <div className="space-y-2">
          <p>אספקה 3–5 ימי עסקים · משלוח לכל הארץ</p>
          <p>המחירים כוללים מע״מ בסיכום ההזמנה</p>
          <p className="text-neutral-600">© דפוס</p>
        </div>
      </footer>
    </main>
    <Chat />
    </>
  );
}
