import { DocPage, fillSections } from "@/components/doc-page";
import { BUSINESS } from "@/lib/content";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.legal.accessibility.title} — ${d.meta.titleSuffix}` };
}

export default async function Accessibility() {
  const { d, f } = await getI18n();
  const t = d.legal.accessibility;
  const parts = [BUSINESS.phone && f(t.phone, { v: BUSINESS.phone }), BUSINESS.email && f(t.email, { v: BUSINESS.email })].filter(Boolean).join(", ");
  const contact = parts ? f(t.contactVia, { contact: parts }) : t.contactFallback;
  return <DocPage title={t.title} intro={t.intro} note={t.note} sections={fillSections(t.sections, { contact })} />;
}
