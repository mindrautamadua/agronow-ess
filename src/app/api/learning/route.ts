import { currentMemberId } from "@/lib/member";
import { getLearningSummary, getMemberClasses } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aktivitas pembelajaran member + ringkasan 70-20-10. */
export async function GET() {
  try {
    const id = await currentMemberId();
    const [summary, classes] = await Promise.all([getLearningSummary(id), getMemberClasses(id)]);
    return Response.json({ summary, classes });
  } catch (e) {
    console.error("/api/learning", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
