import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { priceLine, totals, type Line, type LineInput, type Totals } from "./catalog";
import { getCatalog, localized, readCatalog } from "./catalog-store";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { DICTS } from "@/i18n/dicts";
import { db } from "./db";

// Orders live in the business database (lib/db.ts, table `orders`: searchable columns + the full order as jsonb).
// Customer files are in lib/storage (uploads/<id>).

export type Customer = { name: string; phone: string; email?: string; address?: string; city?: string; zip?: string; notes?: string; business?: string; businessId?: string };
/** lang/currency: the site language the order came from and the market currency its prices are in (₪ when missing). */
export type Order = { id: string; createdAt: string; source: "site" | "chat"; items: Line[]; totals: Totals; payment: "phone"; customer: Customer; status: Status; lang?: Locale; currency?: string };

export const STATUSES = ["התקבלה", "בהכנה", "נשלחה", "בוטלה"] as const;
export type Status = (typeof STATUSES)[number];

export const MAX_UPLOAD = 25 * 1024 * 1024;

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

export async function createOrder(input: { items: LineInput[]; shipping?: string; customer: Record<string, unknown>; source: Order["source"]; lang?: unknown; userId?: string }): Promise<Order> {
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
  const sql = await db();
  await sql`insert into orders ${sql({ ...row(order), user_id: input.userId ?? null, data: sql.json(order as never) })}`;
  // runs after the response is sent; a mail failure never fails the order
  after(() => import("./order-email").then((m) => m.sendOrderEmail(order)).catch((e) => console.error("[order-email]", order.id, e)));
  return order;
}

const row = (o: Order) => ({
  id: o.id, created_at: o.createdAt, status: o.status, source: o.source, lang: o.lang ?? DEFAULT_LOCALE, currency: o.currency ?? "ILS",
  customer_name: o.customer.name, phone: o.customer.phone, email: o.customer.email ?? null, city: o.customer.city ?? null,
  total: o.totals.total,
});
const fromRow = (r: { data: Order; status: string }): Order => ({ ...r.data, status: r.status as Status });

export type OrderQuery = { status?: string; lang?: string; q?: string; limit?: number };

/** Newest first. `q` matches order number, name, phone, email, city or a product name. */
export async function listOrders(f: OrderQuery = {}): Promise<Order[]> {
  const sql = await db();
  const like = f.q?.trim() ? `%${f.q.trim().replace(/[\\%_]/g, (c) => "\\" + c)}%` : undefined;
  const rows = await sql<{ data: Order; status: string }[]>`
    select data, status from orders
    where true
      ${f.status ? sql`and status = ${f.status}` : sql``}
      ${f.lang ? sql`and lang = ${f.lang}` : sql``}
      ${like ? sql`and (id ilike ${like} or customer_name ilike ${like} or phone ilike ${like} or coalesce(email, '') ilike ${like}
                        or coalesce(city, '') ilike ${like} or (data -> 'items')::text ilike ${like})` : sql``}
    order by created_at desc limit ${f.limit ?? 500}`;
  return rows.map(fromRow);
}

/** Dashboard numbers: counts per status and language, revenue per currency (cancelled orders excluded). */
export async function orderStats() {
  const sql = await db();
  const [byStatus, byLang, revenue] = await Promise.all([
    sql<{ k: string; n: number }[]>`select status as k, count(*)::int as n from orders group by status`,
    sql<{ k: string; n: number }[]>`select lang as k, count(*)::int as n from orders group by lang`,
    sql<{ currency: string; total: string; n: number }[]>`select currency, sum(total) as total, count(*)::int as n from orders where status <> ${STATUSES[3]} group by currency order by sum(total) desc`,
  ]);
  const map = (r: { k: string; n: number }[]) => Object.fromEntries(r.map((x) => [x.k, x.n])) as Record<string, number>;
  return { byStatus: map(byStatus), byLang: map(byLang), revenue: revenue.map((r) => ({ currency: r.currency, total: Number(r.total), n: r.n })) };
}

/** A customer's own orders (linked by account id only), newest first. */
export async function userOrders(userId: string): Promise<Order[]> {
  const sql = await db();
  const rows = await sql<{ data: Order; status: string }[]>`select data, status from orders where user_id = ${userId} order by created_at desc limit 200`;
  return rows.map(fromRow);
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!/^DP-[A-Z0-9]+$/.test(id)) return null;
  const sql = await db();
  const [r] = await sql<{ data: Order; status: string }[]>`select data, status from orders where id = ${id}`;
  return r ? fromRow(r) : null;
}

export async function setStatus(id: string, status: string) {
  if (!STATUSES.includes(status as Status)) throw new Error("bad status");
  const sql = await db();
  const r = await sql`update orders set status = ${status}, data = jsonb_set(data, '{status}', to_jsonb(${status}::text)) where id = ${id}`;
  if (!r.count) throw new Error("order not found");
}

/** Import an order as-is (migration from the old file storage). Existing ids are left untouched. */
export async function importOrder(o: Order) {
  const sql = await db();
  await sql`insert into orders ${sql({ ...row(o), data: sql.json(o as never) })} on conflict (id) do nothing`;
}

/** Email the order summary to the customer after checkout. Only for a fresh order (≤ 2h) and when the phone matches —
 *  the browser that placed the order knows both; nobody else can mail out someone's order. */
export async function emailOrderToCustomer(id: unknown, phone: unknown, email: unknown, langIn?: unknown) {
  const lang = isLocale(langIn) ? langIn : DEFAULT_LOCALE, e = DICTS[lang].errors;
  const o = typeof id === "string" ? await getOrder(id) : null;
  const digits = (x: unknown) => String(x ?? "").replace(/\D/g, "").slice(-9);
  if (!o || digits(o.customer.phone) !== digits(phone) || Date.now() - Date.parse(o.createdAt) > 2 * 3600_000) throw new Error(e.orderNotFound);
  const to = typeof email === "string" ? email.trim().slice(0, 200) : "";
  if (!/^\S+@\S+\.\S+$/.test(to)) throw new Error(e.email);
  const next = { ...o, customer: { ...o.customer, email: to } };
  const sql = await db();
  await sql`update orders set email = ${to}, data = ${sql.json(next as never)} where id = ${id as string}`;
  await (await import("./order-email")).sendCustomerEmail(next);
}
