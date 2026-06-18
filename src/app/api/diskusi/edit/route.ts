/** Sunting balasan diskusi sendiri (`_forum_chat`). Wajib login & pemilik komentar. */
import { editDiskusiReply } from "@/lib/insight";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Harus login untuk menyunting" }, { status: 401 });

  let fcId = 0;
  let text = "";
  try {
    const body = await req.json();
    fcId = Number(body?.fcId) || 0;
    text = String(body?.text ?? "");
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!fcId || !text.trim()) {
    return Response.json({ error: "Komentar tidak boleh kosong" }, { status: 400 });
  }

  try {
    const updated = await editDiskusiReply(fcId, session.memberId, text);
    if (!updated) return Response.json({ error: "Komentar tidak ditemukan atau bukan milik Anda" }, { status: 403 });
    return Response.json(updated);
  } catch (e) {
    console.error("/api/diskusi/edit", e);
    return Response.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}
