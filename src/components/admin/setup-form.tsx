"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { useAdmin } from "@/i18n/admin/client";
import { adminLogout, claimAdminAction } from "@/app/admin/actions";

export function SetupForm() {
  const T = useAdmin().t.setup;
  const [state, action, pending] = useActionState(claimAdminAction, null);
  if (state?.ok) return (
    <>
      <p role="status">{T.saved}</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load: the proxy re-checks the account */}
      <a href="/admin" className="inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">{T.go}</a>
    </>
  );
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="block space-y-1 text-sm"><span>{T.code}</span><input name="code" type="password" required autoComplete="off" dir="ltr" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50" /></label>
        {state?.error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{T.badCode}</p>}
        <button disabled={pending} className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />} {T.save}</button>
      </form>
      <form action={adminLogout}><button className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">{T.other}</button></form>
    </div>
  );
}
