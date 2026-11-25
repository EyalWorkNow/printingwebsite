import { createOrder } from "@/lib/orders";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { items, shipping, customer, lang } = await req.json();
    const order = await createOrder({ items, shipping, customer, source: "site", lang, userId: (await currentUser())?.id });
    return Response.json({ id: order.id, total: order.totals.total });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
