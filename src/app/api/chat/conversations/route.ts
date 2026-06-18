/** Daftar percakapan DM milik member yang login. */
import { getConversations } from "@/lib/chat";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });
  return Response.json({ items: await getConversations(s.memberId) });
}
