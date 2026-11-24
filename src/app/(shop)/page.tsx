import Link from "next/link";
import Image from "next/image";
import { Upload, Eye, Truck, MessageCircle, ArrowLeft, Sparkles, Clock, BadgeCheck, Calculator } from "lucide-react";
import { fromPrice, ils, liveProducts, PRODUCTION_IDS } from "@/lib/catalog";
import { getCatalog } from "@/lib/catalog-store";
import { Mockup } from "@/components/mockup";
import { ProductCard } from "@/components/product-card";
import { GlowCard } from "@/components/glow-card";
import { FAQ } from "@/lib/content";
import { FaqList } from "@/components/faq-list";

const STEPS = [
  { icon: Eye, t: "בוחרים מוצר ומאפיינים", d: "גודל, חומר, גימור, כמות וזמן ייצור — המחיר מתעדכן מיד." },
  { icon: Upload, t: "מעלים גרפיקה", d: "PDF, PNG, JPG או SVG. רואים הדמיה ובדיקת איכות להדפסה." },
  { icon: Truck, t: "מקבלים", d: "ייצור מיום עסקים אחד, איסוף עצמי או שליח עד הבית." },
];
const POPULAR = ["tshirt", "hoodie", "mug", "roll-up", "sticker", "tote", "notebook", "pen", "jacket", "charger"];

