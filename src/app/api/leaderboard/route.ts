import { query } from "@/lib/db";
import { currentMemberId, getMember } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_N = 10;
const TTL_MS = 5 * 60 * 1000; // cache leaderboard 5 menit (identik utk semua user)

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/**
 * Nama panggilan: lewati inisial/gelar (token huruf ≤2 berakhiran titik, mis.
 * "M.", "Dr.") & gelar setelah koma, ambil kata nama utuh pertama. "M. INDRA
 * UTAMA" → "Indra".
 */
const firstName = (name: string) => {
  const tokens = name.replace(/,.*$/, "").split(/\s+/).filter(Boolean);
  const alpha = (t: string) => t.replace(/[^A-Za-z]/g, "");
  const isInitial = (t: string) => t.endsWith(".") && alpha(t).length <= 2;
  const pick = tokens.find((t) => !isInitial(t) && alpha(t).length >= 2) ?? name;
  const core = alpha(pick) || pick;
  return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
};

const role = (groupName: string | null, lvl: string | null) => {
  const l = clean(lvl);
  const bod = /^bod-\d/i.test(l) ? l.toUpperCase() : ""; // buang "bod-unknown" dll.
  return [clean(groupName), bod].filter(Boolean).join(" - ");
};

interface TopEntry { mid: number; rank: number; name: string; initials: string; role: string; points: number }
interface LeaderboardData {
  top: TopEntry[];
  total: number;
  rankByMember: Map<number, { rank: number; pts: number }>;
  expires: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __essLeaderboardCache: Record<string, LeaderboardData> | undefined;
}
const cacheStore = () => (globalThis.__essLeaderboardCache ??= {});

/**
 * Hitung leaderboard penuh sekali (mahal: agregasi `_member_poin` lintas member).
 * Filter tahun memakai rentang tanggal (sargable → pakai index `mp_create_date`).
 * Hanya member `active`; akun uji ("test …") dikecualikan.
 */
async function buildLeaderboard(scope: "year" | "all", year: number): Promise<LeaderboardData> {
  const dateFilter = scope === "year" ? "AND p.mp_create_date >= ?::date AND p.mp_create_date < ?::date" : "";
  const aggParams: unknown[] = scope === "year" ? [`${year}-01-01`, `${year + 1}-01-01`] : [];

  // Daftar peringkat penuh (kolom ringan) — untuk map peringkat semua member.
  const ranked = await query<{ member_id: number; pts: number; rnk: number }>(
    `WITH agg AS (
       SELECT p.member_id, SUM(p.mp_poin) AS pts
         FROM _member_poin p
         JOIN _member m ON m.member_id = p.member_id
          AND m.member_status = 'active'
          AND m.member_name NOT ILIKE 'test %'
        WHERE 1 = 1 ${dateFilter}
        GROUP BY p.member_id
     )
     SELECT member_id, pts, ROW_NUMBER() OVER (ORDER BY pts DESC, member_id) AS rnk FROM agg`,
    aggParams,
  );

  const total = ranked.length;
  const rankByMember = new Map<number, { rank: number; pts: number }>();
  for (const r of ranked) rankByMember.set(Number(r.member_id), { rank: Number(r.rnk), pts: Number(r.pts) });

  // Detail hanya untuk Top-N (cepat: lookup by PK).
  const topRows = ranked.slice(0, TOP_N);
  let top: TopEntry[] = [];
  if (topRows.length) {
    const ids = topRows.map((r) => Number(r.member_id));
    const details = await query<{ member_id: number; member_name: string | null; lvl: string | null; group_name: string | null }>(
      `SELECT m.member_id, m.member_name, lk.nama AS lvl, g.group_name
         FROM _member m
         LEFT JOIN _member_level_karyawan lk ON lk.id = m.id_level_karyawan
         LEFT JOIN _group g ON g.group_id = m.group_id
        WHERE m.member_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    const byId = new Map(details.map((d) => [Number(d.member_id), d]));
    top = topRows.map((r) => {
      const d = byId.get(Number(r.member_id));
      const name = clean(d?.member_name) || "—";
      return { mid: Number(r.member_id), rank: Number(r.rnk), name, initials: initials(name || "?"), role: role(d?.group_name ?? null, d?.lvl ?? null), points: Number(r.pts) };
    });
  }

  return { top, total, rankByMember, expires: Date.now() + TTL_MS };
}

/** Ambil leaderboard dari cache (per scope+tahun), bangun ulang bila kedaluwarsa. */
async function getLeaderboard(scope: "year" | "all", year: number): Promise<LeaderboardData> {
  const key = scope === "all" ? "all" : `year:${year}`;
  const store = cacheStore();
  const cached = store[key];
  if (cached && cached.expires > Date.now()) return cached;
  const fresh = await buildLeaderboard(scope, year);
  store[key] = fresh;
  return fresh;
}

export async function GET(req: Request) {
  try {
    const memberId = await currentMemberId();
    const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "year";
    const year = new Date().getFullYear();

    const lb = await getLeaderboard(scope, year);
    const meRank = lb.rankByMember.get(memberId) ?? null;

    const meMember = await getMember(memberId);
    const meName = clean(meMember?.member_name) || "Kamu";
    const me = {
      name: meName,
      firstName: firstName(meName),
      rank: meRank?.rank ?? null,
      points: meRank?.pts ?? 0,
      total: lb.total,
      percentile: meRank && lb.total ? Math.max(1, Math.round((meRank.rank / lb.total) * 100)) : null,
    };

    const top = lb.top.map((t) => ({
      rank: t.rank, name: t.name, initials: t.initials, role: t.role, points: t.points,
      isMe: t.mid === memberId,
    }));

    return Response.json({ scope, year, me, top });
  } catch (e) {
    console.error("GET /api/leaderboard", e);
    return Response.json({ error: "Gagal memuat leaderboard" }, { status: 500 });
  }
}
