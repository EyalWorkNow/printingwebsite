import Link from "next/link";
import { Upload, Eye, Truck, MessageCircle, ArrowLeft } from "lucide-react";
import { fromPrice, ils, liveProducts } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { Mockup } from "@/components/mockup";
import { ProductCard } from "@/components/product-card";
import { GlowCard } from "@/components/glow-card";

const STEPS = [
  { icon: Eye, t: "בוחרים מוצר ומאפיינים", d: "גודל, נייר, גימור, כמות וזמן ייצור — המחיר מתעדכן מיד." },
  { icon: Upload, t: "מעלים גרפיקה", d: "PDF, PNG, JPG או SVG. רואים הדמיה ובדיקת איכות להדפסה." },
  { icon: Truck, t: "מקבלים", d: "ייצור מיום עסקים אחד, איסוף עצמי או שליח עד הבית." },
];

// sample artwork for the hero mockups
const SAMPLE = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dd7bbb"/><stop offset=".35" stop-color="#d79f1e"/><stop offset=".7" stop-color="#5a922c"/><stop offset="1" stop-color="#4c7894"/></linearGradient></defs><circle cx="150" cy="130" r="70" fill="url(#g)"/><text x="150" y="250" text-anchor="middle" font-family="Arial" font-weight="700" font-size="44" fill="#111">STUDIO</text></svg>`)}`;

const FAQ = [
  { q: "באילו פורמטים אפשר להעלות קבצים?", a: "PDF (מומלץ), PNG, JPG, WEBP או SVG עד 25MB. לתוצאה הכי חדה — PDF וקטורי או תמונה ב-300 DPI בגודל ההדפסה. המערכת תתריע אם הרזולוציה נמוכה." },
  { q: "מתי אקבל את ההזמנה?", a: "בוחרים זמן ייצור בכל מוצר — מאקספרס (יום עסקים) ועד חסכוני. אחרי הייצור: איסוף עצמי, שליח עד הבית (כ-2 ימי עסקים) או שליח אקספרס. התאריך המשוער מוצג לפני ההזמנה." },
  { q: "איך משלמים?", a: "אחרי שההזמנה נקלטת אנחנו בודקים את הקבצים ומתקשרים לאישור ולתשלום תוך יום עסקים. לא מחייבים לפני שראיתם שהכל תקין." },
  { q: "המחיר באתר סופי?", a: "כן. המחיר כולל מע״מ, וזהה בין האתר לבין נציג ה-AI בצ׳אט. משלוח עד הבית חינם בהזמנות מעל ₪500 לפני מע״מ." },
  { q: "אין לי קובץ מוכן — מה עושים?", a: "מוסיפים לעגלה בלי קובץ ושולחים את הגרפיקה אחר כך בצ׳אט. נחכה לקובץ לפני שנתחיל לייצר." },
  { q: "אפשר להזמין כמה מוצרים יחד?", a: "בטח. כל מוצר נכנס לעגלה עם האפשרויות והקובץ שלו, ומשלמים על הכל בהזמנה אחת עם משלוח אחד." },
];

const POPULAR = ["business-card", "sticker", "tshirt", "mug", "flyer", "roll-up"];

export default async function Home() {
  const cat = await getCatalog();
  const PRODUCTS = liveProducts(cat);
  const popular = POPULAR.flatMap((id) => PRODUCTS.filter((p) => p.id === id));
  return (
    <div className="space-y-24">
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-2">
        <div className="space-y-6 text-center lg:text-right">
          <h1 className="text-4xl font-bold text-balance md:text-6xl">מדפיסים את מה שדמיינת.<br /><span className="text-neutral-500">עד הבית.</span></h1>
          <p className="mx-auto max-w-xl text-neutral-400 md:text-lg lg:mx-0">{PRODUCTS.length} מוצרים, מחיר מיידי לכל שילוב, הדמיה על המוצר והזמנה בכמה קליקים — באתר או בשיחה עם נציג ה-AI שלנו.</p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="#categories" className="rounded-lg bg-white px-6 py-3 font-medium text-black">לכל המוצרים</Link>
            <a href="#chat" className="flex items-center gap-2 rounded-lg border px-6 py-3 font-medium text-neutral-200 hover:border-neutral-500"><MessageCircle className="h-4 w-4" /> הצעת מחיר בצ׳אט</a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <GlowCard className="col-span-2 h-56" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-64"><Mockup kind="card" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
          <GlowCard className="h-44" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-40"><Mockup kind="mug" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
          <GlowCard className="h-44" inner="flex items-center justify-center p-2"><div className="h-full w-full max-w-40"><Mockup kind="shirt" tint="#1e2a5a" src={SAMPLE} fit uid="-hero" /></div></GlowCard>
        </div>
      </section>

      <section id="categories" className="scroll-mt-24 space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">קטגוריות</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {cat.categories.map((c) => {
            const items = PRODUCTS.filter((p) => p.category === c.id);
            if (!items.length) return null;
            return (
              <li key={c.id}>
                <Link href={`/c/${c.id}`} className="group block h-full">
                  <GlowCard inner="flex items-center gap-5">
                    <div className="aspect-square w-24 shrink-0"><Mockup kind={items[0].mockup} uid={`-cat-${c.id}`} tint={items[0].options.find((o) => o.kind === "color")?.values[1]?.color} /></div>
                    <div className="space-y-1.5">
                      <h3 className="flex items-center gap-2 text-xl font-semibold">{c.name}<ArrowLeft className="h-4 w-4 text-neutral-500 transition group-hover:-translate-x-1" /></h3>
                      <p className="text-sm text-neutral-400">{c.desc}</p>
                      <p className="text-xs text-neutral-500">{items.length} מוצרים · החל מ־{ils(Math.min(...items.map((p) => fromPrice(cat, p))))} ליח׳</p>
                    </div>
                  </GlowCard>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">הכי מוזמנים</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popular.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
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

      <section id="faq" className="scroll-mt-24 space-y-6">
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
    </div>
  );
}
