import { stat } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { ils } from "./catalog";
import { UPLOADS, type Order } from "./orders";

// New-order email in the glowing-effect-demo look. Email clients don't run JS, so the
// mouse-follow glow becomes a CSS-animated gradient border (Apple Mail / iOS / Outlook.com animate;
// Gmail shows the static gradient or the #262626 fallback border).

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const GLOW = "linear-gradient(90deg,#dd7bbb,#d79f1e,#5a922c,#4c7894,#dd7bbb,#d79f1e)";
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

${inner}<tr><td align="center" class="rise" style="padding:12px 0 8px;animation-delay:520ms">
<a href="${esc(cta.href)}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px">${esc(cta.label)}</a></td></tr>
<tr><td align="center" style="padding-top:18px;font-size:12px;color:#525252">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

const row = (k: string, v: string, strong = false) =>
  `<tr><td style="padding:4px 0;color:#a3a3a3;font-size:14px">${k}</td><td align="left" style="padding:4px 0;font-size:${strong ? 18 : 14}px;color:#fff;${strong ? "font-weight:700" : ""}">${v}</td></tr>`;
const priceTable = (q: Order["quote"]) => `<table role="presentation" width="100%">
${row("מחיר ליחידה", esc(ils(q.unitPrice)))}${q.setup ? row("הכנה לדפוס", esc(ils(q.setup))) : ""}${row("משלוח", q.shipping ? esc(ils(q.shipping)) : "חינם")}${row("מע״מ", esc(ils(q.vat)))}${row("סה״כ", esc(ils(q.total)), true)}</table>`;
const two = (a: string, b: string) => `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="col" width="50%" valign="top" style="padding:0 0 12px 6px">${a}</td><td class="col" width="50%" valign="top" style="padding:0 6px 12px 0">${b}</td></tr></table></td></tr>`;

