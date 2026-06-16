import { query } from "@/lib/db";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const yt = (id: string | null) => (id ? `https://img.youtube.com/vi/${id.trim()}/hqdefault.jpg` : null);
const watch = (id: string | null) => (id ? `https://www.youtube.com/watch?v=${id.trim()}` : "#");

/** Insight Hub: webinar, short movie/vlog, pesan direksi, quotes — dari Supabase. */
export async function GET() {
  try {
    const [webinar, movies, direksi, quotes] = await Promise.all([
      query<{ id: number; judul: string; url: string | null; tgl: string | null }>(
        `SELECT id, judul, url, tgl FROM _webinar WHERE status = 'publish' ORDER BY tgl DESC NULLS LAST, id DESC LIMIT 8`,
      ),
      query<{ id: number; judul: string; url: string | null; tipe: string | null }>(
        `SELECT id, judul, url, tipe FROM _movies WHERE status = 'publish' ORDER BY id DESC LIMIT 12`,
      ),
      query<{ id: number; nama: string; jabatan: string | null; pesan: string | null; no_urut: number | null }>(
        `SELECT id, nama, jabatan, pesan, no_urut FROM _pesan_direksi WHERE status = 'publish' ORDER BY no_urut ASC LIMIT 8`,
      ),
      query<{ quotes_text: string; quotes_author: string | null }>(
        `SELECT quotes_text, quotes_author FROM _quotes ORDER BY quotes_id DESC LIMIT 6`,
      ),
    ]);

    return Response.json({
      webinar: webinar.map((w) => ({ id: w.id, judul: clean(w.judul), thumb: yt(w.url), link: watch(w.url), videoId: w.url?.trim() ?? null, tgl: w.tgl })),
      movies: movies.map((m) => ({
        id: m.id, judul: clean(m.judul), thumb: yt(m.url), link: watch(m.url), videoId: m.url?.trim() ?? null,
        tipe: m.tipe === "vlog" ? "Vlog" : "Short Movie",
      })),
      direksi: direksi.map((d) => {
        const pesan = clean(d.pesan);
        return {
          id: d.id, nama: clean(d.nama), jabatan: clean(d.jabatan),
          pesan: pesan && pesan.toLowerCase() !== "- coming soon -" ? pesan : null,
          initials: clean(d.nama).split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase(),
        };
      }),
      quotes: quotes.map((q) => ({ text: clean(q.quotes_text), author: clean(q.quotes_author) || "NN" })),
    });
  } catch (e) {
    console.error("/api/insight", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
