"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutGrid, Printer, Sticker, Shirt, Gift, Tag } from "lucide-react";
import { LiquidNav, type LiquidNavItem, type NimbusFx } from "./liquid-nav";
import { useCatalog } from "./catalog-provider";
import { useI18n } from "@/i18n/client";

// Header category nav (liquid pill). Categories come from the live catalog; new ones get a tag icon.
const ICONS: Record<string, [React.ReactNode, NimbusFx]> = {
  print: [<Printer key="i" />, "drop"], signs: [<Sticker key="i" />, "spin"], apparel: [<Shirt key="i" />, "wave"], promo: [<Gift key="i" />, "glow"],
};

export function ShopNav() {
  const cat = useCatalog();
  const { d, href } = useI18n();
  const path = usePathname();
  const items: LiquidNavItem[] = [
    { label: d.nav.allProducts, href: href("/products"), icon: <LayoutGrid />, fx: "pop" },
    ...cat.categories.map((c) => ({ label: c.name, href: href(`/c/${c.id}`), icon: ICONS[c.id]?.[0] ?? <Tag />, fx: ICONS[c.id]?.[1] ?? "pop" })),
  ];
  // current page → item: /products, /c/<id>, or a product page (its category)
  const product = /\/p\/([^/]+)$/.exec(path)?.[1];
  const catOf = product && cat.products.find((p) => p.id === product)?.category;
  const fromPath = items.findIndex((it) => it.href === path || (catOf && it.href === href(`/c/${catOf}`)));
  // the drop moves on click, before the next page has loaded
  const [picked, setPicked] = useState<{ i: number; path: string }>();
  const active = picked?.path === path ? picked.i : fromPath;
  return <LiquidNav items={items} active={active} onPick={(i) => setPicked({ i, path })} label={d.nav.categories} />;
}
