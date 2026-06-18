/**
 * Data layer Insight Hub — tiap section di-fetch terpisah & paginated agar halaman
 * tidak menarik semua konten sekaligus (sub-halaman per section di /insight-hub/[section]).
 *
 * Sumber: Supabase Postgres — `_webinar`, `_movies`, `_pesan_direksi`, `_quotes`.
 */
import { query, queryOne } from "./db";
import { clean, decodeEntities } from "./text";

export interface VideoItem {
  id: number; judul: string; thumb: string | null; link: string; videoId: string | null;
  tipe?: string; tgl?: string | null;
}
export interface DireksiItem {
  id: number; nama: string; jabatan: string;
  pesan: string | null; // HTML kaya (br/strong/em) sudah ter-decode; null bila "coming soon"
  image: string | null; initials: string;
}
export interface BeritaItem {
  id: number; title: string; image: string | null;
  date: string | null; source: string | null; author: string | null;
  body: string | null; // HTML artikel sudah ter-decode & dibersihkan
}
export interface ArticleItem extends BeritaItem { views: number }
export interface LibraryCat { id: number; name: string; alias: string; count: number }
export interface LibraryItem {
  id: number; title: string; alias: string; image: string | null;
  date: string | null; author: string | null; category: string | null;
  body: string | null; // HTML (boleh berisi embed YouTube/audio)
}

// Poster pesan direksi di-host terpisah (sama dengan halaman produksi /whatsnew/ceo_note).
const PD_IMG_BASE = "https://insight.agronow.co.id/media/uploads/pd/";
// Host `insight.agronow.co.id` TIDAK terjangkau dari internet publik (Vercel),
// jadi foto direksi di-host lokal di `public/img/direksi/` dengan nama file asli
// (basename dari kolom `gambar`). Jika file lokal tak ada, UI jatuh ke kartu
// inisial (lihat DireksiCard.onError).
function direksiLocalImg(gambar: string | null): string | null {
  if (!gambar) return null;
  const file = gambar.split("/").pop();
  return file ? "/img/direksi/" + file : null;
}
// Gambar konten (_content/_media) di /media/image (berita & digital library).
const MEDIA_IMG_BASE = "https://agronow.co.id/media/image/";
const NEWS_SECTION = 12;
const ARTICLE_SECTION = 13;
const LIBRARY_SECTION = 35;

