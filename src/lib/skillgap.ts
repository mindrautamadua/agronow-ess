/**
 * Skill-Gap: peta kompetensi per *metode belajar* (Coaching, Mentoring, Workshop,
 * Project Assignment, dst.) — capaian JPL member vs target tahun berjalan, ditambah
 * rekomendasi pelatihan nyata dari `_learning_katalog` untuk menutup gap terbesar.
 *
 * Sumbu radar = kategori metode (`_learning_kategori` id 7..15) yang punya target di
 * `_learning_kategori_jpl`. Katalog menyumbang JPL ke metode lewat metode1/2/3_id.
 */
import { query } from "./db";
import { clean } from "./text";
import type { BucketKey, BucketProgress } from "./learning";
import { BUCKET_LABEL } from "./learning";

const KATEGORI_TO_BUCKET: Record<string, BucketKey> = {
  metode_belajar10: "formal",
  metode_belajar20: "social",
  metode_belajar70: "experiential",
};

export const BUCKET_SHORT: Record<BucketKey, string> = {
  formal: "Formal", social: "Sosial", experiential: "Experiential",
};

// Label ringkas untuk label sumbu radar (nama asli sebagian panjang).
const SHORT_METHOD: Record<string, string> = {
  mb_c: "Coaching", mb_m: "Mentoring", mb_b: "Benchmark",
  mb_pa: "Project", mb_lo: "Action Learning", mb_ib: "Innovation",
  mb_w: "Workshop", mb_ict: "Kelas", mb_sl: "Mandiri",
};

export interface SkillAxis {
  catId: number; name: string; short: string; kode: string;
  bucket: BucketKey; bucketLabel: string;
  target: number; earned: number; pct: number; remaining: number;
}

export interface SkillRec {
  id: number; nama: string; jplTotal: number; durasiHari: number; harga: number;
  metode: string | null; deskripsi: string; score: number;
  fills: { name: string; short: string; jpl: number }[];
}

export interface SkillGapData {
  year: number;
  axes: SkillAxis[];
  buckets: BucketProgress[];
  recommendations: SkillRec[];
  total: { earned: number; target: number; pct: number };
}

function currentYear(): number {
  return new Date().getFullYear();
}