export default async function Home() {
  const cat = await getCatalog();
  const products = liveProducts(cat);
  const popular = POPULAR.flatMap((id) => products.filter((p) => p.id === id)).slice(0, 6);
  const fastest = Math.min(...PRODUCTION_IDS.map((id) => cat.production[id].days));
  const from = (id: string) => { const p = products.find((x) => x.id === id); return p ? ils(fromPrice(cat, p)) : undefined; };

  return (
    <div className="space-y-24">
      {/* hero */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-7 text-center lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-foreground/80"><Sparkles className="h-3.5 w-3.5 text-[#dd7bbb]" /> בית דפוס דיגיטלי · מחיר מיידי לכל שילוב</span>
          <h1 className="text-4xl leading-[1.1] font-bold text-balance md:text-6xl">המותג שלך,<br /><span className="bg-gradient-to-l from-[#b23d8a] via-[#9a6200] to-[#3f7020] bg-clip-text text-transparent dark:from-[#dd7bbb] dark:via-[#d79f1e] dark:to-[#5a922c]">מודפס על הכל.</span></h1>
          <p className="mx-auto max-w-xl text-muted-foreground md:text-lg lg:mx-0">חולצות, ספלים, מחברות, כרטיסי ביקור ושילוט — בוחרים, מעלים לוגו, רואים הדמיה ומזמינים עד הבית. או פשוט כותבים לנציג ה-AI מה צריך.</p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/products" className="rounded-lg bg-foreground px-6 py-3 font-medium text-background">לכל המוצרים</Link>
            <a href="#chat" className="flex items-center gap-2 rounded-lg border px-6 py-3 font-medium text-foreground/80 hover:border-foreground/40"><MessageCircle className="h-4 w-4" /> הצעת מחיר בצ׳אט</a>
          </div>
          <dl className="mx-auto grid max-w-lg grid-cols-3 gap-3 pt-2 text-center lg:mx-0 lg:text-right">
            {[[Clock, `${fastest === 1 ? "יום עסקים" : `${fastest} ימים`}`, "ייצור אקספרס"], [Calculator, `${products.length} מוצרים`, "מחיר מיידי"], [BadgeCheck, "בדיקת קובץ", "לפני כל הדפסה"]].map(([I, v, t]) => {
              const Icon = I as typeof Clock;
              return <div key={t as string} className="space-y-1"><dt className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground lg:justify-start"><Icon className="h-3.5 w-3.5" />{t as string}</dt><dd className="font-semibold">{v as string}</dd></div>;
            })}
          </dl>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-3 md:gap-4">
          <HeroTile src="/img/set-apparel.webp" alt="חולצה, קפוצ׳ון ותיק בד ממותגים" href="/c/apparel" label="ביגוד ממותג" price={from("tshirt")} className="row-span-2" priority sizes="(min-width: 1024px) 28vw, 50vw" />
          <HeroTile src="/img/set-office.webp" alt="מחברת, ספל, עט ותיק ממותגים" href="/c/promo" label="מוצרי פרסום" price={from("pen")} sizes="(min-width: 1024px) 20vw, 50vw" />
          <HeroTile src="/img/rollup.webp" alt="רול-אפ ממותג" href="/c/signs" label="שילוט ומדבקות" price={from("sticker")} sizes="(min-width: 1024px) 20vw, 50vw" />
        </div>
      </section>

      {/* categories */}
      <section id="categories" className="scroll-mt-24 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold md:text-3xl">מה מדפיסים היום?</h2>
          <Link href="/products" className="py-2 text-sm text-muted-foreground hover:text-foreground">כל המוצרים ←</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cat.categories.map((c) => {
            const items = products.filter((p) => p.category === c.id);
            if (!items.length) return null;
            return (
              <li key={c.id}>
                <Link href={`/c/${c.id}`} className="group block h-full">
                  <GlowCard inner="flex flex-col gap-4 p-4">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/60">
                      {c.image ? <Image src={c.image} alt={c.name} fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
                        : <div className="mx-auto h-full max-w-40 p-3"><Mockup kind={items[0].mockup} uid={`-cat-${c.id}`} /></div>}
                    </div>
                    <div className="space-y-1 px-1">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">{c.name}<ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1" /></h3>
                      <p className="text-sm text-muted-foreground">{c.desc}</p>
                      <p className="text-xs text-muted-foreground">{items.length} מוצרים · החל מ־{ils(Math.min(...items.map((p) => fromPrice(cat, p))))} ליח׳</p>
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

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">איך זה עובד</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: I, t, d }, i) => (
            <GlowCard key={t} inner="space-y-3">
              <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">0{i + 1}</span><I className="h-5 w-5 text-muted-foreground" /></div>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* showcase + chat */}
      <section className="grid gap-4 lg:grid-cols-2">
        <GlowCard inner="relative min-h-80 p-0">
          <Image src="/img/set-flatlay.webp" alt="ערכת מיתוג: חולצה, כובע, מחברת, עט ותיק" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6 pt-16 text-white">
            <p className="text-lg font-semibold">ערכת מיתוג שלמה, בהזמנה אחת</p>
            <p className="text-sm text-white/80">מוסיפים כמה מוצרים לעגלה — משלמים ומקבלים יחד.</p>
          </div>
        </GlowCard>
        <GlowCard inner="flex flex-col justify-center gap-5 p-8">
          <div className="w-fit rounded-lg border border-foreground/20 p-2"><MessageCircle className="h-5 w-5 text-foreground/80" /></div>
          <h2 className="text-2xl font-semibold md:text-3xl">לא בטוחים מה להזמין?</h2>
          <p className="text-muted-foreground">ספרו לנציג ה-AI מה אתם צריכים — &quot;50 חולצות לצוות ו-200 עטים לכנס&quot; — והוא ימליץ, יחשב מחיר מדויק לפי המחירון ויסגור הזמנה. אפשר גם לצרף לוגו בצ׳אט.</p>
          <a href="#chat" className="w-fit rounded-lg bg-foreground px-6 py-3 font-medium text-background">פתיחת צ׳אט</a>
        </GlowCard>
      </section>

      <section id="faq" className="scroll-mt-24 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold md:text-3xl">שאלות נפוצות</h2>
          <Link href="/faq" className="py-2 text-sm text-muted-foreground hover:text-foreground">לכל השאלות ←</Link>
        </div>
        <FaqList items={FAQ.slice(0, 6)} />
      </section>
    </div>
  );
}

function HeroTile({ src, alt, href, label, price, className = "", priority, sizes }: { src: string; alt: string; href: string; label: string; price?: string; className?: string; priority?: boolean; sizes: string }) {
  return (
    <Link href={href} className={`group block ${className}`}>
      <GlowCard className="p-1.5 md:p-2" inner="relative min-h-40 p-0 md:min-h-52">
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute right-3 bottom-3 rounded-full bg-black/75 px-3 py-1 text-xs text-white backdrop-blur">{label}{price && <span className="text-white/70"> · מ־{price}</span>}</span>
      </GlowCard>
    </Link>
  );
}