export function renderOrderEmail(o: Order) {
  const q = o.quote, c = o.customer;
  const admin = `${site()}/admin?q=${encodeURIComponent(o.id)}`;

  const html = shell(`הזמנה חדשה ${o.id}`, `${c.name} · ${q.quantity} × ${q.productName} · ${ils(q.total)}`, "הזמנה חדשה", `<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id),
  `<span style="font-size:28px;line-height:36px">${esc(ils(q.total))}</span>`,
  `${esc(q.quantity.toLocaleString("he-IL"))} × <b style="color:#fff">${esc(q.productName)}</b> · ${esc(q.size)}<br>${o.source === "chat" ? "התקבלה בצ׳אט ה-AI" : "התקבלה באתר"} · ${esc(new Date(o.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" }))}`, 0, "padding:26px")}</td></tr>

<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="col" width="50%" valign="top" style="padding:0 0 12px 6px">${card("☺ לקוח", esc(c.name),
  `<a href="tel:${esc(c.phone)}" style="color:#d4d4d4;text-decoration:none" dir="ltr">${esc(c.phone)}</a>${c.email ? `<br><a href="mailto:${esc(c.email)}" style="color:#d4d4d4">${esc(c.email)}</a>` : ""}`, 120)}</td>
<td class="col" width="50%" valign="top" style="padding:0 6px 12px 0">${card("➜ משלוח עד הבית", esc(c.city), `${esc(c.address)}${c.notes ? `<br>הערות: ${esc(c.notes)}` : ""}`, 220)}</td>
</tr><tr>
<td class="col" width="50%" valign="top" style="padding:0 0 12px 6px">${card("▣ גרפיקה", o.artwork ? "צורפה ✓" : "טרם הועלתה",
  o.artwork ? "הקובץ מצורף למייל וזמין בממשק הניהול." : `<span style="color:#fbbf24">יש לבקש מהלקוח קובץ גרפיקה.</span>`, 320)}</td>
<td class="col" width="50%" valign="top" style="padding:0 6px 12px 0">${card("₪ פירוט", "סיכום מחיר", priceTable(q), 420)}</td>
</tr></table></td></tr>

`, { href: admin, label: "פתיחה בממשק הניהול" }, "התראה אוטומטית מאתר דפוס");

  const text = [`הזמנה חדשה ${o.id}`, `${q.quantity} × ${q.productName} (${q.size}) — ${ils(q.total)}`, `לקוח: ${c.name}, ${c.phone}${c.email ? ", " + c.email : ""}`, `משלוח: ${c.address}, ${c.city}`, `גרפיקה: ${o.artwork ? "מצורפת" : "טרם הועלתה"}`, admin].join("\n");
  return { subject: `הזמנה חדשה ${o.id} · ${c.name} · ${ils(q.total)}`, html, text };
}

/** Confirmation to the customer (only when they left an email). */
export function renderCustomerEmail(o: Order) {
  const q = o.quote, c = o.customer;
  const steps = ["נבדוק את קובץ הגרפיקה ונחזור אליך לאישור", "תשלום בטלפון לאחר אישור הגרפיקה", "ייצור ומשלוח עד הבית תוך 3–5 ימי עסקים"]
    .map((t, i) => `<div style="padding:3px 0"><span style="color:#737373">0${i + 1}</span>&nbsp; ${t}</div>`).join("");
  const html = shell(`ההזמנה ${o.id} התקבלה`, `תודה ${c.name}! ההזמנה ${o.id} התקבלה · ${ils(q.total)}`, "ההזמנה התקבלה",
    `<tr><td style="padding-bottom:12px">${card("✦ " + esc(o.id), `<span style="font-size:26px;line-height:34px">תודה, ${esc(c.name)}!</span>`,
      `קיבלנו את ההזמנה שלך: ${esc(q.quantity.toLocaleString("he-IL"))} × <b style="color:#fff">${esc(q.productName)}</b> · ${esc(q.size)}`, 0, "padding:26px")}</td></tr>
${two(card("➜ מה הלאה", "השלבים הבאים", steps, 120), card("₪ פירוט", "סיכום מחיר", priceTable(q), 220))}
${two(card("⌂ משלוח", esc(c.city), esc(c.address), 320), card("▣ גרפיקה", o.artwork ? "התקבלה ✓" : "עדיין חסרה", o.artwork ? "נבדוק אותה לפני ההדפסה." : "אפשר לשלוח לנו בצ׳אט באתר.", 420))}`,
    { href: `${site()}/#chat`, label: "שאלה? דברו איתנו בצ׳אט" }, "דפוס · בית דפוס דיגיטלי");
  const text = [`תודה ${c.name}! ההזמנה ${o.id} התקבלה.`, `${q.quantity} × ${q.productName} (${q.size}) — ${ils(q.total)} כולל מע״מ ומשלוח`, `משלוח: ${c.address}, ${c.city}`, "נחזור אליך לאישור הגרפיקה ותשלום. אספקה 3–5 ימי עסקים.", site()].join("\n");
  return { subject: `ההזמנה ${o.id} התקבלה — דפוס`, html, text };
}

export async function sendOrderEmail(o: Order) {
  const url = process.env.SMTP_URL, to = process.env.NOTIFY_EMAIL;
  if (!url || !to) return console.warn("[order-email] SMTP_URL/NOTIFY_EMAIL not set — skipping", o.id);
  const { subject, html, text } = renderOrderEmail(o);
  const file = o.artwork && path.join(UPLOADS, o.artwork);
  const size = file ? (await stat(file).catch(() => null))?.size : undefined;
  const attach = file && size !== undefined && size < 10 * 1024 * 1024;
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? `"דפוס — הזמנות" <${decodeURIComponent(new URL(url).username)}>`,
    to, subject, html, text,
    attachments: attach ? [{ filename: `${o.id}${path.extname(file)}`, path: file }] : [],
  });
  if (o.customer.email) {
    const m = renderCustomerEmail(o);
    await transport.sendMail({ from: process.env.MAIL_FROM ?? `"דפוס" <${decodeURIComponent(new URL(url).username)}>`, to: o.customer.email, subject: m.subject, html: m.html, text: m.text });
  }
}
