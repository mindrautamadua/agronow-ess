/** Simpan/hapus langganan Web Push milik member. Wajib login. */
import { saveSubscription, removeSubscription } from "@/lib/push";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });
  try {
    const sub = await req.json();
    await saveSubscription(s.memberId, sub, req.headers.get("user-agent") || "");
    return Response.json({ ok: true });
  } catch (e) {
    console.error("/api/push/subscribe", e);
    return Response.json({ error: "Langganan tidak valid" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json();
    if (endpoint) await removeSubscription(String(endpoint));
  } catch { /* abaikan */ }
  return Response.json({ ok: true });
}
