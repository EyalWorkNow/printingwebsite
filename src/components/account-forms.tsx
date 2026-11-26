"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { authChanged } from "@/lib/account-client";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { GlowCard } from "@/components/glow-card";
import type { User } from "@/lib/auth";
import * as A from "@/app/[lang]/(shop)/account/actions";
import { googleIdToken } from "@/lib/firebase-client";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50";
const btn = "flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50";

/** useActionState, submitted via onSubmit so the form keeps what the user typed when the server answers with an error
 *  (a plain `action={…}` form is reset by React after every submission). */
function useAct(fn: (s: A.State, f: FormData) => Promise<A.State>, confirmText?: string) {
  const [state, act, pending] = useActionState(fn, null);
  const [, start] = useTransition();
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (confirmText && !confirm(confirmText)) return;
    const fd = new FormData(e.currentTarget);
    start(() => act(fd));
  };
  return [state, submit, pending] as const;
}

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block space-y-1 text-sm"><span className="text-muted-foreground">{label}</span><input className={input} {...p} /></label>;
}
function Status({ state, ok }: { state: A.State; ok?: string }) {
  if (state?.error) return <p className="text-sm text-red-600 dark:text-red-400" role="alert">{state.error}</p>;
  if (state?.ok && ok) return <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{ok}</p>;
  return null;
}
function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <button disabled={pending} className={btn}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} {children}</button>;
}

function GoogleButton({ next }: { next?: string }) {
  const { lang, d } = useI18n();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const go = () => start(async () => {
    setErr("");
    try { const r = await A.firebaseLoginAction(await googleIdToken(), lang, next); if (r?.error) setErr(r.error); }
    catch (e) { if (!String((e as { code?: string })?.code).includes("popup-closed")) setErr(d.account.errors.google); }
  });
  return (
    <div className="space-y-3">
      <button type="button" onClick={go} disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <svg aria-hidden viewBox="0 0 48 48" className="h-4 w-4"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>}
        {d.account.google}
      </button>
      {err && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{err}</p>}
      <p className="flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{d.account.or}</p>
    </div>
  );
}

