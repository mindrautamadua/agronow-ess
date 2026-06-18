/**
 * Notifikasi in-app (lonceng) — tabel `_notifikasi_v2` (dipakai bersama sistem
 * Agronow lain). `id` tak punya sequence → dihitung manual (MAX+1). `is_read`
 * bertipe text '0'/'1'. `untuk` = 'frontend'.
 */
import { query, queryOne } from "./db";

export interface NotifItem {
  id: number;
  kategori: string;
  judul: string;
  isi: string;
  ref: string | null;     // id_tabel_lain — id entitas terkait (mis. kode_friend chat)
  read: boolean;
  tgl: string | null;
}

export interface NewNotif {
  memberId: number;
  kategori: string;
  judul: string;
  isi: string;
  ref?: string | null;
}

/** Tambah notifikasi untuk satu member. Mengembalikan id baru. */
export async function addNotification(n: NewNotif): Promise<number> {
  const rows = await query<{ id: number }>(
    `INSERT INTO _notifikasi_v2 (id, id_member, id_tabel_lain, untuk, kategori, judul, isi, untuk_tanggal, tgl_create, is_read)
     VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM _notifikasi_v2), ?, ?, 'frontend', ?, ?, ?, NOW(), NOW(), '0')
     RETURNING id`,
    [n.memberId, n.ref ?? null, n.kategori, n.judul.slice(0, 255), n.isi.slice(0, 1000)],
  );
  return rows[0].id;
}

export async function getNotifications(memberId: number, limit = 20): Promise<NotifItem[]> {
  const rows = await query<{ id: number; kategori: string; judul: string; isi: string; ref: string | null; is_read: string; tgl: string | null }>(
    `SELECT id, kategori, judul, isi, id_tabel_lain AS ref, is_read, tgl_create AS tgl
       FROM _notifikasi_v2
      WHERE id_member = ? AND untuk = 'frontend'
      ORDER BY id DESC LIMIT ?`,
    [memberId, limit],
  );
  return rows.map((r) => ({
    id: r.id, kategori: r.kategori || "", judul: r.judul || "", isi: r.isi || "",
    ref: r.ref, read: r.is_read === "1", tgl: r.tgl,
  }));
}

export async function getUnreadCount(memberId: number): Promise<number> {
  const r = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM _notifikasi_v2 WHERE id_member = ? AND untuk = 'frontend' AND COALESCE(is_read,'0') <> '1'`,
    [memberId],
  );
  return Number(r?.n) || 0;
}

/** Tandai sudah dibaca: satu notif (id) atau semua milik member bila id null. */
export async function markRead(memberId: number, id?: number): Promise<void> {
  if (id != null) {
    await query(`UPDATE _notifikasi_v2 SET is_read = '1' WHERE id = ? AND id_member = ?`, [id, memberId]);
  } else {
    await query(`UPDATE _notifikasi_v2 SET is_read = '1' WHERE id_member = ? AND untuk = 'frontend' AND COALESCE(is_read,'0') <> '1'`, [memberId]);
  }
}
