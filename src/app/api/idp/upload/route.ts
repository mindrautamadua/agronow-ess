/**
 * Upload dokumentasi IDP (PDF saja) ke Supabase Storage bucket `idp-docs`
 * (publik). Mengembalikan URL publik yang lalu disimpan ke `_idp.url_dokumentasi`.
 * Path objek diawali member_id agar mudah ditelusuri. Wajib ada konteks member.
 */
import { randomUUID } from "node:crypto";
import { currentMemberId } from "@/lib/member";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "idp-docs";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const memberId = await currentMemberId();

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!file) return Response.json({ error: "File belum dipilih" }, { status: 400 });

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return Response.json({ error: "Hanya file PDF yang diperbolehkan" }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "File kosong" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran file maksimal 10 MB" }, { status: 400 });

  try {
    const storage = getStorage();
    const objectPath = `${memberId}/${randomUUID()}.pdf`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (error) throw error;

    const { data } = storage.from(BUCKET).getPublicUrl(objectPath);
    return Response.json({ url: data.publicUrl });
  } catch (e) {
    console.error("POST /api/idp/upload", e);
    const msg = e instanceof Error && e.message.includes("belum di-set")
      ? "Penyimpanan belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
      : "Gagal mengunggah file";
    return Response.json({ error: msg }, { status: 500 });
  }
}
