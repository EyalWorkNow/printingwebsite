import { emailOrderToCustomer } from "@/lib/orders";

// "Email me the order details" from the order confirmation screen.
export async function POST(req: Request) {
  try {
    const { id, phone, email, lang } = await req.json();
    await emailOrderToCustomer(id, phone, email, lang);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
