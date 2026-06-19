"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import NotificationBell from "@/components/NotificationBell";
import { NAV } from "@/lib/nav";
import LearningCurve from "@/components/LearningCurve";
import Leaderboard from "@/components/Leaderboard";
import {
  Menu, ChevronDown, ChevronLeft, ChevronRight, ExternalLink,
  Wallet, FileText, ArrowUpRight, Flame, ArrowRight, Sparkles,
} from "lucide-react";

// ── Tipe data dari /api/me ──
interface Bucket { key: string; label: string; earned: number; target: number; pct: number }
interface Me {
  member: { name: string; image: string | null; poin: number; saldo: number };
  learning: { total: { earned: number; target: number; pct: number }; buckets: Bucket[] };
}

const SHORT_LABEL: Record<string, string> = {
  formal: "Pembelajaran Formal (Formal Learning)",
  social: "Pembelajaran Sosial (Social Learning)",
  experiential: "Belajar dari Pengalaman (Experiential Learning)",
};

// ── Status RAG (Red · Amber · Green) ──
// Berbasis *pace*: dibandingkan target yang semestinya tercapai sampai titik tahun
// berjalan saat ini — bukan total target tahunan — agar tidak otomatis "merah"
// hanya karena tahun baru berjalan separuh. Ubah ambang di RAG_AMBER/RAG_GREEN.
type Rag = "red" | "amber" | "green";
const RAG_AMBER = 0.5; // ratio capaian/ekspektasi minimal untuk Amber
const RAG_GREEN = 0.9; // ratio minimal untuk Green (sesuai/di atas pace)

const RAG_UI: Record<Rag, { fill: string; pill: string; label: string }> = {
  green: { fill: "from-lime-400 to-emerald-500", pill: "bg-emerald-500/25 text-emerald-50 ring-1 ring-emerald-300/40", label: "Sesuai target" },
  amber: { fill: "from-amber-300 to-orange-400", pill: "bg-amber-500/25 text-amber-50 ring-1 ring-amber-300/40", label: "Perlu dikejar" },
  red: { fill: "from-rose-400 to-red-500", pill: "bg-red-500/25 text-red-50 ring-1 ring-red-300/40", label: "Tertinggal" },
};

function yearElapsed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return Math.min(Math.max((now.getTime() - start) / (end - start), 0.01), 1);
}
function ragOf(earned: number, target: number): Rag {
  if (target <= 0) return "green";
  const ratio = earned / (target * yearElapsed());
  if (ratio >= RAG_GREEN) return "green";
  if (ratio >= RAG_AMBER) return "amber";
  return "red";
}

const CAROUSEL = [
  { image: "/img/gambar1.png", kind: "greeting" as const },
  { image: "/img/gambar2.png", kind: "quote" as const },
  { image: "/img/gambar3.png", kind: "experience" as const },
];

// Tiap kartu menuju bucket metode khusus sesuai judulnya (filter ?metode= di /learning).
const SECTIONS = [
  {
    title: "Pembelajaran Formal (Formal Learning)",
    desc: "Proses belajar yang terstruktur dan terukur melalui kelas, belajar mandiri dan workshop dengan pengembangan kompetensi yang jelas. Yuk lebih produktif!",
    items: [
      { src: "/img/item1.jpg", label: "Belajar di Kelas", href: "/learning?metode=mb_ict" },
      { src: "/img/item2.jpg", label: "Belajar Mandiri", href: "/learning?metode=mb_sl" },
      { src: "/img/item3.jpg", label: "Workshop", href: "/learning?metode=mb_w" },
    ],
  },
  {
    title: "Pembelajaran Sosial (Social Learning)",
    desc: "Proses pembelajaran yang relevan melalui pembelajaran coaching, mentoring dan benchmarking buat kamu lebih professional. Siap naik level bareng?",
    items: [
      { src: "/img/item4.jpg", label: "Coaching", href: "/learning?metode=mb_c" },
      { src: "/img/item5.jpg", label: "Mentoring", href: "/learning?metode=mb_m" },
      { src: "/img/item6.jpg", label: "Benchmark", href: "/learning?metode=mb_b" },
    ],
  },
  {
    title: "Belajar dari pengalaman (Experiential Learning)",
    desc: "Proses pembelajaran berbasis pengalaman nyata dan tantangan yang seru melalui action-based learning, project assignment, dan innovation box. Buat kamu jadi berpengalaman!",
    items: [
      { src: "/img/item7.jpg", label: "Action Based Learning", href: "/learning?metode=mb_lo" },
      { src: "/img/item8.jpg", label: "Project Assignment", href: "/learning?metode=mb_pa" },
      { src: "/img/item9.jpg", label: "Innovation Box", href: "/learning?metode=mb_ib" },
    ],
  },
];

