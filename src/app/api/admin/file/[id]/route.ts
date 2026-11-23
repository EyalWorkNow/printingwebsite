import { readFile } from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin-auth";
import { UPLOADS } from "@/lib/orders";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", pdf: "application/pdf", svg: "image/svg+xml" };

export async function GET(req: Request, ctx: RouteContext<"/api/admin/file/[id]">) {
  if (!isAdmin(req.headers.get("authorization"))) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const m = /^[\w-]+\.(png|jpg|webp|pdf|svg)$/.exec(id); // no path traversal
  if (!m) return new Response(null, { status: 400 });
  const buf = await readFile(path.join(UPLOADS, id)).catch(() => null);
  if (!buf) return new Response(null, { status: 404 });
  return new Response(buf, {
    headers: {
      "Content-Type": TYPES[m[1]],
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'", // uploaded SVGs can't run script
      "Cache-Control": "private, max-age=3600",
    },
  });
}
