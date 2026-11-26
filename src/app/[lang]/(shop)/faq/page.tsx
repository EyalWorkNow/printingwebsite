import { JsonLd, faqLd, pageMeta } from "@/lib/seo";
import Link from "next/link";
import { FaqList } from "@/components/faq-list";
import { getI18n } from "@/i18n/server";

export async function generateMetadata() {
  const { lang, d } = await getI18n();
  return pageMeta(lang, "/faq", { title: `${d.faq.title} — ${d.meta.titleSuffix}`, description: d.faq.metaDesc });
}

export default async function Faq() {
  const { d, href } = await getI18n();
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">{d.faq.title}</h1>
        <p className="text-muted-foreground">{d.faq.intro} <a href="#chat" className="underline underline-offset-4 hover:text-foreground">{d.faq.askAi}</a> {d.faq.or} <Link href={href("/contact")} className="underline underline-offset-4 hover:text-foreground">{d.faq.writeUs}</Link>.</p>
      </header>
      <JsonLd data={faqLd(d.faq.items)} />
      <FaqList items={d.faq.items} />
    </div>
  );
}
