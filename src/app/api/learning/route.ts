import { getMember, getMemberLevel, UnauthenticatedError } from "@/lib/member";
import { getLearningSummary, getMemberClasses, getAvailableYears } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aktivitas pembelajaran member + ringkasan 70-20-10, opsional per tahun (?year=). */
export async function GET(req: Request) {
  try {
    const member = await getMember();
    if (!member) {
      return Response.json(
        { error: "Member tidak ditemukan untuk akun ini. Pastikan NIK/akun terhubung ke data _member." },
        { status: 404 },
      );
    }
    const id = member.member_id;
    // Tahun dari query (default tahun berjalan); abaikan nilai tak masuk akal.
    const yParam = Number(new URL(req.url).searchParams.get("year"));
    const year = Number.isInteger(yParam) && yParam >= 2000 && yParam <= 2100 ? yParam : new Date().getFullYear();

    const [summary, classes, level, years] = await Promise.all([
      getLearningSummary(id, year),
      getMemberClasses(id, year),
      getMemberLevel(id),
      getAvailableYears(id),
    ]);
    return Response.json({ year, years, summary, classes, member: { name: member.member_name, email: member.member_email, level } });
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      return Response.json({ error: e.message }, { status: 401 });
    }
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
