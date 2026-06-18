import { getMember } from "@/lib/member";
import { getClassDetail } from "@/lib/learning";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Detail satu kelas member (modul + sertifikat). Hanya kelas milik member sendiri. */
export async function GET(_req: Request, { params }: { params: Promise<{ crmId: string }> }) {
  const { crmId } = await params;
  const id = Number(crmId);
  if (!Number.isFinite(id)) return Response.json({ error: "ID tidak valid" }, { status: 400 });

  try {
    const member = await getMember();
    if (!member) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
    const detail = await getClassDetail(member.member_id, id);
    if (!detail) return Response.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    return Response.json({ detail });
  } catch (e) {
    console.error(`/api/learning/${crmId}`, e);
    return Response.json({ error: "Gagal memuat data" }, { status: 500 });
  }
}
