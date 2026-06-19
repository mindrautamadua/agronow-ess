/**
 * Chat pribadi 1:1 (DM). Sumber:
 *  - `_chat_friend` (kode_chat, member_id, friend_id) = pasangan percakapan.
 *  - `_chat_msg` (kode_cm, kode_friend→kode_chat, sender, receiver, konten, status).
 *
 * Status pesan: '1' = terkirim/belum dibaca, '2' = dibaca oleh penerima (dipakai
 * untuk badge unread di app ini; nilai legacy semula selalu '1').
 * `kode_chat`/`kode_cm` tak punya sequence → digenerate (gaya uniqid PHP).
 * `konten` disimpan plain-text (tag dibuang) & ditampilkan sebagai teks.
 */
import { query, queryOne } from "./db";

export interface ChatConversation {
  kode: string; friendId: number; friendName: string; friendImg: string | null;
  lastText: string; lastTgl: string | null; lastFromMe: boolean; unread: number;
}
export interface ChatMessage { id: string; fromMe: boolean; text: string; tgl: string | null }
export interface MemberLite { id: number; name: string; img: string | null; jabatan: string | null; entitas: string | null }

const avatar = (img: string | null): string | null => (/^https?:\/\//i.test((img ?? "").trim()) ? (img as string).trim() : null);
const sanitize = (t: string): string => t.replace(/<[^>]*>/g, "").trim().slice(0, 2000);
const gen = (prefix: string): string => `${prefix}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

/** Daftar percakapan member (urut pesan terbaru) + pesan terakhir & jumlah unread. */
export async function getConversations(memberId: number): Promise<ChatConversation[]> {
  const rows = await query<{ kode: string; fid: number; name: string | null; img: string | null; last_text: string | null; last_tgl: string | null; last_sender: number | null; unread: number }>(
    `WITH conv AS (
       SELECT f.kode_chat AS kode,
              CASE WHEN f.member_id = ? THEN f.friend_id ELSE f.member_id END AS fid
         FROM _chat_friend f
        WHERE f.member_id = ? OR f.friend_id = ?
     )
     SELECT c.kode, c.fid, m.member_name AS name, m.member_image AS img,
            lm.konten AS last_text, lm.create_date AS last_tgl, lm.sender AS last_sender,
            (SELECT COUNT(*) FROM _chat_msg x WHERE x.kode_friend = c.kode AND x.receiver = ? AND x.status = '1') AS unread
       FROM conv c
       LEFT JOIN _member m ON m.member_id = c.fid
       LEFT JOIN LATERAL (
         SELECT konten, create_date, sender FROM _chat_msg x
          WHERE x.kode_friend = c.kode ORDER BY x.create_date DESC, x.kode_cm DESC LIMIT 1
       ) lm ON TRUE
      WHERE lm.create_date IS NOT NULL
      ORDER BY lm.create_date DESC`,
    [memberId, memberId, memberId, memberId],
  );
  return rows.map((r) => ({
    kode: r.kode, friendId: r.fid, friendName: (r.name || "").trim() || "Pengguna", friendImg: avatar(r.img),
    lastText: r.last_text || "", lastTgl: r.last_tgl, lastFromMe: r.last_sender === memberId, unread: Number(r.unread) || 0,
  }));
}

/** Verifikasi member adalah peserta percakapan; kembalikan id lawan bicara atau null. */
export async function friendOfConversation(memberId: number, kode: string): Promise<number | null> {
  const r = await queryOne<{ member_id: number; friend_id: number }>(
    `SELECT member_id, friend_id FROM _chat_friend WHERE kode_chat = ?`, [kode],
  );
  if (!r) return null;
  if (r.member_id === memberId) return r.friend_id;
  if (r.friend_id === memberId) return r.member_id;
  return null;
}

/** Pesan satu percakapan (setelah afterId opsional tidak relevan—pakai create_date). */
export async function getDmMessages(memberId: number, kode: string, afterTs?: string): Promise<ChatMessage[] | null> {
  if ((await friendOfConversation(memberId, kode)) === null) return null;
  const cond = afterTs ? "AND create_date > ?" : "";
  const params: unknown[] = afterTs ? [kode, afterTs] : [kode];
  const rows = await query<{ kode_cm: string; sender: number; konten: string | null; tgl: string }>(
    `SELECT kode_cm, sender, konten, create_date AS tgl FROM _chat_msg
      WHERE kode_friend = ? ${cond} ORDER BY create_date ASC, kode_cm ASC`,
    params,
  );
  return rows.map((r) => ({ id: r.kode_cm, fromMe: r.sender === memberId, text: r.konten || "", tgl: r.tgl }));
}

/** Tandai pesan masuk pada percakapan sebagai dibaca. */
export async function markConversationRead(memberId: number, kode: string): Promise<void> {
  await query(`UPDATE _chat_msg SET status = '2' WHERE kode_friend = ? AND receiver = ? AND status = '1'`, [kode, memberId]);
}

/** Cari/buat pasangan percakapan, kembalikan kode_chat. */
export async function findOrCreateFriend(memberId: number, friendId: number): Promise<string> {
  const existing = await queryOne<{ kode_chat: string }>(
    `SELECT kode_chat FROM _chat_friend
      WHERE (member_id = ? AND friend_id = ?) OR (member_id = ? AND friend_id = ?) LIMIT 1`,
    [memberId, friendId, friendId, memberId],
  );
  if (existing) return existing.kode_chat;
  const kode = gen("CH");
  await query(
    `INSERT INTO _chat_friend (kode_chat, member_id, friend_id, create_date, status, fstat)
     VALUES (?, ?, ?, NOW(), '1', 'propose')`,
    [kode, memberId, friendId],
  );
  return kode;
}

export interface SentDm { message: ChatMessage; kode: string; toId: number; toName: string }

/** Kirim DM. Mengembalikan pesan + info penerima (untuk notif/push). null bila gagal. */
export async function sendDm(memberId: number, toId: number, text: string): Promise<SentDm | null> {
  const body = sanitize(text);
  if (!body || !toId || toId === memberId) return null;
  const target = await queryOne<{ member_id: number; member_name: string | null }>(
    `SELECT member_id, member_name FROM _member WHERE member_id = ? AND member_status = 'active'`, [toId],
  );
  if (!target) return null;

  const kode = await findOrCreateFriend(memberId, toId);
  const id = gen("CM");
  const ins = await query<{ tgl: string }>(
    `INSERT INTO _chat_msg (kode_cm, kode_friend, sender, receiver, create_date, status, konten)
     VALUES (?, ?, ?, ?, NOW(), '1', ?) RETURNING create_date AS tgl`,
    [id, kode, memberId, toId, body],
  );
  return {
    message: { id, fromMe: true, text: body, tgl: ins[0].tgl },
    kode, toId, toName: (target.member_name || "").trim() || "Pengguna",
  };
}

/** Nama+foto member (untuk header percakapan). */
export async function getMemberLite(id: number): Promise<MemberLite | null> {
  const r = await queryOne<{ member_id: number; member_name: string | null; member_image: string | null; member_jabatan: string | null; group_name: string | null }>(
    `SELECT member_id, member_name, member_image,
            COALESCE(NULLIF(btrim(member_kel_jabatan), ''), member_jabatan) AS member_jabatan,
            g.group_name
       FROM _member
       LEFT JOIN _group g ON g.group_id = _member.group_id
      WHERE member_id = ?`, [id],
  );
  return r ? { id: r.member_id, name: (r.member_name || "").trim() || "Pengguna", img: avatar(r.member_image), jabatan: r.member_jabatan, entitas: (r.group_name || "").trim() || null } : null;
}

/** Cari member untuk memulai chat baru. */
export async function searchMembers(memberId: number, q: string, limit = 15): Promise<MemberLite[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const rows = await query<{ member_id: number; member_name: string | null; member_image: string | null; member_jabatan: string | null; group_name: string | null }>(
    `SELECT member_id, member_name, member_image,
            COALESCE(NULLIF(btrim(member_kel_jabatan), ''), member_jabatan) AS member_jabatan,
            g.group_name
       FROM _member
       LEFT JOIN _group g ON g.group_id = _member.group_id
      WHERE member_status = 'active' AND member_id <> ? AND TRIM(COALESCE(member_name,'')) <> ''
        AND (member_name ILIKE ? OR member_nip ILIKE ?)
      ORDER BY member_name LIMIT ?`,
    [memberId, like, like, limit],
  );
  return rows.map((r) => ({ id: r.member_id, name: (r.member_name || "").trim() || "Pengguna", img: avatar(r.member_image), jabatan: r.member_jabatan, entitas: (r.group_name || "").trim() || null }));
}
