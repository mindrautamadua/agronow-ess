import { getMember, currentMemberId } from "@/lib/member";
import { getLearningSummary } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ringkasan untuk halaman utama: identitas + poin + saldo + progres 70-20-10. */
export async function GET() {
  try {
    const id = currentMemberId();
    const [member, summary] = await Promise.all([getMember(id), getLearningSummary(id)]);
    if (!member) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });

    return Response.json({
      member: {
        id: member.member_id,
        name: member.member_name,
        nip: member.member_nip,
        jabatan: member.member_jabatan,
        kel_jabatan: member.member_kel_jabatan,
        unit: member.member_unit_kerja,
        image: member.member_image,
        poin: member.member_poin ?? 0,
        saldo: member.member_saldo ?? 0,
      },
      learning: summary,
    });
  } catch (e) {
    console.error("/api/me", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
