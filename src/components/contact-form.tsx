"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useI18n } from "@/i18n/client";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/50";

export function ContactForm() {
  const { lang, d } = useI18n();
  const t = d.contact;
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)); // read before await
    setState("busy"); setErr("");
    try {
      const r = await (await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, lang }) })).json();
      if (r.error) throw new Error(r.error);
      setState("done");
    } catch (e) { setErr((e as Error).message || t.error); setState("idle"); }
  }
  if (state === "done") return <p className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400" role="status"><Check className="h-5 w-5" /> {t.sent}</p>;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required minLength={2} placeholder={t.name} aria-label={t.name} className={input} autoComplete="name" />
      <input name="phone" required placeholder={t.phone} aria-label={t.phone} className={input} inputMode="tel" autoComplete="tel" />
      <input name="email" type="email" placeholder={t.email} aria-label={t.email} className={`${input} sm:col-span-2`} autoComplete="email" />
      <textarea name="message" required minLength={5} maxLength={2000} rows={5} placeholder={t.message} aria-label={t.message} className={`${input} resize-y sm:col-span-2`} />
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />{/* honeypot */}
      {err && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2" role="alert">{err}</p>}
      <button disabled={state === "busy"} className="flex items-center justify-center gap-2 rounded-lg bg-foreground py-3 font-medium text-background disabled:opacity-50 sm:col-span-2">{state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} {t.send}</button>
    </form>
  );
}
