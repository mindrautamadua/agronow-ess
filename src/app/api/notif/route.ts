/** Notifikasi lonceng: GET daftar + unread; POST tandai dibaca. Wajib login. */
import { getNotifications, getUnreadCount, markRead } from "@/lib/notif";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ items: [], unread: 0 });
  const [items, unread] = await Promise.all([getNotifications(s.memberId), getUnreadCount(s.memberId)]);
  return Response.json({ items, unread });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });
  let id: number | undefined;
  try {
    const b = await req.json();
    if (b?.id != null) id = Number(b.id) || undefined;
  } catch { /* mark all */ }
  await markRead(s.memberId, id);
  const unread = await getUnreadCount(s.memberId);
  return Response.json({ ok: true, unread });
}