// HTML legacy ter-encode (kadang ganda). decodeEntities mengupasnya jadi HTML asli;
// buang tag berbahaya + atribut style/warna (banyak teks hitam yang tak terbaca di tema gelap).
// allowEmbed=true menyisakan <iframe> (embed YouTube/Spotify di Digital Library) — sumber CMS internal tepercaya.
function richHtml(raw: string | null, allowEmbed = false): string {
  if (!raw) return "";
  const blocked = allowEmbed ? "script|style|object|link|meta" : "script|style|iframe|object|embed|link|meta";
  return decodeEntities(raw)
    .replace(new RegExp(`<\\/?(${blocked})[^>]*>`, "gi"), "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/\s(color|bgcolor|face)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/<\/?font[^>]*>/gi, "")
    .trim();
}

function richPesan(raw: string | null): string | null {
  const plain = clean(raw);
  if (!plain || plain.toLowerCase() === "- coming soon -") return null;
  return richHtml(raw) || null;
}
export interface QuoteItem { text: string; author: string }

export interface DiskusiItem {
  id: number; judul: string;
  preview: string;       // ringkasan teks polos forum_desc
  body: string | null;   // HTML kaya forum_desc
  penulis: string; penulisImg: string | null;
  tgl: string | null; balasan: number;
  likes: number; likedByMe: boolean;
}
export interface DiskusiReply {
  id: number; memberId: number;
  penulis: string; penulisImg: string | null;
  tgl: string | null; body: string | null; // HTML kaya fc_desc
  likes: number; likedByMe: boolean;
}

export interface Paged<T> { items: T[]; total: number }

// Avatar member: hanya pakai URL absolut (mis. apis.holding-perkebunan.com/foto/…
// yang publik). Path relatif/legacy diabaikan → UI jatuh ke inisial.
function avatarUrl(img: string | null): string | null {
  const t = (img ?? "").trim();
  return /^https?:\/\//i.test(t) ? t : null;
}
// Ringkasan teks polos dari HTML (untuk preview kartu diskusi).
function excerpt(raw: string | null, n = 160): string {
  const text = decodeEntities(raw ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
  return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
}

const yt = (id: string | null) => (id ? `https://img.youtube.com/vi/${id.trim()}/hqdefault.jpg` : null);
const watch = (id: string | null) => (id ? `https://www.youtube.com/watch?v=${id.trim()}` : "#");

// Klausa pencarian ILIKE opsional pada kolom tertentu (kembalikan SQL + params).
function search(q: string | undefined, ...cols: string[]): { sql: string; params: string[] } {
  const term = (q ?? "").trim();
  if (!term) return { sql: "", params: [] };
  const like = `%${term}%`;
  return { sql: ` AND (${cols.map((c) => `${c} ILIKE ?`).join(" OR ")})`, params: cols.map(() => like) };
}

/**
 * Daftar thread diskusi (`_forum`, status open) + jumlah balasan, penulis, & like.
 * `viewerId` (member yang login) dipakai menghitung `likedByMe`; 0 bila tamu.
 */
export async function getDiskusi(limit = 12, offset = 0, q?: string, viewerId = 0): Promise<Paged<DiskusiItem>> {
  const s = search(q, "f.forum_name", "f.forum_desc");
  const [rows, count] = await Promise.all([
    query<{ id: number; judul: string; body: string | null; tgl: string | null; penulis: string | null; img: string | null; balasan: number; likes: number; liked: boolean }>(
      `SELECT f.forum_id AS id, f.forum_name AS judul, f.forum_desc AS body,
              f.forum_create_date AS tgl, m.member_name AS penulis, m.member_image AS img,
              (SELECT COUNT(*) FROM _forum_chat c WHERE c.forum_id = f.forum_id AND c.fc_status = 'active') AS balasan,
              (SELECT COUNT(*) FROM _forum_like l WHERE l.forum_id = f.forum_id) AS likes,
              EXISTS (SELECT 1 FROM _forum_like l WHERE l.forum_id = f.forum_id AND l.member_id = ?) AS liked
         FROM _forum f LEFT JOIN _member m ON m.member_id = f.member_id
        WHERE f.forum_status = 'open'${s.sql}
        ORDER BY f.forum_create_date DESC NULLS LAST, f.forum_id DESC LIMIT ? OFFSET ?`,
      [viewerId, ...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _forum f WHERE f.forum_status = 'open'${s.sql}`, s.params),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id, judul: clean(r.judul) || "(Tanpa judul)",
      preview: excerpt(r.body), body: richHtml(r.body) || null,
      penulis: clean(r.penulis) || "Anonim", penulisImg: avatarUrl(r.img),
      tgl: r.tgl, balasan: Number(r.balasan) || 0,
      likes: Number(r.likes) || 0, likedByMe: !!r.liked,
    })),
    total: count[0]?.n ?? 0,
  };
}

/**
 * Toggle like pada thread diskusi untuk satu member (`_forum_like`).
 * Mengembalikan status like terbaru + total like, atau null bila thread tak ada.
 */
export async function toggleThreadLike(forumId: number, memberId: number): Promise<{ liked: boolean; likes: number } | null> {
  const exists = await queryOne<{ forum_id: number }>(`SELECT forum_id FROM _forum WHERE forum_id = ? AND forum_status = 'open'`, [forumId]);
  if (!exists) return null;

  const del = await query<{ forum_id: number }>(`DELETE FROM _forum_like WHERE forum_id = ? AND member_id = ? RETURNING forum_id`, [forumId, memberId]);
  const liked = del.length === 0;
  if (liked) {
    await query(`INSERT INTO _forum_like (forum_id, member_id) VALUES (?, ?) ON CONFLICT (forum_id, member_id) DO NOTHING`, [forumId, memberId]);
  }
  const c = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM _forum_like WHERE forum_id = ?`, [forumId]);
  return { liked, likes: Number(c?.n) || 0 };
}

/**
 * Balasan satu thread diskusi (`_forum_chat`, status active), urut terlama→terbaru.
 * `viewerId` (member yang sedang login) dipakai menghitung `likedByMe`; 0 bila tamu.
 */
export async function getDiskusiReplies(forumId: number, viewerId = 0): Promise<DiskusiReply[]> {
  const rows = await query<{ id: number; member_id: number; body: string | null; tgl: string | null; penulis: string | null; img: string | null; likes: number; liked: boolean }>(
    `SELECT c.fc_id AS id, c.member_id, c.fc_desc AS body, c.fc_create_date AS tgl,
            m.member_name AS penulis, m.member_image AS img,
            (SELECT COUNT(*) FROM _forum_chat_like l WHERE l.fc_id = c.fc_id) AS likes,
            EXISTS (SELECT 1 FROM _forum_chat_like l WHERE l.fc_id = c.fc_id AND l.member_id = ?) AS liked
       FROM _forum_chat c LEFT JOIN _member m ON m.member_id = c.member_id
      WHERE c.forum_id = ? AND c.fc_status = 'active'
      ORDER BY c.fc_create_date ASC, c.fc_id ASC`,
    [viewerId, forumId],
  );
  return rows.map((r) => ({
    id: r.id, memberId: r.member_id,
    penulis: clean(r.penulis) || "Anonim", penulisImg: avatarUrl(r.img),
    tgl: r.tgl, body: richHtml(r.body) || null,
    likes: Number(r.likes) || 0, likedByMe: !!r.liked,
  }));
}

/**
 * Tambah balasan ke thread diskusi. Input di-sanitasi (semua tag dibuang →
 * disimpan plain-text, newline jadi <br>) agar aman dari stored-XSS karena
 * jalur baca (richHtml) men-decode entity. `fc_id` dihitung manual (tabel tak
 * punya sequence). `user_id` legacy = 0. Mengembalikan balasan baru, atau null
 * bila thread tak ada / tertutup / teks kosong.
 */
export async function addDiskusiReply(forumId: number, memberId: number, text: string): Promise<DiskusiReply | null> {
  const stored = text.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 4000).replace(/\r\n|\r|\n/g, "<br>");
  if (!stored) return null;

  const forum = await queryOne<{ forum_id: number }>(`SELECT forum_id FROM _forum WHERE forum_id = ? AND forum_status = 'open'`, [forumId]);
  if (!forum) return null;

  const ins = await query<{ fc_id: number; tgl: string }>(
    `INSERT INTO _forum_chat (fc_id, forum_id, user_id, member_id, fc_desc, fc_image, fc_status, fc_create_date)
     VALUES ((SELECT COALESCE(MAX(fc_id), 0) + 1 FROM _forum_chat), ?, 0, ?, ?, '', 'active', NOW())
     RETURNING fc_id, fc_create_date AS tgl`,
    [forumId, memberId, stored],
  );
  const m = await queryOne<{ nama: string | null; img: string | null }>(`SELECT member_name AS nama, member_image AS img FROM _member WHERE member_id = ?`, [memberId]);
  return {
    id: ins[0].fc_id, memberId,
    penulis: clean(m?.nama ?? null) || "Anonim",
    penulisImg: avatarUrl(m?.img ?? null),
    tgl: ins[0].tgl,
    body: richHtml(stored) || null,
    likes: 0, likedByMe: false,
  };
}

/**
 * Ubah isi balasan diskusi. Hanya pemilik (`member_id` cocok) & komentar aktif
 * yang boleh disunting. Input disanitasi sama seperti `addDiskusiReply`.
 * Mengembalikan body HTML baru, atau null bila bukan pemilik / tak ada / kosong.
 */
export async function editDiskusiReply(fcId: number, memberId: number, text: string): Promise<{ body: string | null } | null> {
  const stored = text.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 4000).replace(/\r\n|\r|\n/g, "<br>");
  if (!stored) return null;

  const upd = await query<{ fc_id: number }>(
    `UPDATE _forum_chat SET fc_desc = ? WHERE fc_id = ? AND member_id = ? AND fc_status = 'active' RETURNING fc_id`,
    [stored, fcId, memberId],
  );
  if (!upd.length) return null;
  return { body: richHtml(stored) || null };
}

/**
 * Toggle like pada balasan diskusi untuk satu member (`_forum_chat_like`).
 * Mengembalikan status like terbaru + total like, atau null bila komentar tak ada.
 */
export async function toggleDiskusiLike(fcId: number, memberId: number): Promise<{ liked: boolean; likes: number } | null> {
  const exists = await queryOne<{ fc_id: number }>(`SELECT fc_id FROM _forum_chat WHERE fc_id = ? AND fc_status = 'active'`, [fcId]);
  if (!exists) return null;

  const del = await query<{ fc_id: number }>(`DELETE FROM _forum_chat_like WHERE fc_id = ? AND member_id = ? RETURNING fc_id`, [fcId, memberId]);
  const liked = del.length === 0;
  if (liked) {
    await query(`INSERT INTO _forum_chat_like (fc_id, member_id) VALUES (?, ?) ON CONFLICT (fc_id, member_id) DO NOTHING`, [fcId, memberId]);
  }
  const c = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM _forum_chat_like WHERE fc_id = ?`, [fcId]);
  return { liked, likes: Number(c?.n) || 0 };
}

/* ── Chatroom (`_forum_group` = room, `_forum_group_chat` = pesan) ────────── */

export interface ChatRoom {
  id: number; nama: string; desc: string | null;
  jumlah: number; // jumlah pesan (non-kosong)
  terakhir: { text: string; penulis: string; tgl: string | null } | null;
}
export interface ChatMessage {
  id: number; memberId: number;
  penulis: string; penulisImg: string | null;
  tgl: string | null; body: string | null; // HTML kaya fc_desc
}

// Pesan kosong (fc_desc blank) banyak di data legacy — disaring agar bubble tidak hampa.
const CHAT_NONBLANK = `COALESCE(TRIM(c.fc_desc), '') <> ''`;

/** Daftar room chat (`_forum_group`, status open) + pesan terakhir & jumlah pesan. */
export async function getChatrooms(limit = 20, offset = 0, q?: string): Promise<Paged<ChatRoom>> {
  const s = search(q, "g.forum_name");
  const [rows, count] = await Promise.all([
    query<{ id: number; nama: string | null; desc: string | null; jumlah: number; last_text: string | null; last_tgl: string | null; last_penulis: string | null }>(
      `SELECT g.forum_id AS id, g.forum_name AS nama, g.forum_desc AS desc,
              (SELECT COUNT(*) FROM _forum_group_chat c WHERE c.forum_id = g.forum_id AND c.fc_status = 'active' AND ${CHAT_NONBLANK}) AS jumlah,
              lc.fc_desc AS last_text, lc.fc_create_date AS last_tgl, lm.member_name AS last_penulis
         FROM _forum_group g
         LEFT JOIN LATERAL (
           SELECT c.fc_desc, c.fc_create_date, c.member_id FROM _forum_group_chat c
            WHERE c.forum_id = g.forum_id AND c.fc_status = 'active' AND ${CHAT_NONBLANK}
            ORDER BY c.fc_create_date DESC NULLS LAST, c.fc_id DESC LIMIT 1
         ) lc ON TRUE
         LEFT JOIN _member lm ON lm.member_id = lc.member_id
        WHERE g.forum_status = 'open'${s.sql}
        ORDER BY lc.fc_create_date DESC NULLS LAST, g.forum_id DESC LIMIT ? OFFSET ?`,
      [...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _forum_group g WHERE g.forum_status = 'open'${s.sql}`, s.params),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id, nama: clean(r.nama) || "(Tanpa nama)", desc: excerpt(r.desc, 80) || null,
      jumlah: Number(r.jumlah) || 0,
      terakhir: r.last_text != null ? { text: excerpt(r.last_text, 60), penulis: clean(r.last_penulis) || "Anonim", tgl: r.last_tgl } : null,
    })),
    total: count[0]?.n ?? 0,
  };
}

