import { getMember, getMemberLevel } from "@/lib/member";
import { getLearningSummary, getMemberClasses } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aktivitas pembelajaran member + ringkasan 70-20-10. */
export async function GET() {
  try {
    const member = await getMember();
    if (!member) {
      return Response.json(
        { error: "Member tidak ditemukan untuk akun ini. Pastikan NIK/akun terhubung ke data _member." },
        { status: 404 },
      );
    }
    const id = member.member_id;
    const [summary, classes, level] = await Promise.all([getLearningSummary(id), getMemberClasses(id), getMemberLevel(id)]);
    return Response.json({ summary, classes, member: { name: member.member_name, email: member.member_email, level } });
  } catch (e) {
    console.error("/api/learning", e);
    const detail = e instanceof Error ? e.message : String(e);
    return Response.json(
      {
        error: "Gagal memuat data pembelajaran",
        // Detail teknis hanya di non-produksi agar tak bocor ke user akhir.
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 },
    );
  }
}
