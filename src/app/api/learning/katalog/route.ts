import { query } from "@/lib/db";
import { currentMemberId } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODE: Record<string, string> = { Offline: "Offline", Online: "Online", Hybrid: "Hybrid", Blended: "Blended" };

interface Row {
  id: number; nama: string; kategori_key_element: string | null;
  jpl_total: number | null; metode: string | null; deskripsi: string | null;
  in_wishlist: boolean;
}

/**
 * Katalog pelatihan untuk satu metode belajar (`?metode=` = kode di
 * `_learning_kategori.kode`, mis. `mb_ict` = "Belajar di Kelas"). Difilter dari
 * `_learning_katalog` aktif yang salah satu metode1/2/3-nya mengacu ke kategori
 * tersebut. Bentuk item mengikuti katalog di /api/wishlist.
 */
export async function GET(req: Request) {
  try {
    const memberId = await currentMemberId();
    const metode = (new URL(req.url).searchParams.get("metode") || "mb_ict").trim();
    const LIMIT = 12;

    const where =
      `k.status = 'aktif' AND k.nama IS NOT NULL AND k.nama <> ''
       AND EXISTS (SELECT 1 FROM _learning_kategori lk
                    WHERE lk.kode = ? AND lk.id IN (k.metode1_id, k.metode2_id, k.metode3_id))`;

    const rows = await query<Row>(
      `SELECT k.id, k.nama, k.kategori_key_element, k.jpl_total, k.metode, k.deskripsi,
              EXISTS (SELECT 1 FROM _learning_wishlist_v2 w
                       WHERE w.id_member = ? AND w.id_learning_katalog = k.id AND w.status = 'aktif') AS in_wishlist
         FROM _learning_katalog k
        WHERE ${where}
        ORDER BY k.id DESC
        LIMIT ?`,
      [String(memberId), metode, LIMIT],
    );
    const [{ total }] = await query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM _learning_katalog k WHERE ${where}`,
      [metode],
    );

    const items = rows.map((r) => ({
      id: r.id,
      judul: clean(r.nama),
      kategori: r.kategori_key_element?.trim() ? r.kategori_key_element.trim().replace(/\s*,\s*/g, ", ") : null,
      jpl: r.jpl_total && r.jpl_total > 0 ? r.jpl_total : null,
      metode: r.metode?.trim() ? MODE[r.metode.trim()] ?? r.metode.trim() : null,
      deskripsi: clean(r.deskripsi).slice(0, 120) || null,
      inWishlist: !!r.in_wishlist,
    }));

    return Response.json({ total, items });
  } catch (e) {
    console.error("/api/learning/katalog", e);
    return Response.json({ error: "Gagal memuat katalog" }, { status: 500 });
  }
}
