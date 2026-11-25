import { SITE_URL } from "@/lib/env";
import path from "node:path";
import nodemailer from "nodemailer";
import { addBusinessDays, fill, lineFiles, money, HE_MARKET, type Line } from "./catalog";
import { type Order } from "./orders";
import { read } from "./storage";
import { DEFAULT_LOCALE, LOCALE_META, localePath, type Locale } from "@/i18n/config";
import { DICTS, type Dict } from "@/i18n/dicts";

/** Language context of one email: the shop owner always reads Hebrew; the customer gets the order's language.
 *  Amounts are always in the order's currency. */
type L = { lang: Locale; d: Dict; dir: "rtl" | "ltr"; intl: string; m: (n: number) => string; weekend: number[] };
function ctx(o: Order, forCustomer: boolean): L {
  const lang = forCustomer ? o.lang ?? DEFAULT_LOCALE : DEFAULT_LOCALE;
  const intl = LOCALE_META[lang].intl, currency = o.currency ?? "ILS";
  const weekend = (o.lang ?? DEFAULT_LOCALE) === DEFAULT_LOCALE ? HE_MARKET.weekend : [0, 6];
  return { lang, d: DICTS[lang], dir: LOCALE_META[lang].dir, intl, weekend, m: money({ market: { currency, vat: 0, intl, weekend } }) };
}

// New-order email in the glowing-effect-demo look. Email clients don't run JS, so the
// mouse-follow glow becomes a CSS-animated gradient border (Apple Mail / iOS / Outlook.com animate;
// Gmail shows the static gradient or the #262626 fallback border).

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const GLOW = "linear-gradient(90deg,#dd7bbb,#d79f1e,#5a922c,#4c7894,#dd7bbb,#d79f1e)";
export const ART_CID = "printrun@dfus"; // animated hero GIF (email-art.ts), attached inline
const site = () => SITE_URL;

function card(icon: string, title: string, body: string, delay: number, extra = "") {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="rise" style="animation-delay:${delay}ms;border-collapse:separate">
<tr><td class="glow" style="padding:1px;border-radius:18px;background-color:#262626;background-image:${GLOW};background-size:300% 100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>
<td style="background:#0a0a0a;border-radius:17px;padding:20px;box-shadow:0 0 27px 0 #2D2D2D;${extra}" valign="top">
<div style="display:inline-block;border:1px solid #4b5563;border-radius:8px;padding:5px 9px;font-size:13px;color:#a3a3a3;line-height:16px">${icon}</div>
<div style="padding-top:14px;font-size:18px;font-weight:600;color:#fff;line-height:24px">${title}</div>
<div style="padding-top:6px;font-size:14px;color:#a3a3a3;line-height:21px">${body}</div>
</td></tr></table></td></tr></table>`;
}

const hero = (alt: string) => `<tr><td style="padding-bottom:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>
<td class="glow" style="padding:1px;border-radius:18px;background-color:#262626;background-image:${GLOW};background-size:300% 100%">
<img src="cid:${ART_CID}" width="598" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border:0;border-radius:17px;background:#0a0a0a"></td></tr></table></td></tr>`;

/** Order progress: done steps green, current step pulses. */
const tracker = (o: Order, L: L) => {
  const tr = L.d.email.tracker, steps = [tr[0], tr[1], tr[2], o.totals.shippingMethod === "pickup" ? L.d.email.trackerPickup : tr[3]];
  return `<tr><td class="rise" style="padding:4px 0 16px;animation-delay:80ms"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${steps.map((s, i) => `
<td width="25%" align="center" valign="top" style="padding:0 2px">
<div style="height:4px;border-radius:2px;background:${i === 0 ? "#5a922c" : "#262626"}"></div>
<div style="padding-top:10px"><span${i === 1 ? ' class="dot"' : ""} style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i === 0 ? "#5a922c" : i === 1 ? "#dd7bbb" : "#404040"}"></span></div>
<div style="padding-top:6px;font-size:12px;line-height:16px;color:${i <= 1 ? "#fff" : "#737373"}">${i === 0 ? "✓ " : ""}${esc(s)}</div></td>`).join("")}
</tr></table></td></tr>`;
};

function shell(L: L, title: string, preheader: string, badge: string, inner: string, cta: { href: string; label: string }, footer: string) {
  const end = L.dir === "rtl" ? "left" : "right";
  return `<!doctype html><html lang="${L.lang}" dir="${L.dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title>
<style>
@keyframes glow{0%{background-position:0% 50%}100%{background-position:300% 50%}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(221,123,187,.7)}50%{opacity:.6;box-shadow:0 0 0 6px rgba(221,123,187,0)}}
.glow{animation:glow 6s linear infinite}
.rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both}
.dot{animation:pulse 1.6s ease-in-out infinite}
@media (max-width:620px){.col{display:block!important;width:100%!important;padding:0 0 12px!important}}
@media (prefers-reduced-motion:reduce){.glow,.rise,.dot{animation:none!important}}
</style></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'SF Hebrew','Segoe UI',Arial,Helvetica,sans-serif;color:#fff">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%" dir="${L.dir}">

