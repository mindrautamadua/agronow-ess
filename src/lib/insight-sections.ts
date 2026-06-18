/**
 * Registry section Insight Hub — dipakai landing (/insight-hub), sub-halaman
 * (/insight-hub/[section]), dan kartu di /home. Sumber tunggal slug → metadata.
 */
import { Video, MessageSquareQuote, Newspaper, MessagesSquare, Library, FileText, MessageCircle, Play, Clapperboard, Quote, FileCheck } from "lucide-react";

export type SectionKind = "video" | "direksi" | "berita" | "article" | "library" | "quotes" | "discussion" | "chatroom" | "soon" | "external";

export interface SectionMeta {
  slug: string;
  title: string;
  desc: string;
  image: string | null; // foto kartu; null → tile gradien
  icon: typeof Video;
  kind: SectionKind;
  href?: string; // bila ada, kartu menautkan ke URL ini (eksternal, tab baru) alih-alih sub-halaman
}

export const INSIGHT_SECTIONS: SectionMeta[] = [
  { slug: "webinar", title: "Webinar", image: "/img/item10.jpg", icon: Video, kind: "video",
    desc: "Rekaman dan jadwal webinar pengembangan kompetensi." },
  { slug: "direksi", title: "Direksi Menyapa", image: "/img/item11.jpg", icon: MessageSquareQuote, kind: "direksi",
    desc: "Pesan dan arahan langsung dari jajaran direksi." },
  { slug: "berita", title: "Berita Terkini", image: "/img/item12.jpg", icon: Newspaper, kind: "berita",
    desc: "Kabar dan berita terbaru seputar PTPN Group." },
  { slug: "diskusi", title: "Diskusi", image: "/img/diskusi.jpg", icon: MessagesSquare, kind: "discussion",
    desc: "Ruang berbagi ide dan tanya jawab antar karyawan." },
  { slug: "library", title: "Digital Library", image: "/img/library.jpg", icon: Library, kind: "library",
    desc: "Koleksi materi, e-book, podcast, dan referensi pembelajaran." },
  { slug: "article", title: "Article", image: "/img/article.jpg", icon: FileText, kind: "article",
    desc: "Artikel dan tulisan seputar perkebunan dan pengembangan diri." },
  { slug: "chatroom", title: "Chatroom", image: "/img/chatroom.jpg", icon: MessageCircle, kind: "chatroom",
    desc: "Ngobrol santai dan kolaborasi real-time bersama rekan kerja." },
  { slug: "short-movie", title: "Short Movie", image: "/img/short-movie.jpg", icon: Clapperboard, kind: "video",
    desc: "Film pendek inspiratif pilihan." },
  { slug: "vlog", title: "Vlog", image: "/img/vlog.jpg", icon: Play, kind: "video",
    desc: "Vlog dan cerita seru dari lapangan." },
  { slug: "sop", title: "SOP", image: "/img/SOP_banner_no_ornament.png", icon: FileCheck, kind: "external",
    href: "https://onehub.ptpn.id",
    desc: "Standard Operating Procedure — akses panduan resmi di OneHub PTPN." },
  { slug: "inspirasi", title: "Inspirasi", image: null, icon: Quote, kind: "quotes",
    desc: "Kutipan inspiratif untuk menyemangati harimu." },
];

export const SECTION_BY_SLUG: Record<string, SectionMeta> = Object.fromEntries(
  INSIGHT_SECTIONS.map((s) => [s.slug, s]),
);
