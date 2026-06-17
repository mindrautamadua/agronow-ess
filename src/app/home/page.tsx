"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell, Menu, ChevronDown, ExternalLink, GraduationCap, Users, Briefcase,
  Wallet, FileText, ArrowUpRight, Trophy, Flame, ArrowRight, Sparkles,
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

const BUCKET_UI: Record<string, { icon: typeof GraduationCap; from: string; to: string; tag: string }> = {
  formal: { icon: GraduationCap, from: "#a3e635", to: "#16a34a", tag: "10%" },
  social: { icon: Users, from: "#2dd4bf", to: "#059669", tag: "20%" },
  experiential: { icon: Briefcase, from: "#34d399", to: "#15803d", tag: "70%" },
};

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
];

interface NavItem { label: string; active?: boolean; href: string; dropdown?: { label: string; href: string }[] }
const NAV: NavItem[] = [
  { label: "Home", active: true, href: "/home" },
  {
    label: "Progres Pembelajaran", href: "/learning",
    dropdown: [
      { label: "AI Coach", href: "/coach" },
      { label: "Aktivitas Pembelajaran", href: "/learning" },
      { label: "Pembelajaran Formal", href: "/learning?bucket=formal" },
      { label: "Pembelajaran Sosial", href: "/learning?bucket=social" },
      { label: "Belajar Dari Pengalaman", href: "/learning?bucket=experiential" },
      { label: "Belajar Harian", href: "/harian" },
      { label: "Peta Kompetensi", href: "/kompetensi" },
    ],
  },
  { label: "Insight Hub", href: "/insight-hub" },
  { label: "Profile", href: "/profile" },
  { label: "Bantuan", href: "/bantuan/panduan", dropdown: [{ label: "Panduan", href: "/bantuan/panduan" }, { label: "FAQ", href: "/bantuan/faq" }] },
  { label: "Logout", href: "/login" },
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
  return href ? <a href={href}>{inner}</a> : inner;
}

