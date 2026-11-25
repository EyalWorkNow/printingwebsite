import Image from "next/image";
import Link from "next/link";
import { GlowCard } from "@/components/glow-card";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.about.title} — ${d.meta.titleSuffix}`, description: d.about.metaDesc };
}

export default async function About() {
  const { d, href } = await getI18n();
  const a = d.about;
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold md:text-5xl">{a.heading}</h1>
          <p className="text-muted-foreground md:text-lg">{a.text}</p>
          <Link href={href("/products")} className="inline-block rounded-lg bg-foreground px-6 py-3 font-medium text-background">{a.cta}</Link>
        </div>
        <GlowCard className="h-auto" inner="relative aspect-square p-0"><Image src="/img/set-flatlay.webp" alt={a.imgAlt} fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" /></GlowCard>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {a.points.map(({ t, d: x }) => <GlowCard key={t} inner="space-y-2"><h2 className="text-lg font-semibold">{t}</h2><p className="text-sm text-muted-foreground">{x}</p></GlowCard>)}
      </section>
    </div>
  );
}
