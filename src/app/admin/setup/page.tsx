"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/i18n/admin/client";
import { setupAdmin } from "./actions";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50";

export default function AdminSetup() {
  const T = useAdmin().t.setup;
  const [state, action, pending] = useActionState(setupAdmin, null);
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-12">
      <h1 className="text-2xl font-bold">{T.title}</h1>
      {state?.ok ? (
        <>
          <p role="status">{T.saved}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page load so the browser asks for the new login */}
          <a href="/admin" className="inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">{T.go}</a>
        </>
      ) : (
        <form action={action} className="space-y-3">
          <p className="text-sm text-muted-foreground">{T.intro}</p>
          <label className="block space-y-1 text-sm"><span>{T.code}</span><input name="code" type="password" required autoComplete="off" dir="ltr" className={input} /></label>
          <label className="block space-y-1 text-sm"><span>{T.user}</span><input name="user" required minLength={2} maxLength={40} autoComplete="username" dir="ltr" className={input} /></label>
          <label className="block space-y-1 text-sm"><span>{T.password}</span><input name="password" type="password" required minLength={10} autoComplete="new-password" dir="ltr" className={input} /></label>
          <label className="block space-y-1 text-sm"><span>{T.confirm}</span><input name="confirm" type="password" required minLength={10} autoComplete="new-password" dir="ltr" className={input} /></label>
          {state?.error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{T[state.error]}</p>}
          <button disabled={pending} className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />} {T.save}</button>
        </form>
      )}
    </main>
  );
}
