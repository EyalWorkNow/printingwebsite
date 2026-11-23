import { createOrder } from "@/lib/orders";

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const order = await createOrder({ ...b, source: "site" });
    return Response.json({ id: order.id, total: order.quote.total });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
