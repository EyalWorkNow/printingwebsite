import { DocPage } from "@/components/doc-page";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { d } = await getI18n();
  return { title: `${d.legal.cancellation.title} — ${d.meta.titleSuffix}` };
}

export default async function Cancellation() {
  const { d } = await getI18n();
  const t = d.legal.cancellation;
  return <DocPage title={t.title} intro={t.intro} note={d.legal.draftNote} sections={t.sections} />;
}
