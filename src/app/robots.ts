import { SITE_URL } from "@/lib/env";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = SITE_URL;
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/checkout"] }, sitemap: `${site}/sitemap.xml` };
}
