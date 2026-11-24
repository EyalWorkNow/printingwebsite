import path from "node:path";
import nodemailer from "nodemailer";
import { ils, addBusinessDays, type Line } from "./catalog";
import { type Order } from "./orders";
import { read } from "./storage";

// New-order email in the glowing-effect-demo look. Email clients don't run JS, so the
// mouse-follow glow becomes a CSS-animated gradient border (Apple Mail / iOS / Outlook.com animate;
// Gmail shows the static gradient or the #262626 fallback border).

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const GLOW = "linear-gradient(90deg,#dd7bbb,#d79f1e,#5a922c,#4c7894,#dd7bbb,#d79f1e)";
export const ART_CID = "printrun@dfus"; // animated hero GIF (email-art.ts), attached inline
const site = () => process.env.SITE_URL ?? "http://localhost:3007";

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
const tracker = (o: Order) => {
  const steps = ["התקבלה", "בדיקת קבצים", "ייצור", o.totals.shippingMethod === "pickup" ? "מוכן לאיסוף" : "במשלוח"];
  return `<tr><td class="rise" style="padding:4px 0 16px;animation-delay:80ms"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${steps.map((s, i) => `
<td width="25%" align="center" valign="top" style="padding:0 2px">
<div style="height:4px;border-radius:2px;background:${i === 0 ? "#5a922c" : "#262626"}"></div>
<div style="padding-top:10px"><span${i === 1 ? ' class="dot"' : ""} style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i === 0 ? "#5a922c" : i === 1 ? "#dd7bbb" : "#404040"}"></span></div>
<div style="padding-top:6px;font-size:12px;line-height:16px;color:${i <= 1 ? "#fff" : "#737373"}">${i === 0 ? "✓ " : ""}${esc(s)}</div></td>`).join("")}
</tr></table></td></tr>`;
};

function shell(title: string, preheader: string, badge: string, inner: string, cta: { href: string; label: string }, footer: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
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
<body style="margin:0;padding:0;background:#000;font-family:'Heebo',Arial,Helvetica,sans-serif;color:#fff">
<div style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%" dir="rtl">

<tr><td style="padding:0 4px 20px"><table role="presentation" width="100%"><tr>
<td style="font-size:22px;font-weight:700;color:#fff">דפוס<span style="color:#737373">.</span></td>
<td align="left"><span style="display:inline-block;border:1px solid #404040;border-radius:999px;padding:4px 12px;font-size:12px;color:#d4d4d4">
<span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#dd7bbb;vertical-align:middle;margin-left:6px"></span>${esc(badge)}</span></td>
</tr></table></td></tr>

${hero(badge)}${inner}<tr><td align="center" class="rise" style="padding:12px 0 8px;animation-delay:520ms">
<a href="${esc(cta.href)}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px">${esc(cta.label)}</a></td></tr>
<tr><td align="center" style="padding-top:18px;font-size:12px;color:#525252">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (k: string, v: string, strong = false) =>
  `<tr><td style="padding:4px 0;color:#a3a3a3;font-size:14px">${k}</td><td align="left" style="padding:4px 0;font-size:${strong ? 18 : 14}px;color:#fff;${strong ? "font-weight:700" : ""}">${v}</td></tr>`;
const priceTable = (o: Order) => { const t = o.totals; return `<table role="presentation" width="100%">
${row("מוצרים", esc(ils(t.subtotal)))}${row(esc(t.shippingLabel), t.shipping ? esc(ils(t.shipping)) : "חינם")}${row("מע״מ", esc(ils(t.vat)))}${row("סה״כ", esc(ils(t.total)), true)}</table>`; };
const two = (a: string, b: string) => `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="col" width="50%" valign="top" style="padding:0 0 12px 6px">${a}</td><td class="col" width="50%" valign="top" style="padding:0 6px 12px 0">${b}</td></tr></table></td></tr>`;
const itemsTable = (items: Line[]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #262626;vertical-align:top">
<div style="font-size:15px;color:#fff;font-weight:600">${esc(l.quantity.toLocaleString("he-IL"))} × ${esc(l.productName)}</div>
<div style="font-size:13px;color:#a3a3a3;line-height:20px">${l.labels.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ")}<br>ייצור ${esc(l.productionLabel)} (${l.productionDays} ימי עסקים) · ${l.artwork ? "גרפיקה צורפה ✓" : `<span style="color:#fbbf24">חסרה גרפיקה</span>`}${l.placement ? ` · ${esc(l.placement)}` : ""}</div></td>
<td align="left" style="padding:10px 0;border-bottom:1px solid #262626;vertical-align:top;font-size:15px;color:#fff;white-space:nowrap">${esc(ils(l.subtotal))}</td></tr>`).join("")}</table>`;
const summary = (o: Order) => o.items.map((l) => `${l.quantity} × ${l.productName}`).join(", ");
const eta = (o: Order) => addBusinessDays(new Date(o.createdAt), Math.max(...o.items.map((l) => l.productionDays)) + o.totals.shippingDays)
  .toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
const where = (o: Order) => o.totals.shippingMethod === "pickup" ? "איסוף עצמי — נתאם בטלפון" : `${esc(o.customer.address)}, ${esc(o.customer.city)}`;

export function renderOrderEmail(o: Order) {
  const t = o.totals, c = o.customer;
  const admin = `${site()}/admin?q=${encodeURIComponent(o.id)}`;
  const missing = o.items.filter((l) => !l.artwork).length;

  const html = shell(`הזמנה חדשה ${o.id}`, `${c.name} · ${summary(o)} · ${ils(t.total)}`, "הזמנה חדשה", `<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id),
  `<span style="font-size:28px;line-height:36px">${esc(ils(t.total))}</span>`,
  `${o.items.length} פריטים · ${esc(t.shippingLabel)} · יעד משוער ${esc(eta(o))}<br>${o.source === "chat" ? "התקבלה בצ׳אט ה-AI" : "התקבלה באתר"} · ${esc(new Date(o.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }))}`, 0, "padding:26px")}</td></tr>
