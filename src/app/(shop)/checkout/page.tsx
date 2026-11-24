import { Checkout } from "@/components/cart-view";

export const metadata = { title: "קופה — דפוס", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">קופה</h1>
      <Checkout />
    </div>
  );
}
