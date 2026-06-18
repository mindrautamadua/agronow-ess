import { query } from "@/lib/db";
import { currentMemberId, getMemberLevel, canCreateCoaching } from "@/lib/member";
import { clean } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daftar bawahan (coachee) dari pembimbing yang login — untuk mode coaching
 * "Development Dialogue" (konteks atasan–bawahan). Relasi atasan tersimpan di
 * `_come_member_profil.atasan_id`. Hanya BOD-1/BOD-2 yang boleh mengakses.
 */
export async function GET() {
  const me = await currentMemberId();
  const level = await getMemberLevel(me);
  if (!canCreateCoaching(level)) {
    return Response.json({ error: "Tidak berwenang." }, { status: 403 });
  }

  try {
    const rows = await query<{
      member_id: number; member_name: string | null; member_nip: string | null;
      member_jabatan: string | null; member_unit_kerja: string | null;
    }>(
      `SELECT m.member_id, m.member_name, m.member_nip, m.member_jabatan, m.member_unit_kerja
         FROM _come_member_profil p
         JOIN _member m ON m.member_id = p.member_id
        WHERE p.atasan_id = ? AND m.member_status = 'active' AND m.member_id <> ?
        ORDER BY m.member_name`,
      [me, me],
    );
    const bawahan = rows.map((r) => ({
      id: r.member_id,
      nama: clean(r.member_name) || `Member #${r.member_id}`,
      nip: clean(r.member_nip) || null,
      jabatan: clean(r.member_jabatan) || null,
      unit: clean(r.member_unit_kerja) || null,
    }));
    return Response.json({ bawahan });
  } catch (e) {
    console.error("/api/coaching/bawahan", e);
    return Response.json({ error: "Gagal memuat daftar bawahan" }, { status: 500 });
  }
}
