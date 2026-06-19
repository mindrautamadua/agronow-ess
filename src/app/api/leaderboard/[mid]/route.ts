/**
 * Detail satu kontributor (untuk modal saat baris Top Contributors diklik).
 * Menggabungkan: profil ringkas (jabatan/unit/role), progres 70-20-10 tahun ini,
 * rincian poin per kategori (`mp_section`), dan aktivitas poin terbaru.
 *
 * Rank & total poin TIDAK dihitung ulang di sini — klien sudah memilikinya dari
 * baris tabel; endpoint ini hanya melengkapi data yang belum ada.
 */
import { query, queryOne } from "@/lib/db";
import { clean } from "@/lib/text";
import { getLearningSummary, BUCKET_LABEL } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 8;

const role = (groupName: string | null, lvl: string | null) => {
  const l = clean(lvl);
  const bod = /^bod-\d/i.test(l) ? l.toUpperCase() : "";
  return [clean(groupName), bod].filter(Boolean).join(" - ");
};

export async function GET(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  try {
    const { mid } = await params;
    const memberId = Number(mid);
    if (!Number.isInteger(memberId) || memberId <= 0) {
      return Response.json({ error: "ID kontributor tidak valid." }, { status: 400 });
    }

    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "year";
    const year = new Date().getFullYear();
    const dateFilter = scope === "year" ? "AND mp_create_date >= ?::date AND mp_create_date < ?::date" : "";
    const dateParams: unknown[] = scope === "year" ? [`${year}-01-01`, `${year + 1}-01-01`] : [];

    // Profil ringkas (hanya data non-sensitif: jabatan, unit, role/level).
    const profile = await queryOne<{ member_name: string | null; member_jabatan: string | null; member_unit_kerja: string | null; lvl: string | null; group_name: string | null }>(
      `SELECT m.member_name, m.member_jabatan, m.member_unit_kerja, lk.nama AS lvl, g.group_name
         FROM _member m
         LEFT JOIN _member_level_karyawan lk ON lk.id = m.id_level_karyawan
         LEFT JOIN _group g ON g.group_id = m.group_id
        WHERE m.member_id = ?`,
      [memberId],
    );
    if (!profile) return Response.json({ error: "Kontributor tidak ditemukan." }, { status: 404 });

    const [summary, sections, recent] = await Promise.all([
      getLearningSummary(memberId, year),
      query<{ section: string | null; pts: number; n: number }>(
        `SELECT mp_section AS section, SUM(mp_poin)::int AS pts, COUNT(*)::int AS n
           FROM _member_poin
          WHERE member_id = ? ${dateFilter}
          GROUP BY mp_section
          ORDER BY pts DESC`,
        [memberId, ...dateParams],
      ),
      query<{ name: string | null; section: string | null; poin: number; tanggal: string | null }>(
        `SELECT mp_name AS name, mp_section AS section, mp_poin::int AS poin, mp_create_date AS tanggal
           FROM _member_poin
          WHERE member_id = ? ${dateFilter}
          ORDER BY mp_create_date DESC NULLS LAST
          LIMIT ${RECENT_LIMIT}`,
        [memberId, ...dateParams],
      ),
    ]);

    return Response.json({
      scope,
      year,
      profile: {
        name: clean(profile.member_name) || "—",
        jabatan: clean(profile.member_jabatan) || null,
        unit: clean(profile.member_unit_kerja) || null,
        role: role(profile.group_name, profile.lvl) || null,
      },
      learning: {
        total: summary.total,
        buckets: summary.buckets.map((b) => ({ key: b.key, label: BUCKET_LABEL[b.key], earned: b.earned, target: b.target, pct: b.pct })),
        totalClasses: summary.totalClasses,
        certificates: summary.certificates,
      },
      pointsBySection: sections.map((s) => ({ section: clean(s.section) || "Lainnya", points: Number(s.pts ?? 0), count: Number(s.n ?? 0) })),
      recent: recent.map((r) => ({ name: clean(r.name) || "(tanpa nama)", section: clean(r.section) || "—", points: Number(r.poin ?? 0), date: r.tanggal })),
    });
  } catch (e) {
    console.error("GET /api/leaderboard/[mid]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "Gagal memuat detail kontributor", detail: process.env.NODE_ENV === "production" ? undefined : detail },
      { status: 500 },
    );
  }
}