/** Pesan satu room (`_forum_group_chat`, status active & non-kosong), urut terlama→terbaru. */
export async function getChatMessages(forumId: number, afterId = 0): Promise<ChatMessage[]> {
  const rows = await query<{ id: number; member_id: number; body: string | null; tgl: string | null; penulis: string | null; img: string | null }>(
    `SELECT c.fc_id AS id, c.member_id, c.fc_desc AS body, c.fc_create_date AS tgl,
            m.member_name AS penulis, m.member_image AS img
       FROM _forum_group_chat c LEFT JOIN _member m ON m.member_id = c.member_id
      WHERE c.forum_id = ? AND c.fc_status = 'active' AND ${CHAT_NONBLANK} AND c.fc_id > ?
      ORDER BY c.fc_create_date ASC, c.fc_id ASC`,
    [forumId, afterId],
  );
  return rows.map((r) => ({
    id: r.id, memberId: r.member_id,
    penulis: clean(r.penulis) || "Anonim", penulisImg: avatarUrl(r.img),
    tgl: r.tgl, body: richHtml(r.body) || null,
  }));
}

/**
 * Kirim pesan ke room chat. Input disanitasi (tag dibuang → plain-text, newline
 * jadi <br>) seperti `addDiskusiReply`. `fc_id` dihitung manual; `group_id` diambil
 * dari room. Mengembalikan pesan baru, atau null bila room tak ada/tertutup/kosong.
 */
