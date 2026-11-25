import { DocPage, fillSections } from "@/components/doc-page";
import { legalName, BUSINESS } from "@/lib/content";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.legal.privacy.title} — ${d.meta.titleSuffix}` };
}

export default async function Privacy() {
  const { lang, d, f } = await getI18n();
  const t = d.legal.privacy, name = lang === "he" ? legalName() : BUSINESS.legalName || d.meta.brand;
  const contact = BUSINESS.email ? f(t.contactEmail, { email: BUSINESS.email }) : t.contactPage;
  return <DocPage title={t.title} intro={f(t.intro, { name })} note={d.legal.draftNote} sections={fillSections(t.sections, { contact })} />;
}