// Tiap kartu menuju sub-halaman section di /insight-hub/<slug>.
const INSIGHT = [
  { src: "/img/item10.jpg", label: "Webinar", href: "/insight-hub/webinar" },
  { src: "/img/item11.jpg", label: "Direksi Menyapa", href: "/insight-hub/direksi" },
  { src: "/img/item12.jpg", label: "Berita Terkini", href: "/insight-hub/berita" },
  { src: "/img/diskusi.jpg", label: "Diskusi", href: "/insight-hub/diskusi" },
  { src: "/img/library.jpg", label: "Library", href: "/insight-hub/library" },
  { src: "/img/article.jpg", label: "Article", href: "/insight-hub/article" },
  { src: "/img/chatroom.jpg", label: "Chatroom", href: "/insight-hub/chatroom" },
  { src: "/img/short-movie.jpg", label: "Short Movie", href: "/insight-hub/short-movie" },
  { src: "/img/vlog.jpg", label: "Vlog", href: "/insight-hub/vlog" },
  { src: "/img/SOP_banner_no_ornament.png", label: "SOP", href: "https://onehub.ptpn.id" },
];

// Logo anak perusahaan (file di public/img/logo-anper/) — ditampilkan di footer.
const ANPER_LOGOS = [
  "ptpn 1.png",
  "logo ptpn 4.png",
  "sgn.png",
  "sripamela_logo_transparent.png",
  "Industri Karet Nusantara.webp",
  "RPN.png",
  "LPP.png",
  "kpbn.png",
  "bionusa.png",
  "kinra_logo_transparent.png",
];

const rupiah = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

// CTA Belajar Harian — baca streak dari perangkat (sinkron dgn halaman /harian).
function DailyCTA() {
  const [streak, setStreak] = useState<{ current: number; lastDate: string } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ess_microlearning_streak_v1");
      if (raw) { const s = JSON.parse(raw); setStreak({ current: s.current ?? 0, lastDate: s.lastDate ?? "" }); }
      else setStreak({ current: 0, lastDate: "" });
    } catch { setStreak({ current: 0, lastDate: "" }); }
  }, []);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const doneToday = streak?.lastDate === today;
  const n = streak?.current ?? 0;

  return (
    <a href="/harian" className="group relative mt-12 block overflow-hidden rounded-[24px] border border-amber-400/20 bg-gradient-to-r from-[#241803]/70 to-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(251,146,60,0.18), transparent 65%)" }} />
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
          <Flame className={`h-8 w-8 ${n > 0 ? "text-amber-400" : "text-white/40"}`} fill={n > 0 ? "rgba(251,146,60,0.25)" : "none"} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold sm:text-2xl">Belajar Harian</h3>
            {n > 0 && <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[12px] font-bold text-amber-200 tabular-nums">🔥 {n} hari</span>}
          </div>
          <p className="mt-0.5 text-[13.5px] text-emerald-50/70">
            {doneToday ? "Misi hari ini selesai 🎉 Sampai jumpa besok!" : "Kuis istilah 1 menit — jaga streak-mu tetap menyala."}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold transition-all group-hover:bg-white/15">
          {doneToday ? "Lihat" : "Mulai"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </a>
  );
}

function ZoomImg({ src, alt, href }: { src: string; alt: string; href?: string }) {
  const inner = (
    <div className="overflow-hidden rounded-[15px] bg-black shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-500 hover:scale-110" />
    </div>
  );
  if (!href) return inner;
  const external = /^https?:\/\//.test(href);
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
    : <a href={href}>{inner}</a>;
}

