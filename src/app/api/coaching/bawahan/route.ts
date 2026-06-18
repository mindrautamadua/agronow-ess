import { currentMemberId, currentNikSap, getMemberLevel, canCreateCoaching } from "@/lib/member";
import { getBawahanKarpim } from "@/lib/aghris";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daftar bawahan (coachee) untuk mode coaching "Development Dialogue".
 * Sumber: API AGHRIS holding (pemetaan atasan→bawahan karpim), dengan
 * `nik_sap_atasan` = NIK SAP user yang login. Hanya BOD-1/BOD-2 yang boleh akses.
 */
export async function GET() {
  const me = await currentMemberId();
  const level = await getMemberLevel(me);
  if (!canCreateCoaching(level)) {
    return Response.json({ error: "Tidak berwenang." }, { status: 403 });
  }

  const nik = await currentNikSap();
  if (!nik) return Response.json({ bawahan: [] });

  try {
    const list = await getBawahanKarpim(nik);
    const bawahan = list.map((b) => ({ nikSap: b.nikSap, nama: b.nama || b.nikSap, psa: b.psa }));
    return Response.json({ bawahan });
  } catch (e) {
    console.error("/api/coaching/bawahan", e);
    return Response.json({ error: "Gagal memuat daftar bawahan dari AGHRIS." }, { status: 502 });
  }
}
