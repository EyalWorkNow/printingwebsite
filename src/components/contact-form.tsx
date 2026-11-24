"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

const input = "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-neutral-400";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget)); // read before await
    setState("busy"); setErr("");
    try {
      const r = await (await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
      if (r.error) throw new Error(r.error);
      setState("done");
    } catch (e) { setErr((e as Error).message); setState("idle"); }
  }
  if (state === "done") return <p className="flex items-center gap-2 text-emerald-400" role="status"><Check className="h-5 w-5" /> ההודעה נשלחה — נחזור אליכם בהקדם.</p>;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required minLength={2} placeholder="שם" className={input} autoComplete="name" />
      <input name="phone" required placeholder="טלפון" className={input} inputMode="tel" autoComplete="tel" />
      <input name="email" type="email" placeholder="אימייל (רשות)" className={`${input} sm:col-span-2`} autoComplete="email" />
      <textarea name="message" required minLength={5} maxLength={2000} rows={5} placeholder="במה נוכל לעזור? (מוצר, כמות, תאריך יעד…)" className={`${input} resize-y sm:col-span-2`} />
      <input name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />{/* honeypot */}
      {err && <p className="text-sm text-red-400 sm:col-span-2" role="alert">{err}</p>}
      <button disabled={state === "busy"} className="flex items-center justify-center gap-2 rounded-lg bg-white py-3 font-medium text-black disabled:opacity-50 sm:col-span-2">{state === "busy" && <Loader2 className="h-4 w-4 animate-spin" />} שליחה</button>
    </form>
  );
}
