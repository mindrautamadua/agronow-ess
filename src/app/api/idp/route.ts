import { query } from "@/lib/db";
import { currentMemberId } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daftar IDP (Individual Development Program) milik member. */
export async function GET() {
  try {
    const id = await currentMemberId();
    const rows = await query<{
      id: number; tahun: number | null; area_pengembangan: string | null;
      aspirasi_pengembangan: string | null; rencana: string | null; deskripsi_pengembangan: string | null;
      tgl_pelaksanaan: string | null; jam_mulai: string | null; jam_selesai: string | null;
      status_idp: string | null; status_verifikasi: string | null; catatan_verifikasi: string | null;
    }>(
      `SELECT id, tahun, area_pengembangan, aspirasi_pengembangan, rencana, deskripsi_pengembangan,
              tgl_pelaksanaan, jam_mulai, jam_selesai, status_idp, status_verifikasi, catatan_verifikasi
         FROM _idp WHERE member_id = ? ORDER BY tahun DESC NULLS LAST, id DESC`,
      [String(id)],
    );

    const items = rows.map((r) => ({
      id: r.id,
      tahun: r.tahun,
      area: clean(r.area_pengembangan),
      aspirasi: clean(r.aspirasi_pengembangan),
      rencana: clean(r.rencana),
      deskripsi: clean(r.deskripsi_pengembangan),
      tanggal: r.tgl_pelaksanaan,
      jam: r.jam_mulai && r.jam_selesai ? `${r.jam_mulai.slice(0, 5)} – ${r.jam_selesai.slice(0, 5)}` : null,
      status: clean(r.status_idp) || "draft",
      status_verifikasi: clean(r.status_verifikasi),
      catatan: clean(r.catatan_verifikasi),
    }));

    return Response.json({ year: new Date().getFullYear(), items });
  } catch (e) {
    console.error("/api/idp", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}

/**
 * Simpan IDP baru milik member yang sedang login. Tabel `_idp` tidak memakai
 * sequence untuk `id`, jadi id di-generate `MAX(id)+1` di dalam INSERT. Status
 * awal: `pending` / `sedang direview` (menunggu verifikator).
 */
export async function POST(req: Request) {
  const memberId = await currentMemberId();

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const str = (v: unknown) => String(v ?? "").trim();
  const tahun = Number(b.tahun) || new Date().getFullYear();
  const area = str(b.area);
  const aspirasi = str(b.aspirasi);
  const rencana = str(b.rencana);
  const deskripsi = str(b.deskripsi);
  const summary = str(b.summary);
  const dokumentasi = str(b.dokumentasi);
  const lokasi = str(b.lokasi);
  const tanggal = str(b.tanggal) || null;
  const jamMulai = str(b.jamMulai) || null;
  const jamSelesai = str(b.jamSelesai) || null;

  if (!area || !aspirasi || !rencana) {
    return Response.json({ error: "Area, aspirasi, dan rencana wajib diisi" }, { status: 400 });
  }

  try {
    const rows = await query<{ id: number }>(
      `INSERT INTO _idp
         (id, member_id, tahun, area_pengembangan, aspirasi_pengembangan, rencana,
          deskripsi_pengembangan, summary, url_dokumentasi, lokasi, tgl_pelaksanaan, jam_mulai, jam_selesai,
          status_idp, status_verifikasi, status, created_at, updated_at)
       VALUES
         ((SELECT COALESCE(MAX(id), 0) + 1 FROM _idp), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'pending', 'sedang direview', '', NOW()::timestamp, NOW()::timestamp)
       RETURNING id`,
      [String(memberId), tahun, area, aspirasi, rencana, deskripsi, summary, dokumentasi, lokasi, tanggal, jamMulai, jamSelesai],
    );
    return Response.json({ id: rows[0]?.id ?? null });
  } catch (e) {
    console.error("POST /api/idp", e);
    return Response.json({ error: "Gagal menyimpan IDP" }, { status: 500 });
  }
}