export async function addChatMessage(forumId: number, memberId: number, text: string): Promise<ChatMessage | null> {
  const stored = text.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().slice(0, 4000).replace(/\r\n|\r|\n/g, "<br>");
  if (!stored) return null;

  const room = await queryOne<{ group_id: number | null }>(`SELECT group_id FROM _forum_group WHERE forum_id = ? AND forum_status = 'open'`, [forumId]);
  if (!room) return null;

  const ins = await query<{ fc_id: number; tgl: string }>(
    `INSERT INTO _forum_group_chat (fc_id, forum_id, user_id, member_id, group_id, fc_desc, fc_image, fc_status, fc_create_date)
     VALUES ((SELECT COALESCE(MAX(fc_id), 0) + 1 FROM _forum_group_chat), ?, 0, ?, ?, ?, '', 'active', NOW())
     RETURNING fc_id, fc_create_date AS tgl`,
    [forumId, memberId, room.group_id ?? 0, stored],
  );
  const m = await queryOne<{ nama: string | null; img: string | null }>(`SELECT member_name AS nama, member_image AS img FROM _member WHERE member_id = ?`, [memberId]);
  return {
    id: ins[0].fc_id, memberId,
    penulis: clean(m?.nama ?? null) || "Anonim",
    penulisImg: avatarUrl(m?.img ?? null),
    tgl: ins[0].tgl,
    body: richHtml(stored) || null,
  };
}

