/**
 * Logika pembelajaran 70-20-10 untuk Agronow ESS.
 *
 * Pemetaan bucket (lewat `_learning_kategori.kategori`):
 *   metode_belajar10 → Formal (10%)
 *   metode_belajar20 → Sosial (20%)
 *   metode_belajar70 → Experiential (70%)
 *
 * Target JPL per kategori per tahun ada di `_learning_kategori_jpl`.
 * "Earned" per kategori = total JPL kelas member yang terverifikasi (is_verified='1'),
 * di-cap maksimal sebesar target kategori (sesuai perilaku aplikasi asli).
 */
import { query, queryOne } from "./db";
import { clean } from "./text";

export type BucketKey = "formal" | "social" | "experiential";

const KATEGORI_TO_BUCKET: Record<string, BucketKey> = {
  metode_belajar10: "formal",
  metode_belajar20: "social",
  metode_belajar70: "experiential",
};

export const BUCKET_LABEL: Record<BucketKey, string> = {
  formal: "Pembelajaran Formal (Formal Learning)",
  social: "Pembelajaran Sosial (Social Learning)",
  experiential: "Belajar dari Pengalaman (Experiential Learning)",
};

/** Rincian progres JPL per jenis pembelajaran di dalam satu bucket
 *  (mis. formal → Workshop, Belajar di Kelas, Belajar Mandiri). */
export interface BucketTypeProgress {
  key: string;   // kode metode (mb_w, mb_ict, mb_sl, …)
  label: string; // nama jenis (Workshop, …)
  earned: number;
  target: number;
  pct: number;
}

export interface BucketProgress {
  key: BucketKey;
  label: string;
  earned: number;
  target: number;
  pct: number;
  types?: BucketTypeProgress[];
}

export interface LearningClass {
  crm_id: number;
  cr_id: number;
  name: string;
  type: string | null;
  status: string | null;
  bucket: BucketKey | null;
  kategori: string | null;
  method: string | null;
  methodLabel: string | null;
  jpl: number;
  date_start: string | null;
  date_end: string | null;
  verified: boolean;
  has_certificate: boolean;
}

export interface LearningSummary {
  year: number;
  total: { earned: number; target: number; pct: number };
  buckets: BucketProgress[];
  totalClasses: number;
  certificates: number;
}

function currentYear(): number {
  return new Date().getFullYear();
}

/** Daftar tahun untuk pemilih di UI, terbaru dulu. Gabungan tahun yang punya
 *  target JPL DAN tahun yang member-nya punya kelas (agar history lama bisa
 *  dilihat walau belum ada target). Tahun berjalan selalu disertakan. */
export async function getAvailableYears(memberId: number): Promise<number[]> {
  const rows = await query<{ tahun: number | null }>(
    `SELECT tahun FROM _learning_kategori_jpl WHERE tahun IS NOT NULL
     UNION
     SELECT EXTRACT(YEAR FROM c.cr_date_start)::int AS tahun
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
      WHERE m.member_id = ? AND c.cr_date_start IS NOT NULL`,
    [memberId],
  );
  const years = new Set<number>(
    rows.map((r) => Number(r.tahun)).filter((n) => Number.isInteger(n) && n >= 2000 && n <= 2100),
  );
  years.add(currentYear());
  return [...years].sort((a, b) => b - a);
}

/** Ringkasan progres 70-20-10 untuk satu member pada satu tahun.
 *  Capaian (earned), jumlah kelas, & sertifikat difilter berdasarkan tahun
 *  `cr_date_start` agar konsisten dengan pemilih tahun. */
