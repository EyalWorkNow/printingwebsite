import { PRODUCTS, quote, FREE_SHIPPING_FROM, SHIPPING } from "@/lib/catalog";
import { createOrder } from "@/lib/orders";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

const catalog = PRODUCTS.map((p) => `- ${p.id}: ${p.name} (${p.desc}); מידות: ${p.sizes.join(", ")}; מינימום ${p.minQty}`).join("\n");

const SYSTEM = `אתה נציג המכירות של "דפוס" — בית דפוס דיגיטלי. ענה תמיד בעברית, קצר וחם, בטקסט רגיל בלי Markdown (בלי כוכביות או סולמיות).
המטרה: לעזור ללקוח לבחור מוצר, לתת הצעת מחיר ולסגור הזמנה עם משלוח עד הבית.
קטלוג:
${catalog}
משלוח עד הבית ${SHIPPING}₪, חינם מעל ${FREE_SHIPPING_FROM}₪ לפני מע״מ. זמן אספקה 3–5 ימי עסקים. תשלום מתבצע בטלפון לאחר אישור הגרפיקה.
כללים:
- לעולם אל תמציא מחיר. כל מחיר מגיע רק מהכלי get_quote.
- לפני place_order: הצג סיכום (מוצר, מידה, כמות, סה״כ כולל מע״מ ומשלוח, שם, טלפון נייד, כתובת ועיר) ובקש אישור מפורש מהלקוח. רק אחרי "כן"/אישור — הפעל place_order.
- אם הלקוח צירף קובץ גרפיקה תופיע הודעה "[קובץ גרפיקה צורף: <id>]" — העבר את ה-id בשדה artwork. אם אין קובץ, אמור שאפשר לצרף בכפתור 📎 או לשלוח אחר כך.`;

const tools = [
  { type: "function", function: { name: "get_quote", description: "הצעת מחיר למוצר וכמות", parameters: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string", enum: PRODUCTS.map((p) => p.id) }, quantity: { type: "integer" }, size: { type: "string" } } } } },
  { type: "function", function: { name: "place_order", description: "ביצוע הזמנה סופית — רק אחרי אישור מפורש של הלקוח", parameters: { type: "object", required: ["productId", "quantity", "name", "phone", "address", "city"], properties: { productId: { type: "string", enum: PRODUCTS.map((p) => p.id) }, quantity: { type: "integer" }, size: { type: "string" }, name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, address: { type: "string" }, city: { type: "string" }, notes: { type: "string" }, artwork: { type: "string" } } } } },
];

async function runTool(name: string, args: Record<string, unknown>) {
  try {
    if (name === "get_quote") return quote(String(args.productId), Number(args.quantity), args.size as string);
    if (name === "place_order") {
      const { productId, quantity, size, artwork, ...customer } = args;
      const o = await createOrder({ productId: String(productId), quantity: Number(quantity), size: size as string, artwork: artwork as string, customer, source: "chat" });
      return { ok: true, orderId: o.id, total: o.quote.total };
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
