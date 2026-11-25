import Link from "next/link";
import Image from "next/image";
import { Upload, Eye, Truck, MessageCircle, ArrowLeft } from "lucide-react";
import { fromPrice, money, num, liveProducts } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { getI18n } from "@/i18n/server";
import { Mockup } from "@/components/mockup";
import { ProductCard } from "@/components/product-card";
import { GlowCard } from "@/components/glow-card";
import { HeroMarquee } from "@/components/hero-marquee";
import { FaqList } from "@/components/faq-list";

const STEP_ICONS = [Eye, Upload, Truck];
const POPULAR = ["tshirt", "hoodie", "mug", "roll-up", "sticker", "tote", "notebook", "pen", "jacket", "charger"];

export default async function Home() {
  const { lang, d, href, f, dir } = await getI18n();
  const h = d.home;
  const cat = await getLocalizedCatalog(lang);
  const m = money(cat);
  const products = liveProducts(cat);
  const popular = POPULAR.flatMap((id) => products.filter((p) => p.id === id)).slice(0, 6);

  return (
    <div className="space-y-24">
      <HeroMarquee tagline={d.footer.tagline} title1={h.heroTitle1} title2={h.heroTitle2} text={h.heroText} cta={h.ctaProducts} ctaHref={href("/products")} chat={h.ctaChat}
        fromLabel={d.product.cardFrom} perUnit={`${d.product.perUnit} ${d.vat.short}`} details={h.heroDetails} dir={dir}
        items={[...popular, ...products.filter((p) => !popular.includes(p))].flatMap((p) => p.image ? [{ id: p.id, name: p.name, image: p.image, price: m(fromPrice(cat, p)), href: href(`/p/${p.id}`) }] : [])} />

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
