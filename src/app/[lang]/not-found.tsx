import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { d, href } = await getI18n();
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">{d.notFound.title}</h1>
      <p className="text-muted-foreground">{d.notFound.text}</p>
      <div className="flex gap-3"><Link href={href("/")} className="rounded-lg bg-foreground px-5 py-2.5 font-medium text-background">{d.notFound.home}</Link><Link href={href("/products")} className="rounded-lg border px-5 py-2.5">{d.notFound.products}</Link></div>
    </main>
  );
}
