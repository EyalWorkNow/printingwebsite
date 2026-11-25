"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useAdmin } from "@/i18n/admin/client";

// Vercel caps request bodies at 4.5MB: big photos are scaled to ≤2400px JPEG in the browser first (the server re-encodes to 1600px WebP anyway).
async function shrink(f: File): Promise<Blob> {
  if (f.size <= 4 * 1024 * 1024) return f;
  const bmp = await createImageBitmap(f).catch(() => null);
  if (!bmp) return f;
  const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob((b) => ok(b ?? f), "image/jpeg", 0.9));
}

/** Upload → /api/admin/image (re-encoded WebP) → returns a /media/… url. */
export function ImageField({ value, onChange, label }: { value?: string; onChange: (url: string | undefined) => void; label?: string }) {
  const { t: { image: T } } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(f?: File) {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", await shrink(f));
      const r = await (await fetch("/api/admin/image", { method: "POST", body: fd })).json();
      if (r.error) throw new Error(r.error);
      onChange(r.url);
    } catch (e) { setErr((e as Error).message || T.failed); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <span className="text-sm text-muted-foreground">{label ?? T.label}</span>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border bg-muted">
          {value ? <Image src={value} alt="" fill sizes="112px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">{T.none}</span>}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white"><Loader2 className="h-5 w-5 animate-spin" /></span>}
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 hover:border-foreground/40">
            <ImagePlus className="h-4 w-4" /> {value ? T.replace : T.upload}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {value && <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> {T.remove}</button>}
          <p className="text-xs text-muted-foreground">{T.hint}</p>
          {err && <p className="text-xs text-red-600 dark:text-red-400" role="alert">{err}</p>}
        </div>
      </div>
    </div>
  );
}
