import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isAdmin } from "@/lib/admin-auth";
import { MEDIA } from "@/lib/catalog-store";

// Admin product/category photo upload → re-encoded WebP (max 1600px) in data/media, served from /media/<file>.
// Decoding with sharp means only real images get through, whatever the browser claims the type is.
export async function POST(req: Request) {
  if (!isAdmin(req.headers.get("authorization"))) return new Response(null, { status: 401 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "לא נבחר קובץ" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: "התמונה גדולה מ-20MB" }, { status: 400 });
  try {
    const out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 80_000_000 })
      .rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const name = `${randomUUID()}.webp`;
    await mkdir(MEDIA, { recursive: true });
    await writeFile(path.join(MEDIA, name), out.data);
    return Response.json({ url: `/media/${name}`, width: out.info.width, height: out.info.height });
  } catch {
    return Response.json({ error: "הקובץ אינו תמונה תקינה (PNG / JPG / WEBP)" }, { status: 400 });
  }
}
