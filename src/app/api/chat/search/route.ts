/** Cari member untuk memulai chat baru (?q=). Wajib login. */
import { searchMembers, getMemberLite } from "@/lib/chat";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const id = Number(sp.get("id") || 0);
  if (id) {
    const m = await getMemberLite(id);
    return Response.json({ member: m });
  }
  const q = sp.get("q") || "";
  return Response.json({ items: await searchMembers(s.memberId, q) });
}
