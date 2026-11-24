import { isAdmin } from "@/lib/admin-auth";
import { listOrders } from "@/lib/orders";
import { renderOrderEmail, renderCustomerEmail, ART_CID } from "@/lib/order-email";

// /admin/email-preview[?id=DP-…][&to=customer] — shows the notification email for an order (latest by default)
export async function GET(req: Request) {
  if (!isAdmin(req.headers.get("authorization"))) return new Response(null, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  const all = await listOrders();
  const o = id ? all.find((x) => x.id === id) : all.at(-1);
  if (!o) return new Response("אין הזמנות", { status: 404 });
  const render = new URL(req.url).searchParams.get("to") === "customer" ? renderCustomerEmail : renderOrderEmail;
  return new Response(render(o).html.replaceAll(`cid:${ART_CID}`, "/admin/email-preview/print.gif"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
