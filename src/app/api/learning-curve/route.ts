import { query } from "@/lib/db";
import { currentMemberId } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

interface PoinRow { m: number; mp_name: string | null; mp_poin: number | null; mp_section: string | null; mp_create_date: string | null; }

/**
 * Kurva aktivitas belajar: total poin (`_member_poin`) per bulan untuk satu tahun,
 * beserta rincian entri tiap bulan (untuk panel detail saat titik diklik).
 * Query param `year` (default tahun berjalan). `minYear`/`maxYear` membatasi navigasi.
 */
export async function GET(req: Request) {
  try {
    const memberId = await currentMemberId();
    const now = new Date();
    const url = new URL(req.url);
    const year = Number(url.searchParams.get("year")) || now.getFullYear();

    // Rentang tahun yang punya data (untuk batas tombol ‹ ›).
    const [bounds] = await query<{ miny: number | null; maxy: number | null }>(
      `SELECT MIN(EXTRACT(YEAR FROM mp_create_date))::int AS miny,
              MAX(EXTRACT(YEAR FROM mp_create_date))::int AS maxy
         FROM _member_poin WHERE member_id = ?`,
      [String(memberId)],
    );
    const minYear = bounds?.miny ?? now.getFullYear();
    const maxYear = Math.max(bounds?.maxy ?? now.getFullYear(), now.getFullYear());

    const rows = await query<PoinRow>(
      `SELECT EXTRACT(MONTH FROM mp_create_date)::int AS m,
              mp_name, mp_poin, mp_section, mp_create_date
         FROM _member_poin
        WHERE member_id = ? AND EXTRACT(YEAR FROM mp_create_date) = ?
        ORDER BY mp_create_date`,
      [String(memberId), year],
    );

    const points = SHORT.map((label, i) => ({
      m: i + 1, label, total: 0,
      count: 0,
      items: [] as { name: string; poin: number; section: string; date: string | null }[],
    }));
    for (const r of rows) {
      const idx = (r.m ?? 0) - 1;
      if (idx < 0 || idx > 11) continue;
      const poin = Number(r.mp_poin) || 0;
      points[idx].total += poin;
      points[idx].count += 1;
      points[idx].items.push({
        name: clean(r.mp_name) || "Aktivitas", poin,
        section: clean(r.mp_section), date: r.mp_create_date,
      });
    }

    const total = points.reduce((s, p) => s + p.total, 0);
    return Response.json({ year, minYear, maxYear, total, points });
  } catch (e) {
    console.error("GET /api/learning-curve", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
