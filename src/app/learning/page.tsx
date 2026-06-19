"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import LearningCatalog from "@/components/LearningCatalog";
import { GLOSSARY } from "@/lib/glossary";
import { GraduationCap, Users, Briefcase, CheckCircle2, Award, Clock, BadgeCheck, X, ExternalLink, ArrowUpRight, FileText, PlayCircle, ChevronRight, ChevronDown, Download, Plus, Search, Loader2, UserPlus, CalendarDays } from "lucide-react";

// Level pembimbing yang boleh membuat Paket Coaching (selaras src/lib/member.ts).
const COACH_LEVELS = ["BOD-1", "BOD-2"];
const canCreateCoaching = (level: string | null | undefined) => !!level && COACH_LEVELS.includes(level.trim());

/** Logo LinkedIn (lucide tidak menyediakan ikon brand ini). */
function LinkedinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

interface BucketType { key: string; label: string; earned: number; earnedReal: number; target: number; pct: number }
interface Bucket { key: string; label: string; earned: number; earnedReal: number; target: number; pct: number; types?: BucketType[] }
interface LClass {
  crm_id: number; name: string; type: string | null; status: string | null;
  bucket: string | null; method: string | null; methodLabel: string | null;
  penyelenggara: string | null;
  jpl: number; date_start: string | null; date_end: string | null;
  verified: boolean; has_certificate: boolean;
}
interface Data {
  summary: { total: { earned: number; earnedReal: number; target: number; pct: number }; buckets: Bucket[]; totalClasses: number; certificates: number };
  classes: LClass[];
  member?: { name: string | null; email: string | null; level?: string | null };
}
interface ClassMateri { type: string; title: string; url: string | null; isVideo: boolean }
interface ClassModule { name: string; start: string | null; end: string | null; materi: ClassMateri[] }
interface ClassDetail {
  crm_id: number; name: string; desc: string | null; moduleDesc: string | null;
  modules: ClassModule[]; certificate: string | null; scorePre: number | null; scorePost: number | null;
  jpl: number; methodLabel: string | null; penyelenggara: string | null; date_start: string | null; date_end: string | null;
  verified: boolean; has_certificate: boolean;
}

// Belajar Mandiri terhubung ke LinkedIn Learning. Katalog ditautkan langsung
// ke LinkedIn Learning (hyperlink) — tiap kartu membuka pencarian topik terkait.
const LINKEDIN_LEARNING_URL = "https://www.linkedin.com/learning/";
const LINKEDIN_CATALOG: { title: string; topic: string; keyword: string }[] = [
  { title: "Leadership Foundations", topic: "Kepemimpinan", keyword: "leadership foundations" },
  { title: "Project Management Foundations", topic: "Manajemen Proyek", keyword: "project management foundations" },
  { title: "Data Analysis with Excel", topic: "Analisis Data", keyword: "excel data analysis" },
  { title: "Effective Communication", topic: "Komunikasi", keyword: "communication skills" },
  { title: "Agile Project Management", topic: "Agile", keyword: "agile project management" },
  { title: "Financial Literacy", topic: "Keuangan", keyword: "finance for non financial managers" },
  { title: "Digital Transformation", topic: "Transformasi Digital", keyword: "digital transformation" },
  { title: "Time Management", topic: "Produktivitas", keyword: "time management" },
];
const linkedinSearchUrl = (keyword: string) =>
  `https://www.linkedin.com/learning/search?keywords=${encodeURIComponent(keyword)}`;

const BUCKET_META: Record<string, { icon: typeof GraduationCap; short: string; accent: string }> = {
  formal: { icon: GraduationCap, short: "Formal", accent: "from-lime-500 to-green-600" },
  social: { icon: Users, short: "Sosial", accent: "from-teal-500 to-emerald-600" },
  experiential: { icon: Briefcase, short: "Experiential", accent: "from-emerald-500 to-green-700" },
};

// Label metode belajar (kode `_learning_kategori`) — dipakai saat filter via ?metode=.
const METHOD_LABEL: Record<string, string> = {
  mb_ict: "Belajar di Kelas", mb_sl: "Belajar Mandiri", mb_w: "Workshop",
  mb_c: "Coaching", mb_m: "Mentoring", mb_b: "Benchmark",
  mb_lo: "Action Based Learning", mb_pa: "Project Assignment", mb_ib: "Innovation Box",
};

const fmtDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

// "earned/target Unit" — saat target 0 (tahun tanpa target, mode history)
// tampilkan capaian saja tanpa "/0" yang membingungkan.
const progressLabel = (earned: number, target: number, unit: string) =>
  target > 0 ? `${earned}/${target} ${unit}` : `${earned} ${unit}`;

