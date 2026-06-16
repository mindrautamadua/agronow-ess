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
import { query } from "./db";
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

export interface BucketProgress {
  key: BucketKey;
  label: string;
  earned: number;
  target: number;
  pct: number;
}

export interface LearningClass {
  crm_id: number;
  cr_id: number;
  name: string;
  type: string | null;
  status: string | null;
  bucket: BucketKey | null;
  kategori: string | null;
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

/** Ringkasan progres 70-20-10 untuk satu member. */
export async function getLearningSummary(memberId: number, year = currentYear()): Promise<LearningSummary> {
  const earnedRows = await query<{ cat_id: number; kategori: string; earned_raw: number | null }>(
    `SELECT c.id_learning_kategori1 AS cat_id, lk.kategori,
            SUM(c.jpl_learning_kategori1) FILTER (WHERE m.is_verified = '1') AS earned_raw
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
       JOIN _learning_kategori lk ON lk.id = c.id_learning_kategori1
      WHERE m.member_id = ?
        AND lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')
      GROUP BY c.id_learning_kategori1, lk.kategori`,
    [memberId],
  );

  const targetRows = await query<{ cat_id: number; kategori: string; target: number }>(
    `SELECT j.id_kategori AS cat_id, lk.kategori, j.jpl AS target
       FROM _learning_kategori_jpl j
       JOIN _learning_kategori lk ON lk.id = j.id_kategori
      WHERE j.tahun = ?
        AND lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')`,
    [year],
  );

  const earnedByCat = new Map<number, number>();
  earnedRows.forEach((r) => earnedByCat.set(r.cat_id, Number(r.earned_raw ?? 0)));

  const agg: Record<BucketKey, { earned: number; target: number }> = {
    formal: { earned: 0, target: 0 },
    social: { earned: 0, target: 0 },
    experiential: { earned: 0, target: 0 },
  };

  for (const t of targetRows) {
    const bucket = KATEGORI_TO_BUCKET[t.kategori];
    if (!bucket) continue;
    const target = Number(t.target ?? 0);
    const earned = Math.min(earnedByCat.get(t.cat_id) ?? 0, target);
    agg[bucket].target += target;
    agg[bucket].earned += earned;
  }

  const buckets: BucketProgress[] = (["formal", "social", "experiential"] as BucketKey[]).map((key) => {
    const { earned, target } = agg[key];
    return { key, label: BUCKET_LABEL[key], earned, target, pct: target > 0 ? Math.round((earned / target) * 100) : 0 };
  });

  const totalEarned = buckets.reduce((s, b) => s + b.earned, 0);
  const totalTarget = buckets.reduce((s, b) => s + b.target, 0);

  const [{ n: totalClasses } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _classroom_member WHERE member_id = ?`,
    [memberId],
  );
  const [{ n: certificates } = { n: 0 }] = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM _classroom_member
      WHERE member_id = ? AND berkas_sertifikat IS NOT NULL AND berkas_sertifikat <> ''`,
    [memberId],
  );

  return {
    year,
    total: { earned: totalEarned, target: totalTarget, pct: totalTarget > 0 ? Math.round((totalEarned / totalTarget) * 100) : 0 },
    buckets,
    totalClasses: Number(totalClasses),
    certificates: Number(certificates),
  };
}

/** Daftar kelas/aktivitas pembelajaran member (terbaru dulu). */
export async function getMemberClasses(memberId: number): Promise<LearningClass[]> {
  const rows = await query<{
    crm_id: number; cr_id: number; cr_name: string; cr_type: string | null; cr_status: string | null;
    cr_date_start: string | null; cr_date_end: string | null; cr_has_certificate: number | null;
    is_verified: string | null; has_cert: boolean; kategori: string | null; jpl: number | null;
  }>(
    `SELECT m.crm_id, c.cr_id, c.cr_name, c.cr_type, c.cr_status,
            c.cr_date_start, c.cr_date_end, c.cr_has_certificate,
            m.is_verified,
            (m.berkas_sertifikat IS NOT NULL AND m.berkas_sertifikat <> '') AS has_cert,
            lk.kategori, c.jpl_learning_kategori1 AS jpl
       FROM _classroom_member m
       JOIN _classroom c ON c.cr_id = m.cr_id
       LEFT JOIN _learning_kategori lk ON lk.id = c.id_learning_kategori1
      WHERE m.member_id = ?
      ORDER BY c.cr_date_start DESC NULLS LAST`,
    [memberId],
  );

  return rows.map((r) => ({
    crm_id: r.crm_id,
    cr_id: r.cr_id,
    name: clean(r.cr_name),
    type: r.cr_type,
    status: r.cr_status,
    bucket: r.kategori ? KATEGORI_TO_BUCKET[r.kategori] ?? null : null,
    kategori: r.kategori,
    jpl: Number(r.jpl ?? 0),
    date_start: r.cr_date_start,
    date_end: r.cr_date_end,
    verified: r.is_verified === "1",
    has_certificate: r.has_cert || r.cr_has_certificate === 1,
  }));
}