export async function getLearningSummary(memberId: number, year = currentYear()): Promise<LearningSummary> {
  const yStart = `${year}-01-01`, yEnd = `${year + 1}-01-01`;

  const earnedRows = await query<{ cat_id: number; kategori: string; earned_raw: number | null }>(
    `SELECT c.id_learning_kategori1 AS cat_id, lk.kategori,
            SUM(c.jpl_learning_kategori1) FILTER (WHERE m.is_verified = '1') AS earned_raw
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
       JOIN _learning_kategori lk ON lk.id = c.id_learning_kategori1
      WHERE m.member_id = ?
        AND c.cr_date_start >= ?::date AND c.cr_date_start < ?::date
        AND lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')
      GROUP BY c.id_learning_kategori1, lk.kategori`,
    [memberId, yStart, yEnd],
  );

  // Semua jenis metode (dari _learning_kategori) + target tahun ybs (0 bila tak
  // ada). LEFT JOIN — bukan INNER — agar tahun TANPA target (mode history, mis.
  // 2024) tetap memunculkan seluruh jenis sehingga capaian lama bisa dilihat.
  const targetRows = await query<{ cat_id: number; kategori: string; kode: string | null; nama: string | null; target: number }>(
    `SELECT lk.id AS cat_id, lk.kategori, lk.kode, lk.nama, COALESCE(j.jpl, 0) AS target
       FROM _learning_kategori lk
       LEFT JOIN _learning_kategori_jpl j ON j.id_kategori = lk.id AND j.tahun = ?
      WHERE lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')
      ORDER BY lk.id`,
    [year],
  );

  const earnedByCat = new Map<number, number>();
  earnedRows.forEach((r) => earnedByCat.set(r.cat_id, Number(r.earned_raw ?? 0)));

  const agg: Record<BucketKey, { earned: number; target: number; types: BucketTypeProgress[] }> = {
    formal: { earned: 0, target: 0, types: [] },
    social: { earned: 0, target: 0, types: [] },
    experiential: { earned: 0, target: 0, types: [] },
  };

  for (const t of targetRows) {
    const bucket = KATEGORI_TO_BUCKET[t.kategori];
    if (!bucket) continue;
    const target = Number(t.target ?? 0);
    const earnedRaw = earnedByCat.get(t.cat_id) ?? 0;
    // Cap ke target hanya bila target ada; tanpa target (history) tampilkan apa adanya.
    const earned = target > 0 ? Math.min(earnedRaw, target) : earnedRaw;
    agg[bucket].target += target;
    agg[bucket].earned += earned;
    agg[bucket].types.push({
      key: t.kode?.trim() || String(t.cat_id),
      label: clean(t.nama) || "Lainnya",
      earned, target,
      pct: target > 0 ? Math.round((earned / target) * 100) : 0,
    });
  }

  const buckets: BucketProgress[] = (["formal", "social", "experiential"] as BucketKey[]).map((key) => {
    const { earned, target, types } = agg[key];
    return { key, label: BUCKET_LABEL[key], earned, target, pct: target > 0 ? Math.round((earned / target) * 100) : 0, types };
  });

  const totalEarned = buckets.reduce((s, b) => s + b.earned, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.target, 0);

  const [{ n: totalClasses } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
      WHERE m.member_id = ? AND c.cr_date_start >= ?::date AND c.cr_date_start < ?::date`,
    [memberId, yStart, yEnd],
  );
  const [{ n: certificates } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
      WHERE m.member_id = ? AND m.berkas_sertifikat IS NOT NULL AND m.berkas_sertifikat <> ''
        AND c.cr_date_start >= ?::date AND c.cr_date_start < ?::date`,
    [memberId, yStart, yEnd],
  );

  return {
    year,
    total: { earned: totalEarned, target: totalTarget, pct: totalTarget > 0 ? Math.round((totalEarned / totalTarget) * 100) : 0 },
    buckets,
    totalClasses: Number(totalClasses),
    certificates: Number(certificates),
  };
}

// Base URL file dokumen materi (Media berupa nama file, mis. "32Overview.pdf").
// Materi video menyimpan URL penuh, jadi tak butuh base ini. Set lewat env bila
// dokumen materi perlu bisa diunduh; kosong → dokumen tampil tanpa tautan.
const MATERI_DOC_BASE = (process.env.CLASSROOM_MATERI_BASE ?? "").replace(/\/+$/, "");

export interface ClassMateri { type: string; title: string; url: string | null; isVideo: boolean }
export interface ClassModule { name: string; start: string | null; end: string | null; materi: ClassMateri[] }
export interface ClassDetail {
  crm_id: number;
  name: string;
  desc: string | null;
  moduleDesc: string | null;
  modules: ClassModule[];
  certificate: string | null;
  scorePre: number | null;
  scorePost: number | null;
  jpl: number;
  methodLabel: string | null;
  date_start: string | null;
  date_end: string | null;
  verified: boolean;
  has_certificate: boolean;
}

