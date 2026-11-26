import { liveProducts, money, fromPrice } from "@/lib/catalog";
import { getLocalizedCatalog } from "@/lib/catalog-store";
import { DICTS } from "@/i18n/dicts";
import { LOCALES, LOCALE_META, localePath } from "@/i18n/config";
import { abs } from "@/lib/seo";

// /llms.txt (llmstxt.org): a plain-markdown map of the shop for AI assistants — what we sell, prices, links, FAQ.
// Built from the live catalog; names in English + Hebrew, "from" prices for Israel (₪, incl. VAT) and the US ($).
export async function GET() {
  const [he, en] = await Promise.all([getLocalizedCatalog("he"), getLocalizedCatalog("en")]);
  const d = DICTS.en, ils = money(he), usd = money(en);
  const heName = (id: string) => he.products.find((p) => p.id === id)?.name;
  const lines = [
    `# ${d.meta.brand} (${DICTS.he.meta.brand}) — digital print shop`,
    "",
    `> ${d.meta.description} Instant prices on the site and in an AI chat, a live preview of your artwork on the product, and delivery or pickup. Hebrew (Israel, prices in ₪ incl. VAT) is the main site; every other language is its own market and currency.`,
    "",
    "Ordering: pick a product, options and quantity, upload artwork (PDF/PNG/JPG/WEBP/SVG up to 25MB), check out. We check every file and call to confirm and take payment within one business day — nothing is charged before that. Customers can open an account to track orders.",
    "",
    "## Categories",
    ...en.categories.map((c) => `- [${c.name}](${abs(localePath("en", `/c/${c.id}`))}): ${c.desc}`),
    "",
    "## Products",
    ...liveProducts(en).map((p) => {
      const hp = he.products.find((x) => x.id === p.id);
      const prices = [hp && `from ${ils(fromPrice(he, hp))} per unit in Israel (incl. VAT)`, `from ${usd(fromPrice(en, p))} per unit in the US (before sales tax)`].filter(Boolean).join(", ");
      return `- [${p.name}${heName(p.id) ? ` / ${heName(p.id)}` : ""}](${abs(localePath("he", `/p/${p.id}`))}): ${p.desc}. Minimum ${p.qty.min}. ${prices}. English page: ${abs(localePath("en", `/p/${p.id}`))}`;
    }),
    "",
    "## FAQ",
    ...d.faq.items.flatMap((x) => [`- **${x.q}** ${x.a}`]),
    "",
    "## Languages and markets",
    ...LOCALES.map((l) => `- ${LOCALE_META[l].name} (${LOCALE_META[l].country}): ${abs(localePath(l, "/"))}`),
    "",
    "## Optional",
    ...([["/about", "About"], ["/faq", "FAQ"], ["/contact", "Contact"], ["/terms", "Terms"], ["/privacy", "Privacy"], ["/cancellation", "Cancellations & returns"], ["/accessibility", "Accessibility statement"]] as const)
      .map(([p, t]) => `- [${t}](${abs(localePath("en", p))})`),
    `- [Sitemap](${abs("/sitemap.xml")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
