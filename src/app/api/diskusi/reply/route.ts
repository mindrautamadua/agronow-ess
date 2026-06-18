/** Kirim balasan ke thread diskusi (`_forum_chat`). Wajib login. */
import { addDiskusiReply } from "@/lib/insight";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Harus login untuk berkomentar" }, { status: 401 });

  let forumId = 0;
  let text = "";
  try {
    const body = await req.json();
    forumId = Number(body?.forumId) || 0;
    text = String(body?.text ?? "");
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!forumId || !text.trim()) {
    return Response.json({ error: "Komentar tidak boleh kosong" }, { status: 400 });
  }

  try {
    const reply = await addDiskusiReply(forumId, session.memberId, text);
    if (!reply) return Response.json({ error: "Thread tidak ditemukan atau sudah ditutup" }, { status: 404 });
    return Response.json({ reply });
  } catch (e) {
    console.error("/api/diskusi/reply", e);
    return Response.json({ error: "Gagal mengirim komentar" }, { status: 500 });
  }
}
