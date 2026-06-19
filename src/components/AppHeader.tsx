"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import NotificationBell from "./NotificationBell";

interface NavItem { label: string; href: string; dropdown?: { label: string; href: string }[] }

const NAV: NavItem[] = [
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
    ],
  },
  { label: "Insight Hub", href: "/insight-hub" },
  { label: "Chat", href: "/chat" },
  { label: "Profile", href: "/profile" },
  { label: "Bantuan", href: "/bantuan/panduan", dropdown: [{ label: "Panduan", href: "/bantuan/panduan" }, { label: "FAQ", href: "/bantuan/faq" }, { label: "Helpdesk", href: "/bantuan/helpdesk" }] },
  { label: "Logout", href: "/login" },
];

export default function AppHeader({ active }: { active?: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);

  const go = async (href: string) => {
    if (!href.startsWith("/")) return;
    // Logout: hapus sesi dulu (kalau tidak, proxy memantulkan /login → /home).
    if (href === "/login") {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* abaikan */ }
    }
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#19191B]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-5">
        <a href="/home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo-putih.png" alt="Agronow" className="h-9 w-auto sm:h-10" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <div key={n.label} className="group relative">
              <button
                onClick={() => go(n.href)}
                className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1.5 text-[14px] transition-colors hover:text-emerald-300 ${active === n.label ? "font-semibold text-emerald-300" : "text-white/90"}`}
              >
                {n.label}
                {n.dropdown && <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {n.dropdown && (
                <div className="invisible absolute left-0 top-full z-40 min-w-[230px] rounded-lg border border-white/10 bg-[#21241f] py-1.5 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                  {n.dropdown.map((d) => (
                    <button key={d.label} onClick={() => go(d.href)} className="block w-full px-4 py-2 text-left text-[13.5px] text-white/85 hover:bg-white/5 hover:text-emerald-300">{d.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <button className="lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu"><Menu className="h-7 w-7" /></button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#21241f] px-4 py-2 lg:hidden">
          {NAV.map((n) => (
            <div key={n.label}>
              <button
                onClick={() => { if (n.dropdown) setOpenDrop(openDrop === n.label ? null : n.label); else go(n.href); }}
                className="flex w-full items-center justify-between py-2.5 text-[14px] text-white/90"
              >
                {n.label}
                {n.dropdown && <ChevronDown className={`h-4 w-4 transition-transform ${openDrop === n.label ? "rotate-180" : ""}`} />}
              </button>
              {n.dropdown && openDrop === n.label && (
                <div className="pb-2 pl-3">
                  {n.dropdown.map((d) => (
                    <button key={d.label} onClick={() => go(d.href)} className="block py-2 text-left text-[13px] text-white/70">{d.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
