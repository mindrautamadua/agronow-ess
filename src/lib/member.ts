/**
 * Member yang sedang login. ID diambil dari sesi cookie (`/api/auth/login`
 * memvalidasi ke API holding lalu memetakan NIK_SAP → member_id). Jika tidak
 * ada sesi, jatuh ke env `CURRENT_MEMBER_ID` (default 6063 = M. INDRA UTAMA)
 * sebagai fallback dev.
 */
import crypto from "node:crypto";
import { query, queryOne } from "./db";
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

/** Hasil match autentikasi DB beserta info perusahaan untuk disambiguasi. */
export interface MemberAuthMatch {
  member: MemberRow;
  groupId: string | null;
  groupName: string | null;
}

function md5Matches(stored: string | null, password: string): boolean {
  if (!stored) return false;
  const expected = stored.trim().toLowerCase();
  const actual = crypto.createHash("md5").update(password).digest("hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

/**
 * Fallback autentikasi langsung ke DB ketika API holding tidak memvalidasi user
 * (tidak ditemukan / API bermasalah). Password `_member.member_password`
 * disimpan sebagai MD5 (warisan AGHRIS), dibandingkan waktu-konstan, hanya
 * member `active`.
 *
 * NIK bisa muncul di banyak perusahaan (160 NIK lintas-`group_id`). Karena itu
 * fungsi ini mengembalikan SEMUA baris yang password-nya cocok — pemanggil yang
 * menentukan: 0 = gagal, 1 = login, >1 = minta user pilih entitas/perusahaan.
 */
export async function findMembersByPassword(
  niksap: string,
  password: string,
): Promise<MemberAuthMatch[]> {
  type Row = MemberRow & {
    member_password: string | null;
    group_id: string | null;
    group_name: string | null;
  };
  const rows = await query<Row>(
    `SELECT ${MEMBER_COLUMNS}, m.member_password,
            m.group_id::text AS group_id, g.group_name
       FROM _member m
       LEFT JOIN _group g ON g.group_id = m.group_id
       WHERE (m.member_nip = ? OR m.nip_sap = ?) AND m.member_status = 'active'
       ORDER BY m.member_id`,
    [niksap, niksap],
  );

  return rows
    .filter((r) => md5Matches(r.member_password, password))
    .map(({ member_password: _omit, group_id, group_name, ...member }) => {
      void _omit;
      return { member: member as MemberRow, groupId: group_id, groupName: group_name };
    });
}
