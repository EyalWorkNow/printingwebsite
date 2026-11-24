import Link from "next/link";

export function AdminHeader({ active }: { active: "orders" | "catalog" }) {
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 ${on ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`;
  return (
    <header className="flex flex-wrap items-center gap-4">
      <span className="text-xl font-bold">דפוס<span className="text-neutral-500">.</span> <span className="text-base font-normal text-neutral-400">ניהול</span></span>
      <nav className="flex gap-1 text-sm" aria-label="ניהול">
        <Link href="/admin" className={tab(active === "orders")}>הזמנות</Link>
        <Link href="/admin/catalog" className={tab(active === "catalog")}>מוצרים ומחירים</Link>
      </nav>
      <Link href="/" className="ms-auto text-sm text-neutral-400 hover:text-white">לאתר ←</Link>
    </header>
  );
}