export async function getWebinars(limit = 12, offset = 0, q?: string): Promise<Paged<VideoItem>> {
  const s = search(q, "judul");
  const [rows, count] = await Promise.all([
    query<{ id: number; judul: string; url: string | null; tgl: string | null }>(
      `SELECT id, judul, url, tgl FROM _webinar WHERE status = 'publish'${s.sql}
        ORDER BY tgl DESC NULLS LAST, id DESC LIMIT ? OFFSET ?`,
      [...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _webinar WHERE status = 'publish'${s.sql}`, s.params),
  ]);
  return {
    items: rows.map((w) => ({ id: w.id, judul: clean(w.judul), thumb: yt(w.url), link: watch(w.url), videoId: w.url?.trim() ?? null, tgl: w.tgl })),
    total: count[0]?.n ?? 0,
  };
}

/** `kind`: "vlog" = tipe vlog; "short" = selain vlog; "all" = semua. */
export async function getMovies(kind: "short" | "vlog" | "all", limit = 12, offset = 0, q?: string): Promise<Paged<VideoItem>> {
  const cond = kind === "vlog" ? `tipe = 'vlog'` : kind === "short" ? `tipe IS DISTINCT FROM 'vlog'` : `TRUE`;
  const s = search(q, "judul");
  const where = `status = 'publish' AND ${cond}${s.sql}`;
  const [rows, count] = await Promise.all([
    query<{ id: number; judul: string; url: string | null; tipe: string | null }>(
      `SELECT id, judul, url, tipe FROM _movies WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _movies WHERE ${where}`, s.params),
  ]);
  return {
    items: rows.map((m) => ({
      id: m.id, judul: clean(m.judul), thumb: yt(m.url), link: watch(m.url), videoId: m.url?.trim() ?? null,
      tipe: m.tipe === "vlog" ? "Vlog" : "Short Movie",
    })),
    total: count[0]?.n ?? 0,
  };
}

export async function getDireksi(limit = 12, offset = 0, q?: string): Promise<Paged<DireksiItem>> {
  const s = search(q, "nama", "jabatan");
  const [rows, count] = await Promise.all([
    query<{ id: number; nama: string; jabatan: string | null; pesan: string | null; gambar: string | null }>(
      `SELECT id, nama, jabatan, pesan, gambar FROM _pesan_direksi WHERE status = 'publish'${s.sql}
        ORDER BY no_urut ASC LIMIT ? OFFSET ?`,
      [...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _pesan_direksi WHERE status = 'publish'${s.sql}`, s.params),
  ]);
  return {
    items: rows.map((d) => ({
      id: d.id, nama: clean(d.nama), jabatan: clean(d.jabatan),
      pesan: richPesan(d.pesan),
      image: direksiLocalImg(d.gambar),
      initials: clean(d.nama).split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase(),
    })),
    total: count[0]?.n ?? 0,
  };
}

export async function getBerita(limit = 12, offset = 0, q?: string): Promise<Paged<BeritaItem>> {
  const s = search(q, "c.content_name", "c.content_author");
  const sc = search(q, "content_name", "content_author");
  const [rows, count] = await Promise.all([
    query<{
      content_id: number; content_name: string; content_desc: string | null;
      content_source: string | null; content_author: string | null;
      content_publish_date: string | null; media_value: string | null;
    }>(
      `SELECT c.content_id, c.content_name, c.content_desc, c.content_source,
              c.content_author, c.content_publish_date, m.media_value
         FROM _content c
         LEFT JOIN LATERAL (
           SELECT media_value FROM _media
            WHERE data_id = c.content_id AND section_id = ? AND media_type = 'image' AND media_status = '1'
            ORDER BY media_primary DESC, media_id ASC LIMIT 1
         ) m ON TRUE
        WHERE c.section_id = ? AND c.content_status = 'publish'${s.sql}
        ORDER BY c.content_publish_date DESC NULLS LAST, c.content_id DESC
        LIMIT ? OFFSET ?`,
      [NEWS_SECTION, NEWS_SECTION, ...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _content WHERE section_id = ? AND content_status = 'publish'${sc.sql}`, [NEWS_SECTION, ...sc.params]),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.content_id,
      title: clean(r.content_name),
      image: r.media_value ? MEDIA_IMG_BASE + r.media_value : null,
      date: r.content_publish_date,
      source: r.content_source || null,
      author: clean(r.content_author) || null,
      body: richHtml(r.content_desc) || null,
    })),
    total: count[0]?.n ?? 0,
  };
}

export async function getArticle(limit = 12, offset = 0, q?: string): Promise<Paged<ArticleItem>> {
  const s = search(q, "c.content_name", "c.content_author");
  const sc = search(q, "content_name", "content_author");
  const [rows, count] = await Promise.all([
    query<{
      content_id: number; content_name: string; content_desc: string | null;
      content_source: string | null; content_author: string | null;
      content_publish_date: string | null; content_hits: number | null; media_value: string | null;
    }>(
      `SELECT c.content_id, c.content_name, c.content_desc, c.content_source,
              c.content_author, c.content_publish_date, c.content_hits, m.media_value
         FROM _content c
         LEFT JOIN LATERAL (
           SELECT media_value FROM _media
            WHERE data_id = c.content_id AND section_id = ? AND media_type = 'image' AND media_status = '1'
            ORDER BY media_primary DESC, media_id ASC LIMIT 1
         ) m ON TRUE
        WHERE c.section_id = ? AND c.content_status = 'publish'${s.sql}
        ORDER BY c.content_publish_date DESC NULLS LAST, c.content_id DESC
        LIMIT ? OFFSET ?`,
      [ARTICLE_SECTION, ARTICLE_SECTION, ...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _content WHERE section_id = ? AND content_status = 'publish'${sc.sql}`, [ARTICLE_SECTION, ...sc.params]),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.content_id,
      title: clean(r.content_name),
      image: r.media_value ? MEDIA_IMG_BASE + r.media_value : null,
      date: r.content_publish_date,
      source: r.content_source || null,
      author: clean(r.content_author) || null,
      body: richHtml(r.content_desc) || null,
      views: Number(r.content_hits ?? 0),
    })),
    total: count[0]?.n ?? 0,
  };
}

