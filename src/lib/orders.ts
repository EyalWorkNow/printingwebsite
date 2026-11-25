import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { priceLine, totals, type Line, type LineInput, type Totals } from "./catalog";
import { getCatalog, localized, readCatalog } from "./catalog-store";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dicts";
import { keys, readJson, write, writeJson } from "./storage";

// One JSON per order (orders/<id>.json) in storage — Blob on Vercel, data/ locally. Customer files in uploads/<id>.

export type Customer = { name: string; phone: string; email?: string; address?: string; city?: string; zip?: string; notes?: string; business?: string; businessId?: string };
/** lang/currency: the site language the order came from and the market currency its prices are in (₪ when missing). */
export type Order = { id: string; createdAt: string; source: "site" | "chat"; items: Line[]; totals: Totals; payment: "phone"; customer: Customer; status: Status; lang?: Locale; currency?: string };

export const STATUSES = ["התקבלה", "בהכנה", "נשלחה", "בוטלה"] as const;
export type Status = (typeof STATUSES)[number];

export const UPLOAD_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", "image/svg+xml": "svg" };
export const MAX_UPLOAD = 25 * 1024 * 1024;
export const UPLOAD_KEY = /^uploads\/[0-9a-f-]{36}\.(png|jpg|webp|pdf|svg)$/;

export async function saveUpload(file: File): Promise<string> {
  const ext = UPLOAD_TYPES[file.type];
  if (!ext) throw new Error("סוג קובץ לא נתמך (PDF/PNG/JPG/WEBP/SVG)");
  if (file.size > MAX_UPLOAD) throw new Error("הקובץ גדול מ-25MB");
  const id = `${randomUUID()}.${ext}`;
  await write(`uploads/${id}`, Buffer.from(await file.arrayBuffer()), { contentType: file.type, create: true });
  return id;
}

const s = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateCustomer(c: Record<string, unknown>, needsAddress = true, lang: Locale = DEFAULT_LOCALE): Customer {
  const e = DICTS[lang].errors;
  const out: Customer = {
    name: s(c.name), phone: s(c.phone, 24).replace(/[^\d+]/g, ""), email: s(c.email) || undefined,
    address: s(c.address) || undefined, city: s(c.city, 60) || undefined, zip: s(c.zip, 12) || undefined, notes: s(c.notes, 500) || undefined,
    business: s(c.business, 100) || undefined, businessId: s(c.businessId, 20) || undefined,
  };
  if (out.name.length < 2) throw new Error(e.name);
  // Israeli site: Israeli mobile; elsewhere any international number (7–15 digits, optional +)
  if (!(lang === "he" ? /^(\+972|0)5\d{8}$/ : /^\+?\d{7,15}$/).test(out.phone)) throw new Error(e.phone);
  if (needsAddress && ((out.address?.length ?? 0) < 3 || (out.city?.length ?? 0) < 2)) throw new Error(e.address);
  if (out.email && !/^\S+@\S+\.\S+$/.test(out.email)) throw new Error(e.email);
  return out;
}

export async function createOrder(input: { items: LineInput[]; shipping?: string; customer: Record<string, unknown>; source: Order["source"]; lang?: unknown }): Promise<Order> {
  const lang = isLocale(input.lang) ? input.lang : DEFAULT_LOCALE, e = DICTS[lang].errors;
  if (!Array.isArray(input.items) || !input.items.length) throw new Error(e.emptyCart);
  if (input.items.length > 30) throw new Error(e.tooMany);
  const cat = lang === DEFAULT_LOCALE ? await getCatalog() : await localized(await readCatalog(), lang); // priced in the order's market
  const items = input.items.map((i) => priceLine(cat, i)); // prices are always recomputed server-side, from the live catalog
  const t = totals(cat, items, input.shipping);
  const order: Order = {
    id: `DP-${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 2).toUpperCase()}`, createdAt: new Date().toISOString(), source: input.source, items, totals: t, payment: "phone",
    customer: validateCustomer(input.customer ?? {}, t.shippingMethod !== "pickup", lang), status: "התקבלה",
    lang, currency: cat.market?.currency ?? "ILS",
  };
  await writeJson(`orders/${order.id}.json`, order, { create: true });
  // runs after the response is sent; a mail failure never fails the order
  after(() => import("./order-email").then((m) => m.sendOrderEmail(order)).catch((e) => console.error("[order-email]", order.id, e)));
  return order;
}

// ponytail: reads every order file on each admin view; fine for hundreds of orders, add a DB index past a few thousand
export async function listOrders(): Promise<Order[]> {
  const all = await Promise.all((await keys("orders/")).filter((k) => k.endsWith(".json")).map((k) => readJson<Order>(k)));
  return all.filter((o): o is Order => !!o).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function setStatus(id: string, status: string) {
  if (!STATUSES.includes(status as Status)) throw new Error("סטטוס לא חוקי");
  if (!/^DP-[A-Z0-9]+$/.test(id)) throw new Error("הזמנה לא נמצאה");
  const o = await readJson<Order>(`orders/${id}.json`);
  if (!o) throw new Error("הזמנה לא נמצאה");
  await writeJson(`orders/${id}.json`, { ...o, status });
}

/** Email the order summary to the customer after checkout. Only for a fresh order (≤ 2h) and when the phone matches —
 *  the browser that placed the order knows both; nobody else can mail out someone's order. */
export async function emailOrderToCustomer(id: unknown, phone: unknown, email: unknown, langIn?: unknown) {
  const lang = isLocale(langIn) ? langIn : DEFAULT_LOCALE, e = DICTS[lang].errors;
  if (typeof id !== "string" || !/^DP-[A-Z0-9]+$/.test(id)) throw new Error(e.orderNotFound);
  const o = await readJson<Order>(`orders/${id}.json`);
  const digits = (x: unknown) => String(x ?? "").replace(/\D/g, "").slice(-9);
  if (!o || digits(o.customer.phone) !== digits(phone) || Date.now() - Date.parse(o.createdAt) > 2 * 3600_000) throw new Error(e.orderNotFound);
  const to = typeof email === "string" ? email.trim().slice(0, 200) : "";
  if (!/^\S+@\S+\.\S+$/.test(to)) throw new Error(e.email);
  const next = { ...o, customer: { ...o.customer, email: to } };
  await writeJson(`orders/${id}.json`, next);
  await (await import("./order-email")).sendCustomerEmail(next);
}
