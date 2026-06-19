import { query, queryOne } from "@/lib/db";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODE: Record<string, string> = { Offline: "Offline", Online: "Online", Hybrid: "Hybrid", Blended: "Blended" };

interface Row {
  id: number; nama: string; kategori_key_element: string | null; kategori_gesture: string | null;
  metode: string | null; jpl_total: number | null; durasi_hari: number | null; minimal_peserta: number | null;
  harga: number | null; deskripsi: string | null; silabus: string | null; sasaran_pembelajaran: string | null;
  penugasan_pasca_pelatihan: string | null; daftar_level_karyawan: string | null; kata_kunci: string | null;
  metode1_id: number | null; metode1_jpl: number | null; metode2_id: number | null; metode2_jpl: number | null;
  metode3_id: number | null; metode3_jpl: number | null;
}

/** Detail satu item katalog pelatihan (`_learning_katalog`) + rincian metode belajarnya. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return Response.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const r = await queryOne<Row>(
      `SELECT id, nama, kategori_key_element, kategori_gesture, metode, jpl_total, durasi_hari,
              minimal_peserta, harga, deskripsi, silabus, sasaran_pembelajaran, penugasan_pasca_pelatihan,
              daftar_level_karyawan, kata_kunci,
              metode1_id, metode1_jpl, metode2_id, metode2_jpl, metode3_id, metode3_jpl
         FROM _learning_katalog WHERE id = ? AND status = 'aktif'`,
      [id],
    );
    if (!r) return Response.json({ error: "Pelatihan tidak ditemukan" }, { status: 404 });

    // Rincian metode belajar (id → nama dari _learning_kategori).
    const pairs = [
      { id: r.metode1_id, jpl: r.metode1_jpl },
      { id: r.metode2_id, jpl: r.metode2_jpl },
      { id: r.metode3_id, jpl: r.metode3_jpl },
    ].filter((m) => Number(m.id) > 0);
    let metodeBelajar: { label: string; jpl: number }[] = [];
    if (pairs.length) {
      const names = await query<{ id: number; nama: string | null }>(
        `SELECT id, nama FROM _learning_kategori WHERE id IN (${pairs.map(() => "?").join(",")})`,
        pairs.map((m) => Number(m.id)),
      );
      const nameById = new Map(names.map((n) => [n.id, clean(n.nama)]));
      metodeBelajar = pairs.map((m) => ({ label: nameById.get(Number(m.id)) || "Lainnya", jpl: Number(m.jpl) || 0 }));
    }

    const detail = {
      id: r.id,
      judul: clean(r.nama),
      elemen: r.kategori_key_element?.trim() ? r.kategori_key_element.trim().replace(/\s*,\s*/g, ", ") : null,
      gesture: clean(r.kategori_gesture) || null,
      metode: r.metode?.trim() ? MODE[r.metode.trim()] ?? r.metode.trim() : null,
      jpl: Number(r.jpl_total) || 0,
      durasiHari: Number(r.durasi_hari) || 0,
      minimalPeserta: Number(r.minimal_peserta) || 0,
      harga: Number(r.harga) || 0,
      deskripsi: clean(r.deskripsi) || null,
      silabus: clean(r.silabus) || null,
      sasaran: clean(r.sasaran_pembelajaran) || null,
      penugasan: clean(r.penugasan_pasca_pelatihan) || null,
      kataKunci: clean(r.kata_kunci) || null,
      metodeBelajar,
    };
    return Response.json({ detail });
  } catch (e) {
    console.error(`/api/learning/katalog/${idStr}`, e);
    return Response.json({ error: "Gagal memuat detail" }, { status: 500 });
  }
}