// cat_id pada _content adalah teks; cast aman hanya bila numeric.
const CAT_JOIN = `cat.cat_id = CASE WHEN ct.cat_id ~ '^[0-9]+$' THEN ct.cat_id::int ELSE NULL END`;

/** Kategori (pill) Digital Library — hanya yang dipakai konten publish. */
export async function getLibraryCategories(): Promise<LibraryCat[]> {
  const rows = await query<{ cat_id: number; cat_name: string; cat_alias: string; n: number }>(
    `SELECT cat.cat_id, cat.cat_name, cat.cat_alias, COUNT(*) AS n
       FROM _content ct JOIN _category cat ON ${CAT_JOIN}
      WHERE ct.section_id = ? AND ct.content_status = 'publish' AND cat.cat_status = '1'
      GROUP BY cat.cat_id, cat.cat_name, cat.cat_alias, cat.cat_order
      ORDER BY cat.cat_order, cat.cat_name`,
    [LIBRARY_SECTION],
  );
  return rows.map((r) => ({ id: r.cat_id, name: clean(r.cat_name), alias: r.cat_alias, count: Number(r.n) }));
}

/** Konten Digital Library; `category` = alias kategori atau "all". */
export async function getLibrary(category = "all", limit = 12, offset = 0, q?: string): Promise<Paged<LibraryItem>> {
  const s = search(q, "ct.content_name");
  const filter = `ct.section_id = ? AND ct.content_status = 'publish' AND (? = 'all' OR cat.cat_alias = ?)${s.sql}`;
  const [rows, count] = await Promise.all([
    query<{
      content_id: number; content_name: string; content_alias: string; content_author: string | null;
      content_publish_date: string | null; content_desc: string | null; cat_name: string | null; media_value: string | null;
    }>(
      `SELECT ct.content_id, ct.content_name, ct.content_alias, ct.content_author,
              ct.content_publish_date, ct.content_desc, cat.cat_name, m.media_value
         FROM _content ct
         LEFT JOIN _category cat ON ${CAT_JOIN}
         LEFT JOIN LATERAL (
           SELECT media_value FROM _media
            WHERE data_id = ct.content_id AND section_id = ? AND media_type = 'image' AND media_status = '1'
            ORDER BY media_primary DESC, media_id ASC LIMIT 1
         ) m ON TRUE
        WHERE ${filter}
        ORDER BY ct.content_publish_date DESC NULLS LAST, ct.content_id DESC
        LIMIT ? OFFSET ?`,
      [LIBRARY_SECTION, LIBRARY_SECTION, category, category, ...s.params, limit, offset],
    ),
    query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM _content ct LEFT JOIN _category cat ON ${CAT_JOIN} WHERE ${filter}`,
      [LIBRARY_SECTION, category, category, ...s.params],
    ),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.content_id,
      title: clean(r.content_name),
      alias: r.content_alias,
      image: r.media_value ? MEDIA_IMG_BASE + r.media_value : null,
      date: r.content_publish_date,
      author: clean(r.content_author) || null,
      category: clean(r.cat_name) || null,
      body: richHtml(r.content_desc, true) || null,
    })),
    total: count[0]?.n ?? 0,
  };
}

export async function getQuotes(limit = 12, offset = 0, q?: string): Promise<Paged<QuoteItem>> {
  const s = search(q, "quotes_text", "quotes_author");
  const [rows, count] = await Promise.all([
    query<{ quotes_text: string; quotes_author: string | null }>(
      `SELECT quotes_text, quotes_author FROM _quotes WHERE TRUE${s.sql} ORDER BY quotes_id DESC LIMIT ? OFFSET ?`,
      [...s.params, limit, offset],
    ),
    query<{ n: number }>(`SELECT COUNT(*) AS n FROM _quotes WHERE TRUE${s.sql}`, s.params),
  ]);
  return {
    items: rows.map((q) => ({ text: clean(q.quotes_text), author: clean(q.quotes_author) || "NN" })),
    total: count[0]?.n ?? 0,
  };
}
