import { query } from "@/lib/db";
import { currentMemberId, getMember } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_N = 10;

interface Row {
  rnk: number; pts: number; member_name: string | null;
  lvl: string | null; group_name: string | null; is_me: boolean; total: number;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/**
 * Nama panggilan: lewati inisial/gelar (token berakhiran titik, mis. "M.", "Dr.")
 * dan gelar setelah koma, ambil kata nama utuh pertama, rapikan kapitalisasi.
 * "M. INDRA UTAMA" → "Indra"; "Dr. Risal Ardika, S.P." → "Risal".
 */
const firstName = (name: string) => {
  const tokens = name.replace(/,.*$/, "").split(/\s+/).filter(Boolean);
  const alpha = (t: string) => t.replace(/[^A-Za-z]/g, "");
  const isInitial = (t: string) => t.endsWith(".") && alpha(t).length <= 2; // "M.", "Dr."
  const pick = tokens.find((t) => !isInitial(t) && alpha(t).length >= 2) ?? name;
  const core = alpha(pick) || pick;
  return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
};

/**
 * Leaderboard poin (`_member_poin`) lintas korporat. `scope=year` (default,
 * tahun berjalan) atau `scope=all` (sepanjang waktu). Mengembalikan Top N
 * kontributor + peringkat & persentil member yang sedang login. Hanya member
 * `active`; akun uji ("test ...") dikecualikan agar peringkat bersih.
 */
export async function GET(req: Request) {
  try {
    const memberId = await currentMemberId();
    const now = new Date();
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "year";
    const year = now.getFullYear();

    const yearFilter = scope === "year" ? "WHERE EXTRACT(YEAR FROM p.mp_create_date) = ?" : "";
    // Urutan `?` → params: [ (year?), me, me ]
    const params: unknown[] = scope === "year" ? [year, String(memberId), String(memberId)] : [String(memberId), String(memberId)];

    const rows = await query<Row>(
      `WITH agg AS (
         SELECT p.member_id, SUM(p.mp_poin) AS pts
           FROM _member_poin p
           JOIN _member m ON m.member_id = p.member_id
            AND m.member_status = 'active'
            AND m.member_name NOT ILIKE 'test %'
         ${yearFilter}
          GROUP BY p.member_id
       ),
       ranked AS (
         SELECT member_id, pts, ROW_NUMBER() OVER (ORDER BY pts DESC, member_id) AS rnk FROM agg
       )
       SELECT r.rnk, r.pts, m.member_name, lk.nama AS lvl, g.group_name,
              (r.member_id = ?) AS is_me,
              (SELECT COUNT(*) FROM agg) AS total
         FROM ranked r
         JOIN _member m ON m.member_id = r.member_id
         LEFT JOIN _member_level_karyawan lk ON lk.id = m.id_level_karyawan
         LEFT JOIN _group g ON g.group_id = m.group_id
        WHERE r.rnk <= ${TOP_N} OR r.member_id = ?
        ORDER BY r.rnk`,
      params,
    );

    const role = (r: Row) => {
      const lvl = clean(r.lvl);
      const bod = /^bod-\d/i.test(lvl) ? lvl.toUpperCase() : ""; // buang "bod-unknown" dll.
      return [clean(r.group_name), bod].filter(Boolean).join(" - ");
    };
    const top = rows
      .filter((r) => r.rnk <= TOP_N)
      .map((r) => ({
        rank: Number(r.rnk), name: clean(r.member_name) || "—",
        initials: initials(clean(r.member_name) || "?"), role: role(r),
        points: Number(r.pts), isMe: r.is_me,
      }));

    const total = rows[0] ? Number(rows[0].total) : 0;
    const meRow = rows.find((r) => r.is_me);
    const meMember = await getMember(memberId);
    const meName = clean(meMember?.member_name) || "Kamu";

    const me = {
      name: meName,
      firstName: firstName(meName),
      rank: meRow ? Number(meRow.rnk) : null,
      points: meRow ? Number(meRow.pts) : 0,
      total,
      percentile: meRow && total ? Math.max(1, Math.round((Number(meRow.rnk) / total) * 100)) : null,
    };

    return Response.json({ scope, year, me, top });
  } catch (e) {
    console.error("GET /api/leaderboard", e);
    return Response.json({ error: "Gagal memuat leaderboard" }, { status: 500 });
  }
}
