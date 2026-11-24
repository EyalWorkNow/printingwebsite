import Link from "next/link";
import Image from "next/image";
import { ils, type Product } from "@/lib/catalog";
import { Mockup } from "./mockup";
import { GlowCard } from "./glow-card";

export function ProductCard({ p, from }: { p: Product; from: number }) {
  return (
    <Link href={`/p/${p.id}`} className="group block h-full">
      <GlowCard inner="flex flex-col gap-4 p-4">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-900/60">
          {p.image ? (
            <Image src={p.image} alt={p.name} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className="mx-auto h-full max-w-56 p-4"><Mockup kind={p.mockup} uid={`-c-${p.id}`} tint={p.options.find((o) => o.kind === "color")?.values[0].color} /></div>
          )}
        </div>
        <div className="space-y-1.5 px-1">
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="text-sm text-neutral-400">{p.desc}</p>
          <p className="text-sm">החל מ־<b>{ils(from)}</b> <span className="text-neutral-500">ליח׳ כולל מע״מ</span></p>
        </div>
      </GlowCard>
    </Link>
  );
}
