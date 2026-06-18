/** Kirim pesan ke room chat (`_forum_group_chat`). Wajib login. */
import { addChatMessage } from "@/lib/insight";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Harus login untuk mengirim pesan" }, { status: 401 });

  let roomId = 0;
  let text = "";
  try {
    const body = await req.json();
    roomId = Number(body?.roomId) || 0;
    text = String(body?.text ?? "");
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!roomId || !text.trim()) {
    return Response.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });
  }

  try {
    const message = await addChatMessage(roomId, session.memberId, text);
    if (!message) return Response.json({ error: "Room tidak ditemukan atau sudah ditutup" }, { status: 404 });
    return Response.json({ message });
  } catch (e) {
    console.error("/api/chatroom/message", e);
    return Response.json({ error: "Gagal mengirim pesan" }, { status: 500 });
  }
}
