import Image from "next/image";
import Link from "next/link";
import { GlowCard } from "@/components/glow-card";

export const metadata = { title: "אודות — דפוס", description: "בית דפוס דיגיטלי: מוצרי דפוס, ביגוד ומוצרי פרסום ממותגים, עם מחיר מיידי והזמנה אונליין." };

const POINTS = [
  ["מחיר שקוף ומיידי", "כל שילוב של גודל, חומר, גימור, כמות וזמן ייצור מקבל מחיר מדויק כבר באתר — בלי ״נחזור אליכם עם הצעה״."],
  ["בודקים כל קובץ", "לפני שמדפיסים, אדם אמיתי עובר על הקובץ: רזולוציה, שוליים, צבעים. אם משהו לא תקין — נחזור אליכם לפני הייצור."],
  ["הזמנה אחת, הרבה מוצרים", "חולצות לצוות, עטים לכנס וכרטיסי ביקור — באותה עגלה, באותו משלוח."],
  ["נציג AI שמבין דפוס", "רוצים לדבר ולא למלא טפסים? הנציג בצ׳אט ממליץ, מחשב מחיר לפי אותו מחירון וסוגר הזמנה."],
];

export default function About() {
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold md:text-5xl">מדפיסים את המותג שלכם — בפשטות.</h1>
          <p className="text-neutral-400 md:text-lg">דפוס הוא בית דפוס דיגיטלי לעסקים, ארגונים ואנשים פרטיים. מכרטיס ביקור אחד ועד ערכת מיתוג שלמה לאירוע — אנחנו מאמינים שהזמנת דפוס צריכה להיות פשוטה כמו קנייה אונליין: רואים מחיר, רואים הדמיה, מזמינים.</p>
          <Link href="/products" className="inline-block rounded-lg bg-white px-6 py-3 font-medium text-black">למוצרים</Link>
        </div>
        <GlowCard className="h-auto" inner="relative aspect-square p-0"><Image src="/img/set-flatlay.webp" alt="מוצרים ממותגים: חולצה, כובע, מחברת, עט ותיק" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" /></GlowCard>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {POINTS.map(([t, d]) => <GlowCard key={t} inner="space-y-2"><h2 className="text-lg font-semibold">{t}</h2><p className="text-sm text-neutral-400">{d}</p></GlowCard>)}
      </section>
    </div>
  );
}
