import { Checkout } from "@/components/cart-view";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.checkout.title} — ${d.meta.titleSuffix}`, robots: { index: false } };
}

export default async function CheckoutPage() {
  const { d } = await getI18n();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{d.checkout.title}</h1>
      <Checkout />
    </div>
  );
}
