/**
 * Member yang sedang login. ID diambil dari sesi cookie (`/api/auth/login`
 * memvalidasi ke API holding lalu memetakan NIK_SAP → member_id). Jika tidak
 * ada sesi, jatuh ke env `CURRENT_MEMBER_ID` (default 6063 = M. INDRA UTAMA)
 * sebagai fallback dev.
 */
import crypto from "node:crypto";
import { queryOne } from "./db";
import { getSession } from "./session";

export async function currentMemberId(): Promise<number> {
  const session = await getSession();
  if (session) return session.memberId;
  return Number(process.env.CURRENT_MEMBER_ID ?? 6063);
}

export interface MemberRow {
  member_id: number;
  member_name: string | null;
  member_nip: string | null;
  nip_sap: string | null;
  member_email: string | null;
  member_jabatan: string | null;
  member_kel_jabatan: string | null;
  member_unit_kerja: string | null;
  member_image: string | null;
  member_gender: string | null;
  member_phone: string | null;
  member_birth_place: string | null;
  member_birth_date: string | null;
  member_address: string | null;
  member_city: string | null;
  member_province: string | null;
  date_masuk_kerja: string | null;
  member_poin: number | null;
  member_saldo: number | null;
  member_status: string | null;
}

const MEMBER_COLUMNS = `member_id, member_name, member_nip, nip_sap, member_email,
            member_jabatan, member_kel_jabatan, member_unit_kerja, member_image,
            member_gender, member_phone, member_birth_place, member_birth_date,
            member_address, member_city, member_province, date_masuk_kerja,
            member_poin, member_saldo, member_status`;

export async function getMember(id?: number): Promise<MemberRow | null> {
  const memberId = id ?? (await currentMemberId());
  return queryOne<MemberRow>(
    `SELECT ${MEMBER_COLUMNS} FROM _member WHERE member_id = ?`,
    [memberId],
  );
}

/**
 * Cari member berdasarkan NIK SAP yang dikembalikan API holding. NIK tersebut
 * bisa tersimpan di `member_nip` atau `nip_sap`, jadi dicocokkan ke keduanya.
 * Hanya member berstatus `active` yang dianggap valid untuk login.
 */
export async function getMemberByNikSap(niksap: string): Promise<MemberRow | null> {
  return queryOne<MemberRow>(
    `SELECT ${MEMBER_COLUMNS} FROM _member
       WHERE (member_nip = ? OR nip_sap = ?) AND member_status = 'active'
       ORDER BY member_id LIMIT 1`,
    [niksap, niksap],
  );
}

/**
 * Fallback autentikasi langsung ke DB ketika API holding tidak memvalidasi user
 * (tidak ditemukan / API bermasalah). Password `_member.member_password`
 * disimpan sebagai MD5 (warisan AGHRIS). Membandingkan secara waktu-konstan,
 * hanya member `active`. Mengembalikan baris member bila cocok, jika tidak null.
 */
export async function verifyMemberPassword(
  niksap: string,
  password: string,
): Promise<MemberRow | null> {
  const row = await queryOne<MemberRow & { member_password: string | null }>(
    `SELECT ${MEMBER_COLUMNS}, member_password FROM _member
       WHERE (member_nip = ? OR nip_sap = ?) AND member_status = 'active'
       ORDER BY member_id LIMIT 1`,
    [niksap, niksap],
  );
  if (!row || !row.member_password) return null;

  const expected = row.member_password.trim().toLowerCase();
  const actual = crypto.createHash("md5").update(password).digest("hex");
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return null;

  // Jangan ikut-bocorkan hash ke pemanggil.
  const { member_password: _omit, ...member } = row;
  void _omit;
  return member;
}
