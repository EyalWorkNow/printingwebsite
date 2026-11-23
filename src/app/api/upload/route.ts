import { saveUpload } from "@/lib/orders";

export async function POST(req: Request) {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "לא נבחר קובץ" }, { status: 400 });
  try {
    return Response.json({ id: await saveUpload(file) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
