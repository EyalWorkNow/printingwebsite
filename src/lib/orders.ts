import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { quote, type Quote } from "./catalog";

// ponytail: JSON file + local disk, swap for a DB/object storage before multi-instance hosting
const DATA = path.join(process.cwd(), "data");
const ORDERS = path.join(DATA, "orders.json");
export const UPLOADS = path.join(DATA, "uploads");

export type Customer = { name: string; phone: string; email?: string; address: string; city: string; notes?: string };
export type Order = { id: string; createdAt: string; source: "site" | "chat"; quote: Quote; customer: Customer; artwork?: string; status: Status };

export const STATUSES = ["התקבלה", "בהכנה", "נשלחה", "בוטלה"] as const;
export type Status = (typeof STATUSES)[number];

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf", "image/svg+xml"]);
export const MAX_UPLOAD = 20 * 1024 * 1024;

export async function saveUpload(file: File): Promise<string> {
  if (!ALLOWED.has(file.type)) throw new Error("סוג קובץ לא נתמך (PNG/JPG/WEBP/SVG/PDF)");
  if (file.size > MAX_UPLOAD) throw new Error("הקובץ גדול מ-20MB");
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf", "image/svg+xml": "svg" }[file.type];
  const id = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS, { recursive: true });
  await writeFile(path.join(UPLOADS, id), Buffer.from(await file.arrayBuffer()));
  return id;
}

const s = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validateCustomer(c: Record<string, unknown>): Customer {
  const out: Customer = { name: s(c.name), phone: s(c.phone, 20).replace(/[^\d+]/g, ""), email: s(c.email) || undefined, address: s(c.address), city: s(c.city, 60), notes: s(c.notes, 500) || undefined };
  if (out.name.length < 2) throw new Error("חסר שם מלא");
  if (!/^(\+972|0)5\d{8}$/.test(out.phone)) throw new Error("מספר טלפון נייד לא תקין");
  if (out.address.length < 3 || out.city.length < 2) throw new Error("חסרה כתובת למשלוח");
  if (out.email && !/^\S+@\S+\.\S+$/.test(out.email)) throw new Error("אימייל לא תקין");
  return out;
}

let chain = Promise.resolve(); // ponytail: in-process write lock, single-instance only

export async function createOrder(input: { productId: string; quantity: number; size?: string; customer: Record<string, unknown>; artwork?: string; source: Order["source"] }): Promise<Order> {
  const q = quote(input.productId, Number(input.quantity), input.size); // price is always recomputed server-side
  const artwork = input.artwork && /^[\w-]+\.(png|jpg|webp|pdf|svg)$/.test(input.artwork) ? input.artwork : undefined;
  const order: Order = { id: `DP-${Date.now().toString(36).toUpperCase()}`, createdAt: new Date().toISOString(), source: input.source, quote: q, customer: validateCustomer(input.customer), artwork, status: "התקבלה" };
  await mutate((all) => { all.push(order); });
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
