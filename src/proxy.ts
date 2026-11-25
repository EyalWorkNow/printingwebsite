import { NextResponse, type NextRequest } from "next/server";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/config";

// 1. /admin + /api/admin: HTTP Basic auth (lib/admin-auth). /admin/setup (set/reset the login with an owner secret) is open;
//    before any login exists, /admin redirects there.
// 2. Shop: Hebrew lives at the root — "/p/mug" is served by app/[lang] with lang=he (internal rewrite), and "/he/…"
//    redirects to the clean URL. Other languages have their own prefix ("/en/p/mug") and pass through untouched.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (pathname === "/admin/setup" || await isAdmin(req.headers.get("authorization"))) return NextResponse.next();
    if (pathname.startsWith("/admin") && !await adminConfigured()) return NextResponse.redirect(new URL("/admin/setup", req.url));
    return new NextResponse('<!doctype html><meta charset="utf-8"><body dir="rtl" style="font:16px system-ui;padding:2rem">נדרשת התחברות · Login required — <a href="/admin/setup">הגדרת כניסה / Set up login</a>', {
      status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "WWW-Authenticate": 'Basic realm="dfus-admin", charset="UTF-8"' },
    });
  }
  const first = pathname.split("/")[1];
  if (first === DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }
  if (isLocale(first)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

// everything except Next internals, API routes, uploaded media and static files (anything with an extension)
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/((?!api|_next|media|.*\\..*).*)"] };
