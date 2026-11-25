"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import * as auth from "@/lib/auth";
import type { AuthError } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale, localePath, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dicts";
import { SITE_URL } from "@/lib/env";

// Account forms (useActionState). Every action reads its language from a hidden "lang" field for messages and links.
export type State = { error?: string; ok?: boolean } | null;
const langOf = (f: FormData): Locale => { const l = f.get("lang"); return isLocale(l) ? l : DEFAULT_LOCALE; };
const msg = (l: Locale, e: AuthError) => ({ error: DICTS[l].account.errors[e] });
/** Only same-site paths ("/admin", "/en/checkout") — never "//evil.com". */
const safeNext = (v: FormDataEntryValue | null, l: Locale) => (typeof v === "string" && /^\/(?!\/)[\w\-/?=&.%#]*$/.test(v) ? v : localePath(l, "/account"));

export async function loginAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), e = await auth.login(f.get("email"), f.get("password"));
  if (e) return msg(l, e);
  redirect(safeNext(f.get("next"), l));
}

export async function registerAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), e = await auth.register({ email: f.get("email"), password: f.get("password"), name: f.get("name"), phone: f.get("phone"), lang: l });
  if (e) return msg(l, e);
  redirect(safeNext(f.get("next"), l));
}

export async function logoutAction(f: FormData) {
  await auth.logout();
  redirect(localePath(langOf(f), "/account"));
}

/** Always answers "sent" (doesn't reveal which emails have accounts). */
export async function forgotAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), r = await auth.createReset(f.get("email"));
  if (r) {
    const { transport } = await import("@/lib/order-email");
    const tr = await transport(), d = DICTS[l], brand = d.meta.brand;
    const link = `${SITE_URL}${localePath(l, "/account")}?token=${r.token}`;
    if (tr) await tr.t.sendMail({
      from: tr.from(brand), to: r.user.email, subject: d.account.resetSubject.replace("{brand}", brand),
      text: `${d.account.resetBody}\n${link}\n\n${d.account.resetIgnore}`,
      html: `<div dir="${l === "he" || l === "ar" ? "rtl" : "ltr"}" style="font-family:system-ui,sans-serif;font-size:15px"><p>${d.account.resetBody}</p><p><a href="${link}">${link}</a></p><p style="color:#666">${d.account.resetIgnore}</p></div>`,
    }).catch((e) => console.error("[account] reset email", e));
    else console.warn("[account] SMTP_URL not set — reset email not sent");
  }
  return { ok: true };
}

export async function resetAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), e = await auth.resetPassword(f.get("token"), f.get("password"));
  if (e) return msg(l, e);
  redirect(localePath(l, "/account"));
}

async function me() {
  const u = await auth.currentUser();
  if (!u) throw new Error("unauthorized");
  return u;
}

export async function profileAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), u = await me();
  const g = (k: string) => f.get(k);
  const e = await auth.updateProfile(u, { name: g("name"), phone: g("phone"), email: g("email"), profile: { address: g("address"), city: g("city"), zip: g("zip"), business: g("business"), businessId: g("businessId") } });
  if (e) return msg(l, e);
  refresh();
  return { ok: true };
}

export async function passwordAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), e = await auth.changePassword(await me(), f.get("current"), f.get("password"));
  return e ? msg(l, e) : { ok: true };
}

export async function deleteAction(_: State, f: FormData): Promise<State> {
  const l = langOf(f), e = await auth.deleteAccount(await me(), f.get("password"));
  if (e) return msg(l, e);
  redirect(localePath(l, "/"));
}
