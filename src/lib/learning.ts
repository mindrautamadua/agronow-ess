/**
 * Logika pembelajaran 70-20-10 untuk Agronow ESS.
 *
 * SUMBER DATA: `_rekap_classroom_excel` (status_data='publish') — rekap realisasi
 * pelatihan yang sama dipakai Agronow Insight (/cari-jpl), sehingga pelatihan
 * EKSTERNAL (mis. LPP, Dayalima) ikut terhitung. Sebelumnya modul ini membaca
 * dari `_classroom_member`/`_classroom` (hanya kelas LMS internal) sehingga
 * pelatihan eksternal tak muncul. Baris publish selalu status_verifikasi='ok'
 * → dianggap terverifikasi. Bila sebuah baris rekap ter-link ke kelas LMS
 * (`cr_id`), detail modul/nilai/sertifikat tetap diperkaya dari classroom.
 *
 * Pemetaan bucket (lewat `_learning_kategori.kategori`, via `rce.kategori`=lk.id):
 *   metode_belajar10 → Formal (10%)
 *   metode_belajar20 → Sosial (20%)
 *   metode_belajar70 → Experiential (70%)
 *
 * Target JPL per kategori per tahun ada di `_learning_kategori_jpl`.
 * Tiap kategori punya DUA angka:
 *   - earnedReal = total JPL realisasi sebenarnya (tak di-cap) — untuk ditampilkan.
 *   - earned (diakui) = di-cap ke target kategori; inilah yang dihitung ke progres
 *     70-20-10 (mis. Belajar di Kelas 59 JPL → hanya 6 yang "diakui"). Home &
 *     persen capaian memakai angka diakui ini.
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
  earned: number;     // JPL diakui (di-cap ke target) — dihitung ke progres 70-20-10
  earnedReal: number; // JPL realisasi sebenarnya (tak di-cap)
  target: number;
  pct: number;        // dari earned diakui → maksimal 100%
}

export interface BucketProgress {
  key: BucketKey;
  label: string;
  earned: number;     // jumlah JPL diakui (capped)
  earnedReal: number; // jumlah JPL realisasi (tak di-cap)
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
  penyelenggara: string | null;
  jpl: number;
  date_start: string | null;
  date_end: string | null;
  verified: boolean;
  has_certificate: boolean;
}

export interface LearningSummary {
  year: number;
  total: { earned: number; earnedReal: number; target: number; pct: number };
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
     SELECT EXTRACT(YEAR FROM tgl_pelatihan_mulai)::int AS tahun
       FROM _rekap_classroom_excel
      WHERE member_id = ? AND status_data = 'publish' AND tgl_pelatihan_mulai IS NOT NULL`,
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
    `SELECT rce.kategori AS cat_id, lk.kategori,
            SUM(rce.jpl) AS earned_raw
       FROM _rekap_classroom_excel rce
       JOIN _learning_kategori lk ON lk.id = rce.kategori
      WHERE rce.member_id = ?
        AND rce.status_data = 'publish'
        AND rce.tgl_pelatihan_mulai >= ?::date AND rce.tgl_pelatihan_mulai < ?::date
        AND lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')
      GROUP BY rce.kategori, lk.kategori`,
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

  const agg: Record<BucketKey, { earned: number; earnedReal: number; target: number; types: BucketTypeProgress[] }> = {
    formal: { earned: 0, earnedReal: 0, target: 0, types: [] },
    social: { earned: 0, earnedReal: 0, target: 0, types: [] },
    experiential: { earned: 0, earnedReal: 0, target: 0, types: [] },
  };

  for (const t of targetRows) {
    const bucket = KATEGORI_TO_BUCKET[t.kategori];
    if (!bucket) continue;
    const target = Number(t.target ?? 0);
    const earnedReal = earnedByCat.get(t.cat_id) ?? 0;
    // "Diakui" = di-cap ke target (mis. 59 → 6). Realisasi sebenarnya tetap di
    // earnedReal untuk ditampilkan. pct & progres pakai angka diakui (≤ 100%).
    const earned = target > 0 ? Math.min(earnedReal, target) : earnedReal;
    agg[bucket].target += target;
    agg[bucket].earned += earned;
    agg[bucket].earnedReal += earnedReal;
    agg[bucket].types.push({
      key: t.kode?.trim() || String(t.cat_id),
      label: clean(t.nama) || "Lainnya",
      earned, earnedReal, target,
      pct: target > 0 ? Math.round((earned / target) * 100) : 0,
    });
  }

  const buckets: BucketProgress[] = (["formal", "social", "experiential"] as BucketKey[]).map((key) => {
    const { earned, earnedReal, target, types } = agg[key];
    return { key, label: BUCKET_LABEL[key], earned, earnedReal, target, pct: target > 0 ? Math.round((earned / target) * 100) : 0, types };
  });

  const totalEarned = buckets.reduce((s, b) => s + b.earned, 0);
  const totalEarnedReal = buckets.reduce((s, b) => s + b.earnedReal, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.target, 0);

  const [{ n: totalClasses } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _rekap_classroom_excel
      WHERE member_id = ? AND status_data = 'publish'
        AND tgl_pelatihan_mulai >= ?::date AND tgl_pelatihan_mulai < ?::date`,
    [memberId, yStart, yEnd],
  );
  // Sertifikat: rekap eksternal tak menyimpan sertifikat; hitung dari kelas LMS
  // yang ter-link (cr_id) dan punya berkas sertifikat.
  const [{ n: certificates } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _rekap_classroom_excel rce
      WHERE rce.member_id = ? AND rce.status_data = 'publish'
        AND rce.tgl_pelatihan_mulai >= ?::date AND rce.tgl_pelatihan_mulai < ?::date
        AND rce.cr_id IS NOT NULL AND rce.cr_id > 0
        AND EXISTS (SELECT 1 FROM _classroom_member cm
                     WHERE cm.cr_id = rce.cr_id AND cm.member_id = rce.member_id
                       AND cm.berkas_sertifikat IS NOT NULL AND cm.berkas_sertifikat <> '')`,
    [memberId, yStart, yEnd],
  );

  return {
    year,
    total: { earned: totalEarned, earnedReal: totalEarnedReal, target: totalTarget, pct: totalTarget > 0 ? Math.round((totalEarned / totalTarget) * 100) : 0 },
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
  penyelenggara: string | null;
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

interface ClassroomExtras {
  desc: string | null;
  moduleDesc: string | null;
  modules: ClassModule[];
  certificate: string | null;
  scorePre: number | null;
  scorePost: number | null;
  has_certificate: boolean;
}

/** Modul + nilai + sertifikat dari kelas LMS (`_classroom`/`_classroom_member`)
 *  untuk baris rekap yang ter-link via `cr_id`. Null bila kelas tak ditemukan. */