/** Sign in / register / forgot password — signed-out view of /account. */
export function AuthForms({ initial, next }: { initial: "login" | "register" | "forgot"; next?: string }) {
  const { lang, d } = useI18n();
  const k = d.account;
  const [mode, setMode] = useState(initial);
  useEffect(() => { authChanged(); }, []); // shown after sign-out: the header must drop the old name
  const [ls, login, lp] = useAct(A.loginAction);
  const [rs, register, rp] = useAct(A.registerAction);
  const [fs, forgot, fp] = useAct(A.forgotAction);
  const hidden = <><input type="hidden" name="lang" value={lang} />{next && <input type="hidden" name="next" value={next} />}</>;
  const tab = (m: typeof mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
      className={`flex-1 rounded-lg py-2 text-sm ${mode === m ? "bg-foreground/10 font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );
  return (
    <GlowCard className="mx-auto h-auto max-w-md" inner="space-y-5">
      {mode !== "forgot" && <GoogleButton next={next} />}
      {mode !== "forgot" && <div role="tablist" aria-label={k.tabsAria} className="flex gap-1 rounded-xl border p-1">{tab("login", k.login)}{tab("register", k.register)}</div>}
      {mode === "login" && (
        <form onSubmit={login} className="space-y-3">
          {hidden}
          <Field label={k.email} name="email" type="email" required autoComplete="email" dir="ltr" />
          <Field label={k.password} name="password" type="password" required autoComplete="current-password" dir="ltr" />
          <Status state={ls} />
          <Submit pending={lp}>{k.login}</Submit>
          <button type="button" onClick={() => setMode("forgot")} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">{k.forgot}</button>
        </form>
      )}
      {mode === "register" && (
        <form onSubmit={register} className="space-y-3">
          {hidden}
          <Field label={k.name} name="name" required minLength={2} autoComplete="name" />
          <Field label={k.email} name="email" type="email" required autoComplete="email" dir="ltr" />
          <Field label={k.phone} name="phone" type="tel" autoComplete="tel" dir="ltr" />
          <Field label={k.passwordNew} name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" />
          <Status state={rs} />
          <Submit pending={rp}>{k.register}</Submit>
        </form>
      )}
      {mode === "forgot" && (
        <form onSubmit={forgot} className="space-y-3">
          {hidden}
          <h2 className="text-lg font-semibold">{k.forgotTitle}</h2>
          {fs?.ok ? <p role="status">{k.forgotSent}</p> : <>
            <p className="text-sm text-muted-foreground">{k.forgotHint}</p>
            <Field label={k.email} name="email" type="email" required autoComplete="email" dir="ltr" />
            <Submit pending={fp}>{k.forgotSend}</Submit>
          </>}
          <button type="button" onClick={() => setMode("login")} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">{k.backToLogin}</button>
        </form>
      )}
    </GlowCard>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { lang, d, href } = useI18n();
  const [s, action, p] = useAct(A.resetAction);
  return (
    <GlowCard className="mx-auto h-auto max-w-md" inner="space-y-4">
      <h2 className="text-lg font-semibold">{d.account.resetTitle}</h2>
      <form onSubmit={action} className="space-y-3">
        <input type="hidden" name="lang" value={lang} /><input type="hidden" name="token" value={token} />
        <Field label={d.account.passwordNew} name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" />
        <Status state={s} />
        <Submit pending={p}>{d.account.resetSave}</Submit>
      </form>
      <Link href={href("/account")} className="text-sm text-muted-foreground underline underline-offset-4">{d.account.backToLogin}</Link>
    </GlowCard>
  );
}

export function ProfileForm({ user }: { user: User }) {
  const { lang, d } = useI18n();
  const k = d.account, p = user.profile;
  const [s, action, pending] = useAct(A.profileAction);
  useEffect(() => { authChanged(); }, [s]); // mount = just signed in; saved = name may have changed
  return (
    <form onSubmit={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="lang" value={lang} />
      <Field label={k.name} name="name" defaultValue={user.name} required minLength={2} autoComplete="name" />
      <Field label={k.email} name="email" type="email" defaultValue={user.email} required autoComplete="email" dir="ltr" />
      <Field label={k.phone} name="phone" type="tel" defaultValue={user.phone} autoComplete="tel" dir="ltr" />
      <Field label={k.address} name="address" defaultValue={p.address} autoComplete="street-address" />
      <Field label={k.city} name="city" defaultValue={p.city} autoComplete="address-level2" />
      <Field label={k.zip} name="zip" defaultValue={p.zip} autoComplete="postal-code" />
      <Field label={k.business} name="business" defaultValue={p.business} autoComplete="organization" />
      <Field label={k.businessId} name="businessId" defaultValue={p.businessId} />
      <div className="flex items-center gap-3 sm:col-span-2"><Submit pending={pending}>{k.save}</Submit><Status state={s} ok={k.saved} /></div>
    </form>
  );
}

export function PasswordForm() {
  const { lang, d } = useI18n();
  const k = d.account;
  const [s, action, pending] = useAct(A.passwordAction);
  return (
    <form onSubmit={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="lang" value={lang} />
      <Field label={k.currentPassword} name="current" type="password" required autoComplete="current-password" dir="ltr" />
      <Field label={k.newPassword} name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" />
      <div className="flex items-center gap-3 sm:col-span-2"><Submit pending={pending}>{k.changePassword}</Submit><Status state={s} ok={k.passwordChanged} /></div>
    </form>
  );
}

export function DeleteForm() {
  const { lang, d } = useI18n();
  const k = d.account;
  const [s, action, pending] = useAct(A.deleteAction, k.deleteConfirm);
  return (
    <form onSubmit={action} className="space-y-3">
      <input type="hidden" name="lang" value={lang} />
      <p className="text-sm text-muted-foreground">{k.deleteHint}</p>
      <div className="max-w-sm"><Field label={k.password} name="password" type="password" required autoComplete="current-password" dir="ltr" /></div>
      <Status state={s} />
      <button disabled={pending} className="rounded-lg border border-red-600/50 px-4 py-2 text-sm text-red-700 hover:bg-red-600/10 disabled:opacity-50 dark:text-red-400">{k.deleteButton}</button>
    </form>
  );
}

export function LogoutButton({ className }: { className?: string }) {
  const { lang, d } = useI18n();
  return <form action={A.logoutAction}><input type="hidden" name="lang" value={lang} /><button className={className}>{d.account.logout}</button></form>;
}
