import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_UPLOAD, saveUpload, UPLOAD_KEY, UPLOAD_TYPES } from "@/lib/orders";
import { BLOB } from "@/lib/storage";
import { BLOB_TOKEN } from "@/lib/env";

// Customer artwork. With Blob the browser uploads straight to storage (Vercel functions cap request bodies at 4.5MB);
// this route only signs a token limited to one private uploads/<uuid>.<ext> key, allowed types and 25MB.
// Without Blob (local dev) the file is posted here as form data.
export const GET = () => Response.json({ direct: BLOB });

export async function POST(req: Request) {
  if (req.headers.get("content-type")?.includes("application/json")) {
    if (!BLOB) return Response.json({ error: "direct upload disabled" }, { status: 400 });
    try {
      return Response.json(await handleUpload({
        request: req, token: BLOB_TOKEN,
        body: (await req.json()) as HandleUploadBody,
        onBeforeGenerateToken: async (pathname) => {
          if (!UPLOAD_KEY.test(pathname)) throw new Error("bad path");
          return { allowedContentTypes: Object.keys(UPLOAD_TYPES), maximumSizeInBytes: MAX_UPLOAD, addRandomSuffix: false, allowOverwrite: false };
        },
      }));
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "לא נבחר קובץ" }, { status: 400 });
  try {
    return Response.json({ id: await saveUpload(file) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
