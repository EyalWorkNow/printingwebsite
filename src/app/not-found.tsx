import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl font-bold text-neutral-700">404</p>
      <h1 className="text-2xl font-semibold">העמוד לא נמצא</h1>
      <p className="text-neutral-400">ייתכן שהמוצר הוסר או שהקישור שגוי.</p>
      <div className="flex gap-3"><Link href="/" className="rounded-lg bg-white px-5 py-2.5 font-medium text-black">לדף הבית</Link><Link href="/products" className="rounded-lg border px-5 py-2.5">לכל המוצרים</Link></div>
    </main>
  );
}
