"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { GraduationCap, Users, Briefcase, CheckCircle2, Award, Clock, BadgeCheck, X, ExternalLink, ArrowUpRight, FileText, PlayCircle, ChevronRight, Download } from "lucide-react";

/** Logo LinkedIn (lucide tidak menyediakan ikon brand ini). */
function LinkedinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

interface Bucket { key: string; label: string; earned: number; target: number; pct: number }
interface LClass {
  crm_id: number; name: string; type: string | null; status: string | null;
  bucket: string | null; method: string | null; methodLabel: string | null;
  jpl: number; date_start: string | null; date_end: string | null;
  verified: boolean; has_certificate: boolean;
}
interface Data {
  summary: { total: { earned: number; target: number; pct: number }; buckets: Bucket[]; totalClasses: number; certificates: number };
  classes: LClass[];
  member?: { name: string | null; email: string | null };
}
interface ClassMateri { type: string; title: string; url: string | null; isVideo: boolean }
interface ClassModule { name: string; start: string | null; end: string | null; materi: ClassMateri[] }
interface ClassDetail {
  crm_id: number; name: string; desc: string | null; moduleDesc: string | null;
  modules: ClassModule[]; certificate: string | null; scorePre: number | null; scorePost: number | null;
  jpl: number; methodLabel: string | null; date_start: string | null; date_end: string | null;
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

function LearningInner() {
  const params = useSearchParams();
  // Filter bisa berupa bucket (formal/social/experiential) atau kode metode (mb_*) lewat ?metode=.
  const paramFilter = (p: URLSearchParams) => p.get("metode") || p.get("bucket") || "all";
  const [filter, setFilter] = useState(() => paramFilter(params));
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

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
    fetch("/api/learning").then((r) => r.json()).then((d) => { d.summary ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

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
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Aktivitas Pembelajaran</h1>
        <p className="mt-1 text-[14px] text-white/60">Progres pengembangan kompetensi dengan kerangka 70 · 20 · 10.</p>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}
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
                      <span className="text-sm font-bold text-white/70">{b.earned}/{b.target} Jam</span>
                    </div>
                    <p className="mt-4 text-[15px] font-semibold">{meta.short}</p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full bg-gradient-to-r ${meta.accent}`} style={{ width: `${b.pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-right text-[12px] font-medium text-white/50">{b.pct}%</p>
                  </div>
                );
              })}
            </section>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-white/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> {data.summary.totalClasses} kelas</span>
              <span className="inline-flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-400" /> {data.summary.certificates} sertifikat</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-sky-400" /> Total {data.summary.total.earned}/{data.summary.total.target} Jam ({data.summary.total.pct}%)</span>
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
              </section>
            )}

            {/* Daftar kelas */}
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
