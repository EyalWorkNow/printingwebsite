import { MAX_UPLOAD } from "@/lib/orders";
import { PART, writePart } from "@/lib/storage";

// Customer artwork, sent by the browser in parts (lib/upload-client.ts): POST /api/upload?id=<uuid>.<ext>&part=<n>, raw body.
// Each part is ≤ PART bytes (Vercel caps function request bodies at 4.5MB). Parts are insert-only, so an upload can't be overwritten.
const ID = /^[0-9a-f-]{36}\.(png|jpg|webp|pdf|svg)$/;
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", pdf: "application/pdf", svg: "image/svg+xml" };

export async function POST(req: Request) {
  const q = new URL(req.url).searchParams;
  const id = q.get("id") ?? "", part = Number(q.get("part"));
  const m = ID.exec(id);
  if (!m || !Number.isInteger(part) || part < 0 || part >= Math.ceil(MAX_UPLOAD / PART)) return Response.json({ error: "bad upload" }, { status: 400 });
  const body = Buffer.from(await req.arrayBuffer());
  if (!body.length || body.length > PART) return Response.json({ error: "bad part size" }, { status: 400 });
  try {
    await writePart(`uploads/${id}`, part, body, TYPES[m[1]]);
    return Response.json({ id });
  } catch {
    return Response.json({ error: "upload failed" }, { status: 409 });
  }
}