<tr><td style="padding-bottom:12px">${card("▣ פריטים", missing ? `<span style="color:#fbbf24">חסרה גרפיקה ${missing === 1 ? "בפריט אחד" : `ב-${missing} פריטים`}</span>` : "כל הקבצים צורפו ✓", itemsTable(o.items), 120)}</td></tr>
${two(card("☺ לקוח", esc(c.name), `<a href="tel:${esc(c.phone)}" style="color:#d4d4d4;text-decoration:none" dir="ltr">${esc(c.phone)}</a>${c.email ? `<br><a href="mailto:${esc(c.email)}" style="color:#d4d4d4">${esc(c.email)}</a>` : ""}${c.business ? `<br>${esc(c.business)}${c.businessId ? ` · ${esc(c.businessId)}` : ""}` : ""}`, 220),
  card("➜ " + esc(t.shippingLabel), t.shippingMethod === "pickup" ? "איסוף עצמי" : esc(c.city), `${where(o)}${c.notes ? `<br>הערות: ${esc(c.notes)}` : ""}<br>תשלום: טלפוני`, 320))}
<tr><td style="padding-bottom:12px">${card("₪ פירוט", "סיכום מחיר", priceTable(o), 420)}</td></tr>`, { href: admin, label: "פתיחה בממשק הניהול" }, "התראה אוטומטית מאתר דפוס");

  const text = [`הזמנה חדשה ${o.id} — ${ils(t.total)}`, ...o.items.map((l) => `• ${l.quantity} × ${l.productName} (${l.labels.map(([k, v]) => `${k}: ${v}`).join(", ")}) — ${ils(l.subtotal)}${l.artwork ? "" : " [חסרה גרפיקה]"}`),
    `לקוח: ${c.name}, ${c.phone}${c.email ? ", " + c.email : ""}`, `משלוח: ${t.shippingLabel}${t.shippingMethod === "pickup" ? "" : ` — ${c.address}, ${c.city}`}`, admin].join("\n");
  return { subject: `הזמנה חדשה ${o.id} · ${c.name} · ${ils(t.total)}`, html, text };
}

/** Confirmation to the customer (only when they left an email). */
export function renderCustomerEmail(o: Order) {
  const t = o.totals, c = o.customer;
  const steps = ["נבדוק את קבצי הגרפיקה ונחזור אליך לאישור", "תשלום טלפוני — נתקשר תוך יום עסקים", `ייצור ו${t.shippingMethod === "pickup" ? "איסוף" : "משלוח"} — יעד משוער ${eta(o)}`]
    .map((x, i) => `<div style="padding:3px 0"><span style="color:#737373">0${i + 1}</span>&nbsp; ${esc(x)}</div>`).join("");
  const html = shell(`ההזמנה ${o.id} התקבלה`, `תודה ${c.name}! ההזמנה ${o.id} התקבלה · ${ils(t.total)}`, "ההזמנה התקבלה",
    `${tracker(o)}<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id), `<span style="font-size:26px;line-height:34px">תודה, ${esc(c.name)}!</span>`,
      `קיבלנו את ההזמנה שלך: ${esc(summary(o))}`, 0, "padding:26px")}</td></tr>
