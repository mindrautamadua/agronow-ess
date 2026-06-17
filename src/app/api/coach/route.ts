import { runCoach, type ChatMsg } from "@/lib/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** AI Career Coach — menerima riwayat chat, mengembalikan balasan coach. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMsg[] = Array.isArray(body.messages) ? body.messages : [];
    const clean = messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content }));

    if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
      return Response.json({ error: "Pesan tidak valid." }, { status: 400 });
    }

    const reply = await runCoach(clean);
    return Response.json({ reply });
  } catch (e) {
    console.error("/api/coach", e);
    const msg = e instanceof Error && e.message.includes("OPENAI_API_KEY")
      ? "AI Coach belum dikonfigurasi (OPENAI_API_KEY belum di-set)."
      : "Maaf, terjadi kendala saat menghubungi AI Coach.";
    return Response.json({ error: msg }, { status: 500 });
  }
}
