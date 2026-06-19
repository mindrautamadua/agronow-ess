/**
 * Login Agronow ESS — proxy ke API holding (PT Perkebunan Nusantara).
 *
 * Client TIDAK memanggil API holding langsung (hindari CORS & jaga agar detail
 * endpoint tetap di server). Alur:
 *   1. Validasi NIK + password ke `/access/login` (respons array; `ADA="1"` = valid).
 *   2. Petakan `NIK_SAP` → `member_id` di DB `_member` (sumber data app).
 *   3. Set cookie sesi httpOnly bertanda tangan.
 *
 * Fallback DB: bila API tidak memvalidasi, password dicek ke `_member` (MD5).
 * Karena satu NIK bisa ada di banyak perusahaan, jika password cocok ke >1
 * baris, route balas `needGroup` + daftar perusahaan agar user memilih entitas.
 */
import { getMemberByNikSap, findMembersByPassword, type MemberRow } from "@/lib/member";
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
  let groupId = ""; // dipilih user saat NIK ambigu (login non-API)
  try {
    const body = await req.json();
    nik = String(body?.nik ?? "").trim();
    password = String(body?.password ?? "");
    groupId = String(body?.groupId ?? "").trim();
  } catch {
    return Response.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  if (!nik || !password) {
    return Response.json({ error: "NIK dan password wajib diisi" }, { status: 400 });
  }

  try {
    return await authenticate(nik, password, groupId);
  } catch (e) {
    // Kesalahan tak terduga (mis. koneksi DB gagal) — kembalikan JSON yang jelas
    // alih-alih 500 kosong yang memaksa frontend memakai pesan generik.
    console.error("/api/auth/login", e);
    const detail = e instanceof Error ? e.message : String(e);
    return Response.json(
      {
        error: "Tidak dapat memproses login karena kendala server (kemungkinan koneksi database).",
        detail: process.env.NODE_ENV === "production" ? undefined : detail,
      },
      { status: 500 },
    );
  }
}

/** Inti autentikasi: validasi holding → fallback DB → terbitkan sesi. */
async function authenticate(nik: string, password: string, groupId: string): Promise<Response> {
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
  const matches = await findMembersByPassword(nik, password);

  if (matches.length === 0) {
    return Response.json({ error: "NIK atau password salah" }, { status: 401 });
  }

  // Persempit dengan entitas pilihan user (jika ada).
  const candidates = groupId
    ? matches.filter((m) => m.groupId === groupId)
    : matches;

  if (candidates.length === 0) {
    // groupId dikirim tapi tak cocok — minta pilih ulang.
    return needGroupResponse(matches);
  }

  if (candidates.length > 1) {
    // NIK + password sama di >1 perusahaan → user harus memilih entitas.
    return needGroupResponse(candidates);
  }

  const { member } = candidates[0];
  return issueSession(member, {
    niksap: member.nip_sap || member.member_nip || nik,
    nama: member.member_name ?? "",
    role: "",
    ptpn: "",
    token: "",
  });
}

/** Balasan saat NIK ambigu — daftar perusahaan untuk dipilih di form login. */
function needGroupResponse(matches: { groupId: string | null; groupName: string | null }[]): Response {
  // Dedup per groupId, urut nama perusahaan.
  const seen = new Map<string, { groupId: string; groupName: string }>();
  for (const m of matches) {
    const id = m.groupId ?? "";
    if (!seen.has(id)) seen.set(id, { groupId: id, groupName: m.groupName ?? "(Tanpa nama)" });
  }
  const options = [...seen.values()].sort((a, b) => a.groupName.localeCompare(b.groupName));
  return Response.json({ needGroup: true, options }, { status: 409 });
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
