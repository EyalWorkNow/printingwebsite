"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Paperclip, Loader2 } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";

type M = { role: "user" | "assistant"; content: string };
const HELLO: M = { role: "assistant", content: "היי! אני העוזר של דפוס 👋 ספר לי מה תרצה להדפיס וכמה — ואתן לך הצעת מחיר מיידית ואסגור לך הזמנה עד הבית." };

export function Chat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<M[]>([HELLO]);
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

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await (await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(1) }) })).json();
      setMsgs([...next, { role: "assistant", content: r.reply ?? "משהו השתבש, נסה שוב." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "אין חיבור כרגע, נסה שוב." }]);
    } finally { setBusy(false); }
  }

  async function attach(f?: File) {
    if (!f) return;
    const fd = new FormData(); fd.append("file", f);
    const r = await (await fetch("/api/upload", { method: "POST", body: fd })).json();
    if (r.error) return setMsgs((m) => [...m, { role: "assistant", content: r.error }]);
    send(`[קובץ גרפיקה צורף: ${r.id}] (${f.name})`);
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label={open ? "סגירת צ'אט" : "פתיחת צ'אט עם נציג AI"} className="fixed bottom-[calc(1.25rem+var(--fab-offset,0rem))] left-5 z-50 flex h-14 w-14 md:bottom-5 items-center justify-center rounded-full bg-foreground text-background shadow-lg">
        {open ? <X /> : <MessageCircle />}
      </button>
      {open && (
        <div className="fixed bottom-[calc(6rem+var(--fab-offset,0rem))] left-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border bg-background p-2 md:bottom-24">
          <GlowingEffect spread={40} glow disabled={false} proximity={64} inactiveZone={0.01} />
          <div className="relative flex h-[32rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border-[0.75px] bg-card">
            <div className="border-b p-4 font-semibold">הצעת מחיר בצ׳אט <span className="text-xs font-normal text-muted-foreground">· AI</span></div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
              {msgs.map((m, i) => (
                <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === "user" ? "mr-auto bg-foreground text-background" : "bg-muted"}`}>{m.content}</p>
              ))}
              {msgs.length === 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {["כמה עולים 500 כרטיסי ביקור?", "אני צריך 20 חולצות עם לוגו", "מה זמן האספקה?"].map((t) => (
                    <button key={t} onClick={() => send(t)} className="rounded-full border px-3 py-1 text-xs text-foreground/80 hover:border-foreground/40 hover:text-foreground">{t}</button>
                  ))}
                </div>
              )}
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <div ref={end} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t p-3">
              <label className="cursor-pointer p-2 text-muted-foreground hover:text-foreground" aria-label="צירוף גרפיקה">
                <Paperclip className="h-5 w-5" />
                <input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" onChange={(e) => attach(e.target.files?.[0])} />
              </label>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: 500 כרטיסי ביקור לתל אביב" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
              <button disabled={busy} aria-label="שליחה" className="p-2 text-foreground/80 disabled:opacity-40"><Send className="h-5 w-5 -scale-x-100" /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
