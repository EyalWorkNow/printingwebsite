import { FAQ } from "@/lib/content";
import { FaqList } from "@/components/faq-list";

export const metadata = { title: "שאלות נפוצות — דפוס", description: "קבצים, זמני ייצור, משלוחים, תשלום וביטולים — כל התשובות." };

export default function Faq() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold md:text-4xl">שאלות נפוצות</h1>
        <p className="text-muted-foreground">לא מצאתם תשובה? <a href="#chat" className="underline underline-offset-4 hover:text-foreground">שאלו את נציג ה-AI</a> או <a href="/contact" className="underline underline-offset-4 hover:text-foreground">כתבו לנו</a>.</p>
      </header>
      <FaqList items={FAQ} />
    </div>
  );
}
