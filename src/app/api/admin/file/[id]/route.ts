import { isAdmin } from "@/lib/auth";
import { parts } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", pdf: "application/pdf", svg: "image/svg+xml" };

export async function GET(req: Request, ctx: RouteContext<"/api/admin/file/[id]">) {
  if (!await isAdmin()) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const m = /^[\w-]+\.(png|jpg|webp|pdf|svg)$/.exec(id); // no path traversal
  if (!m) return new Response(null, { status: 400 });
  // streamed part by part: a whole 25MB file would exceed Vercel's 4.5MB response limit
  const it = parts(`uploads/${id}`);
  const first = await it.next();
  if (first.done) return new Response(null, { status: 404 });
  const body = new ReadableStream<Uint8Array>({
    start: (c) => c.enqueue(new Uint8Array(first.value)),
    pull: async (c) => { const n = await it.next(); if (n.done) c.close(); else c.enqueue(new Uint8Array(n.value)); },
  });
  return new Response(body, {
    headers: {
      "Content-Type": TYPES[m[1]],
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'", // uploaded SVGs can't run script
      "Cache-Control": "private, max-age=3600",
    },
  });
}
