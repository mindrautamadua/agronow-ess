/**
 * Data layer Insight Hub — tiap section di-fetch terpisah & paginated agar halaman
 * tidak menarik semua konten sekaligus (sub-halaman per section di /insight-hub/[section]).
 *
 * Sumber: Supabase Postgres — `_webinar`, `_movies`, `_pesan_direksi`, `_quotes`.
 */
import { query } from "./db";
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

export interface Paged<T> { items: T[]; total: number }

const yt = (id: string | null) => (id ? `https://img.youtube.com/vi/${id.trim()}/hqdefault.jpg` : null);
const watch = (id: string | null) => (id ? `https://www.youtube.com/watch?v=${id.trim()}` : "#");

// Klausa pencarian ILIKE opsional pada kolom tertentu (kembalikan SQL + params).
function search(q: string | undefined, ...cols: string[]): { sql: string; params: string[] } {
  const term = (q ?? "").trim();
  if (!term) return { sql: "", params: [] };
  const like = `%${term}%`;
  return { sql: ` AND (${cols.map((c) => `${c} ILIKE ?`).join(" OR ")})`, params: cols.map(() => like) };
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
      image: d.gambar ? PD_IMG_BASE + d.gambar : null,
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
