import { PRODUCTION_IDS, liveProducts, liveShipping, priceLine, totals, withVat, money, type Catalog, type LineInput } from "@/lib/catalog";
import { getCatalog, localized, readCatalog } from "@/lib/catalog-store";
import { createOrder, emailOrderToCustomer, type Order } from "@/lib/orders";
import { readJson } from "@/lib/storage";
import { DEFAULT_LOCALE, LOCALE_META, isLocale, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dicts";

// AI sales agent. Tools do real work: quotes from the live price list, adding to the visitor's cart, opening pages,
// placing orders (incl. "order what's in my cart"), order status and emailing order details. Client-side effects
// (cart, navigation) come back as `actions` the widget executes. Prices/tools are per locale (language + market).
type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type ChatAction =
  | { type: "add_to_cart"; item: LineInput & { label: string } }
  | { type: "navigate"; path: string }
  | { type: "order_placed"; id: string; total: string; clearCart: boolean };

const LANG_NAME: Record<Locale, string> = { he: "Hebrew", en: "English", de: "German", fr: "French", es: "Spanish", it: "Italian", ar: "Arabic" };
const FORMAL: Partial<Record<Locale, string>> = { de: "Sie", fr: "vous", es: "usted", it: "Lei" };
const STATUS_EN: Record<string, string> = { "התקבלה": "received", "בהכנה": "in production", "נשלחה": "shipped", "בוטלה": "cancelled" };

function setup(cat: Catalog, lang: Locale, cart: LineInput[]) {
  const m = money(cat), vat = cat.market?.vat ?? 0.18, products = liveProducts(cat), ships = liveShipping(cat);
  const catalog = products.map((p) => [
    `- ${p.id}: ${p.name} — ${p.desc}. qty ${p.qty.min}–${p.qty.max} (step ${p.qty.step}; tiers ${p.qty.presets.join("/")}). production: ${p.production.join("/")}`,
    ...p.options.map((o) => `    ${o.kind === "split" ? "split" : `options.${o.id}`} (${o.title}): ${o.values.filter((v) => v.active !== false).map((v) => `${v.id}=${v.title}`).join(", ")}`),
  ].join("\n")).join("\n");
  const cartText = cart.length ? cart.map((i, n) => `${n + 1}. ${JSON.stringify({ productId: i.productId, quantity: i.quantity, options: i.options, split: i.split, production: i.production, hasArtwork: !!(i.artwork || i.files?.some((f) => f.artwork)) })}`).join("\n") : "(empty)";

  const system = `You are the sales assistant of "${DICTS[lang].meta.brand}", an online print shop (business cards, flyers, signage, branded apparel, promotional products).
ALWAYS reply in ${LANG_NAME[lang]}${LOCALE_META[lang].dir === "rtl" ? " (right-to-left)" : ""}${FORMAL[lang] ? `, addressing the customer formally (${FORMAL[lang]})` : ""}. Short, warm, efficient. Plain text only — no Markdown (no asterisks, no #, no tables). Use line breaks for lists.
Market: prices in ${cat.market?.currency ?? "ILS"}${vat ? `, shown including ${Math.round(vat * 100)}% VAT` : ", excluding sales tax"}.
Goal: understand what the customer needs, recommend, quote exact prices, then either put it in their cart or place the order — end to end, with as few questions as possible (ask only for what is missing; sensible defaults are fine and you say which you chose).

Catalog (ids are for tools only — never show ids to the customer; use the product/option names):
${catalog}
Production times (business days): ${PRODUCTION_IDS.map((k) => { const v = cat.production[k]; return `${k}=${v.label} ${v.days}d${v.pct ? ` (${v.pct > 0 ? "+" : ""}${Math.round(v.pct * 100)}%)` : ""}`; }).join(", ")}. Default: standard.
Shipping: ${ships.map((k) => { const v = cat.shipping[k]; return `${k}=${v.label} ${v.price ? m(v.price) : "free"} (${v.days}d)${v.freeFrom ? `, free over ${m(v.freeFrom)} before tax` : ""}`; }).join("; ")}.
Payment: after the order we check the artwork and contact the customer to confirm and pay within one business day (no payment in chat — never ask for card details).
The customer's cart right now:
${cartText}

Rules:
- Never invent a price: every price comes from get_quote (or the tool results). Options not mentioned get the default (first value).
- Apparel: quantities per size go in split, e.g. {"M":5,"L":3}.
- If the customer wants to buy/collect items: offer add_to_cart (they can keep shopping) or ordering right here with place_order.
- Before place_order: show a short summary (items with options and quantities, shipping method, total incl. VAT, name, mobile phone, email if given, and address unless pickup) and get an explicit yes. Only then call place_order. To order exactly what is in their cart use useCart=true.
- Artwork: if a message contains "[artwork attached: <id>]" (or the Hebrew "[קובץ גרפיקה צורף: <id>]"), pass that id as artwork of the matching item. Without a file, say they can attach it with the 📎 button now or send it later.
- After an order: give the order number, offer to email the details (send_order_email) if they gave no email.
- Order status: ask for the order number and phone, then order_status.
- To show a product, the cart or checkout, call open_page.`;

  const item = { type: "object", required: ["productId"], properties: {
    productId: { type: "string", enum: products.map((p) => p.id) }, quantity: { type: "integer" },
    options: { type: "object", additionalProperties: { type: "string" }, description: "option id → value id" },
    split: { type: "object", additionalProperties: { type: "integer" }, description: "apparel: size → quantity" },
    production: { type: "string", enum: PRODUCTION_IDS }, artwork: { type: "string" },
  } };
  const shipping = { type: "string", enum: ships };
  const fn = (name: string, description: string, parameters: object) => ({ type: "function", function: { name, description, parameters } });
  const tools = [
    fn("get_quote", "Exact price for one or more items incl. shipping and VAT", { type: "object", required: ["items"], properties: { items: { type: "array", items: item }, shipping } }),
    fn("add_to_cart", "Put items in the customer's site cart (they check out later or keep shopping)", { type: "object", required: ["items"], properties: { items: { type: "array", items: item } } }),
    fn("open_page", "Open a page for the customer", { type: "object", required: ["page"], properties: { page: { type: "string", enum: ["cart", "checkout", "products", "product", "contact", "faq"] }, productId: { type: "string", enum: products.map((p) => p.id) } } }),
    fn("place_order", "Place the final order — only after the customer explicitly confirmed the summary", { type: "object", required: ["shipping", "name", "phone"], properties: {
      items: { type: "array", items: item, description: "items to order (omit when useCart=true)" }, useCart: { type: "boolean", description: "order exactly the items in the customer's cart" },
      shipping, name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, address: { type: "string" }, city: { type: "string" }, zip: { type: "string" }, notes: { type: "string" } } }),
    fn("order_status", "Status of an existing order", { type: "object", required: ["orderId", "phone"], properties: { orderId: { type: "string" }, phone: { type: "string" } } }),
    fn("send_order_email", "Email the order details to the customer (recent orders)", { type: "object", required: ["orderId", "phone", "email"], properties: { orderId: { type: "string" }, phone: { type: "string" }, email: { type: "string" } } }),
  ];
  return { system, tools };
}

async function runTool(cat: Catalog, lang: Locale, cart: LineInput[], name: string, args: Record<string, unknown>, actions: ChatAction[]) {
  const m = money(cat);
  try {
    const items = (Array.isArray(args.items) ? args.items : []) as LineInput[];
    if (name === "get_quote") {
      const lines = items.map((i) => priceLine(cat, i));
      const t = totals(cat, lines, args.shipping as string);
      return { items: lines.map((l) => ({ product: l.productName, quantity: l.quantity, chosen: l.labels, production: `${l.productionLabel} ${l.productionDays}d`, unit: m(withVat(l.unitPrice, cat)), line: m(withVat(l.subtotal, cat)) })),
        shipping: `${t.shippingLabel}: ${t.shipping ? m(withVat(t.shipping, cat)) : "free"}`, vat: m(t.vat), total: m(t.total) };
    }
    if (name === "add_to_cart") {
      const added = items.map((i) => { const l = priceLine(cat, i); actions.push({ type: "add_to_cart", item: { ...i, quantity: l.quantity, label: `${l.quantity} × ${l.productName}` } }); return `${l.quantity} × ${l.productName} (${m(withVat(l.subtotal, cat))})`; });
      return { ok: true, added };
    }
    if (name === "open_page") {
      const page = String(args.page), id = String(args.productId ?? "");
      const path = page === "product" && liveProducts(cat).some((p) => p.id === id) ? `/p/${id}` : ["cart", "checkout", "products", "contact", "faq"].includes(page) ? `/${page}` : null;
      if (!path) return { error: "unknown page" };
      actions.push({ type: "navigate", path });
      return { ok: true };
    }
    if (name === "place_order") {
      const useCart = args.useCart === true && cart.length > 0;
      const customer = { ...args };
      for (const k of ["items", "shipping", "useCart"]) delete customer[k];
      const o = await createOrder({ items: useCart ? cart : items, shipping: args.shipping as string, customer, source: "chat", lang });
      actions.push({ type: "order_placed", id: o.id, total: m(o.totals.total), clearCart: useCart });
      return { ok: true, orderId: o.id, total: m(o.totals.total), emailSent: !!o.customer.email };
    }
    if (name === "order_status") {
      const id = String(args.orderId ?? "").toUpperCase().trim();
      const o = /^DP-[A-Z0-9]+$/.test(id) ? await readJson<Order>(`orders/${id}.json`) : null;
      const last = (x: unknown) => String(x ?? "").replace(/\D/g, "").slice(-9);
      if (!o || last(o.customer.phone) !== last(args.phone)) return { error: "order not found for this phone number" };
      return { orderId: o.id, status: STATUS_EN[o.status] ?? o.status, placed: o.createdAt.slice(0, 10), items: o.items.map((l) => `${l.quantity} × ${l.productName}`), shipping: o.totals.shippingLabel };
    }
    if (name === "send_order_email") {
      await emailOrderToCustomer(args.orderId, args.phone, args.email, lang);
      return { ok: true };
    }
    return { error: "unknown tool" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const l: unknown = body.lang, lang: Locale = isLocale(l) ? l : DEFAULT_LOCALE, t = DICTS[lang].chat;
  const key = process.env.AI_API_KEY;
  if (!key) return Response.json({ reply: t.notConnected });

  // only user/assistant text from the client — tool results are never trusted from the browser
  const history: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: Msg) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-30)
    .map((m: Msg) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  const cart: LineInput[] = (Array.isArray(body.cart) ? body.cart : []).slice(0, 30)
    .filter((i: LineInput) => i && typeof i.productId === "string")
    .map((i: LineInput) => ({ productId: i.productId, quantity: i.quantity, options: i.options, split: i.split, production: i.production, artwork: i.artwork, placement: i.placement, files: i.files }));
  const cat = lang === DEFAULT_LOCALE ? await getCatalog() : await localized(await readCatalog(), lang);
  const { system, tools } = setup(cat, lang, cart);
  const messages: Msg[] = [{ role: "system", content: system }, ...history];
  const actions: ChatAction[] = [];

  for (let step = 0; step < 6; step++) {
    const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.deepseek.com"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: process.env.AI_MODEL ?? "deepseek-chat", messages, tools, temperature: 0.3 }),
    });
    if (!res.ok) return Response.json({ reply: t.temporary, actions }, { status: 502 });
    const msg: Msg = (await res.json()).choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) return Response.json({ reply: msg.content, actions });
    for (const c of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(c.function.arguments || "{}"); } catch {}
      const result = await runTool(cat, lang, cart, c.function.name, args, actions);
      messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
    }
  }
  return Response.json({ reply: t.retry, actions });
}
