import { Suspense } from "react";
import Link from "next/link";
import { Loader2, Settings } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { userOrders } from "@/lib/orders";
import { money, type Market } from "@/lib/catalog";
import { LOCALE_META } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { GlowCard } from "@/components/glow-card";
import { AuthForms, DeleteForm, LogoutButton, PasswordForm, ProfileForm, ResetForm } from "@/components/account-forms";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.account.title} — ${d.meta.titleSuffix}`, robots: { index: false } };
}

export default async function AccountPage({ searchParams }: PageProps<"/[lang]/account">) {
  const { d } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{d.account.title}</h1>
      <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />}><View searchParams={searchParams} /></Suspense>
    </div>
  );
}

async function View({ searchParams }: { searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const token = one(sp.token);
  if (token) return <ResetForm token={token} />;
  const user = await currentUser();
  const mode = one(sp.mode);
  if (!user) return <AuthForms initial={mode === "register" || mode === "forgot" ? mode : "login"} next={one(sp.next)} />;

  const { lang, d, f, href } = await getI18n();
  const k = d.account, intl = LOCALE_META[lang].intl;
  const orders = await userOrders(user.id);
  const card = "h-auto";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-lg">{f(k.hello, { name: user.name })} <span className="text-sm text-muted-foreground" dir="ltr">· {user.email}</span></p>
        <div className="ms-auto flex items-center gap-2">
          {user.isAdmin && <Link href="/admin" className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:border-foreground/40"><Settings className="h-4 w-4" /> {k.adminLink}</Link>}
          <LogoutButton className="rounded-lg border px-3 py-1.5 text-sm hover:border-foreground/40" />
        </div>
      </div>

      <GlowCard className={card} inner="space-y-4">
        <h2 className="text-lg font-semibold">{k.ordersTitle}</h2>
        {!orders.length ? <p className="text-sm text-muted-foreground">{k.noOrders}</p> : (
          <ul className="divide-y">
            {orders.map((o) => {
              const m = money({ market: { currency: o.currency ?? "ILS", intl: LOCALE_META[o.lang ?? "he"].intl, vat: 0, weekend: [] } as unknown as Market });
              return (
                <li key={o.id}>
                  <details className="group py-3">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-medium" dir="ltr">{f(k.order, { id: o.id })}</span>
                      <span className="text-sm text-muted-foreground">{f(k.placed, { date: new Date(o.createdAt).toLocaleDateString(intl) })}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{k.statuses[o.status] ?? o.status}</span>
                      <span className="ms-auto font-semibold" dir="ltr">{m(o.totals.total)}</span>
                    </summary>
                    <div className="mt-3 space-y-1 text-sm text-foreground/80">
                      <p className="font-medium">{k.items}</p>
                      <ul className="list-inside list-disc">{o.items.map((l, i) => <li key={i}>{l.quantity.toLocaleString(intl)} × {l.productName}</li>)}</ul>
                      <p className="text-muted-foreground">{k.shipping}: {o.totals.shippingLabel}</p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </GlowCard>

      <GlowCard className={card} inner="space-y-4">
        <div><h2 className="text-lg font-semibold">{k.profileTitle}</h2><p className="text-sm text-muted-foreground">{k.profileHint}</p></div>
        <ProfileForm user={user} />
      </GlowCard>

      <GlowCard className={card} inner="space-y-4">
        <h2 className="text-lg font-semibold">{k.passwordTitle}</h2>
        <PasswordForm />
      </GlowCard>

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">{k.deleteTitle}</summary>
        <div className="pt-4"><DeleteForm /></div>
      </details>
      <p className="text-center text-sm"><Link href={href("/")} className="text-muted-foreground hover:text-foreground">{d.checkout.backHome}</Link></p>
    </div>
  );
}
