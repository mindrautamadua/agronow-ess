import { query } from "@/lib/db";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Microlearning harian: satu kuis "active recall" per hari + quote inspirasi.
 * Sumber: `_kamus` (istilah perkebunan) & `_quotes`. Pilihan harian deterministik
 * per tanggal (zona Jakarta) → semua orang dapat kartu yang sama sepanjang hari,
 * dan tidak berubah saat halaman di-reload.
 */

// Tanggal "hari ini" zona Jakarta, format YYYY-MM-DD.
function todayJakarta(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// PRNG deterministik dari string (xfnv1a hash → mulberry32). Urutan stabil per seed.
function seededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET() {
  try {
    const [terms, quotes] = await Promise.all([
      query<{ kamus_name: string; kamus_desc: string }>(
        `SELECT kamus_name, kamus_desc FROM _kamus
          WHERE kamus_name IS NOT NULL AND kamus_desc IS NOT NULL
          ORDER BY kamus_name ASC LIMIT 400`,
      ),
      query<{ quotes_text: string; quotes_author: string | null }>(
        `SELECT quotes_text, quotes_author FROM _quotes ORDER BY quotes_id DESC LIMIT 80`,
      ),
    ]);

    // Hanya istilah dengan definisi yang "layak kuis" (tidak terlalu pendek/panjang).
    const pool = terms
      .map((r) => ({ name: clean(r.kamus_name), desc: clean(r.kamus_desc) }))
      .filter((t) => t.name.length >= 2 && t.desc.length >= 24 && t.desc.length <= 320);

    const date = todayJakarta();

    if (pool.length < 4) {
      return Response.json({ date, term: null, quiz: null, quote: null, totalTerms: pool.length });
    }

    const rng = seededRng(date);
    const idx = Math.floor(rng() * pool.length);
    const term = pool[idx];

    // 3 distraktor unik (nama berbeda dari jawaban).
    const seen = new Set([term.name.toLowerCase()]);
    const distractors: { name: string; desc: string }[] = [];
    for (const o of shuffle(pool.filter((_, i) => i !== idx), rng)) {
      const k = o.name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      distractors.push(o);
      if (distractors.length === 3) break;
    }

    const options = shuffle(
      [{ name: term.name, correct: true }, ...distractors.map((d) => ({ name: d.name, correct: false }))],
      rng,
    );

    // Sembunyikan nama istilah bila kebetulan muncul di definisinya (agar tak membocorkan jawaban).
    const re = new RegExp(term.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const question = term.desc.replace(re, "____");

    const cleanQuotes = quotes
      .map((q) => ({ text: clean(q.quotes_text), author: clean(q.quotes_author) || "NN" }))
      .filter((q) => q.text.length > 0);
    const quote = cleanQuotes.length ? cleanQuotes[Math.floor(rng() * cleanQuotes.length)] : null;

    return Response.json({
      date,
      term, // { name, desc } — untuk penjelasan setelah menjawab
      quiz: { question, options }, // tebak istilah dari definisinya (active recall)
      quote,
      totalTerms: pool.length,
    });
  } catch (e) {
    console.error("/api/microlearning", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
