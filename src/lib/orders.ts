import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { priceLine, totals, type Line, type LineInput, type Totals } from "./catalog";
import { getCatalog } from "./catalog-store";
import { keys, readJson, write, writeJson } from "./storage";

// One JSON per order (orders/<id>.json) in storage — Blob on Vercel, data/ locally. Customer files in uploads/<id>.

export type Customer = { name: string; phone: string; email?: string; address?: string; city?: string; notes?: string; business?: string; businessId?: string };
export type Order = { id: string; createdAt: string; source: "site" | "chat"; items: Line[]; totals: Totals; payment: "phone"; customer: Customer; status: Status };

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

export function validateCustomer(c: Record<string, unknown>, needsAddress = true): Customer {
  const out: Customer = {
    name: s(c.name), phone: s(c.phone, 20).replace(/[^\d+]/g, ""), email: s(c.email) || undefined,
    address: s(c.address) || undefined, city: s(c.city, 60) || undefined, notes: s(c.notes, 500) || undefined,
    business: s(c.business, 100) || undefined, businessId: s(c.businessId, 12).replace(/\D/g, "") || undefined,
  };
  if (out.name.length < 2) throw new Error("חסר שם מלא");
  if (!/^(\+972|0)5\d{8}$/.test(out.phone)) throw new Error("מספר טלפון נייד לא תקין");
  if (needsAddress && ((out.address?.length ?? 0) < 3 || (out.city?.length ?? 0) < 2)) throw new Error("חסרה כתובת למשלוח");
  if (out.email && !/^\S+@\S+\.\S+$/.test(out.email)) throw new Error("אימייל לא תקין");
  return out;
}

export async function createOrder(input: { items: LineInput[]; shipping?: string; customer: Record<string, unknown>; source: Order["source"] }): Promise<Order> {
  if (!Array.isArray(input.items) || !input.items.length) throw new Error("העגלה ריקה");
  if (input.items.length > 30) throw new Error("יותר מדי פריטים בהזמנה אחת");
  const cat = await getCatalog();
  const items = input.items.map((i) => priceLine(cat, i)); // prices are always recomputed server-side, from the live catalog
  const t = totals(cat, items, input.shipping);
  const order: Order = {
    id: `DP-${Date.now().toString(36).toUpperCase()}${randomUUID().slice(0, 2).toUpperCase()}`, createdAt: new Date().toISOString(), source: input.source, items, totals: t, payment: "phone",
    customer: validateCustomer(input.customer ?? {}, t.shippingMethod !== "pickup"), status: "התקבלה",
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
