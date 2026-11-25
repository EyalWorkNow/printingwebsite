"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, Printer, Sticker, Shirt, Gift, Tag, Sun, Moon, CircleUser, ShoppingCart } from "lucide-react";
import { LiquidNav, type LiquidNavItem, type NimbusFx } from "./liquid-nav";
import { useCatalog } from "./catalog-provider";
import { useI18n } from "@/i18n/client";
import { useTheme } from "./theme-toggle";
import { useMe } from "@/lib/account-client";
import { useCart } from "@/lib/cart";

/** Current path as the visitor sees it. Hebrew pages are served from /he/… internally (proxy rewrite) and the
 *  prerendered page can report that path — strip it so "/he/c/apparel" matches the "/c/apparel" links. */
function useSitePath() {
  return usePathname().replace(/^\/he(?=\/|$)/, "") || "/";
}

/** Item picked by a click (the drop moves before the next page loads). Forgotten as soon as the URL changes, so going
 *  Back to a page never shows an old pick as current. */
function usePicked(path: string) {
  const [picked, setPicked] = useState<number>();
  const [at, setAt] = useState(path);
  if (at !== path) { setAt(path); setPicked(undefined); } // reset during render (React's "adjust state on prop change")
  return [at === path ? picked : undefined, setPicked] as const;
}

// Header category nav (liquid pill). Categories come from the live catalog; new ones get a tag icon.
const ICONS: Record<string, [React.ReactNode, NimbusFx]> = {
  print: [<Printer key="i" />, "drop"], signs: [<Sticker key="i" />, "spin"], apparel: [<Shirt key="i" />, "wave"], promo: [<Gift key="i" />, "glow"],
};

export function ShopNav() {
  const cat = useCatalog();
  const { d, href } = useI18n();
  const path = useSitePath();
  const items: LiquidNavItem[] = [
    { label: d.nav.home, href: href("/"), icon: <House />, fx: "glow" },
    { label: d.nav.allProducts, href: href("/products"), icon: <LayoutGrid />, fx: "pop" },
    ...cat.categories.map((c) => ({ label: c.name, href: href(`/c/${c.id}`), icon: ICONS[c.id]?.[0] ?? <Tag />, fx: ICONS[c.id]?.[1] ?? "pop" })),
  ];
  // current page → item: /products, /c/<id>, or a product page (its category)
  const product = /\/p\/([^/]+)$/.exec(path)?.[1];
  const catOf = product && cat.products.find((p) => p.id === product)?.category;
  const fromPath = items.findIndex((it) => it.href === path || (catOf && it.href === href(`/c/${catOf}`)));
  // the drop moves on click, before the next page has loaded
  const [picked, setPicked] = usePicked(path);
  return <LiquidNav items={items} active={picked ?? fromPath} onPick={setPicked} label={d.nav.categories} />;
}

/** Small icons-only pill next to the categories: theme, account, cart (same liquid look). */
export function ShopActions() {
  const { d, href, f } = useI18n();
  const path = useSitePath();
  const [dark, toggle] = useTheme();
  const me = useMe();
  const n = useCart().length;
  const items: LiquidNavItem[] = [
    { label: dark ? d.theme.toLight : d.theme.toDark, onClick: toggle, icon: dark ? <Sun /> : <Moon />, fx: "spin" },
    { label: me ? me.name.split(" ")[0] : d.nav.login, aria: me ? `${d.nav.account} · ${me.name}` : d.nav.login, href: href("/account"), icon: <CircleUser />, fx: "wave" },
    { label: d.nav.cart, aria: f(d.nav.cartAria, { n }), href: href("/cart"), icon: <ShoppingCart />, fx: "drop", badge: n },
  ];
  const fromPath = path === href("/account") ? 1 : path === href("/cart") || path === href("/checkout") ? 2 : -1;
  const [picked, setPicked] = usePicked(path);
  return <LiquidNav compact items={items} active={picked ?? fromPath} onPick={(i) => { if (items[i].href) setPicked(i); }} label={d.nav.account} />;
}
