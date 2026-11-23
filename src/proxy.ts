import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export function proxy(req: NextRequest) {
  if (isAdmin(req.headers.get("authorization"))) return NextResponse.next();
  return new NextResponse("נדרשת התחברות", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="dfus-admin", charset="UTF-8"' } });
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
