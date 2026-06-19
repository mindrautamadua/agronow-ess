/**
 * Upload bukti/lampiran Helpdesk ke Supabase Storage bucket `helpdesk-bukti`
 * (publik). Menerima gambar (PNG/JPG/WEBP/GIF) atau PDF, maks 10 MB.
 * Mengembalikan URL publik yang lalu disimpan ke `_helpdesk.berkas`.
 * Path objek diawali member_id agar mudah ditelusuri.
 */
import { randomUUID } from "node:crypto";
import { currentMemberId } from "@/lib/member";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "helpdesk-bukti";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "application/pdf"]);
const EXT: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
  "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf",
};

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
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: "Format harus gambar (PNG/JPG/WEBP/GIF) atau PDF" }, { status: 400 });
  }
  if (file.size === 0) return Response.json({ error: "File kosong" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Ukuran file maksimal 10 MB" }, { status: 400 });

  try {
    const storage = getStorage();
    const objectPath = `${memberId}/${randomUUID()}.${EXT[file.type] ?? "bin"}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await storage.from(BUCKET).upload(objectPath, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;

    const { data } = storage.from(BUCKET).getPublicUrl(objectPath);
    return Response.json({ url: data.publicUrl });
  } catch (e) {
    console.error("POST /api/helpdesk/upload", e);
    const msg = e instanceof Error && e.message.includes("belum di-set")
      ? "Penyimpanan belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
      : "Gagal mengunggah file";
    return Response.json({ error: msg }, { status: 500 });
  }
}
