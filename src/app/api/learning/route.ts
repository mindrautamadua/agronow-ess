import { getMember, getMemberLevel } from "@/lib/member";
import { getLearningSummary, getMemberClasses } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aktivitas pembelajaran member + ringkasan 70-20-10. */
export async function GET() {
  try {
    const member = await getMember();
    if (!member) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
    const id = member.member_id;
    const [summary, classes, level] = await Promise.all([getLearningSummary(id), getMemberClasses(id), getMemberLevel(id)]);
    return Response.json({ summary, classes, member: { name: member.member_name, email: member.member_email, level } });
  } catch (e) {
    console.error("/api/learning", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
