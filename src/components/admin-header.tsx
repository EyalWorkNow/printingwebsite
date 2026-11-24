import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function AdminHeader({ active }: { active: "orders" | "catalog" }) {
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 ${on ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <header className="flex flex-wrap items-center gap-4">
      <span className="text-xl font-bold">דפוס<span className="text-muted-foreground">.</span> <span className="text-base font-normal text-muted-foreground">ניהול</span></span>
      <nav className="flex gap-1 text-sm" aria-label="ניהול">
        <Link href="/admin" className={tab(active === "orders")}>הזמנות</Link>
        <Link href="/admin/catalog" className={tab(active === "catalog")}>מוצרים ומחירים</Link>
      </nav>
      <ThemeToggle className="ms-auto" />
      <Link href="/" className="py-2 text-sm text-muted-foreground hover:text-foreground">לאתר ←</Link>
    </header>
  );
}