// Baris swipe horizontal ala Netflix: scroll-snap + swipe natif (mobile),
// tombol panah muncul saat hover (desktop), scrollbar disembunyikan.
// `itemClass` mengatur lebar tiap kartu (mis. 3 atau 6 kartu per layar).
function SwipeRow({ children, itemClass, center = false }: { children: React.ReactNode[]; itemClass: string; center?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="group/row relative">
      <div
        ref={ref}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${center ? "sm:justify-center" : ""}`}
      >
        {children.map((child, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClass}`}>{child}</div>
        ))}
      </div>
      {/* Panah navigasi — hanya desktop, muncul saat hover (disembunyikan saat row di-tengah/tak perlu scroll) */}
      {!center && (
        <>
          <button
            type="button" aria-label="Sebelumnya" onClick={() => scroll(-1)}
            className="absolute -left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white opacity-0 backdrop-blur transition hover:bg-black/90 group-hover/row:opacity-100 lg:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button" aria-label="Berikutnya" onClick={() => scroll(1)}
            className="absolute -right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-white opacity-0 backdrop-blur transition hover:bg-black/90 group-hover/row:opacity-100 lg:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROUSEL.length), 6000);
    return () => clearInterval(t);
  }, []);

  // Header tetap tampil saat scroll: transparan di atas hero, solid setelah di-scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d.member) setMe(d); }).catch(() => {});
  }, []);

  async function go(href: string) {
    if (href === "/login") {
      // Logout: hapus sesi dulu agar proxy tidak memantulkan /login → /home.
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* abaikan */ }
      router.push("/login");
    } else if (href.startsWith("/")) router.push(href);
  }

  const name = me?.member.name ?? "…";
  const total = me?.learning.total;
  const buckets = me?.learning.buckets ?? [];

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      {/* ───── Header (fixed: transparan di atas hero, solid saat scroll) ───── */}
      <header className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${scrolled ? "border-b border-white/10 bg-[#19191B]/95 shadow-lg backdrop-blur" : ""}`}>
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
                  className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1.5 text-[14px] transition-colors hover:text-emerald-300 ${n.href === "/home" ? "font-semibold" : "text-white/90"}`}
                >
                  {n.label}
                  {n.dropdown && <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {n.dropdown && (
                  <div className="invisible absolute left-0 top-full z-40 min-w-[230px] rounded-lg border border-white/10 bg-[#21241f] py-1.5 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                    {n.dropdown.map((d) => (
                      <button key={d.label} onClick={() => go(d.href)} className="block w-full px-4 py-2 text-left text-[13.5px] text-white/85 hover:bg-white/5 hover:text-emerald-300">
                        {d.label}
                      </button>
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

      {/* ───── Carousel full-bleed ───── */}
      <section className="relative w-full">
        <div className="relative h-[440px] overflow-hidden sm:h-[560px] lg:h-[640px]">
          {CAROUSEL.map((c, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === slide ? "opacity-100" : "pointer-events-none opacity-0"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src={c.image}
                alt={`Slide ${i + 1}`}
                className="h-full w-full object-cover"
                initial={false}
                animate={{ scale: i === slide ? 1.12 : 1 }}
                transition={{ duration: i === slide ? 7 : 1, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
              {/* fade bawah agar menyatu dengan latar gelap & kartu di bawahnya */}
              <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#19191B] via-[#19191B]/70 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="mx-auto flex w-full max-w-[1200px] px-4">
                {c.kind === "greeting" && (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full sm:h-20 sm:w-20">
                      {!me ? (
                        <Skeleton className="h-full w-full rounded-full" />
                      ) : me.member.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={me.member.image} alt={name} className="h-full w-full bg-white/90 object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/90 text-xl font-bold text-emerald-700">{initials(name)}</div>
                      )}
                    </div>
                    <div>
                      {me ? (
                        <div className="text-2xl font-bold leading-tight sm:text-4xl">Hi, {name}!</div>
                      ) : (
                        <Skeleton className="h-8 w-56 sm:h-10 sm:w-72" />
                      )}
                      <div className="mt-1 text-sm text-white/90 sm:text-lg">Selamat datang di Ruang Pembelajaran</div>
                    </div>
                  </div>
                )}
                {c.kind === "quote" && (
                  <blockquote className="max-w-xl">
                    <p className="text-base font-light italic leading-relaxed sm:text-2xl">
                      <b>Big dreams</b> define our direction, but <b>productivity</b>, cost <b>effectiveness</b>, and speed in execution define our success. This is the mindset of <b>Nusantara EntrePlanters</b>
                    </p>
                    <footer className="mt-3 text-sm text-white/80">— Denaldy Mulino Mauna</footer>
                  </blockquote>
                )}
                {c.kind === "experience" && (
                  <div className="max-w-xl">
                    <div className="text-xl font-bold sm:text-3xl">Belajar dari pengalaman</div>
                    <div className="mt-2 text-sm text-white/90 sm:text-base">
                      Proses pembelajaran berbasis pengalaman nyata dan tantangan yang seru melalui action-based learning, project assignment, dan innovation box. Buat kamu jadi berpengalaman!
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          ))}
          {/* scrim atas agar header/nav terbaca di atas area gambar terang */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-black/55 to-transparent" />
          <div className="absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-60">
            {CAROUSEL.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-white" : "w-2 bg-white/50"}`} aria-label={`Slide ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ───── Progres + IDP + Wallet ───── */}
      <main className="relative z-10 mx-auto -mt-24 max-w-[1200px] px-4 sm:-mt-32">
        <section className="grid gap-6 md:grid-cols-2">
          {/* ───── Kiri: progres pembelajaran (LIVE) ───── */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-500 to-green-700 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:p-7">
            <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-[0.08]" style={{ backgroundImage: "url(/img/bg_chart_final.png)" }} />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold sm:text-[26px]">Progres pembelajaran</h3>
                {total ? (
                  <p className="mt-1 text-[13.5px] text-white/85">{Math.max(total.target - total.earned, 0)} jam lagi untuk menyelesaikan misi</p>
                ) : (
                  <Skeleton className="mt-2 h-4 w-56" />
                )}
              </div>
              {total ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="text-4xl font-bold leading-none sm:text-5xl">{total.pct}%</div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${RAG_UI[ragOf(total.earned, total.target)].pill}`}>{RAG_UI[ragOf(total.earned, total.target)].label}</span>
                </div>
              ) : (
                <Skeleton className="h-10 w-16" />
              )}
            </div>

            {/* Bar overall */}
            <div className="relative z-10 mt-5">
              {total ? (
                <div className="relative h-9 rounded-full bg-black/20">
                  <motion.div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${RAG_UI[ragOf(total.earned, total.target)].fill}`} initial={{ width: 0 }} animate={{ width: `${Math.max(total.pct, 5)}%` }} transition={{ duration: 1, ease: "easeOut" }} />
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3.5 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-sm">{total.earned} / {total.target} jam</span>
                </div>
              ) : (
                <Skeleton className="h-9 w-full rounded-full" />
              )}
            </div>

            {/* Rincian per kategori */}
            <div className="relative z-10 mt-5 space-y-4 rounded-2xl bg-green-950/25 p-4 sm:p-5">
              {!me && [0, 1, 2].map((i) => (
                <div key={`sk-${i}`}>
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="mt-2.5 h-8 w-full rounded-full" />
                </div>
              ))}
              {me && buckets.map((b, i) => {
                const started = b.earned > 0;
                const ui = RAG_UI[ragOf(b.earned, b.target)];
                return (
                  <button key={b.key} onClick={() => go(`/learning?bucket=${b.key}`)} className="group -mx-2 block w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/10">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[14px] font-semibold sm:text-[15px]">{SHORT_LABEL[b.key] ?? b.label}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ui.pill}`}>{ui.label}</span>
                        <ArrowUpRight className="h-4 w-4 text-white/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 flex-1 overflow-hidden rounded-full bg-black/25">
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${ui.fill}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: "easeOut" }}
                        />
                        {started ? (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-sm">{b.earned} / {b.target} jam</span>
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-[12px] font-medium text-white/70">{b.earned} / {b.target} jam</span>
                        )}
                      </div>
                      <span className="w-11 shrink-0 text-right text-[15px] font-bold text-white">{b.pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ───── Kanan: IDP + Wallet (LIVE saldo) ───── */}
          <div className="flex flex-col gap-6">
            {/* IDP */}
            <div className="relative flex flex-1 flex-col justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-600 to-green-800 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
              <div aria-hidden className="absolute inset-0 bg-cover bg-right opacity-30" style={{ backgroundImage: "url(/img/bg_idp_final.png)" }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><FileText className="h-5 w-5" /></div>
                <h3 className="text-xl font-bold leading-tight sm:text-2xl">Individual Development Program (IDP)</h3>
              </div>
              <div className="relative z-10 mt-5 space-y-1">
                {[
                  { judul: "Formulir IDP (Isikan Aspirasi Karir Pendek dan Panjang)", desc: "Tahun 2026" },
                  { judul: "Daftar IDP Saya", desc: "Tahun 2026" },
                ].map((idp) => (
                  <a key={idp.judul} href="/idp" className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/10">
                    <ExternalLink className="h-5 w-5 shrink-0 text-white/90" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold leading-snug">{idp.judul}</div>
                      <div className="text-[12px] text-white/70">{idp.desc}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/80" />
                  </a>
                ))}
              </div>
            </div>

            {/* Agro Wallet */}
            <a href="/wishlist" className="group relative block overflow-hidden rounded-[24px] bg-gradient-to-br from-green-700 to-emerald-900 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
              <div aria-hidden className="absolute inset-0 bg-cover bg-right opacity-[0.14]" style={{ backgroundImage: "url(/img/bg_wallet_final.png)" }} />
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Wallet className="h-5 w-5 text-amber-200" /></div>
                <div>
                  <h3 className="text-xl font-bold sm:text-2xl">Agro Wallet</h3>
                  <p className="text-[13px] text-white/80">Saldo pelatihan tahun ini</p>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex items-end justify-between">
                {me ? (
                  <span className="text-[11px] font-medium text-white/75">{me.member.poin} poin terkumpul</span>
                ) : (
                  <Skeleton className="h-3 w-28" />
                )}
                {me ? (
                  <div className="text-right text-4xl font-bold tracking-tight sm:text-5xl">{rupiah(me.member.saldo)}</div>
                ) : (
                  <Skeleton className="h-10 w-32 sm:h-12" />
                )}
              </div>
            </a>
          </div>
        </section>

        {/* ───── AI Coach ───── */}
        <a href="/coach" className="group relative mt-12 block overflow-hidden rounded-[24px] border border-emerald-400/20 bg-gradient-to-r from-[#0c2a14]/70 to-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.2), transparent 65%)" }} />
          <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold sm:text-2xl">Coach Agro</h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">AI</span>
              </div>
              <p className="mt-0.5 text-[13.5px] text-emerald-50/70">Tanya apa saja soal progres, gap kompetensi & rekomendasi pelatihanmu.</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold transition-all group-hover:bg-white/15">
              Tanya <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>

        {/* ───── Belajar Harian (microlearning + streak) ───── */}
        <DailyCTA />

        {/* Section pembelajaran */}
        {SECTIONS.map((sec) => (
          <section key={sec.title} className="mt-12">
            <div className="text-[28px] font-bold sm:text-4xl">{sec.title}</div>
            <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">{sec.desc}</div>
            <div className="mt-6">
              <SwipeRow center itemClass="w-[44%] sm:w-[30%] lg:w-[22%]">
                {sec.items.map((it, i) => <ZoomImg key={i} src={it.src} alt={it.label} href={it.href} />)}
              </SwipeRow>
            </div>
          </section>
        ))}

        {/* Tone From The Top */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Tone From The Top</div>
          <div className="relative mt-5 flex min-h-[22rem] flex-col overflow-hidden rounded-[18px] bg-gradient-to-b from-[#141414] via-[#17211a] to-[#1d3a10] sm:flex-row sm:items-stretch">
            {/* Kiri: kutipan */}
            <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-10 text-center sm:px-12 sm:py-14">
              <svg width="77" height="51" viewBox="0 0 77 51" fill="none" className="mb-6">
                <path d="M19.2181 0C13.9465 0 9.42556 1.87487 5.65534 5.62474C1.88511 9.37462 0 13.8712 0 19.1143V50.9717H32.0302V19.1143H6.40604C6.40604 15.5968 7.65722 12.5935 10.1596 10.1047C12.6619 7.61583 15.6815 6.3714 19.2181 6.3714V0ZM64.0604 0C58.7888 0 54.2679 1.87487 50.4976 5.62474C46.7274 9.37462 44.8423 13.8712 44.8423 19.1143V50.9717H76.8725V19.1143H51.2483C51.2483 15.5968 52.4995 12.5935 55.0019 10.1047C57.5042 7.61583 60.5238 6.3714 64.0604 6.3714V0ZM6.40604 25.4858H25.6242V44.6002H6.40604V25.4858ZM51.2483 25.4858H70.4665V44.6002H51.2483V25.4858Z" fill="white" fillOpacity="0.1" />
              </svg>
              <p className="mx-auto max-w-2xl text-lg font-light italic leading-relaxed sm:text-2xl">
                <b>Big dreams</b> define our direction, but <b>productivity</b>, cost <b>effectiveness</b>, and speed in execution define our success. This is the mindset of <b>Nusantara EntrePlanters</b>.
              </p>
              <div className="mt-5 text-[15px] font-light text-white/80">Denaldy Mulino Mauna</div>
            </div>
            {/* Kanan: foto direksi (PNG transparan, menyatu mulus) menempel kanan-bawah */}
            <div className="relative h-64 w-full shrink-0 self-end sm:h-auto sm:w-72 lg:w-[26rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/quote.png" alt="Denaldy Mulino Mauna" className="h-full w-full object-contain object-bottom" />
            </div>
          </div>
        </section>

        {/* Insight Hub */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Insight Hub</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">
            Pusat informasi terintegrasi untuk memastikan Anda selalu memperoleh pembaruan terkini, mencakup webinar, pesan direksi, serta berita terbaru
          </div>
          <div className="mt-6">
            <SwipeRow itemClass="w-[44%] sm:w-[30%] lg:w-[22%]">
              {INSIGHT.map((it, i) => <ZoomImg key={i} src={it.src} alt={it.label} href={it.href} />)}
            </SwipeRow>
          </div>
        </section>

        {/* Wishlist */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Wishlist</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">
            Tambah pelatihan yang kamu rencanakan untuk diikuti sebagai bagian dari pengembangan diri. Yuk pilih kelas yang kamu inginkan dan tentukan prioritasnya sekarang!
          </div>
          <a href="/wishlist" className="mt-6 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/wishlist.png" alt="Wishlist" className="w-full rounded-[15px]" />
          </a>
        </section>

        {/* Games */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Games (Coming Soon)</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">
            Game berasa belajar dengan tiap tantangannya dirancang buat bantu kamu ngerti materi sesuai tujuan belajar kamu.
          </div>
        </section>

        {/* ───── Kurva Aktivitas Belajar ───── */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Kurva Aktivitas Belajar</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">Perkembangan aktivitas belajar dalam satu tahun.</div>
          <div className="mt-6">
            <LearningCurve />
          </div>
        </section>

        {/* ───── Peringkat & Top Contributors ───── */}
        <section className="mt-14 pb-20">
          <div className="text-[28px] font-bold sm:text-4xl">Peringkat Pembelajar</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">Lihat posisimu dan para kontributor poin teratas di seluruh korporat.</div>
          <div className="mt-6">
            <Leaderboard />
          </div>
        </section>
      </main>

      {/* Footer — logo anak perusahaan */}
      <footer className="relative z-10 mx-auto max-w-[1200px] px-4 pb-16">
        <div className="border-t border-white/10 pt-10">
          <div className="text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-white/60">
            Anak Perusahaan
          </div>
          <div className="mt-8 flex flex-nowrap items-center justify-center gap-3 sm:gap-5">
            {ANPER_LOGOS.map((name) => (
              <div key={name} className="flex h-10 flex-1 items-center justify-center sm:h-12">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/img/logo-anper/${encodeURIComponent(name)}`}
                  alt={name.replace(/\.[^.]+$/, "")}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </footer>

      {/* Degradasi hijau Agronow — replika .fixed-bottom-div dari agronow.co.id:
          fixed di 400px paling bawah viewport, di belakang konten (lewat stacking context `isolate` di root). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-[400px]"
        style={{ backgroundImage: "linear-gradient(to top, #2E7409, #19191B)" }}
      />
    </div>
  );
}
