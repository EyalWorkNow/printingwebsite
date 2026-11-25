"use client";

// Upload customer artwork → returns its id ("<uuid>.<ext>"). Direct-to-Blob in production, form post locally.
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", "image/svg+xml": "svg" };
let mode: Promise<boolean> | undefined;

export async function uploadArtwork(f: File, t: { fileType: string; fileSize: string }): Promise<string> {
  const ext = TYPES[f.type];
  if (!ext) throw new Error(t.fileType);
  if (f.size > 25 * 1024 * 1024) throw new Error(t.fileSize);
  mode ??= fetch("/api/upload").then((r) => r.json()).then((r) => !!r.direct).catch(() => false);
  if (await mode) {
    const { upload } = await import("@vercel/blob/client");
    const r = await upload(`uploads/${crypto.randomUUID()}.${ext}`, f, { access: "private", handleUploadUrl: "/api/upload", contentType: f.type });
    return r.pathname.slice("uploads/".length);
  }
  const fd = new FormData(); fd.append("file", f);
  const r = await (await fetch("/api/upload", { method: "POST", body: fd })).json();
  if (r.error) throw new Error(r.error);
  return r.id;
}
