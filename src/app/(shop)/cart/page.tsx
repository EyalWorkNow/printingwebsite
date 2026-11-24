import { CartView } from "@/components/cart-view";

export const metadata = { title: "עגלת קניות — דפוס", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">עגלת קניות</h1>
      <CartView />
    </div>
  );
}
