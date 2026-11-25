import { GlowCard } from "./glow-card";

/** Simple text page (legal). Sections: heading + paragraphs. */
export function DocPage({ title, intro, sections, note }: { title: string; intro?: string; sections: { h: string; p: string[] }[]; note?: string }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {intro && <p className="text-muted-foreground md:text-lg">{intro}</p>}
      </header>
      <GlowCard className="h-auto" inner="space-y-7 p-6 md:p-8">
        {sections.map(({ h, p }) => (
          <section key={h} className="space-y-2">
            <h2 className="text-lg font-semibold">{h}</h2>
            {p.map((x) => <p key={x} className="leading-relaxed text-foreground/80">{x}</p>)}
          </section>
        ))}
      </GlowCard>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </article>
  );
}

/** Fill a section list's {placeholders}. */
export const fillSections = (sections: { h: string; p: string[] }[], v: Record<string, string>) =>
  sections.map((s) => ({ h: s.h, p: s.p.map((x) => x.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "")) }));
