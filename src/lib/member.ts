/**
 * Member yang sedang login. Karena validasi login masih di-bypass, ID diambil
 * dari env `CURRENT_MEMBER_ID` (default 6063 = M. INDRA UTAMA, NIP 3023255).
 */
import { queryOne } from "./db";

export function currentMemberId(): number {
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

export async function getMember(id = currentMemberId()): Promise<MemberRow | null> {
  return queryOne<MemberRow>(
    `SELECT member_id, member_name, member_nip, nip_sap, member_email,
            member_jabatan, member_kel_jabatan, member_unit_kerja, member_image,
            member_gender, member_phone, member_birth_place, member_birth_date,
            member_address, member_city, member_province, date_masuk_kerja,
            member_poin, member_saldo, member_status
       FROM _member WHERE member_id = ?`,
    [id],
  );
}
