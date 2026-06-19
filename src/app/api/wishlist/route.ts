import { query, queryOne } from "@/lib/db";
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
        WHERE w.id_member = ? AND COALESCE(w.status, '') <> 'dihapus'
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
      wishlist: items.map((r) => ({ ...mapCourse(r), wid: r.wid, tahun: r.tahun, prioritas: r.prioritas, status: clean(r.status) || "aktif" })),
      katalog: katalog.map(mapCourse),
    });
  } catch (e) {
    console.error("/api/wishlist", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

/**
 * Tambah pelatihan ke wishlist member. Idempoten: bila sudah ada & `aktif` →
 * no-op; bila pernah dihapus (`dihapus`) → diaktifkan kembali; selain itu insert
 * baru. `_learning_wishlist_v2.id` tanpa sequence → MAX+1; prioritas = urutan
 * terakhir + 1 (ditaruh di akhir). Body: `{ id_learning_katalog }`.
 */
export async function POST(req: Request) {
  const memberId = await currentMemberId();
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "Permintaan tidak valid" }, { status: 400 }); }

  const katalogId = Number(b.id_learning_katalog) || 0;
  if (!katalogId) return Response.json({ error: "Pelatihan tidak valid" }, { status: 400 });

  try {
    const k = await queryOne<{ id: number }>(`SELECT id FROM _learning_katalog WHERE id = ? AND status = 'aktif'`, [katalogId]);
    if (!k) return Response.json({ error: "Pelatihan tidak ditemukan" }, { status: 404 });

    const year = new Date().getFullYear();
    const ex = await queryOne<{ id: number; status: string | null }>(
      `SELECT id, status FROM _learning_wishlist_v2 WHERE id_member = ? AND id_learning_katalog = ? ORDER BY id DESC LIMIT 1`,
      [String(memberId), katalogId],
    );

    if (ex && (ex.status ?? "").toLowerCase() === "aktif") {
      return Response.json({ ok: true, wid: ex.id, already: true });
    }
    if (ex) {
      await query(`UPDATE _learning_wishlist_v2 SET status = 'aktif', tanggal = NOW()::timestamp, tahun = ? WHERE id = ?`, [year, ex.id]);
      return Response.json({ ok: true, wid: ex.id });
    }

    const rows = await query<{ id: number }>(
      `INSERT INTO _learning_wishlist_v2 (id, id_member, id_learning_katalog, tahun, tanggal, prioritas, status)
       VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM _learning_wishlist_v2), ?, ?, ?, NOW()::timestamp,
               (SELECT COALESCE(MAX(prioritas), 0) + 1 FROM _learning_wishlist_v2 WHERE id_member = ? AND status = 'aktif'), 'aktif')
       RETURNING id`,
      [String(memberId), katalogId, year, String(memberId)],
    );
    return Response.json({ ok: true, wid: rows[0]?.id ?? null });
  } catch (e) {
    console.error("POST /api/wishlist", e);
    return Response.json({ error: "Gagal menambah ke wishlist" }, { status: 500 });
  }
}

/** Hapus pelatihan dari wishlist (soft delete → status `dihapus`). Body: `{ id_learning_katalog }`. */
export async function DELETE(req: Request) {
  const memberId = await currentMemberId();
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return Response.json({ error: "Permintaan tidak valid" }, { status: 400 }); }

  const katalogId = Number(b.id_learning_katalog) || 0;
  if (!katalogId) return Response.json({ error: "Pelatihan tidak valid" }, { status: 400 });

  try {
    // Hanya boleh hapus yang BELUM disetujui (submitted/aktif/pending). Item
    // yang sudah approved/selesai dilindungi agar riwayat pengajuan tetap utuh.
    const rows = await query<{ id: number }>(
      `UPDATE _learning_wishlist_v2 SET status = 'dihapus'
        WHERE id_member = ? AND id_learning_katalog = ?
          AND lower(COALESCE(status, '')) NOT IN ('dihapus', 'approved', 'disetujui', 'diterima', 'selesai')
        RETURNING id`,
      [String(memberId), katalogId],
    );
    if (rows.length === 0) {
      return Response.json({ error: "Wishlist ini sudah disetujui dan tidak dapat dihapus." }, { status: 409 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/wishlist", e);
    return Response.json({ error: "Gagal menghapus dari wishlist" }, { status: 500 });
  }
}