// Label capaian: tampilkan JPL realisasi sebenarnya + berapa yang "diakui"
// (di-cap ke target). Bila tak ada kelebihan, cukup tampilkan "diakui/target".
const recognizedLabel = (earned: number, earnedReal: number, target: number, unit: string) =>
  target > 0 && earnedReal > earned
    ? `${earnedReal} ${unit} · diakui ${earned}/${target}`
    : progressLabel(earned, target, unit);

// Format "tanggal jam" sesi paket (timestamp dari DB, mis. "2026-07-01 09:00:00").
const fmtDateTime = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

interface PaketSesi { urutan: number; tanggal: string }
interface Paket {
  id: number; kode: string; tipe: "coach" | "mentor"; mode: string | null;
  tahun: number; noPaket: number; jpl: number; statusApproval: string | null;
  peserta: { id: number; nama: string | null } | null;
  sessions: PaketSesi[];
}

function LearningInner() {
  const params = useSearchParams();
  // Filter bisa berupa bucket (formal/social/experiential) atau kode metode (mb_*) lewat ?metode=.
  const paramFilter = (p: URLSearchParams) => p.get("metode") || p.get("bucket") || "all";
  const [filter, setFilter] = useState(() => paramFilter(params));
  const [openType, setOpenType] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Pemilih tahun — default tahun berjalan; daftar opsi datang dari API.
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [years, setYears] = useState<number[]>(() => [new Date().getFullYear()]);

  // Modal "Kelola Jadwal" Coaching/Mentoring (khusus pembimbing BOD-1/BOD-2 pada
  // view ?metode=mb_c / mb_m). Null = tertutup.
  const [guidanceModal, setGuidanceModal] = useState<"coach" | "mentor" | null>(null);
  // Dinaikkan setelah sebuah paket baru dibuat agar daftar paket dimuat ulang.
  const [packagesReload, setPackagesReload] = useState(0);

  // Detail kelas (modul + sertifikat) — di-fetch saat sebuah row diklik.
  const [openCrm, setOpenCrm] = useState<number | null>(null);
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState(false);

  function openDetail(crmId: number) {
    setOpenCrm(crmId);
    setDetail(null);
    setDetailErr(false);
    setDetailLoading(true);
    fetch(`/api/learning/${crmId}`)
      .then((r) => r.json())
      .then((d) => { d.detail ? setDetail(d.detail) : setDetailErr(true); })
      .catch(() => setDetailErr(true))
      .finally(() => setDetailLoading(false));
  }

  useEffect(() => { setFilter(paramFilter(params)); }, [params]);
  useEffect(() => {
    let alive = true;
    setErr(null);
    setData(null); // tampilkan skeleton saat ganti tahun
    fetch(`/api/learning?year=${year}`)
      .then(async (r) => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }))
      .then(({ ok, status, body }) => {
        if (!alive) return;
        if (ok && body.summary) {
          setData(body);
          if (Array.isArray(body.years) && body.years.length) setYears(body.years);
          return;
        }
        // Susun pesan dari respons API; sertakan detail teknis bila ada (dev).
        const msg = body.error || `Permintaan gagal (HTTP ${status}).`;
        setErr(body.detail ? `${msg} — ${body.detail}` : msg);
      })
      .catch((e) => { if (alive) setErr(`Tidak dapat terhubung ke server: ${e instanceof Error ? e.message : "kesalahan jaringan"}.`); });
    return () => { alive = false; };
  }, [year]);

  const activeMethod = METHOD_LABEL[filter] ? filter : null;
  const classes = (data?.classes ?? []).filter(
    (c) => filter === "all" || c.bucket === filter || c.method === filter,
  );

  const TABS = [
    { key: "all", label: "Semua" },
    { key: "formal", label: "Formal (10)" },
    { key: "social", label: "Sosial (20)" },
    { key: "experiential", label: "Experiential (70)" },
  ];

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Progres Pembelajaran" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Aktivitas Pembelajaran</h1>
            <p className="mt-1 text-[14px] text-white/60">Progres pengembangan kompetensi dengan kerangka 70 · 20 · 10.</p>
          </div>
          {/* Pemilih tahun — default tahun berjalan. */}
          <label className="relative inline-flex shrink-0 items-center">
            <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-emerald-300/70" />
            <span className="sr-only">Pilih tahun</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none rounded-full border border-white/12 bg-white/[0.05] py-2 pl-9 pr-9 text-[13px] font-semibold text-white outline-none transition-colors hover:bg-white/[0.08] focus:border-emerald-400/50 [&>option]:bg-[#1d1f1c] [&>option]:text-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-white/40" />
          </label>
        </div>

        {err && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <p className="font-semibold">Gagal memuat data.</p>
            <p className="mt-1 text-red-300/80">{err}</p>
          </div>
        )}
        {!data && !err && (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} className="p-5">
                  <div className="flex items-center justify-between"><Skeleton className="h-11 w-11 rounded-xl" /><Skeleton className="h-4 w-16" /></div>
                  <Skeleton className="mt-4 h-4 w-24" />
                  <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
                </SkeletonCard>
              ))}
            </section>
            <div className="mt-6 flex gap-2">
              {[16, 24, 20, 28].map((w, i) => <Skeleton key={i} className="h-9 rounded-full" style={{ width: `${w * 4}px` }} />)}
            </div>
            <section className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} className="flex items-start gap-4">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1"><Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-1/3" /><Skeleton className="mt-2 h-5 w-28 rounded-full" /></div>
                </SkeletonCard>
              ))}
            </section>
          </>
        )}

        {data && (
          <>
            {/* Ringkasan 70-20-10 */}
            <section className="mt-5 grid gap-4 sm:grid-cols-3">
              {data.summary.buckets.map((b) => {
                const meta = BUCKET_META[b.key];
                const Icon = meta.icon;
                return (
                  <div key={b.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${meta.accent}`}><Icon className="h-5 w-5" /></div>
                      <span className="text-sm font-bold text-white/70">{recognizedLabel(b.earned, b.earnedReal, b.target, "Jam")}</span>
                    </div>
                    <p className="mt-4 text-[15px] font-semibold">{meta.short}</p>
                    {GLOSSARY[b.key]?.desc && (
                      <p className="mt-1 text-[11.5px] leading-snug text-white/45">{GLOSSARY[b.key].desc}</p>
                    )}
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-gradient-to-r ${meta.accent}`} style={{ width: `${Math.min(b.pct, 100)}%` }} />
                    </div>
                    <p className="mt-1.5 text-right text-[12px] font-medium text-white/50">{b.pct}%</p>
                  </div>
                );
              })}
            </section>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-white/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> {data.summary.totalClasses} kelas</span>
              <span className="inline-flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-400" /> {data.summary.certificates} sertifikat</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-sky-400" /> Total {recognizedLabel(data.summary.total.earned, data.summary.total.earnedReal, data.summary.total.target, "Jam")}{data.summary.total.target > 0 ? ` (${data.summary.total.pct}%)` : ""}</span>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${filter === t.key ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/10"}`}
                >
                  {t.label}
                </button>
              ))}
              {activeMethod && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-[13px] font-medium text-white">
                  {METHOD_LABEL[activeMethod]}
                  <button onClick={() => setFilter("all")} aria-label="Hapus filter metode" className="-mr-1 rounded-full p-0.5 hover:bg-white/20">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>

            {/* Rincian progres JPL per jenis untuk bucket aktif
                (mis. Formal → Workshop, Belajar di Kelas, Belajar Mandiri). */}
            {(() => {
              const bk = data.summary.buckets.find((b) => b.key === filter);
              if (!bk?.types?.length) return null;
              const meta = BUCKET_META[bk.key];
              return (
                <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold">Progres JPL per Jenis — {meta?.short ?? bk.label}</p>
                    <span className="text-[13px] font-bold text-white/70">{recognizedLabel(bk.earned, bk.earnedReal, bk.target, "Jam")}</span>
                  </div>
                  <p className="mt-1 text-[12px] text-white/45">Klik jenis untuk melihat pelatihan yang kamu jalani.</p>
                  <div className="mt-4 space-y-2.5">
                    {bk.types.map((t) => {
                      const typeClasses = data.classes.filter((c) => c.method === t.key);
                      const open = openType === t.key;
                      return (
                        <div key={t.key} className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
                          <button onClick={() => setOpenType(open ? null : t.key)} className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03]">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2 text-[13px]">
                                <span className="font-medium">{t.label} <span className="text-white/40">· {typeClasses.length} pelatihan</span></span>
                                <span className="text-white/55">{recognizedLabel(t.earned, t.earnedReal, t.target, "JPL")}{t.target > 0 ? ` · ${t.pct}%` : ""}</span>
                              </div>
                              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                                <div className={`h-full rounded-full bg-gradient-to-r ${meta?.accent ?? "from-emerald-500 to-green-600"}`} style={{ width: `${Math.min(t.pct, 100)}%` }} />
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                          {open && (
                            <div className="border-t border-white/8 px-3.5 py-3">
                              {GLOSSARY[t.key]?.desc && (
                                <p className="mb-3 text-[12.5px] leading-relaxed text-white/55">{GLOSSARY[t.key].desc}</p>
                              )}
                              {typeClasses.length === 0 ? (
                                <p className="py-1.5 text-center text-[12.5px] text-white/45">Belum ada pelatihan {t.label} yang kamu jalani.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {typeClasses.map((c) => (
                                    <li key={c.crm_id}>
                                      <button onClick={() => openDetail(c.crm_id)} className="group flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-500/40 hover:bg-white/[0.04]">
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-[13px] font-medium group-hover:text-emerald-200">{c.name}</p>
                                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-white/50">
                                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {c.jpl} JPL</span>
                                            {c.penyelenggara && <span>{c.penyelenggara}</span>}
                                            {fmtDate(c.date_start) && <span>{fmtDate(c.date_start)}</span>}
                                            {c.verified ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Terverifikasi</span> : <span className="text-white/40">Belum diverifikasi</span>}
                                          </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {/* Belajar Mandiri → LinkedIn Learning */}
            {filter === "mb_sl" && (
              <section className="mt-5 space-y-4">
                {/* Kartu koneksi LinkedIn Learning */}
                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a66c2]/20 to-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a66c2]"><LinkedinMark className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">LinkedIn Learning</p>
                      <p className="mt-0.5 text-[13px] text-white/60">
                        Belajar mandiri lewat ribuan kursus LinkedIn Learning.
                        {data.member?.email && <> Masuk dengan email kerja: <span className="font-medium text-white/80">{data.member.email}</span></>}
                      </p>
                    </div>
                  </div>
                  <a
                    href={LINKEDIN_LEARNING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0a66c2] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0958a8]"
                  >
                    Buka LinkedIn Learning <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Katalog pelatihan */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold">Katalog Pelatihan</p>
                    <a href={LINKEDIN_LEARNING_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#4a9eff] hover:underline">
                      Lihat semua <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {LINKEDIN_CATALOG.map((c) => (
                      <a
                        key={c.title}
                        href={linkedinSearchUrl(c.keyword)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-[#0a66c2]/50 hover:bg-white/[0.05]"
                      >
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0a66c2]/15 px-2.5 py-0.5 text-[11px] font-medium text-[#4a9eff]">
                          <LinkedinMark className="h-3 w-3" /> {c.topic}
                        </span>
                        <span className="mt-3 text-[14px] font-semibold leading-snug">{c.title}</span>
                        <span className="mt-auto pt-3 inline-flex items-center gap-1 text-[12px] text-white/50 group-hover:text-white/70">
                          Mulai belajar <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Katalog pelatihan internal kategori Belajar Mandiri */}
                <LearningCatalog metode="mb_sl" label="Belajar Mandiri" />
              </section>
            )}

            {/* Kelola Jadwal Coaching/Mentoring — pada view mb_c / mb_m & untuk pembimbing BOD-1/BOD-2 */}
            {(filter === "mb_c" || filter === "mb_m") && canCreateCoaching(data.member?.level) && (() => {
              const tipe: "coach" | "mentor" = filter === "mb_m" ? "mentor" : "coach";
              const noun = tipe === "mentor" ? "mentoring" : "coaching";
              const title = tipe === "mentor" ? "Kelola Jadwal Mentoring" : "Kelola Jadwal Coaching";
              return (
                <section className="mt-5">
                  <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600"><UserPlus className="h-5 w-5" /></div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold">{title}</p>
                        <p className="mt-0.5 text-[13px] text-white/60">
                          Sebagai pembimbing ({data.member?.level}), susun jadwal pertemuan {noun} (4–6 sesi).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGuidanceModal(tipe)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600"
                    >
                      <Plus className="h-4 w-4" /> Buat Paket {tipe === "mentor" ? "Mentoring" : "Coaching"}
                    </button>
                  </div>
                </section>
              );
            })()}

            {/* Paket Coaching/Mentoring yang dibuat oleh pembimbing yang login */}
            {(filter === "mb_c" || filter === "mb_m") && canCreateCoaching(data.member?.level) && (
              <GuidancePackages tipe={filter === "mb_m" ? "mentor" : "coach"} reload={packagesReload} />
            )}

            {/* Katalog pelatihan internal untuk metode aktif (mb_sl punya katalog
                sendiri di section LinkedIn, jadi dikecualikan di sini). */}
            {activeMethod && activeMethod !== "mb_sl" && (
              <LearningCatalog metode={activeMethod} label={METHOD_LABEL[activeMethod]} />
            )}

            {/* Daftar kelas — disembunyikan pada tampilan bucket (sudah ada
                drill-down "Progres JPL per Jenis"); tetap tampil di "Semua" & per-metode. */}
            {!["formal", "social", "experiential"].includes(filter) && (
            <section className="mt-5 space-y-3">
              {classes.length === 0 && <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/50">{filter === "mb_sl" ? "Belum ada aktivitas belajar mandiri tercatat. Mulai dari katalog di atas." : "Belum ada aktivitas pada kategori ini."}</p>}
              {classes.map((c) => {
                const meta = c.bucket ? BUCKET_META[c.bucket] : null;
                const Icon = meta?.icon ?? GraduationCap;
                return (
                  <button
                    key={c.crm_id}
                    type="button"
                    onClick={() => openDetail(c.crm_id)}
                    className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-emerald-500/50 hover:bg-white/[0.05]"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta?.accent ?? "from-slate-500 to-slate-700"}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug group-hover:text-emerald-200">{c.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-white/55">
                        <span>{c.methodLabel ?? meta?.short ?? "Lainnya"}</span>
                        {c.penyelenggara && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {c.penyelenggara}</span>}
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.jpl} JPL</span>
                        {fmtDate(c.date_start) && <span>{fmtDate(c.date_start)}{fmtDate(c.date_end) ? ` – ${fmtDate(c.date_end)}` : ""}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {c.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Terverifikasi</span>}
                        {c.has_certificate && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300"><Award className="h-3.5 w-3.5" /> Bersertifikat</span>}
                        {!c.verified && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/50">Belum diverifikasi</span>}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </button>
                );
              })}
            </section>
            )}
          </>
        )}
      </main>

      {openCrm != null && (
        <ClassDetailModal
          loading={detailLoading}
          err={detailErr}
          detail={detail}
          onClose={() => setOpenCrm(null)}
        />
      )}

      {guidanceModal && (
        <CoachingPackageModal
          tipe={guidanceModal}
          onClose={() => setGuidanceModal(null)}
          onCreated={() => setPackagesReload((n) => n + 1)}
        />
      )}
    </div>
  );
}

interface SesiRow { tanggal: string; jam: string }
interface Bawahan { nikSap: string; nama: string; psa: string | null }
type CoachingMode = "development_dialogue" | "publik";
type GuidanceTipe = "coach" | "mentor";

const MIN_SESI = 4;
const MAX_SESI = 6;

// Konfigurasi label per jenis bimbingan (coaching/mentoring) — strukturnya sama.
const GUIDANCE: Record<GuidanceTipe, { title: string; actor: string; coachee: string }> = {
  coach: { title: "Kelola Jadwal Coaching", actor: "Coach", coachee: "coachee" },
  mentor: { title: "Kelola Jadwal Mentoring", actor: "Mentor", coachee: "mentee" },
};

const guidanceModes = (coachee: string): { key: CoachingMode; label: string; desc: string }[] => [
  { key: "development_dialogue", label: "Development Dialogue", desc: `Konteks atasan–bawahan. Pilih bawahan sebagai ${coachee}.` },
  { key: "publik", label: "Publik", desc: `Terbuka, tanpa memilih ${coachee}.` },
];

const guidanceRules = (actor: string) => [
  "Tentukan jumlah pertemuan bimbingan yang dibutuhkan",
  `${actor} dapat membuat jadwal pertemuan kegiatan sesuai dengan ketersediaan waktu masing-masing`,
  "Setiap jadwal pertemuan berisikan MINIMAL 4 sesi dan MAKSIMAL 6 sesi pertemuan",
  "Durasi 4 sesi (2 bulan) hingga 6 sesi (3 bulan)",
  "Untuk membuat 1 jadwal pertemuan, isikan terlebih dahulu sesi-sesi yang diajukan kemudian klik Submit",
  "Jadwal pertemuan yang diajukan akan muncul pada halaman profil",
  "Ulangi langkah yang sama untuk membuat jadwal pertemuan lainnya",
];

/**
 * Modal "Kelola Jadwal Coaching/Mentoring" — pembimbing (BOD-1/BOD-2) menyusun 1
 * paket berisi 4–6 sesi (tanggal + jam mulai). Paket mendapat kode otomatis &
 * sesi diurutkan otomatis oleh server. `tipe` membedakan coaching vs mentoring.
 */
function CoachingPackageModal({ tipe, onClose, onCreated }: { tipe: GuidanceTipe; onClose: () => void; onCreated?: () => void }) {
  const g = GUIDANCE[tipe];
  const MODES_LIST = guidanceModes(g.coachee);
  const RULES = guidanceRules(g.actor);
  const [mode, setMode] = useState<CoachingMode>("development_dialogue");
  const [bawahan, setBawahan] = useState<Bawahan[]>([]);
  const [bawahanLoading, setBawahanLoading] = useState(false);
  const [nikSap, setNikSap] = useState<string>("");
  const [sessions, setSessions] = useState<SesiRow[]>(() =>
    Array.from({ length: MIN_SESI }, () => ({ tanggal: "", jam: "" })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ kode: string; sessions: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Muat daftar bawahan SEKALI saat mode Development Dialogue pertama dipakai.
  // Pakai ref agar tidak refetch (hasil kosong + deps loading/length memicu loop → flicker).
  const bawahanFetched = useRef(false);
  useEffect(() => {
    if (mode !== "development_dialogue" || bawahanFetched.current) return;
    bawahanFetched.current = true;
    setBawahanLoading(true);
    fetch("/api/coaching/bawahan")
      .then((r) => (r.ok ? r.json() : { bawahan: [] }))
      .then((d) => setBawahan(d.bawahan ?? []))
      .catch(() => setBawahan([]))
      .finally(() => setBawahanLoading(false));
  }, [mode]);

  const setRow = (i: number, key: keyof SesiRow, val: string) =>
    setSessions((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () => setSessions((rows) => (rows.length >= MAX_SESI ? rows : [...rows, { tanggal: "", jam: "" }]));
  const removeRow = (i: number) => setSessions((rows) => (rows.length <= MIN_SESI ? rows : rows.filter((_, idx) => idx !== i)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "development_dialogue" && !nikSap) { setError("Pilih bawahan (coachee) terlebih dahulu."); return; }
    const filled = sessions.filter((s) => s.tanggal && s.jam);
    if (filled.length !== sessions.length) { setError("Lengkapi tanggal & jam mulai untuk semua sesi."); return; }
    if (sessions.length < MIN_SESI || sessions.length > MAX_SESI) { setError(`Jumlah sesi harus ${MIN_SESI}–${MAX_SESI}.`); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/coaching/paket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipe, mode, nikSap: mode === "development_dialogue" ? nikSap : undefined, sessions }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Gagal menyimpan."); setSaving(false); return; }
      setDone({ kode: d.kode ?? "-", sessions: d.sessions ?? sessions.length });
      onCreated?.();
    } catch { setError("Gagal terhubung ke server."); setSaving(false); }
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white outline-none placeholder:text-white/30 focus:border-emerald-500/50 [color-scheme:dark]";

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1d1f1c] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600"><UserPlus className="h-5 w-5" /></div>
            <p className="text-[16px] font-bold text-white">{g.title}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15"><CheckCircle2 className="h-6 w-6 text-emerald-400" /></div>
            <p className="mt-3 text-[15px] font-semibold text-white">Jadwal {tipe === "mentor" ? "mentoring" : "coaching"} dipublikasikan</p>
            <p className="mt-1 text-[13px] text-white/55">
              Paket <span className="font-semibold text-emerald-300">{done.kode}</span> berisi {done.sessions} sesi sudah aktif dan tampil di profil.
            </p>
            <button onClick={onClose} className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600">
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-4">
            {/* Informasi */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[13px] font-semibold text-white/80">Informasi</p>
              <ul className="mt-2 space-y-1.5">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-snug text-white/55">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mode coaching */}
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-white/70">Mode *</p>
              <div className="grid grid-cols-2 gap-2.5">
                {MODES_LIST.map((m) => (
                  <button key={m.key} type="button" onClick={() => setMode(m.key)}
                    className={`rounded-xl border p-3 text-left transition-colors ${mode === m.key ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                    <span className={`block text-[13.5px] font-semibold ${mode === m.key ? "text-emerald-300" : "text-white"}`}>{m.label}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-white/50">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bawahan (coachee) — hanya untuk Development Dialogue */}
            {mode === "development_dialogue" && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-white/70">Bawahan (Coachee) *</label>
                <select value={nikSap} onChange={(e) => setNikSap(e.target.value)} disabled={bawahanLoading || bawahan.length === 0} className={inputCls}>
                  <option value="">{bawahanLoading ? "Memuat bawahan…" : bawahan.length === 0 ? "Tidak ada bawahan" : "— Pilih bawahan —"}</option>
                  {bawahan.map((bw) => (
                    <option key={bw.nikSap} value={bw.nikSap}>{bw.nama}{bw.psa ? ` — ${bw.psa}` : ""}</option>
                  ))}
                </select>
                {!bawahanLoading && bawahan.length === 0 && (
                  <p className="mt-1 text-[11.5px] text-amber-300/80">Tidak ada bawahan untuk akun Anda di AGHRIS. Gunakan mode Publik.</p>
                )}
              </div>
            )}

            {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">{error}</p>}

            {/* Sesi-sesi */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-medium text-white/70">Sesi Pertemuan ({sessions.length}/{MAX_SESI})</p>
                <button type="button" onClick={addRow} disabled={sessions.length >= MAX_SESI}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" /> Tambah Sesi
                </button>
              </div>

              {sessions.map((s, i) => (
                <div key={i} className="flex items-end gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="mb-2.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[12px] font-bold text-emerald-300">{i + 1}</span>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11.5px] font-medium text-white/55">Tanggal Pelatihan *</label>
                    <input type="date" required value={s.tanggal} onChange={(e) => setRow(i, "tanggal", e.target.value)} className={inputCls} />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11.5px] font-medium text-white/55">Jam Mulai *</label>
                    <input type="time" required value={s.jam} onChange={(e) => setRow(i, "jam", e.target.value)} className={inputCls} />
                  </div>
                  <button type="button" onClick={() => removeRow(i)} disabled={sessions.length <= MIN_SESI}
                    title={sessions.length <= MIN_SESI ? `Minimal ${MIN_SESI} sesi` : "Hapus sesi"}
                    className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <p className="text-[11.5px] text-white/40">Minimal {MIN_SESI} sesi, maksimal {MAX_SESI} sesi. Sesi akan diurutkan otomatis berdasarkan tanggal & jam.</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/10">Batal</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  diterima: { label: "Aktif", cls: "bg-emerald-500/15 text-emerald-300" },
  pending: { label: "Menunggu", cls: "bg-amber-500/15 text-amber-300" },
  ditolak: { label: "Ditolak", cls: "bg-red-500/15 text-red-300" },
};
const MODE_LABEL: Record<string, string> = { development_dialogue: "Development Dialogue", publik: "Publik" };

/**
 * Daftar Paket Coaching/Mentoring yang sudah dibuat oleh pembimbing yang login.
 * Tiap paket bisa diklik untuk melihat detail sesinya (jadwal pertemuan).
 */
function GuidancePackages({ tipe, reload }: { tipe: GuidanceTipe; reload: number }) {
  const noun = tipe === "mentor" ? "Mentoring" : "Coaching";
  const [pakets, setPakets] = useState<Paket[] | null>(null);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState<Paket | null>(null);

  useEffect(() => {
    let alive = true;
    setPakets(null);
    setErr(false);
    fetch(`/api/coaching/paket?tipe=${tipe}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setPakets(d.pakets ?? []); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [tipe, reload]);

  return (
    <section className="mt-5">
      <h3 className="mb-2.5 flex items-center gap-2 text-[14px] font-semibold text-white/80">
        <CalendarDays className="h-4 w-4 text-emerald-400" /> Paket {noun} yang Anda Buat
      </h3>

      {err && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat paket {noun.toLowerCase()}.</p>}

      {!pakets && !err && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} className="flex items-start gap-4">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="mt-2 h-3 w-1/2" /></div>
            </SkeletonCard>
          ))}
        </div>
      )}

      {pakets && pakets.length === 0 && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center text-[13px] text-white/50">
          Anda belum membuat paket {noun.toLowerCase()}. Klik “Buat Paket {noun}” di atas untuk menyusun jadwal.
        </p>
      )}

      {pakets && pakets.length > 0 && (
        <div className="space-y-3">
          {pakets.map((p) => {
            const badge = STATUS_BADGE[p.statusApproval ?? ""] ?? { label: p.statusApproval ?? "—", cls: "bg-white/10 text-white/55" };
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpen(p)}
                className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-emerald-500/50 hover:bg-white/[0.05]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600"><CalendarDays className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold leading-snug group-hover:text-emerald-200">{p.kode}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-white/55">
                    {p.mode && <span>{MODE_LABEL[p.mode] ?? p.mode}</span>}
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {p.sessions.length} sesi</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.jpl} JPL</span>
                    {p.peserta?.nama && <span className="inline-flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> {p.peserta.nama}</span>}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" />
              </button>
            );
          })}
        </div>
      )}

      {open && <PackageDetailModal paket={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

/** Modal detail paket — daftar sesi pertemuan (jadwal) sebuah paket. */
function PackageDetailModal({ paket, onClose }: { paket: Paket; onClose: () => void }) {
  const noun = paket.tipe === "mentor" ? "Mentoring" : "Coaching";
  const badge = STATUS_BADGE[paket.statusApproval ?? ""] ?? { label: paket.statusApproval ?? "—", cls: "bg-white/10 text-white/55" };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-lg rounded-2xl border border-white/10 bg-[#1d1f1c] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[16px] font-bold leading-snug text-white">{paket.kode}</p>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-white/45">
              <span>Paket {noun}</span>
              {paket.mode && <span>{MODE_LABEL[paket.mode] ?? paket.mode}</span>}
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {paket.jpl} JPL</span>
              {paket.peserta?.nama && <span className="inline-flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> {paket.peserta.nama}</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white/70">
            <CalendarDays className="h-4 w-4 text-emerald-400" /> Jadwal Sesi ({paket.sessions.length})
          </h4>
          {paket.sessions.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-[13px] text-white/45">Belum ada sesi pada paket ini.</p>
          ) : (
            <ul className="space-y-2.5">
              {paket.sessions.map((s) => (
                <li key={s.urutan} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[12px] font-bold text-emerald-300">{s.urutan}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-white/55">Sesi {s.urutan}</p>
                    <p className="text-[14px] font-semibold text-white">{fmtDateTime(s.tanggal) ?? "—"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal detail kelas — daftar modul + materi, dan sertifikat. */
function ClassDetailModal({ loading, err, detail, onClose }: { loading: boolean; err: boolean; detail: ClassDetail | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1d1f1c] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-[16px] font-bold leading-snug text-white">{detail?.name ?? (loading ? "Memuat…" : "Detail Kelas")}</p>
            {detail && (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-white/45">
                {detail.methodLabel && <span>{detail.methodLabel}</span>}
                {detail.penyelenggara && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {detail.penyelenggara}</span>}
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {detail.jpl} JPL</span>
                {fmtDate(detail.date_start) && <span>{fmtDate(detail.date_start)}{fmtDate(detail.date_end) ? ` – ${fmtDate(detail.date_end)}` : ""}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4">
          {loading && (
            <>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </>
          )}
          {err && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat detail kelas.</p>}

          {detail && (
            <>
              {/* Nilai pre/post */}
              {(detail.scorePre != null || detail.scorePost != null) && (
                <section className="flex flex-wrap gap-3">
                  {detail.scorePre != null && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                      <p className="text-[11px] text-white/45">Pre-test</p>
                      <p className="text-[18px] font-bold text-white">{detail.scorePre}</p>
                    </div>
                  )}
                  {detail.scorePost != null && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                      <p className="text-[11px] text-white/45">Post-test</p>
                      <p className="text-[18px] font-bold text-white">{detail.scorePost}</p>
                    </div>
                  )}
                </section>
              )}

              {/* Modul */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white/70">
                  <FileText className="h-4 w-4 text-emerald-400" /> Modul Pembelajaran
                </h4>
                {detail.modules.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-[13px] text-white/45">Belum ada modul untuk kelas ini.</p>
                ) : (
                  <div className="space-y-3">
                    {detail.modules.map((mod, i) => (
                      <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] font-semibold text-white">{mod.name}</p>
                          {(mod.start || mod.end) && (
                            <span className="shrink-0 text-[11.5px] text-white/40">{fmtDate(mod.start)}{mod.end ? ` – ${fmtDate(mod.end)}` : ""}</span>
                          )}
                        </div>
                        {mod.materi.length > 0 && (
                          <ul className="mt-2.5 space-y-1.5">
                            {mod.materi.map((mt, j) => {
                              const MtIcon = mt.isVideo ? PlayCircle : FileText;
                              const inner = (
                                <span className="flex items-center gap-2.5">
                                  <MtIcon className={`h-4 w-4 shrink-0 ${mt.isVideo ? "text-rose-300" : "text-sky-300"}`} />
                                  <span className="min-w-0 flex-1 truncate text-[13px] text-white/80">{mt.title}</span>
                                  {mt.url && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/40" />}
                                </span>
                              );
                              return (
                                <li key={j}>
                                  {mt.url ? (
                                    <a href={mt.url} target="_blank" rel="noopener noreferrer"
                                      className="block rounded-lg px-2.5 py-2 transition-colors hover:bg-white/[0.06]">
                                      {inner}
                                    </a>
                                  ) : (
                                    <div className="rounded-lg px-2.5 py-2">{inner}</div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sertifikat */}
              <section>
                <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-white/70">
                  <Award className="h-4 w-4 text-amber-400" /> Sertifikat
                </h4>
                {detail.certificate ? (
                  <a href={detail.certificate} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-amber-500/90 px-5 py-2.5 text-[13px] font-semibold text-[#3a2700] transition-colors hover:bg-amber-400">
                    <Download className="h-4 w-4" /> Lihat / Unduh Sertifikat
                  </a>
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-[13px] text-white/45">
                    {detail.has_certificate ? "Sertifikat sedang diproses." : "Sertifikat belum tersedia untuk kelas ini."}
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LearningPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#19191B] text-white"><AppHeader active="Progres Pembelajaran" /><p className="mx-auto max-w-[1100px] px-4 py-10 text-white/50">Memuat…</p></div>}>
      <LearningInner />
    </Suspense>
  );
}
