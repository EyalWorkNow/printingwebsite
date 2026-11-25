import { Suspense } from "react";
import { connection } from "next/server";
import { NoDb, Spinner } from "@/components/admin/common";
import { AdminHeader } from "@/components/admin-header";
import { GlowCard } from "@/components/glow-card";
import { HAS_DB } from "@/lib/db";
import { currentUser, listUsers } from "@/lib/auth";
import { fill } from "@/lib/catalog";
import { adminI18n } from "@/i18n/admin/server";
import { toggleAdmin } from "../actions";

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <AdminHeader active="customers" />
      <Suspense fallback={<Spinner />}><Customers searchParams={searchParams} /></Suspense>
    </main>
  );
}

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  await connection();
  if (!HAS_DB) return <NoDb />;
  const { t, intl } = await adminI18n();
  const T = t.customers;
  const q = String((await searchParams).q ?? "").slice(0, 100);
  const [users, me] = await Promise.all([listUsers(q), currentUser()]);
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{T.title}</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder={T.search} aria-label={T.search} className="w-full max-w-md rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50" />
      </form>
      <p className="text-sm text-muted-foreground">{fill(T.shown, { n: users.length })}</p>
      {!users.length ? <p className="text-muted-foreground">{T.none}</p> : (
        <GlowCard className="h-auto" inner="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-start text-muted-foreground">
              <tr className="border-b">{[T.name, T.email, T.phone, T.joined, T.orders, T.role, ""].map((h, i) => <th key={i} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{u.name} {u.id === me?.id && <span className="text-muted-foreground">{T.you}</span>}</td>
                  <td className="px-3 py-2" dir="ltr"><a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a></td>
                  <td className="px-3 py-2" dir="ltr">{u.phone}</td>
                  <td className="px-3 py-2">{new Date(u.createdAt).toLocaleDateString(intl)}</td>
                  <td className="px-3 py-2">{u.orders ? <a href={`/admin?q=${encodeURIComponent(u.email)}`} className="underline underline-offset-4">{u.orders}</a> : 0}</td>
                  <td className="px-3 py-2">{u.isAdmin ? <span className="rounded-full border px-2 py-0.5 text-xs">{T.admin}</span> : T.customer}</td>
                  <td className="px-3 py-2">
                    {u.id !== me?.id && (
                      <form action={toggleAdmin}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="on" value={u.isAdmin ? "0" : "1"} />
                        <button className="rounded-lg border px-2.5 py-1 text-xs hover:border-foreground/40">{u.isAdmin ? T.removeAdmin : T.makeAdmin}</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlowCard>
      )}
    </section>
  );
}
