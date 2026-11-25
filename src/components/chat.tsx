"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Paperclip, Loader2, ShoppingCart, Check } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { uploadArtwork } from "@/lib/upload-client";
import { cart, useCart } from "@/lib/cart";
import { useI18n } from "@/i18n/client";
import type { ChatAction } from "@/app/api/chat/route";

// Chat widget: the AI agent answers in the site's language and can act — add to the cart, open pages, place orders.
type Chip = { kind: "cart" | "order"; text: string };
type M = { role: "user" | "assistant"; content: string; chips?: Chip[] };

export function Chat() {
  const { lang, d, href, f } = useI18n();
  const t = d.chat;
  const router = useRouter();
  const items = useCart();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([{ role: "assistant", content: t.hello }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);
  // any link to #chat opens the widget
  useEffect(() => {
    const on = () => { if (location.hash === "#chat") { setOpen(true); history.replaceState(null, "", location.pathname + location.search); } };
    on();
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  function run(actions: ChatAction[] = []): Chip[] {
    const chips: Chip[] = [];
    for (const a of actions) {
      if (a.type === "add_to_cart") {
        const { label, ...item } = a.item;
        cart.add(item);
        chips.push({ kind: "cart", text: f(t.addedToCart, { item: label }) });
      } else if (a.type === "order_placed") {
        if (a.clearCart) cart.clear();
        chips.push({ kind: "order", text: `${f(t.orderPlaced, { id: a.id })} · ${a.total}` });
      } else if (a.type === "navigate") {
        setTimeout(() => router.push(href(a.path)), 600); // let the reply render first
      }
    }
    return chips;
  }

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await (await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, messages: next.slice(1).map(({ role, content }) => ({ role, content })), cart: items }) })).json();
      setMsgs([...next, { role: "assistant", content: r.reply ?? t.error, chips: run(r.actions) }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: t.offline }]);
    } finally { setBusy(false); }
  }

  async function attach(file?: File) {
    if (!file) return;
    try {
      send(`[artwork attached: ${await uploadArtwork(file, d.errors)}] (${file.name})`);
    } catch (e) { setMsgs((m) => [...m, { role: "assistant", content: (e as Error).message || t.uploadFailed }]); }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label={open ? t.close : t.open} className="fixed bottom-[calc(1.25rem+var(--fab-offset,0rem))] left-5 z-50 flex h-14 w-14 md:bottom-5 items-center justify-center rounded-full bg-foreground text-background shadow-lg">
        {open ? <X /> : <MessageCircle />}
      </button>
      {open && (
        <div className="fixed bottom-[calc(6rem+var(--fab-offset,0rem))] left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border bg-background p-2 md:bottom-24">
          <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} />
          <div className="relative flex h-[32rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border-[0.75px] bg-card">
            <div className="border-b p-4 font-semibold">{t.title} <span className="text-xs font-normal text-muted-foreground">· AI</span></div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[85%] space-y-2 ${m.role === "user" ? "ms-auto" : ""}`}>
                  <p className={`whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === "user" ? "bg-foreground text-background" : "bg-muted"}`} dir="auto">{m.content}</p>
                  {m.chips?.map((c, k) => (
                    <p key={k} className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/5 px-3 py-2 text-xs">
                      {c.kind === "cart" ? <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                      <span className="flex-1">{c.text}</span>
                      {c.kind === "cart" && <Link href={href("/cart")} className="font-medium underline underline-offset-4">{t.viewCart}</Link>}
                    </p>
                  ))}
                </div>
              ))}
              {msgs.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {t.suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1 text-xs text-foreground/80 hover:border-foreground/40 hover:text-foreground">{s}</button>
                  ))}
                </div>
              )}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t p-3">
              <label className="cursor-pointer p-2 text-muted-foreground hover:text-foreground" aria-label={t.attach}>
                <Paperclip className="h-5 w-5" />
                <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder} aria-label={t.placeholder} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
              <button disabled={busy} aria-label={t.send} className="p-2 text-foreground/80 disabled:opacity-40"><Send className="h-5 w-5 rtl:-scale-x-100" /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
