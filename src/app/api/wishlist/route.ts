import { query } from "@/lib/db";
import { currentMemberId } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODE: Record<string, string> = { Offline: "Offline", Online: "Online", Hybrid: "Hybrid", Blended: "Blended" };

interface KatalogRow {
  id: number; nama: string; kategori_key_element: string | null; jpl_total: number | null;
  metode: string | null; deskripsi: string | null; harga: number | null;
}

function mapCourse(r: KatalogRow) {
  return {
    id: r.id,
    judul: clean(r.nama),
    kategori: r.kategori_key_element?.trim() ? r.kategori_key_element.trim().replace(/\s*,\s*/g, ", ") : null,
    jpl: r.jpl_total && r.jpl_total > 0 ? r.jpl_total : null,
    metode: r.metode?.trim() ? MODE[r.metode.trim()] ?? r.metode.trim() : null,
    deskripsi: clean(r.deskripsi).slice(0, 140) || null,
    biaya: Number(r.harga ?? 0),
  };
}

/** Wishlist member + katalog pelatihan untuk dipilih. */
export async function GET() {
  try {
    const id = await currentMemberId();

    const items = await query<KatalogRow & { wid: number; tahun: number | null; prioritas: number | null; status: string | null }>(
      `SELECT w.id AS wid, w.tahun, w.prioritas, w.status,
              k.id, k.nama, k.kategori_key_element, k.jpl_total, k.metode, k.deskripsi, k.harga
         FROM _learning_wishlist_v2 w
         JOIN _learning_katalog k ON k.id = w.id_learning_katalog
        WHERE w.id_member = ?
        ORDER BY w.prioritas ASC NULLS LAST, w.id DESC`,
      [id],
    );

    const katalog = await query<KatalogRow>(
      `SELECT id, nama, kategori_key_element, jpl_total, metode, deskripsi, harga
         FROM _learning_katalog
        WHERE status = 'aktif' AND nama IS NOT NULL AND nama <> ''
        ORDER BY id DESC LIMIT 24`,
    );

    return Response.json({
      wishlist: items.map((r) => ({ ...mapCourse(r), wid: r.wid, tahun: r.tahun, prioritas: r.prioritas })),
      katalog: katalog.map(mapCourse),
    });
  } catch (e) {
    console.error("/api/wishlist", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
