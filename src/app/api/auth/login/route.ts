/**
 * Login Agronow ESS — proxy ke API holding (PT Perkebunan Nusantara).
 *
 * Client TIDAK memanggil API holding langsung (hindari CORS & jaga agar detail
 * endpoint tetap di server). Alur:
 *   1. Validasi NIK + password ke `/access/login` (respons array; `ADA="1"` = valid).
 *   2. Petakan `NIK_SAP` → `member_id` di DB `_member` (sumber data app).
 *   3. Set cookie sesi httpOnly bertanda tangan.
 */
import { getMemberByNikSap, verifyMemberPassword, type MemberRow } from "@/lib/member";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOLDING_LOGIN_URL =
  process.env.HOLDING_LOGIN_URL ?? "https://apis.holding-perkebunan.com/access/login";

interface HoldingUser {
  NAMA: string | null;
  NIK_SAP: string;
  ROLEID: string;
  PTPN: string;
  ADA: string; // "1" = ditemukan/valid, "0" = gagal
  TOKEN: string | null;
}

export async function POST(req: Request) {
  let nik = "";
  let password = "";
  try {
    const body = await req.json();
    nik = String(body?.nik ?? "").trim();
    password = String(body?.password ?? "");
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!nik || !password) {
    return Response.json({ error: "NIK dan password wajib diisi" }, { status: 400 });
  }

  // ── 1. Validasi ke API holding (sumber utama) ──
  let holding: HoldingUser | undefined;
  try {
    const url = new URL(HOLDING_LOGIN_URL);
    url.searchParams.set("niksap", nik);
    url.searchParams.set("password", password);
    url.searchParams.set("status-login", "1");
    url.searchParams.set("device_id", "");
    url.searchParams.set("imei", "");
    url.searchParams.set("token-firebase", "");

    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as HoldingUser[];
      holding = Array.isArray(data) ? data[0] : undefined;
    } else {
      console.error("holding login HTTP", res.status);
    }
  } catch (e) {
    // API tidak bisa dihubungi — lanjut ke fallback DB.
    console.error("holding login fetch", e);
  }

  // ── 2a. API memvalidasi → petakan NIK_SAP ke member app ──
  if (holding && holding.ADA === "1") {
    const member = await getMemberByNikSap(holding.NIK_SAP || nik);
    if (!member) {
      return Response.json(
        { error: "Akun terdaftar di SSO tetapi belum terdaftar di Agronow L&D" },
        { status: 403 },
      );
    }
    return issueSession(member, {
      niksap: holding.NIK_SAP || nik,
      nama: holding.NAMA ?? member.member_name ?? "",
      role: holding.ROLEID ?? "",
      ptpn: holding.PTPN ?? "",
      token: holding.TOKEN ?? "",
    });
  }

  // ── 2b. Fallback: API tidak menemukan / tidak tersedia → cek DB `_member` ──
  const dbMember = await verifyMemberPassword(nik, password);
  if (dbMember) {
    return issueSession(dbMember, {
      niksap: dbMember.nip_sap || dbMember.member_nip || nik,
      nama: dbMember.member_name ?? "",
      role: "",
      ptpn: "",
      token: "",
    });
  }

  return Response.json({ error: "NIK atau password salah" }, { status: 401 });
}

async function issueSession(
  member: MemberRow,
  info: { niksap: string; nama: string; role: string; ptpn: string; token: string },
): Promise<Response> {
  await setSessionCookie({
    memberId: member.member_id,
    niksap: info.niksap,
    nama: info.nama,
    role: info.role,
    ptpn: info.ptpn,
    token: info.token,
    ts: Math.floor(Date.now() / 1000),
  });
  return Response.json({
    ok: true,
    member: { id: member.member_id, name: member.member_name },
  });
}