async function getClassroomExtras(memberId: number, crId: number): Promise<ClassroomExtras | null> {
  const row = await queryOne<{
    cr_desc: string | null; cr_module: string | null;
    berkas_sertifikat: string | null; cr_has_certificate: number | null;
    nilai_pre_test: number | null; nilai_post_test: number | null;
  }>(
    `SELECT c.cr_desc, c.cr_module, m.berkas_sertifikat, c.cr_has_certificate,
            m.nilai_pre_test, m.nilai_post_test
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
      WHERE c.cr_id = ? AND m.member_id = ?
      ORDER BY m.crm_id DESC
      LIMIT 1`,
    [crId, memberId],
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
    desc: clean(row.cr_desc) || null,
    moduleDesc,
    modules,
    certificate: cert || null,
    scorePre: row.nilai_pre_test == null ? null : Number(row.nilai_pre_test),
    scorePost: row.nilai_post_test == null ? null : Number(row.nilai_post_test),
    has_certificate: !!cert || row.cr_has_certificate === 1,
  };
}

/** Detail satu pelatihan member (dari rekap; `id` = `_rekap_classroom_excel.id`).
 *  Bila rekap ter-link ke kelas LMS (`cr_id`), diperkaya modul/nilai/sertifikat. */
export async function getClassDetail(memberId: number, rekapId: number): Promise<ClassDetail | null> {
  const row = await queryOne<{
    rid: number; cr_id: number | null; name: string;
    jpl: number | null; date_start: string | null; date_end: string | null;
    penyelenggara: string | null; keterangan: string | null; metode_nama: string | null;
  }>(
    `SELECT rce.id AS rid, rce.cr_id, rce.nama_pelatihan AS name,
            rce.jpl, rce.tgl_pelatihan_mulai::date AS date_start,
            rce.tgl_pelatihan_selesai::date AS date_end,
            rce.penyelenggara, rce.keterangan, lk.nama AS metode_nama
       FROM _rekap_classroom_excel rce
       LEFT JOIN _learning_kategori lk ON lk.id = rce.kategori
      WHERE rce.id = ? AND rce.member_id = ? AND rce.status_data = 'publish'`,
    [rekapId, memberId],
  );
  if (!row) return null;

  const detail: ClassDetail = {
    crm_id: row.rid,
    name: clean(row.name),
    desc: clean(row.keterangan) || null,
    moduleDesc: null,
    modules: [],
    certificate: null,
    scorePre: null,
    scorePost: null,
    jpl: Number(row.jpl ?? 0),
    methodLabel: row.metode_nama ? clean(row.metode_nama) : null,
    penyelenggara: clean(row.penyelenggara) || null,
    date_start: row.date_start,
    date_end: row.date_end,
    verified: true, // baris publish selalu terverifikasi (status_verifikasi='ok')
    has_certificate: false,
  };

  if (row.cr_id && row.cr_id > 0) {
    const extra = await getClassroomExtras(memberId, row.cr_id);
    if (extra) {
      detail.desc = detail.desc || extra.desc;
      detail.moduleDesc = extra.moduleDesc;
      detail.modules = extra.modules;
      detail.certificate = extra.certificate;
      detail.scorePre = extra.scorePre;
      detail.scorePost = extra.scorePost;
      detail.has_certificate = extra.has_certificate;
    }
  }
  return detail;
}