<tr><td style="padding-bottom:12px">${card("▣ ההזמנה שלך", `${o.items.length} פריטים`, itemsTable(o.items), 120)}</td></tr>
${two(card("➜ מה הלאה", "השלבים הבאים", steps, 220), card("₪ פירוט", "סיכום מחיר", priceTable(o), 320))}
<tr><td style="padding-bottom:12px">${card("⌂ " + esc(t.shippingLabel), t.shippingMethod === "pickup" ? "איסוף עצמי" : esc(c.city), where(o), 420)}</td></tr>`,
    { href: `${site()}/#chat`, label: "שאלה? דברו איתנו בצ׳אט" }, "דפוס · בית דפוס דיגיטלי");
  const text = [`תודה ${c.name}! ההזמנה ${o.id} התקבלה.`, ...o.items.map((l) => `• ${l.quantity} × ${l.productName} — ${ils(l.subtotal)}`), `סה״כ ${ils(t.total)} כולל מע״מ ומשלוח`, `יעד משוער: ${eta(o)}`, "נחזור אליך לאישור הגרפיקה ולתשלום.", site()].join("\n");
  return { subject: `ההזמנה ${o.id} התקבלה — דפוס`, html, text };
}

export async function sendOrderEmail(o: Order) {
  const url = process.env.SMTP_URL, to = process.env.NOTIFY_EMAIL;
  if (!url || !to) return console.warn("[order-email] SMTP_URL/NOTIFY_EMAIL not set — skipping", o.id);
  const { subject, html, text } = renderOrderEmail(o);
  let budget = 15 * 1024 * 1024; // keep attachments under typical mailbox limits
  const attachments = [];
  for (const [i, l] of o.items.entries()) {
    if (!l.artwork) continue;
    const content = await read(`uploads/${l.artwork}`);
    if (!content || content.length > budget) continue;
    budget -= content.length;
    attachments.push({ filename: `${o.id}-${i + 1}${path.extname(l.artwork)}`, content });
  }
  const art = { filename: "print.gif", content: await (await import("./email-art")).printGif(), cid: ART_CID, contentDisposition: "inline" as const };
  attachments.push(art);
  const transport = nodemailer.createTransport(url);
  const from = (name: string) => process.env.MAIL_FROM ?? `"${name}" <${decodeURIComponent(new URL(url).username)}>`;
  await transport.sendMail({ from: from("דפוס — הזמנות"), to, subject, html, text, attachments });
  if (o.customer.email) {
    const m = renderCustomerEmail(o);
    await transport.sendMail({ from: from("דפוס"), to: o.customer.email, subject: m.subject, html: m.html, text: m.text, attachments: [art] });
  }
}
