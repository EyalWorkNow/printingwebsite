import { GlowCard } from "./glow-card";

/** Simple text page (about / legal). Sections: [heading, paragraphs[]]. */
export function DocPage({ title, intro, sections, note }: { title: string; intro?: string; sections: [string, string[]][]; note?: string }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {intro && <p className="text-neutral-400 md:text-lg">{intro}</p>}
      </header>
      <GlowCard className="h-auto" inner="space-y-7 p-6 md:p-8">
        {sections.map(([h, ps]) => (
          <section key={h} className="space-y-2">
            <h2 className="text-lg font-semibold">{h}</h2>
            {ps.map((x) => <p key={x} className="leading-relaxed text-neutral-300">{x}</p>)}
          </section>
        ))}
      </GlowCard>
      {note && <p className="text-xs text-neutral-500">{note}</p>}
    </article>
  );
}