<tr><td style="padding:0 4px 20px"><table role="presentation" width="100%"><tr>
<td style="font-size:22px;font-weight:700;color:#fff">${esc(L.d.meta.brand)}<span style="color:#737373">.</span></td>
<td align="${end}"><span style="display:inline-block;border:1px solid #404040;border-radius:999px;padding:4px 12px;font-size:12px;color:#d4d4d4">
<span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#dd7bbb;vertical-align:middle;margin-inline-end:6px"></span>${esc(badge)}</span></td>
</tr></table></td></tr>

${hero(badge)}${inner}<tr><td align="center" class="rise" style="padding:12px 0 8px;animation-delay:520ms">
<a href="${esc(cta.href)}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px">${esc(cta.label)}</a></td></tr>
<tr><td align="center" style="padding-top:18px;font-size:12px;color:#525252">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (L: L, k: string, v: string, strong = false) =>
  `<tr><td style="padding:4px 0;color:#a3a3a3;font-size:14px">${k}</td><td align="${L.dir === "rtl" ? "left" : "right"}" style="padding:4px 0;font-size:${strong ? 18 : 14}px;color:#fff;${strong ? "font-weight:700" : ""}">${v}</td></tr>`;
const priceTable = (o: Order, L: L) => { const t = o.totals, e = L.d.email; return `<table role="presentation" width="100%">
${row(L, e.products, esc(L.m(t.subtotal)))}${row(L, esc(t.shippingLabel), t.shipping ? esc(L.m(t.shipping)) : esc(e.free))}${t.vat ? row(L, e.vat, esc(L.m(t.vat))) : ""}${row(L, e.total, esc(L.m(t.total)), true)}</table>`; };
const two = (a: string, b: string) => `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="col" width="50%" valign="top" style="padding:0 0 12px 6px">${a}</td><td class="col" width="50%" valign="top" style="padding:0 6px 12px 0">${b}</td></tr></table></td></tr>`;
const itemsTable = (items: Line[], L: L) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #262626;vertical-align:top">
<div style="font-size:15px;color:#fff;font-weight:600">${esc(l.quantity.toLocaleString(L.intl))} × ${esc(l.productName)}</div>
<div style="font-size:13px;color:#a3a3a3;line-height:20px">${l.labels.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ")}<br>${esc(fill(L.d.email.production, { label: l.productionLabel, n: l.productionDays }))} ${sideRows(l, L)}</div></td>
<td align="${L.dir === "rtl" ? "left" : "right"}" style="padding:10px 0;border-bottom:1px solid #262626;vertical-align:top;font-size:15px;color:#fff;white-space:nowrap">${esc(L.m(l.subtotal))}</td></tr>`).join("")}</table>`;
// one row per printed side: file status + where/how big
const missingArt = (l: Line) => { const f = lineFiles(l); return !f.length || f.some((x) => !x.artwork); };
const sideRows = (l: Line, L: L) => { const f = lineFiles(l), e = L.d.email; return f.length
  ? f.map((x) => `<br>${x.label ? `${esc(x.label)}: ` : ""}${x.artwork ? esc(e.artOk) : `<span style="color:#fbbf24">${esc(e.artMissing)}</span>`}${x.placement ? ` · ${esc(x.placement)}` : ""}`).join("")
  : ` · <span style="color:#fbbf24">${esc(e.artMissing)}</span>`; };
const summary = (o: Order) => o.items.map((l) => `${l.quantity} × ${l.productName}`).join(", ");
const eta = (o: Order, L: L) => addBusinessDays(new Date(o.createdAt), Math.max(...o.items.map((l) => l.productionDays)) + o.totals.shippingDays, L.weekend)
  .toLocaleDateString(L.intl, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
const where = (o: Order, L: L) => o.totals.shippingMethod === "pickup" ? esc(L.d.email.pickupWhere) : `${esc(o.customer.address)}, ${esc(o.customer.city)}${o.customer.zip ? ` ${esc(o.customer.zip)}` : ""}`;

export function renderOrderEmail(o: Order) {
  const t = o.totals, c = o.customer, L = ctx(o, false), ils = L.m;
  const market = o.lang && o.lang !== DEFAULT_LOCALE ? ` · אתר ${LOCALE_META[o.lang].name} (${o.currency})` : "";
  const admin = `${site()}/admin?q=${encodeURIComponent(o.id)}`;
  const missing = o.items.filter(missingArt).length;

  const html = shell(L, `הזמנה חדשה ${o.id}`, `${c.name} · ${summary(o)} · ${ils(t.total)}`, "הזמנה חדשה", `<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id),
  `<span style="font-size:28px;line-height:36px">${esc(ils(t.total))}</span>`,
  `${o.items.length} פריטים · ${esc(t.shippingLabel)} · יעד משוער ${esc(eta(o, L))}<br>${o.source === "chat" ? "התקבלה בצ׳אט ה-AI" : "התקבלה באתר"}${esc(market)} · ${esc(new Date(o.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }))}`, 0, "padding:26px")}</td></tr>
<tr><td style="padding-bottom:12px">${card("▣ פריטים", missing ? `<span style="color:#fbbf24">חסרה גרפיקה ${missing === 1 ? "בפריט אחד" : `ב-${missing} פריטים`}</span>` : "כל הקבצים צורפו ✓", itemsTable(o.items, L), 120)}</td></tr>
${two(card("☺ לקוח", esc(c.name), `<a href="tel:${esc(c.phone)}" style="color:#d4d4d4;text-decoration:none" dir="ltr">${esc(c.phone)}</a>${c.email ? `<br><a href="mailto:${esc(c.email)}" style="color:#d4d4d4">${esc(c.email)}</a>` : ""}${c.business ? `<br>${esc(c.business)}${c.businessId ? ` · ${esc(c.businessId)}` : ""}` : ""}`, 220),
  card("➜ " + esc(t.shippingLabel), t.shippingMethod === "pickup" ? "איסוף עצמי" : esc(c.city), `${where(o, L)}${c.notes ? `<br>הערות: ${esc(c.notes)}` : ""}<br>תשלום: טלפוני`, 320))}
<tr><td style="padding-bottom:12px">${card("₪ פירוט", "סיכום מחיר", priceTable(o, L), 420)}</td></tr>`, { href: admin, label: "פתיחה בממשק הניהול" }, "התראה אוטומטית מאתר דפוס");

  const text = [`הזמנה חדשה ${o.id} — ${ils(t.total)}`, ...o.items.map((l) => `• ${l.quantity} × ${l.productName} (${l.labels.map(([k, v]) => `${k}: ${v}`).join(", ")}) — ${ils(l.subtotal)}${missingArt(l) ? " [חסרה גרפיקה]" : ""}${lineFiles(l).map((f) => f.placement ? ` | ${f.placement}` : "").join("")}`),
    `לקוח: ${c.name}, ${c.phone}${c.email ? ", " + c.email : ""}`, `משלוח: ${t.shippingLabel}${t.shippingMethod === "pickup" ? "" : ` — ${c.address}, ${c.city}`}`, admin].join("\n");
  return { subject: `הזמנה חדשה ${o.id} · ${c.name} · ${ils(t.total)}`, html, text };
}

/** Confirmation to the customer, in the order's language. */
export function renderCustomerEmail(o: Order) {
  const t = o.totals, c = o.customer, L = ctx(o, true), e = L.d.email, brand = L.d.meta.brand;
  const summary = o.items.map((l) => `${l.quantity.toLocaleString(L.intl)} × ${l.productName}`).join(", ");
  const steps = e.nextSteps.map((x) => fill(x, { delivery: t.shippingMethod === "pickup" ? e.deliveryPickup : e.deliveryShip, eta: eta(o, L) }))
    .map((x, i) => `<div style="padding:3px 0"><span style="color:#737373">0${i + 1}</span>&nbsp; ${esc(x)}</div>`).join("");
  const html = shell(L, fill(e.subject, { id: o.id, brand }), fill(e.preheader, { name: c.name, id: o.id, total: L.m(t.total) }), e.badge,
    `${tracker(o, L)}<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id), `<span style="font-size:26px;line-height:34px">${esc(fill(e.thanks, { name: c.name }))}</span>`,
      esc(fill(e.received, { summary })), 0, "padding:26px")}</td></tr>
<tr><td style="padding-bottom:12px">${card("▣ " + esc(e.yourOrder), esc(fill(e.itemsCount, { n: o.items.length })), itemsTable(o.items, L), 120)}</td></tr>
${two(card("➜ " + esc(e.next), esc(e.nextTitle), steps, 220), card("≡ " + esc(e.price), esc(e.priceTitle), priceTable(o, L), 320))}
<tr><td style="padding-bottom:12px">${card("⌂ " + esc(t.shippingLabel), t.shippingMethod === "pickup" ? esc(e.pickup) : esc(c.city), where(o, L), 420)}</td></tr>`,
    { href: `${site()}${localePath(L.lang, "/")}#chat`, label: e.cta }, fill(e.footer, { brand }));
  const text = [fill(e.textThanks, { name: c.name, id: o.id }), ...o.items.map((l) => `• ${l.quantity} × ${l.productName} — ${L.m(l.subtotal)}`), fill(e.textTotal, { total: L.m(t.total) }), fill(e.textEta, { eta: eta(o, L) }), e.textNext, `${site()}${localePath(L.lang, "/")}`].join("\n");
  return { subject: fill(e.subject, { id: o.id, brand }), html, text };
}

async function transport() {
  const url = process.env.SMTP_URL;
  if (!url) return undefined;
  const t = nodemailer.createTransport(url);
  const from = (name: string) => process.env.MAIL_FROM ?? `"${name}" <${decodeURIComponent(new URL(url).username)}>`;
  return { t, from };
}
const artAttachment = async () => ({ filename: "print.gif", content: await (await import("./email-art")).printGif(), cid: ART_CID, contentDisposition: "inline" as const });

/** Customer confirmation only (also used by "email me the order details"). */
export async function sendCustomerEmail(o: Order) {
  const tr = await transport();
  if (!tr || !o.customer.email) return console.warn("[order-email] customer email skipped", o.id);
  const m = renderCustomerEmail(o);
  await tr.t.sendMail({ from: tr.from(DICTS[o.lang ?? DEFAULT_LOCALE].meta.brand), to: o.customer.email, subject: m.subject, html: m.html, text: m.text, attachments: [await artAttachment()] });
}
export async function sendOrderEmail(o: Order) {
  const url = process.env.SMTP_URL, to = process.env.NOTIFY_EMAIL;
  if (!url || !to) return console.warn("[order-email] SMTP_URL/NOTIFY_EMAIL not set — skipping", o.id);
  const { subject, html, text } = renderOrderEmail(o);
  let budget = 15 * 1024 * 1024; // keep attachments under typical mailbox limits
  const attachments = [];
  for (const [i, l] of o.items.entries()) {
    for (const f of lineFiles(l)) {
      if (!f.artwork) continue;
      const content = await read(`uploads/${f.artwork}`);
      if (!content || content.length > budget) continue;
      budget -= content.length;
      attachments.push({ filename: `${o.id}-${i + 1}-${f.side}${path.extname(f.artwork)}`, content });
    }
  }
  attachments.push(await artAttachment());
  const tr = (await transport())!;
  await tr.t.sendMail({ from: tr.from("דפוס — הזמנות"), to, subject, html, text, attachments });
  if (o.customer.email) await sendCustomerEmail(o);
}
