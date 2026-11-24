import Link from "next/link";
import { fromPrice, ils, type Product } from "@/lib/catalog";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

export function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/p/${p.id}`} className="block h-full">
      <GlowCard inner="flex flex-col gap-4">
        <div className="mx-auto aspect-square w-full max-w-48"><Mockup kind={p.mockup} uid={`-c-${p.id}`} tint={p.options.find((o) => o.kind === "color")?.values[0].color} /></div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="text-sm text-neutral-400">{p.desc}</p>
          <p className="text-sm">החל מ־<b>{ils(fromPrice(p))}</b> <span className="text-neutral-500">ליח׳ כולל מע״מ</span></p>
        </div>
      </GlowCard>
    </Link>
  );
}
