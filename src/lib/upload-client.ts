"use client";

// Upload customer artwork → returns its id ("<uuid>.<ext>"). Sent in 3MB parts (server: app/api/upload, PART in lib/storage).
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", "image/svg+xml": "svg" };
const PART = 3 * 1024 * 1024;

export async function uploadArtwork(f: File, t: { fileType: string; fileSize: string }): Promise<string> {
  const ext = TYPES[f.type];
  if (!ext) throw new Error(t.fileType);
  if (f.size > 25 * 1024 * 1024) throw new Error(t.fileSize);
  const id = `${crypto.randomUUID()}.${ext}`;
  for (let i = 0; i * PART < f.size; i++) {
    const r = await fetch(`/api/upload?id=${id}&part=${i}`, { method: "POST", body: f.slice(i * PART, (i + 1) * PART) });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `HTTP ${r.status}`);
  }
  return id;
}
