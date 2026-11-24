import { MessageCircle, Phone, Mail, MapPin, Clock } from "lucide-react";
import { BUSINESS } from "@/lib/content";
import { ContactForm } from "@/components/contact-form";
import { GlowCard } from "@/components/glow-card";

export const metadata = { title: "צור קשר — דפוס", description: "שאלה, הצעת מחיר לפרויקט גדול או בעיה בהזמנה — כתבו לנו." };

export default function Contact() {
  const rows = ([[Phone, BUSINESS.phone, `tel:${BUSINESS.phone}`], [Mail, BUSINESS.email, `mailto:${BUSINESS.email}`], [MapPin, BUSINESS.address], [Clock, BUSINESS.hours]] as const).filter(([, v]) => v);
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <header className="space-y-2 lg:col-span-12">
        <h1 className="text-3xl font-bold md:text-4xl">צור קשר</h1>
        <p className="text-neutral-400">פרויקט גדול, מוצר שלא מופיע באתר או שאלה על הזמנה — נשמח לעזור.</p>
      </header>
      <GlowCard className="h-auto lg:col-span-7" inner="space-y-4"><h2 className="text-lg font-semibold">שלחו הודעה</h2><ContactForm /></GlowCard>
      <div className="space-y-4 lg:col-span-5">
        <GlowCard className="h-auto" inner="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle className="h-5 w-5" /> הכי מהיר: צ׳אט</h2>
          <p className="text-sm text-neutral-400">נציג ה-AI זמין 24/7 — הצעת מחיר, המלצה על מוצר וסגירת הזמנה.</p>
          <a href="#chat" className="inline-block rounded-lg border px-4 py-2 text-sm hover:border-neutral-500">פתיחת צ׳אט</a>
        </GlowCard>
        {rows.length > 0 && (
          <GlowCard className="h-auto" inner="space-y-3 text-sm">
            {rows.map(([I, v, href]) => <p key={v} className="flex items-center gap-3"><I className="h-4 w-4 text-neutral-500" />{href ? <a href={href} className="hover:underline" dir="auto">{v}</a> : v}</p>)}
          </GlowCard>
        )}
      </div>
    </div>
  );
}
