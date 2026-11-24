"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

/** Upload → /api/admin/image (re-encoded WebP) → returns a /media/… url. */
export function ImageField({ value, onChange, label = "תמונה" }: { value?: string; onChange: (url: string | undefined) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function upload(f?: File) {
    if (!f) return;
    setBusy(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await (await fetch("/api/admin/image", { method: "POST", body: fd })).json();
      if (r.error) throw new Error(r.error);
      onChange(r.url);
    } catch (e) { setErr((e as Error).message || "ההעלאה נכשלה"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <span className="text-sm text-neutral-400">{label}</span>
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border bg-neutral-900">
          {value ? <Image src={value} alt="" fill sizes="112px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-neutral-600">אין תמונה</span>}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="h-5 w-5 animate-spin" /></span>}
        </div>
        <div className="space-y-2 text-sm">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 hover:border-neutral-500">
            <ImagePlus className="h-4 w-4" /> {value ? "החלפת תמונה" : "העלאת תמונה"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {value && <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-2 text-xs text-neutral-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /> הסרת תמונה</button>}
          <p className="text-xs text-neutral-600">PNG / JPG / WEBP · מומלץ ריבועי, 1200px ומעלה</p>
          {err && <p className="text-xs text-red-400" role="alert">{err}</p>}
        </div>
      </div>
    </div>
  );
}
