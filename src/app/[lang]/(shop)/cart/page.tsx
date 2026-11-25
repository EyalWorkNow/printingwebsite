import { CartView } from "@/components/cart-view";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.cart.title} — ${d.meta.titleSuffix}`, robots: { index: false } };
}

export default async function CartPage() {
  const { d } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{d.cart.title}</h1>
      <CartView />
    </div>
  );
}
