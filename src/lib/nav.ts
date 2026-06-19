/**
 * Sumber tunggal daftar menu navbar. Dipakai oleh komponen header solid
 * (`AppHeader`) maupun header transparan-saat-hero di halaman Home — keduanya
 * me-render data yang sama dengan styling masing-masing. Ubah menu di sini saja.
 */
export interface NavItem {
  label: string;
  href: string;
  dropdown?: { label: string; href: string }[];
}

export const NAV: NavItem[] = [
  { label: "Home", href: "/home" },
  {
    label: "Progres Pembelajaran", href: "/learning",
    dropdown: [
      { label: "AI Coach", href: "/coach" },
      { label: "Aktivitas Pembelajaran", href: "/learning" },
      { label: "Pembelajaran Formal", href: "/learning?bucket=formal" },
      { label: "Pembelajaran Sosial", href: "/learning?bucket=social" },
      { label: "Belajar Dari Pengalaman", href: "/learning?bucket=experiential" },
      { label: "Belajar Harian", href: "/harian" },
      { label: "Wishlist", href: "/wishlist" },
    ],
  },
  { label: "Insight Hub", href: "/insight-hub" },
  { label: "Chat", href: "/chat" },
  { label: "Profile", href: "/profile" },
  { label: "Bantuan", href: "/bantuan/panduan", dropdown: [{ label: "Panduan", href: "/bantuan/panduan" }, { label: "FAQ", href: "/bantuan/faq" }, { label: "Helpdesk", href: "/bantuan/helpdesk" }] },
  { label: "Logout", href: "/login" },
];