/** Daftar pelatihan member dari rekap realisasi (terbaru dulu).
 *  Bila `year` diberikan, hanya pelatihan dengan `tgl_pelatihan_mulai` di tahun itu. */
export async function getMemberClasses(memberId: number, year?: number): Promise<LearningClass[]> {
  const yearFilter = year ? "AND rce.tgl_pelatihan_mulai >= ?::date AND rce.tgl_pelatihan_mulai < ?::date" : "";
  const yearParams: unknown[] = year ? [`${year}-01-01`, `${year + 1}-01-01`] : [];
  const rows = await query<{
    rid: number; cr_id: number | null; name: string;
    date_start: string | null; date_end: string | null; has_cert: boolean;
    kategori: string | null; metode_kode: string | null; metode_nama: string | null;
    penyelenggara: string | null; jpl: number | null;
  }>(
    `SELECT rce.id AS rid, rce.cr_id, rce.nama_pelatihan AS name,
            rce.tgl_pelatihan_mulai::date AS date_start,
            rce.tgl_pelatihan_selesai::date AS date_end,
            (rce.cr_id IS NOT NULL AND rce.cr_id > 0 AND EXISTS (
               SELECT 1 FROM _classroom_member cm
                WHERE cm.cr_id = rce.cr_id AND cm.member_id = rce.member_id
                  AND cm.berkas_sertifikat IS NOT NULL AND cm.berkas_sertifikat <> '')) AS has_cert,
            lk.kategori, lk.kode AS metode_kode, lk.nama AS metode_nama,
            rce.penyelenggara, rce.jpl
       FROM _rekap_classroom_excel rce
       LEFT JOIN _learning_kategori lk ON lk.id = rce.kategori
      WHERE rce.member_id = ? AND rce.status_data = 'publish' ${yearFilter}
      ORDER BY rce.tgl_pelatihan_mulai DESC NULLS LAST`,
    [memberId, ...yearParams],
  );

  return rows.map((r) => ({
    crm_id: r.rid,
    cr_id: r.cr_id ?? 0,
    name: clean(r.name),
    type: null,
    status: null,
    bucket: r.kategori ? KATEGORI_TO_BUCKET[r.kategori] ?? null : null,
    kategori: r.kategori,
    method: r.metode_kode,
    methodLabel: r.metode_nama ? clean(r.metode_nama) : null,
    penyelenggara: clean(r.penyelenggara) || null,
    jpl: Number(r.jpl ?? 0),
    date_start: r.date_start,
    date_end: r.date_end,
    verified: true, // baris publish selalu terverifikasi (status_verifikasi='ok')
    has_certificate: r.has_cert,
  }));
}
