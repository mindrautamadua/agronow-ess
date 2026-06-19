import OpenAI from "openai";
import { runCoach, type ChatMsg } from "@/lib/coach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Terjemahkan error menjadi pesan yang jelas penyebabnya untuk user. */
function explain(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  if (raw.includes("OPENAI_API_KEY")) {
    return "AI Coach belum dikonfigurasi: OPENAI_API_KEY belum di-set di .env.local.";
  }
  if (e instanceof OpenAI.APIError) {
    if (e.status === 401) return "Kunci OpenAI ditolak (401). Periksa OPENAI_API_KEY.";
    if (e.status === 429) {
      // 429 bisa rate-limit ATAU kuota habis — bedakan dari kode error.
      return e.code === "insufficient_quota"
        ? "Kuota/billing OpenAI habis (429 insufficient_quota). Isi ulang kredit di dashboard OpenAI."
        : "Terlalu banyak permintaan ke OpenAI (429 rate limit). Coba lagi beberapa saat.";
    }
    if (e.status === 404) return `Model "${e.message}" tidak tersedia untuk akun ini (404).`;
    if (e.status >= 500) return "Server OpenAI sedang bermasalah. Coba lagi sebentar lagi.";
    return `Kesalahan OpenAI (${e.status ?? "?"}): ${e.message}`;
  }
  if (e instanceof OpenAI.APIConnectionError || /ECONNREFUSED|ETIMEDOUT|fetch failed|network/i.test(raw)) {
    return "Tidak bisa terhubung ke OpenAI (masalah jaringan/timeout). Periksa koneksi internet server.";
  }
  return `Terjadi kendala saat menghubungi AI Coach: ${raw}`;
}

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
    return Response.json({ error: explain(e) }, { status: 500 });
  }
}
