import { GlowCard } from "./glow-card";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((f) => (
        <GlowCard key={f.q} inner="p-0">
          <details className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span className="text-neutral-500 transition group-open:rotate-45">+</span></summary>
            <p className="pt-3 text-sm leading-relaxed text-neutral-400">{f.a}</p>
          </details>
        </GlowCard>
      ))}
    </div>
  );
}
