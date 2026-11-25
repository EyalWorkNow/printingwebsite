"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";

// Home hero: tagline pill, word-by-word title, text, CTAs, and an endless strip of product cards.
// Hover/focus a card → product name, lowest unit price and a details link; the strip pauses while the pointer is on it.
export type HeroItem = { id: string; name: string; image: string; price: string; href: string };
type Props = {
  tagline: string; title1: string; title2: string; text: string; cta: string; ctaHref: string; chat: string;
  fromLabel: string; perUnit: string; details: string; items: HeroItem[]; dir: "rtl" | "ltr";
};

const FADE = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 20 } } };

export function HeroMarquee(p: Props) {
  const still = useReducedMotion();
  const words = (s: string) => s.split(" ").map((w, i) => <motion.span key={i} variants={FADE} className="inline-block">{w}&nbsp;</motion.span>);
  return (
    <section className="relative flex flex-col items-center pt-6 text-center">
      <motion.div initial="hidden" animate="show" variants={FADE} className="mb-5 inline-block rounded-full border bg-card/50 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
        {p.tagline}
      </motion.div>
      <motion.h1 initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        className="text-4xl leading-[1.1] font-bold tracking-tight text-balance md:text-7xl">
        {words(p.title1)}<br />
        <span className="bg-gradient-to-l from-[#b23d8a] via-[#9a6200] to-[#3f7020] bg-clip-text text-transparent dark:from-[#dd7bbb] dark:via-[#d79f1e] dark:to-[#5a922c]">{words(p.title2)}</span>
      </motion.h1>
      <motion.p initial="hidden" animate="show" variants={FADE} transition={{ delay: 0.5 }} className="mt-6 max-w-xl text-muted-foreground md:text-lg">{p.text}</motion.p>
      <motion.div initial="hidden" animate="show" variants={FADE} transition={{ delay: 0.6 }} className="mt-8 flex flex-wrap justify-center gap-3">
        <motion.span whileHover={still ? undefined : { scale: 1.05 }} whileTap={still ? undefined : { scale: 0.95 }} className="inline-block">
          <Link href={p.ctaHref} className="inline-block rounded-full bg-foreground px-8 py-3 font-semibold text-background shadow-lg">{p.cta}</Link>
        </motion.span>
        <a href="#chat" className="flex items-center gap-2 rounded-full border px-6 py-3 font-medium text-foreground/80 hover:border-foreground/40"><MessageCircle className="h-4 w-4" /> {p.chat}</a>
      </motion.div>

      {/* full-bleed strip; dir=ltr so the loop math is the same in RTL; cards set their own direction */}
      <div dir="ltr" className="group/strip relative mt-14 w-screen overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="flex w-max animate-[hero-marquee_60s_linear_infinite] gap-5 pe-5 group-hover/strip:[animation-play-state:paused] group-focus-within/strip:[animation-play-state:paused] motion-reduce:animate-none">
          {[...p.items, ...p.items].map((it, i) => {
            const copy = i >= p.items.length; // second half only completes the loop: hidden from assistive tech and tab order
            return (
              <li key={i} aria-hidden={copy || undefined} className={`shrink-0 transition-transform duration-300 hover:z-10 hover:rotate-0 hover:scale-105 ${i % 2 ? "rotate-[4deg]" : "-rotate-2"}`}>
                <Link href={it.href} tabIndex={copy ? -1 : undefined} dir={p.dir} className="group/card relative block aspect-[3/4] h-52 overflow-hidden rounded-2xl bg-muted shadow-md outline-none focus-visible:ring-2 focus-visible:ring-foreground md:h-64">
                  <Image src={it.image} alt={it.name} fill sizes="(min-width: 768px) 192px, 156px" className="object-cover transition duration-500 group-hover/card:scale-110" />
                  {/* touch screens (no hover): name + price always visible; with a mouse: on hover/focus */}
                  <div className="absolute inset-0 flex flex-col justify-end gap-1 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 text-start text-white transition duration-300 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:translate-y-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-visible/card:translate-y-0 [@media(hover:hover)]:group-focus-visible/card:opacity-100">
                    <span className="text-sm leading-tight font-semibold md:text-base">{it.name}</span>
                    <span className="text-xs text-white/85">{p.fromLabel}<b className="text-sm text-white"><bdi>{it.price}</bdi></b><br />{p.perUnit}</span>
                    <span className="mt-1 hidden items-center gap-1 self-start rounded-full bg-white px-3 py-1 text-xs font-medium text-black [@media(hover:hover)]:inline-flex">
                      {p.details} {p.dir === "rtl" ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