/** URL materi: video & tautan absolut dipakai apa adanya; nama file dokumen butuh base. */
function materiUrl(media: string | null | undefined): string | null {
  const m = (media ?? "").trim();
  if (!m) return null;
  if (/^https?:\/\//i.test(m)) return m;
  return MATERI_DOC_BASE ? `${MATERI_DOC_BASE}/${m}` : null;
}

/** Detail satu kelas member: deskripsi, daftar modul + materi, dan sertifikat. */
export async function getClassDetail(memberId: number, crmId: number): Promise<ClassDetail | null> {
  const row = await queryOne<{
    crm_id: number; cr_name: string; cr_desc: string | null; cr_module: string | null;
    berkas_sertifikat: string | null; cr_has_certificate: number | null;
    nilai_pre_test: number | null; nilai_post_test: number | null;
    metode_nama: string | null; jpl: number | null;
    cr_date_start: string | null; cr_date_end: string | null; is_verified: string | null;
  }>(
    `SELECT m.crm_id, c.cr_name, c.cr_desc, c.cr_module,
            m.berkas_sertifikat, c.cr_has_certificate,
            m.nilai_pre_test, m.nilai_post_test, m.is_verified,
            lk.nama AS metode_nama, c.jpl_learning_kategori1 AS jpl,
            c.cr_date_start, c.cr_date_end
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
       LEFT JOIN _learning_kategori lk ON lk.id = c.id_learning_kategori1
      WHERE m.crm_id = ? AND m.member_id = ?`,
    [crmId, memberId],
  );
  if (!row) return null;

  let moduleDesc: string | null = null;
  const modules: ClassModule[] = [];
  try {
    const j = JSON.parse(row.cr_module || "{}") as {
      Desc?: string | null;
      Module?: Array<{ ModuleName?: string; ModuleStart?: string; ModuleEnd?: string; Materi?: Array<{ Type?: string; ContentName?: string; Media?: string; Status?: string }> }>;
    };
    moduleDesc = clean(j.Desc) || null;
    for (const mod of j.Module ?? []) {
      const materi: ClassMateri[] = (mod.Materi ?? [])
        .filter((x) => (x.Status ?? "active") !== "inactive")
        .map((x) => {
          const isVideo = (x.Type ?? "").toLowerCase() === "video";
          return { type: x.Type ?? "document", title: clean(x.ContentName) || "(tanpa judul)", url: materiUrl(x.Media), isVideo };
        });
      modules.push({
        name: clean(mod.ModuleName) || "Modul",
        start: mod.ModuleStart || null,
        end: mod.ModuleEnd || null,
        materi,
      });
    }
  } catch { /* cr_module bukan JSON valid → abaikan */ }

  const cert = (row.berkas_sertifikat ?? "").trim();

  return {
    crm_id: row.crm_id,
    name: clean(row.cr_name),
    desc: clean(row.cr_desc) || null,
    moduleDesc,
    modules,
    certificate: cert || null,
    scorePre: row.nilai_pre_test == null ? null : Number(row.nilai_pre_test),
    scorePost: row.nilai_post_test == null ? null : Number(row.nilai_post_test),
    jpl: Number(row.jpl ?? 0),
    methodLabel: row.metode_nama ? clean(row.metode_nama) : null,
    date_start: row.cr_date_start,
    date_end: row.cr_date_end,
    verified: row.is_verified === "1",
    has_certificate: !!cert || row.cr_has_certificate === 1,
  };
}

/** Daftar kelas/aktivitas pembelajaran member (terbaru dulu).
 *  Bila `year` diberikan, hanya kelas dengan `cr_date_start` di tahun itu. */
export async function getMemberClasses(memberId: number, year?: number): Promise<LearningClass[]> {
  const yearFilter = year ? "AND c.cr_date_start >= ?::date AND c.cr_date_start < ?::date" : "";
  const yearParams: unknown[] = year ? [`${year}-01-01`, `${year + 1}-01-01`] : [];
  const rows = await query<{
    crm_id: number; cr_id: number; cr_name: string; cr_type: string | null; cr_status: string | null;
    cr_date_start: string | null; cr_date_end: string | null; cr_has_certificate: number | null;
    is_verified: string | null; has_cert: boolean; kategori: string | null;
    metode_kode: string | null; metode_nama: string | null; jpl: number | null;
  }>(
    `SELECT m.crm_id, c.cr_id, c.cr_name, c.cr_type, c.cr_status,
            c.cr_date_start, c.cr_date_end, c.cr_has_certificate,
            m.is_verified,
            (m.berkas_sertifikat IS NOT NULL AND m.berkas_sertifikat <> '') AS has_cert,
            lk.kategori, lk.kode AS metode_kode, lk.nama AS metode_nama,
            c.jpl_learning_kategori1 AS jpl
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
       LEFT JOIN _learning_kategori lk ON lk.id = c.id_learning_kategori1
      WHERE m.member_id = ? ${yearFilter}
      ORDER BY c.cr_date_start DESC NULLS LAST`,
    [memberId, ...yearParams],
  );

  return rows.map((r) => ({
    crm_id: r.crm_id,
    cr_id: r.cr_id,
    name: clean(r.cr_name),
    type: r.cr_type,
    status: r.cr_status,
    bucket: r.kategori ? KATEGORI_TO_BUCKET[r.kategori] ?? null : null,
    kategori: r.kategori,
    method: r.metode_kode,
    methodLabel: r.metode_nama ? clean(r.metode_nama) : null,
    jpl: Number(r.jpl ?? 0),
    date_start: r.cr_date_start,
    date_end: r.cr_date_end,
    verified: r.is_verified === "1",
    has_certificate: r.has_cert || r.cr_has_certificate === 1,
  }));
}
