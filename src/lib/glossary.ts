/**
 * Sumber tunggal deskripsi metode & program pembelajaran Agronow ESS.
 * Dipakai ulang di mana pun istilah ini muncul (kartu Home, Insight Hub,
 * halaman /learning, panduan, dsb.) — ubah teks di sini saja.
 *
 * Kunci entri sengaja memakai kode yang sudah dipakai di UI agar gampang
 * di-lookup:
 *   - bucket 70-20-10  → `formal` | `social` | `experiential`
 *   - metode belajar   → kode `mb_*` (lihat METHOD_LABEL di /learning)
 *   - section Insight  → slug `/insight-hub/<slug>`
 *   - program lain      → slug bebas (`wishlist`, `idp`, `agrowallet`)
 */
export interface GlossaryEntry {
  /** Nama tampilan istilah. */
  term: string;
  /** Deskripsi satu kalimat. */
  desc: string;
  /** Fitur belum dirilis. */
  comingSoon?: boolean;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Bucket 70-20-10 ──────────────────────────────────────────────
  formal: {
    term: "Pembelajaran Formal",
    desc: "Proses pembelajaran melalui program resmi dengan kurikulum, materi, instruktur, dan evaluasi untuk memastikan pencapaian kompetensi tertentu.",
  },
  social: {
    term: "Pembelajaran Sosial",
    desc: "Proses pembelajaran melalui interaksi dan berbagi pengetahuan dengan coach, mentor, atau objek benchmark yang tercatat laporan kegiatan.",
  },
  experiential: {
    term: "Belajar dari Pengalaman",
    desc: "Proses pembelajaran yang diperoleh dari pengalaman praktik dan penyelesaian tantangan di lapangan melalui keterlibatan dalam tim untuk mencapai outcome tertentu.",
  },

  // ── Metode Formal ────────────────────────────────────────────────
  mb_ict: {
    term: "Belajar di Kelas",
    desc: "Pembelajaran tatap muka yang dipandu langsung oleh fasilitator atau instruktur.",
  },
  mb_sl: {
    term: "Belajar Mandiri",
    desc: "Pembelajaran atas inisiatif sendiri sesuai kebutuhan masing-masing individu.",
  },
  mb_w: {
    term: "Workshop",
    desc: "Sesi interaktif yang menekankan praktik dan simulasi untuk menguasai keterampilan tertentu.",
  },

  // ── Metode Sosial ────────────────────────────────────────────────
  mb_c: {
    term: "Coaching",
    desc: "Pendampingan oleh coach melalui arahan dan umpan balik untuk meningkatkan kompetensi softskill individu.",
  },
  mb_m: {
    term: "Mentoring",
    desc: "Pendampingan oleh mentor berpengalaman untuk mengembangkan kompetensi hardskill individu.",
  },
  mb_b: {
    term: "Benchmark",
    desc: "Pembelajaran dari praktik terbaik atau keberhasilan unit atau organisasi lain.",
  },

  // ── Metode Experiential ──────────────────────────────────────────
  mb_lo: {
    term: "Action Based Learning",
    desc: "Pembelajaran melalui penyelesaian masalah nyata untuk menghasilkan tindakan perbaikan berkelanjutan.",
  },
  mb_pa: {
    term: "Project Assignment",
    desc: "Pembelajaran melalui penugasan proyek untuk menghasilkan solusi atau output tertentu.",
  },
  mb_ib: {
    term: "Innovation Box",
    desc: "Media untuk mengusulkan dan mengembangkan ide inovasi bernilai tambah bagi perusahaan.",
    comingSoon: true,
  },

  // ── Insight Hub (slug = /insight-hub/<slug>) ─────────────────────
  webinar: {
    term: "Webinar",
    desc: "Sesi berbagi pengetahuan berformat seminar yang diselenggarakan secara daring.",
  },
  direksi: {
    term: "Direksi Menyapa",
    desc: "Sarana komunikasi Direksi untuk menyampaikan arah strategis dan wawasan perusahaan.",
  },
  berita: {
    term: "Berita Terkini",
    desc: "Informasi terbaru seputar perusahaan dan industri yang relevan dengan pekerjaan.",
  },
  diskusi: {
    term: "Discussion",
    desc: "Forum diskusi untuk bertukar pengetahuan, ide, dan solusi atas topik tertentu.",
  },
  library: {
    term: "Library",
    desc: "Pusat referensi digital untuk mendukung pengembangan kompetensi secara mandiri.",
  },
  article: {
    term: "Article",
    desc: "Kontribusi materi tertulis yang menyajikan wawasan atau praktik terbaik.",
  },
  chatroom: {
    term: "Chat Room",
    desc: "Ruang komunikasi daring untuk berdiskusi dan berkolaborasi secara real-time.",
  },
  "short-movie": {
    term: "Short Movie",
    desc: "Video pendek yang menyampaikan informasi secara ringkas dan menarik.",
  },
  vlog: {
    term: "Vlog",
    desc: "Konten video personal yang membagikan pengalaman atau pengetahuan secara informal.",
  },

  // ── Program lain ─────────────────────────────────────────────────
  wishlist: {
    term: "Wishlist",
    desc: "Daftar rencana program pembelajaran yang ingin diikuti di masa mendatang.",
  },
  idp: {
    term: "Individual Development Program",
    desc: "Rencana pengembangan individu untuk mendukung kompetensi dan karier.",
  },
  agrowallet: {
    term: "Agrowallet",
    desc: "Dompet digital untuk bertransaksi pembelajaran sesuai anggaran yang diberikan perusahaan.",
  },
};

/** Lookup entri glossary dari sebuah href kartu/menu.
 *  Mengenali `?metode=mb_*`, `?bucket=*`, dan `/insight-hub/<slug>`. */
export function glossaryFromHref(href: string): GlossaryEntry | undefined {
  const metode = href.match(/[?&]metode=([^&]+)/)?.[1];
  if (metode) return GLOSSARY[metode];

  const bucket = href.match(/[?&]bucket=([^&]+)/)?.[1];
  if (bucket) return GLOSSARY[bucket];

  const section = href.match(/\/insight-hub\/([^/?#]+)/)?.[1];
  if (section) return GLOSSARY[section];

  if (/\/wishlist\b/.test(href)) return GLOSSARY.wishlist;
  return undefined;
}
