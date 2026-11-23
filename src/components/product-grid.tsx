"use client";

import { CreditCard, FileText, Image as ImageIcon, Sticker, Coffee, Shirt } from "lucide-react";
import { PRODUCTS, ils } from "@/lib/catalog";
import { GlowCard } from "./glow-card";

const ICONS = { "business-cards": CreditCard, flyers: FileText, posters: ImageIcon, stickers: Sticker, mugs: Coffee, tshirts: Shirt };
const AREAS = Array(6).fill("md:col-span-6 xl:col-span-4");

export function ProductGrid() {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {PRODUCTS.map((p, i) => {
        const Icon = ICONS[p.id as keyof typeof ICONS];
        return (
          <li key={p.id} className={`min-h-[14rem] list-none ${AREAS[i]}`}>
            <button className="h-full w-full text-right" onClick={() => { window.dispatchEvent(new CustomEvent("pick-product", { detail: p.id })); document.getElementById("order")?.scrollIntoView({ behavior: "smooth" }); }}>
              <GlowCard inner="flex flex-col justify-between gap-6">
                <div className="w-fit rounded-lg border border-gray-600 p-2"><Icon className="h-4 w-4 text-neutral-400" /></div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-balance md:text-2xl">{p.name}</h3>
                  <p className="text-sm text-neutral-400 md:text-base">{p.desc}</p>
                  <p className="text-sm">החל מ־<b>{ils(p.tiers.at(-1)!.unit)}</b> ליחידה</p>
                </div>
              </GlowCard>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
