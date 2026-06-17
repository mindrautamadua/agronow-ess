import { currentMemberId } from "@/lib/member";
import { getSkillGap } from "@/lib/skillgap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Peta kompetensi (skill gap) per metode belajar + rekomendasi pelatihan. */
export async function GET() {
  try {
    const data = await getSkillGap(currentMemberId());
    return Response.json(data);
  } catch (e) {
    console.error("/api/skillgap", e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