export async function getSkillGap(memberId: number, year = currentYear()): Promise<SkillGapData> {
  // Target per metode untuk tahun berjalan (hanya yang target > 0).
  const targets = await query<{ cat_id: number; kode: string; nama: string; bucket_key: string; target: number }>(
    `SELECT j.id_kategori AS cat_id, lk.kode, lk.nama, lk.kategori AS bucket_key, j.jpl AS target
       FROM _learning_kategori_jpl j
       JOIN _learning_kategori lk ON lk.id = j.id_kategori
      WHERE j.tahun = ?
        AND lk.kategori IN ('metode_belajar10','metode_belajar20','metode_belajar70')
        AND j.jpl > 0
      ORDER BY j.id_kategori`,
    [year],
  );

  // JPL realisasi per metode untuk member ini (sumber: rekap `_rekap_classroom_excel`,
  // selaras dengan halaman /learning — termasuk pelatihan eksternal). Baris publish
  // dianggap terverifikasi (status_verifikasi selalu 'ok').
  const earnedRows = await query<{ cat_id: number; earned: number | null }>(
    `SELECT rce.kategori AS cat_id,
            SUM(rce.jpl) AS earned
       FROM _rekap_classroom_excel rce
      WHERE rce.member_id = ?
        AND rce.status_data = 'publish'
      GROUP BY rce.kategori`,
    [memberId],
  );
  const earnedByCat = new Map<number, number>();
  earnedRows.forEach((r) => earnedByCat.set(r.cat_id, Number(r.earned ?? 0)));

  const axes: SkillAxis[] = targets.map((t) => {
    const bucket = KATEGORI_TO_BUCKET[t.bucket_key] ?? "formal";
    const target = Number(t.target);
    const earnedRaw = earnedByCat.get(t.cat_id) ?? 0;
    const earned = Math.min(earnedRaw, target); // "diakui" = di-cap ke target; sisa pakai earnedRaw
    return {
      catId: t.cat_id, name: clean(t.nama), short: SHORT_METHOD[t.kode] ?? clean(t.nama), kode: t.kode,
      bucket, bucketLabel: BUCKET_LABEL[bucket],
      target, earned, pct: target > 0 ? Math.round((earned / target) * 100) : 0,
      remaining: Math.max(target - earnedRaw, 0),
    };
  });

  // Ringkasan per bucket 70-20-10.
  const bAgg: Record<BucketKey, { earned: number; earnedReal: number; target: number }> = {
    formal: { earned: 0, earnedReal: 0, target: 0 }, social: { earned: 0, earnedReal: 0, target: 0 }, experiential: { earned: 0, earnedReal: 0, target: 0 },
  };
  axes.forEach((a) => {
    bAgg[a.bucket].earned += a.earned;
    bAgg[a.bucket].earnedReal += earnedByCat.get(a.catId) ?? 0;
    bAgg[a.bucket].target += a.target;
  });
  const buckets: BucketProgress[] = (["formal", "social", "experiential"] as BucketKey[]).map((key) => {
    const { earned, earnedReal, target } = bAgg[key];
    return { key, label: BUCKET_LABEL[key], earned, earnedReal, target, pct: target > 0 ? Math.round((earned / target) * 100) : 0 };
  });

  const total = {
    earned: buckets.reduce((s, b) => s + b.earned, 0),
    target: buckets.reduce((s, b) => s + b.target, 0),
    pct: 0,
  };
  total.pct = total.target > 0 ? Math.round((total.earned / total.target) * 100) : 0;

  // Rekomendasi: pelatihan aktif yang menyumbang ke metode dengan gap.
  const gapAxes = axes.filter((a) => a.remaining > 0);
  const gapIds = gapAxes.map((a) => a.catId);
  const nameByCat = new Map(axes.map((a) => [a.catId, a]));
  const remainingByCat = new Map(gapAxes.map((a) => [a.catId, a.remaining]));

  let recommendations: SkillRec[] = [];
  if (gapIds.length) {
    const courses = await query<{
      id: number; nama: string; jpl_total: number | null; durasi_hari: number | null; harga: number | null;
      metode: string | null; deskripsi: string | null;
      metode1_id: number | null; metode1_jpl: number | null;
      metode2_id: number | null; metode2_jpl: number | null;
      metode3_id: number | null; metode3_jpl: number | null;
    }>(
      `SELECT id, nama, jpl_total, durasi_hari, harga, metode, deskripsi,
              metode1_id, metode1_jpl, metode2_id, metode2_jpl, metode3_id, metode3_jpl
         FROM _learning_katalog
        WHERE status = 'aktif' AND tahun = ?
          AND (metode1_id = ANY(?) OR metode2_id = ANY(?) OR metode3_id = ANY(?))
        LIMIT 600`,
      [year, gapIds, gapIds, gapIds],
    );

    recommendations = courses
      .map((c) => {
        const slots: [number | null, number | null][] = [
          [c.metode1_id, c.metode1_jpl], [c.metode2_id, c.metode2_jpl], [c.metode3_id, c.metode3_jpl],
        ];
        const fills: { name: string; short: string; jpl: number }[] = [];
        let score = 0;
        const seen = new Set<number>();
        for (const [mid, mjpl] of slots) {
          if (!mid || seen.has(mid) || !remainingByCat.has(mid)) continue;
          seen.add(mid);
          const ax = nameByCat.get(mid)!;
          const jpl = Number(mjpl ?? 0);
          fills.push({ name: ax.name, short: ax.short, jpl });
          score += Math.min(jpl || 1, remainingByCat.get(mid)!); // sumbangan efektif ke gap
        }
        const desc = clean(c.deskripsi);
        return {
          id: c.id, nama: clean(c.nama), jplTotal: Number(c.jpl_total ?? 0),
          durasiHari: Number(c.durasi_hari ?? 0), harga: Number(c.harga ?? 0),
          metode: c.metode, deskripsi: desc.length > 160 ? desc.slice(0, 157) + "…" : desc,
          score, fills,
        };
      })
      .filter((r) => r.score > 0 && r.fills.length > 0)
      .sort((a, b) => b.score - a.score || b.fills.length - a.fills.length || a.harga - b.harga)
      .slice(0, 6);
  }

  return { year, axes, buckets, recommendations, total };
}
