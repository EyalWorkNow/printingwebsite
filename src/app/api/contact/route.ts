import nodemailer from "nodemailer";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const hits = new Map<string, number[]>(); // ponytail: in-memory rate limit, per instance

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 5) return Response.json({ error: "יותר מדי הודעות — נסו שוב בעוד שעה או כתבו בצ׳אט" }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const b = await req.json().catch(() => ({}));
  const f = (k: string, max: number) => (typeof b[k] === "string" ? b[k].trim().slice(0, max) : "");
  if (f("company", 50)) return Response.json({ ok: true }); // honeypot: pretend success to bots
  const name = f("name", 80), phone = f("phone", 20), email = f("email", 120), message = f("message", 2000);
  if (name.length < 2 || phone.replace(/\D/g, "").length < 9 || message.length < 5) return Response.json({ error: "נא למלא שם, טלפון והודעה" }, { status: 400 });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "אימייל לא תקין" }, { status: 400 });

  const url = process.env.SMTP_URL, to = process.env.NOTIFY_EMAIL;
  if (!url || !to) { console.warn("[contact] SMTP not configured", { name, phone }); return Response.json({ ok: true }); }
  await nodemailer.createTransport(url).sendMail({
    from: process.env.MAIL_FROM ?? `"דפוס — אתר" <${decodeURIComponent(new URL(url).username)}>`, to, replyTo: email || undefined,
    subject: `פנייה מהאתר · ${name}`,
    text: `${name}\n${phone}${email ? `\n${email}` : ""}\n\n${message}`,
    html: `<div dir="rtl" style="font-family:Arial;font-size:15px"><p><b>${esc(name)}</b><br>${esc(phone)}${email ? `<br>${esc(email)}` : ""}</p><p style="white-space:pre-wrap">${esc(message)}</p></div>`,
  });
  return Response.json({ ok: true });
}
