"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const n = useCart().length;
  return (
    <Link href="/cart" aria-label={`עגלת קניות, ${n} פריטים`} className="relative flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-foreground/80 hover:border-foreground/40 hover:text-foreground">
      <ShoppingCart className="h-4 w-4" /> <span className="hidden sm:inline">עגלה</span>
      {n > 0 && <span className="absolute -top-2 -left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-semibold text-background">{n}</span>}
    </Link>
  );
}
