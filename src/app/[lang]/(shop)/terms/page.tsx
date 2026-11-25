import { DocPage } from "@/components/doc-page";
import { legalName, BUSINESS } from "@/lib/content";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.legal.terms.title} — ${d.meta.titleSuffix}` };
}

export default async function Terms() {
  const { lang, d, f } = await getI18n();
  const t = d.legal.terms, name = lang === "he" ? legalName() : BUSINESS.legalName || d.meta.brand;
  return <DocPage title={t.title} intro={f(t.intro, { name, id: BUSINESS.companyId ? f(t.companyId, { id: BUSINESS.companyId }) : "" })} note={d.legal.draftNote} sections={t.sections} />;
}
