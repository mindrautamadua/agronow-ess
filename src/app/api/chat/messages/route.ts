/**
 * Pesan DM satu percakapan.
 *  GET  ?kode=<kode_chat>[&after=<iso ts>]  → daftar pesan (+ tandai dibaca).
 *  POST { toId, text }                       → kirim pesan + notif + web push.
 * Wajib login.
 */
import { getDmMessages, markConversationRead, sendDm } from "@/lib/chat";
import { addNotification } from "@/lib/notif";
import { sendPushToMember } from "@/lib/push";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const kode = sp.get("kode") || "";
  const after = sp.get("after") || undefined;
  if (!kode) return Response.json({ error: "kode wajib" }, { status: 400 });

  const items = await getDmMessages(s.memberId, kode, after);
  if (items === null) return Response.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  // Tandai pesan masuk sebagai dibaca (saat membuka / polling).
  await markConversationRead(s.memberId, kode);
  return Response.json({ items });
}

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Harus login" }, { status: 401 });

  let toId = 0; let text = "";
  try {
    const b = await req.json();
    toId = Number(b?.toId) || 0;
    text = String(b?.text ?? "");
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
  if (!toId || !text.trim()) return Response.json({ error: "Pesan tidak boleh kosong" }, { status: 400 });

  const sent = await sendDm(s.memberId, toId, text);
  if (!sent) return Response.json({ error: "Gagal mengirim (penerima tidak valid)" }, { status: 400 });

  // Notifikasi lonceng + push ke penerima (best-effort, tidak menggagalkan kirim).
  const judul = `Pesan baru dari ${s.nama || "rekan"}`;
  const preview = sent.message.text.slice(0, 120);
  try {
    await addNotification({ memberId: toId, kategori: "chat", judul, isi: preview, ref: sent.kode });
    await sendPushToMember(toId, { title: judul, body: preview, url: `/chat?c=${encodeURIComponent(sent.kode)}`, tag: `chat-${sent.kode}` });
  } catch (e) {
    console.error("notif/push DM", e);
  }

  return Response.json({ message: sent.message, kode: sent.kode });
}
