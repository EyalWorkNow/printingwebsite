import { createOrder } from "@/lib/orders";
import { currentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "login required" }, { status: 401 }); // orders need an account
    const { items, shipping, customer, lang } = await req.json();
    const order = await createOrder({ items, shipping, customer, source: "site", lang, userId: user.id });
    return Response.json({ id: order.id, total: order.totals.total });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
