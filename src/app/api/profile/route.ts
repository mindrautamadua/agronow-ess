import { getMember } from "@/lib/member";
import { getLearningSummary } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const member = await getMember();
    if (!member) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
    const summary = await getLearningSummary(member.member_id);

    return Response.json({
      member: {
        id: member.member_id,
        name: member.member_name,
        nip: member.member_nip,
        nip_sap: member.nip_sap,
        email: member.member_email,
        jabatan: member.member_jabatan,
        kel_jabatan: member.member_kel_jabatan,
        unit: member.member_unit_kerja,
        image: member.member_image,
        gender: member.member_gender,
        phone: member.member_phone,
        birth_place: member.member_birth_place,
        birth_date: member.member_birth_date,
        address: member.member_address,
        city: member.member_city,
        province: member.member_province,
        join_date: member.date_masuk_kerja,
        poin: member.member_poin ?? 0,
        saldo: member.member_saldo ?? 0,
        status: member.member_status,
      },
      stats: {
        totalClasses: summary.totalClasses,
        certificates: summary.certificates,
        jplEarned: summary.total.earned,
        jplTarget: summary.total.target,
      },
    });
  } catch (e) {
    console.error("/api/profile", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
