/**
 * Toggle like pada diskusi. Wajib login.
 * Body `{ fcId }`  → like komentar (`_forum_chat_like`).
 * Body `{ forumId }` → like thread utama (`_forum_like`).
 */
import { toggleDiskusiLike, toggleThreadLike } from "@/lib/insight";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Harus login untuk menyukai" }, { status: 401 });

  let fcId = 0;
  let forumId = 0;
  try {
    const body = await req.json();
    fcId = Number(body?.fcId) || 0;
    forumId = Number(body?.forumId) || 0;
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!fcId && !forumId) return Response.json({ error: "Target like tidak valid" }, { status: 400 });

  try {
    const result = forumId
      ? await toggleThreadLike(forumId, session.memberId)
      : await toggleDiskusiLike(fcId, session.memberId);
    if (!result) return Response.json({ error: "Diskusi tidak ditemukan" }, { status: 404 });
    return Response.json(result);
  } catch (e) {
    console.error("/api/diskusi/like", e);
    return Response.json({ error: "Gagal memproses like" }, { status: 500 });
  }
}
