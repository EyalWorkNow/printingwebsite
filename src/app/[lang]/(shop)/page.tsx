import Link from "next/link";
import Image from "next/image";
import { Upload, Eye, Truck, MessageCircle, ArrowLeft, Clock, BadgeCheck, Calculator } from "lucide-react";
import { fromPrice, money, num, liveProducts, PRODUCTION_IDS } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { getI18n } from "@/i18n/server";
import { Mockup } from "@/components/mockup";
import { ProductCard } from "@/components/product-card";
import { GlowCard } from "@/components/glow-card";
import { FaqList } from "@/components/faq-list";

const STEP_ICONS = [Eye, Upload, Truck];
const POPULAR = ["tshirt", "hoodie", "mug", "roll-up", "sticker", "tote", "notebook", "pen", "jacket", "charger"];

export default async function Home() {
  const { lang, d, href, f } = await getI18n();
  const h = d.home;
  const cat = await getLocalizedCatalog(lang);
  const m = money(cat);
  const products = liveProducts(cat);
  const popular = POPULAR.flatMap((id) => products.filter((p) => p.id === id)).slice(0, 6);
  const fastest = Math.min(...PRODUCTION_IDS.map((id) => cat.production[id].days));
  const from = (id: string) => { const p = products.find((x) => x.id === id); return p ? m(fromPrice(cat, p)) : undefined; };

  return (
    <div className="space-y-24">
      {/* hero */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-7 text-center lg:text-start">
          <h1 className="text-4xl leading-[1.1] font-bold text-balance md:text-6xl">{h.heroTitle1}<br /><span className="bg-gradient-to-l from-[#b23d8a] via-[#9a6200] to-[#3f7020] bg-clip-text text-transparent dark:from-[#dd7bbb] dark:via-[#d79f1e] dark:to-[#5a922c]">{h.heroTitle2}</span></h1>
          <p className="mx-auto max-w-xl text-muted-foreground md:text-lg lg:mx-0">{h.heroText}</p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href={href("/products")} className="rounded-lg bg-foreground px-6 py-3 font-medium text-background">{h.ctaProducts}</Link>
            <a href="#chat" className="flex items-center gap-2 rounded-lg border px-6 py-3 font-medium text-foreground/80 hover:border-foreground/40"><MessageCircle className="h-4 w-4" /> {h.ctaChat}</a>
          </div>
          <dl className="mx-auto grid max-w-lg grid-cols-3 gap-3 pt-2 text-center lg:mx-0 lg:text-start">
            {[[Clock, fastest === 1 ? h.statFastValue1 : f(h.statFastValueN, { n: fastest }), h.statFast], [Calculator, f(h.statProductsValue, { n: products.length }), h.statProducts], [BadgeCheck, h.statCheckValue, h.statCheck]].map(([I, v, t]) => {
              const Icon = I as typeof Clock;
              return <div key={t as string} className="space-y-1"><dt className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground lg:justify-start"><Icon className="h-3.5 w-3.5" />{t as string}</dt><dd className="font-semibold">{v as string}</dd></div>;
            })}
          </dl>
        </div>

        <div className="grid grid-cols-2 grid-rows-2 gap-3 md:gap-4">
          <HeroTile src="/img/set-apparel.webp" alt={h.tileApparelAlt} href={href("/c/apparel")} label={h.tileApparel} price={from("tshirt")} fromLabel={h.from} className="row-span-2" priority sizes="(min-width: 1024px) 28vw, 50vw" />
          <HeroTile src="/img/set-office.webp" alt={h.tilePromoAlt} href={href("/c/promo")} label={h.tilePromo} price={from("pen")} fromLabel={h.from} sizes="(min-width: 1024px) 20vw, 50vw" />
          <HeroTile src="/img/rollup.webp" alt={h.tileSignsAlt} href={href("/c/signs")} label={h.tileSigns} price={from("sticker")} fromLabel={h.from} sizes="(min-width: 1024px) 20vw, 50vw" />
        </div>
      </section>

      {/* categories */}
      <section id="categories" className="scroll-mt-24 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold md:text-3xl">{h.whatToday}</h2>
          <Link href={href("/products")} className="py-2 text-sm text-muted-foreground hover:text-foreground">{h.allProductsLink}</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cat.categories.map((c) => {
            const items = products.filter((p) => p.category === c.id);
            if (!items.length) return null;
            return (
              <li key={c.id}>
                <Link href={href(`/c/${c.id}`)} className="group block h-full">
                  <GlowCard inner="flex flex-col gap-4 p-4">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/60">
                      {c.image ? <Image src={c.image} alt={c.name} fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
                        : <div className="mx-auto h-full max-w-40 p-3"><Mockup kind={items[0].mockup} uid={`-cat-${c.id}`} /></div>}
                    </div>
                    <div className="space-y-1 px-1">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">{c.name}<ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" /></h3>
                      <p className="text-sm text-muted-foreground">{c.desc}</p>
                      <p className="text-xs text-muted-foreground">{f(h.categoryMeta, { n: num(cat, items.length), price: m(Math.min(...items.map((p) => fromPrice(cat, p)))) })}</p>
                    </div>
                  </GlowCard>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">{h.popular}</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popular.map((p) => <li key={p.id}><ProductCard p={p} from={fromPrice(cat, p)} /></li>)}</ul>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold md:text-3xl">{h.how}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {h.steps.map(({ t, d: desc }, i) => { const I = STEP_ICONS[i]; return (
            <GlowCard key={t} inner="space-y-3">
              <div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">0{i + 1}</span><I className="h-5 w-5 text-muted-foreground" /></div>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </GlowCard>); })}
        </div>
      </section>

      {/* showcase + chat */}
      <section className="grid gap-4 lg:grid-cols-2">
        <GlowCard inner="relative min-h-80 p-0">
          <Image src="/img/set-flatlay.webp" alt={h.kitAlt} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-6 pt-16 text-white">
            <p className="text-lg font-semibold">{h.kitTitle}</p>
            <p className="text-sm text-white/80">{h.kitText}</p>
          </div>
        </GlowCard>
        <GlowCard inner="flex flex-col justify-center gap-5 p-8">
          <div className="w-fit rounded-lg border border-foreground/20 p-2"><MessageCircle className="h-5 w-5 text-foreground/80" /></div>
          <h2 className="text-2xl font-semibold md:text-3xl">{h.chatTitle}</h2>
          <p className="text-muted-foreground">{h.chatText}</p>
          <a href="#chat" className="w-fit rounded-lg bg-foreground px-6 py-3 font-medium text-background">{h.chatCta}</a>
        </GlowCard>
      </section>

      <section id="faq" className="scroll-mt-24 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold md:text-3xl">{h.faqTitle}</h2>
          <Link href={href("/faq")} className="py-2 text-sm text-muted-foreground hover:text-foreground">{h.faqAll}</Link>
        </div>
        <FaqList items={d.faq.items.slice(0, 6)} />
      </section>
    </div>
  );
}

function HeroTile({ src, alt, href, label, price, fromLabel, className = "", priority, sizes }: { src: string; alt: string; href: string; label: string; price?: string; fromLabel: string; className?: string; priority?: boolean; sizes: string }) {
  return (
    <Link href={href} className={`group block ${className}`}>
      <GlowCard className="p-1.5 md:p-2" inner="relative min-h-40 p-0 md:min-h-52">
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover transition duration-700 group-hover:scale-105" />
        <span className="absolute start-3 bottom-3 rounded-full bg-black/75 px-3 py-1 text-xs text-white backdrop-blur">{label}{price && <span className="text-white/70"> · {fromLabel.replace("{price}", price)}</span>}</span>
      </GlowCard>
    </Link>
  );
}
