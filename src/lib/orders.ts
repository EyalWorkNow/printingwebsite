import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { priceLine, totals, type Line, type LineInput, type Totals } from "./catalog";

// ponytail: JSON file + local disk, swap for a DB/object storage before multi-instance hosting
const DATA = path.join(process.cwd(), "data");
const ORDERS = path.join(DATA, "orders.json");
export const UPLOADS = path.join(DATA, "uploads");

export type Customer = { name: string; phone: string; email?: string; address?: string; city?: string; notes?: string; business?: string; businessId?: string };
export type Order = { id: string; createdAt: string; source: "site" | "chat"; items: Line[]; totals: Totals; payment: "phone"; customer: Customer; status: Status };

export const STATUSES = ["התקבלה", "בהכנה", "נשלחה", "בוטלה"] as const;
export type Status = (typeof STATUSES)[number];

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "image/svg+xml"]);
export const MAX_UPLOAD = 25 * 1024 * 1024;

export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new Error("סוג קובץ לא נתמך (PDF/PNG/JPG/WEBP/SVG)");
  if (file.size > MAX_UPLOAD) throw new Error("הקובץ גדול מ-25MB");
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", "image/svg+xml": "svg" }[file.type];
  const id = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS, { recursive: true });
  await writeFile(path.join(UPLOADS, id), Buffer.from(await file.arrayBuffer()));
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

let chain = Promise.resolve(); // ponytail: in-process write lock, single-instance only

export async function createOrder(input: { items: LineInput[]; shipping?: string; customer: Record<string, unknown>; source: Order["source"] }): Promise<Order> {
  if (!Array.isArray(input.items) || !input.items.length) throw new Error("העגלה ריקה");
  if (input.items.length > 30) throw new Error("יותר מדי פריטים בהזמנה אחת");
  const items = input.items.map((i) => priceLine(i)); // prices are always recomputed server-side
  const t = totals(items, input.shipping);
  const order: Order = {
    id: `DP-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), source: input.source, items, totals: t, payment: "phone",
    customer: validateCustomer(input.customer ?? {}, t.shippingMethod !== "pickup"), status: "התקבלה",
  };
  await mutate((all) => { all.push(order); });
  // runs after the response is sent; a mail failure never fails the order
  after(() => import("./order-email").then((m) => m.sendOrderEmail(order)).catch((e) => console.error("[order-email]", order.id, e)));
  return order;
}

export const listOrders = async (): Promise<Order[]> => JSON.parse(await readFile(ORDERS, "utf8").catch(() => "[]"));

async function mutate(fn: (all: Order[]) => void) {
  const job = chain.then(async () => {
    await mkdir(DATA, { recursive: true });
    const all = await listOrders();
    fn(all);
    await writeFile(ORDERS, JSON.stringify(all, null, 2));
  });
  chain = job.catch(() => {});
  await job;
}

export async function setStatus(id: string, status: string) {
  if (!STATUSES.includes(status as Status)) throw new Error("סטטוס לא חוקי");
  await mutate((all) => {
    const o = all.find((x) => x.id === id);
    if (!o) throw new Error("הזמנה לא נמצאה");
    o.status = status as Status;
  });
}