export default function HomePage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % CAROUSEL.length), 6000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d.member) setMe(d); }).catch(() => {});
  }, []);

  function go(href: string) {
    if (href === "/login") router.push("/login");
    else if (href.startsWith("/")) router.push(href);
  }

  const name = me?.member.name ?? "…";
  const total = me?.learning.total;
  const buckets = me?.learning.buckets ?? [];

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      {/* ───── Header ───── */}
      <header className="relative z-30">
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
                  className={`flex items-center gap-1 whitespace-nowrap rounded px-2 py-1.5 text-[14px] transition-colors hover:text-emerald-300 ${n.active ? "font-semibold" : "text-white/90"}`}
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
            <button className="relative" title="Notifikasi"><Bell className="h-6 w-6" /></button>
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
              <img src={c.image} alt={`Slide ${i + 1}`} className="h-full w-full object-cover" />
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
          <div className="absolute bottom-56 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:bottom-60">
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
          <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            {/* ornamen chart asli (samar) */}
            <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-[0.16]" style={{ backgroundImage: "url(/img/bg_chart_final.png)" }} />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-emerald-900/25 via-transparent to-black/40" />
            {/* glow dekor lembut */}
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.12), transparent 65%)" }} />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-emerald-200">
                  Progres Pembelajaran
                </div>
                <h3 className="mt-3 text-xl font-bold sm:text-2xl">Misi 70 · 20 · 10</h3>
                {total ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[13.5px] text-emerald-50/70">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    {`${Math.max(total.target - total.earned, 0)} jam lagi untuk menuntaskan misi`}
                  </p>
                ) : (
                  <Skeleton className="mt-2 h-4 w-60" />
                )}
              </div>

              {/* Ring progres overall */}
              <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none" stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - (total?.pct ?? 0) / 100) }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#bef264" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {total ? (
                    <>
                      <span className="text-2xl font-bold leading-none sm:text-3xl">{total.pct}<span className="text-base">%</span></span>
                      <span className="mt-0.5 text-[10px] font-medium text-emerald-50/60">{`${total.earned}/${total.target} jam`}</span>
                    </>
                  ) : (
                    <Skeleton className="h-6 w-12 rounded" />
                  )}
                </div>
              </div>
            </div>

            {/* Bar per kategori */}
            <div className="relative z-10 mt-6 space-y-3.5">
              {!me && [0, 1, 2].map((i) => (
                <div key={`sk-${i}`} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-3.5 w-44" />
                      <Skeleton className="mt-2.5 h-2.5 w-full rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
              {me && buckets.map((b, i) => {
                const ui = BUCKET_UI[b.key];
                const Icon = ui?.icon ?? GraduationCap;
                return (
                  <button
                    key={b.key}
                    onClick={() => go(`/learning?bucket=${b.key}`)}
                    className="group block w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3.5 text-left transition-all hover:border-white/15 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#06210a]" style={{ backgroundImage: `linear-gradient(135deg, ${ui?.from}, ${ui?.to})` }}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13.5px] font-semibold">{SHORT_LABEL[b.key] ?? b.label}</span>
                          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/70">{ui?.tag}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2.5">
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/30">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundImage: `linear-gradient(to right, ${ui?.from}, ${ui?.to})` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${b.pct}%` }}
                              transition={{ duration: 0.9, delay: 0.15 + i * 0.1, ease: "easeOut" }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right text-[11px] font-semibold text-emerald-50/70">{b.earned}/{b.target} jam</span>
                          <span className="w-9 shrink-0 text-right text-[12px] font-bold">{b.pct}%</span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/70" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ───── Kanan: IDP + Wallet (LIVE saldo) ───── */}
          <div className="flex flex-col gap-6">
            {/* IDP */}
            <div className="relative flex-1 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              {/* ornamen tablet/IDP asli (samar) */}
              <div aria-hidden className="absolute inset-0 bg-cover bg-right opacity-[0.14]" style={{ backgroundImage: "url(/img/bg_idp_final.png)" }} />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0c1c0e]/70 via-transparent to-black/30" />
              <div aria-hidden className="pointer-events-none absolute -left-12 -bottom-12 h-48 w-48 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.1), transparent 65%)" }} />
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]"><FileText className="h-5.5 w-5.5" /></div>
                <h3 className="text-xl font-bold leading-tight sm:text-2xl">Individual Development<br />Program (IDP)</h3>
              </div>
              <div className="relative z-10 mt-4 space-y-2.5">
                {[
                  { judul: "Formulir IDP — Aspirasi Karir", desc: "Tahun 2026" },
                  { judul: "Daftar IDP Saya", desc: "Tahun 2026" },
                ].map((idp) => (
                  <a key={idp.judul} href="/idp" className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 transition-all hover:border-white/15 hover:bg-white/[0.08]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5"><ExternalLink className="h-4.5 w-4.5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold">{idp.judul}</div>
                      <div className="text-[12px] text-white/40">{idp.desc}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white/70" />
                  </a>
                ))}
              </div>
            </div>

            {/* Agro Wallet */}
            <a href="/wishlist" className="group relative block overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0e2412]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
              {/* ornamen koin asli (samar) */}
              <div aria-hidden className="absolute inset-0 bg-cover bg-right opacity-[0.16]" style={{ backgroundImage: "url(/img/bg_wallet_final.png)" }} />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0e2412]/72 via-transparent to-black/25" />
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(250,204,21,0.12), transparent 65%)" }} />
              {/* shimmer */}
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Wallet className="h-5.5 w-5.5 text-amber-200" /></div>
                <div>
                  <h3 className="text-xl font-bold sm:text-2xl">Agro Wallet</h3>
                  <p className="text-[13px] text-emerald-50/70">Saldo pelatihan tahun ini</p>
                </div>
              </div>
              <div className="relative z-10 mt-5 flex items-end justify-between">
                {me ? (
                  <span className="text-[11px] font-medium text-emerald-50/50">{me.member.poin} poin terkumpul</span>
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
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {sec.items.map((it, i) => <ZoomImg key={i} src={it.src} alt={it.label} href={it.href} />)}
            </div>
          </section>
        ))}

        {/* Tone From The Top */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Tone From The Top</div>
          <div className="relative mt-5 flex flex-col items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[#1f3d12] to-[#0c1f08] px-6 py-10 text-center">
            <svg width="77" height="51" viewBox="0 0 77 51" fill="none" className="mb-4">
              <path d="M19.2181 0C13.9465 0 9.42556 1.87487 5.65534 5.62474C1.88511 9.37462 0 13.8712 0 19.1143V50.9717H32.0302V19.1143H6.40604C6.40604 15.5968 7.65722 12.5935 10.1596 10.1047C12.6619 7.61583 15.6815 6.3714 19.2181 6.3714V0ZM64.0604 0C58.7888 0 54.2679 1.87487 50.4976 5.62474C46.7274 9.37462 44.8423 13.8712 44.8423 19.1143V50.9717H76.8725V19.1143H51.2483C51.2483 15.5968 52.4995 12.5935 55.0019 10.1047C57.5042 7.61583 60.5238 6.3714 64.0604 6.3714V0ZM6.40604 25.4858H25.6242V44.6002H6.40604V25.4858ZM51.2483 25.4858H70.4665V44.6002H51.2483V25.4858Z" fill="white" fillOpacity="0.1" />
            </svg>
            <p className="max-w-2xl text-lg font-light italic leading-relaxed sm:text-2xl">
              <b>Big dreams</b> define our direction, but <b>productivity</b>, cost <b>effectiveness</b>, and speed in execution define our success. This is the mindset of <b>Nusantara EntrePlanters</b>.
            </p>
            <div className="mt-3 text-[15px] font-light">Denaldy Mulino Mauna</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/quote.png" alt="" className="mt-6 max-h-44 w-auto object-contain" />
          </div>
        </section>

        {/* Insight Hub */}
        <section className="mt-14">
          <div className="text-[28px] font-bold sm:text-4xl">Insight Hub</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">
            Pusat informasi terintegrasi untuk memastikan Anda selalu memperoleh pembaruan terkini, mencakup webinar, pesan direksi, serta berita terbaru
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {INSIGHT.map((it, i) => <ZoomImg key={i} src={it.src} alt={it.label} href={it.href} />)}
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
        <section className="mt-14 pb-20">
          <div className="text-[28px] font-bold sm:text-4xl">Games (Coming Soon)</div>
          <div className="mt-2 max-w-4xl text-[16px] text-white/90 sm:text-xl">
            Game berasa belajar dengan tiap tantangannya dirancang buat bantu kamu ngerti materi sesuai tujuan belajar kamu.
          </div>
        </section>
      </main>

      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-96" style={{ backgroundImage: "linear-gradient(to top, #2E7409, #19191B)" }} />
    </div>
  );
}
