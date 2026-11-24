import { PRODUCTS, PRODUCTION, SHIPPING, priceLine, totals, withVat, type LineInput } from "@/lib/catalog";
import { createOrder } from "@/lib/orders";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

// compact catalog for the model: ids it must pass back, human titles to talk with
const catalog = PRODUCTS.map((p) => [
  `- ${p.id}: ${p.name} — ${p.desc}. כמות ${p.qty.min}–${p.qty.max} (קפיצות ${p.qty.step}, מומלץ: ${p.qty.presets.join("/")}). ייצור: ${p.production.join("/")}`,
  ...p.options.map((o) => `    ${o.kind === "split" ? "split" : `options.${o.id}`} (${o.title}): ${o.values.map((v) => `${v.id}=${v.title}`).join(", ")}`),
].join("\n")).join("\n");

const SYSTEM = `אתה נציג המכירות של "דפוס" — בית דפוס דיגיטלי. ענה תמיד בעברית, קצר וחם, בטקסט רגיל בלי Markdown (בלי כוכביות או סולמיות).
המטרה: לעזור ללקוח לבחור מוצרים ואפשרויות, לתת הצעת מחיר ולסגור הזמנה.
קטלוג (מזהים באנגלית — השתמש בהם רק בכלים, מול הלקוח דבר בשמות בעברית):
${catalog}
זמני ייצור (ימי עסקים): ${Object.entries(PRODUCTION).map(([k, v]) => `${k}=${v.label} ${v.days} ימים${v.pct ? ` (${v.pct > 0 ? "+" : ""}${v.pct * 100}%)` : ""}`).join(", ")}. ברירת מחדל standard.
משלוח: ${Object.entries(SHIPPING).map(([k, v]) => `${k}=${v.label} ${v.price ? v.price + "₪" : "חינם"}${v.freeFrom ? ` (חינם מעל ${v.freeFrom}₪ לפני מע״מ)` : ""}`).join(", ")}.
תשלום: טלפוני — נציג מתקשר תוך יום עסקים לאחר בדיקת הגרפיקה.
כללים:
- לעולם אל תמציא מחיר. כל מחיר מגיע רק מהכלי get_quote. אפשרות שלא צוינה מקבלת ברירת מחדל (הערך הראשון) — ציין ללקוח מה נבחר.
- בביגוד אפשר לחלק כמות בין מידות בשדה split, למשל {"M":5,"L":3}.
- לפני place_order: הצג סיכום (פריטים עם אפשרויות וכמויות, שיטת משלוח, סה״כ כולל מע״מ, שם, טלפון נייד, וכתובת ועיר אם זה לא איסוף עצמי) ובקש אישור מפורש. רק אחרי "כן"/אישור — הפעל place_order.
- אם הלקוח צירף קובץ גרפיקה תופיע הודעה "[קובץ גרפיקה צורף: <id>]" — העבר את ה-id בשדה artwork של הפריט המתאים. אם אין קובץ, אמור שאפשר לצרף בכפתור 📎 או לשלוח אחר כך.`;

const item = { type: "object", required: ["productId"], properties: {
  productId: { type: "string", enum: PRODUCTS.map((p) => p.id) }, quantity: { type: "integer" },
  options: { type: "object", additionalProperties: { type: "string" }, description: "מזהה אפשרות → מזהה ערך" },
  split: { type: "object", additionalProperties: { type: "integer" }, description: "ביגוד: מידה → כמות" },
  production: { type: "string", enum: Object.keys(PRODUCTION) }, artwork: { type: "string" },
} };
const shipping = { type: "string", enum: Object.keys(SHIPPING) };
const tools = [
  { type: "function", function: { name: "get_quote", description: "הצעת מחיר לפריט אחד או יותר כולל משלוח ומע״מ", parameters: { type: "object", required: ["items"], properties: { items: { type: "array", items: item }, shipping } } } },
  { type: "function", function: { name: "place_order", description: "ביצוע הזמנה סופית — רק אחרי אישור מפורש של הלקוח", parameters: { type: "object", required: ["items", "shipping", "name", "phone"], properties: {
    items: { type: "array", items: item }, shipping, name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, address: { type: "string" }, city: { type: "string" }, notes: { type: "string" } } } } },
];

async function runTool(name: string, args: Record<string, unknown>) {
  try {
    const items = (Array.isArray(args.items) ? args.items : []) as LineInput[];
    if (name === "get_quote") {
      const lines = items.map((i) => priceLine(i));
      return { items: lines.map((l) => ({ product: l.productName, quantity: l.quantity, chosen: l.labels, production: `${l.productionLabel} ${l.productionDays} ימי עסקים`, unitInclVat: withVat(l.unitPrice), lineInclVat: withVat(l.subtotal) })), ...totals(lines, args.shipping as string) };
    }
    if (name === "place_order") {
      const customer = { ...args };
      delete customer.items; delete customer.shipping;
      const o = await createOrder({ items, shipping: args.shipping as string, customer, source: "chat" });
      return { ok: true, orderId: o.id, total: o.totals.total };
    }
    return { error: "unknown tool" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function POST(req: Request) {
  const key = process.env.AI_API_KEY;
  if (!key) return Response.json({ reply: "הצ'אט עדיין לא מחובר למודל AI (חסר AI_API_KEY). בינתיים אפשר להזמין דרך המחשבון באתר." });

  const body = await req.json();
  // only user/assistant text from the client — tool results are never trusted from the browser
  const history: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: Msg) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-30)
    .map((m: Msg) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  const messages: Msg[] = [{ role: "system", content: SYSTEM }, ...history];
  let order: unknown;

  for (let step = 0; step < 5; step++) {
    const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.AI_MODEL ?? "deepseek-chat", messages, tools, temperature: 0.3 }),
    });
    if (!res.ok) return Response.json({ reply: "מצטער, יש תקלה זמנית בצ'אט. נסה שוב בעוד רגע." }, { status: 502 });
    const msg: Msg = (await res.json()).choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) return Response.json({ reply: msg.content, order });
    for (const c of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(c.function.arguments || "{}"); } catch {}
      const result = await runTool(c.function.name, args);
      if (c.function.name === "place_order" && "ok" in result) order = result;
      messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
    }
  }
  return Response.json({ reply: "בוא ננסה שוב — מה תרצה להזמין?", order });
}
