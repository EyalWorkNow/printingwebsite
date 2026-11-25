import { MessageCircle, Phone, Mail, MapPin, Clock } from "lucide-react";
import { BUSINESS } from "@/lib/content";
import { ContactForm } from "@/components/contact-form";
import { GlowCard } from "@/components/glow-card";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.contact.title} — ${d.meta.titleSuffix}`, description: d.contact.metaDesc };
}

export default async function Contact() {
  const { d } = await getI18n();
  const t = d.contact;
  const rows = ([[Phone, BUSINESS.phone, `tel:${BUSINESS.phone}`], [Mail, BUSINESS.email, `mailto:${BUSINESS.email}`], [MapPin, BUSINESS.address], [Clock, BUSINESS.hours]] as const).filter(([, v]) => v);
  return (
    <div className="grid gap-6 lg:grid-cols-12 [&>*]:min-w-0">
      <header className="space-y-2 lg:col-span-12">
        <h1 className="text-3xl font-bold md:text-4xl">{t.title}</h1>
        <p className="text-muted-foreground">{t.intro}</p>
      </header>
      <GlowCard className="h-auto lg:col-span-7" inner="space-y-4"><h2 className="text-lg font-semibold">{t.form}</h2><ContactForm /></GlowCard>
      <div className="space-y-4 lg:col-span-5">
        <GlowCard className="h-auto" inner="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><MessageCircle className="h-5 w-5" /> {t.chatTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.chatText}</p>
          <a href="#chat" className="inline-block rounded-lg border px-4 py-2 text-sm hover:border-foreground/40">{t.chatCta}</a>
        </GlowCard>
        {rows.length > 0 && (
          <GlowCard className="h-auto" inner="space-y-3 text-sm">
            {rows.map(([I, v, href]) => <p key={v} className="flex items-center gap-3"><I className="h-4 w-4 text-muted-foreground" />{href ? <a href={href} className="hover:underline" dir="auto">{v}</a> : v}</p>)}
          </GlowCard>
        )}
      </div>
    </div>
  );
}
