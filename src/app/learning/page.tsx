"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { GraduationCap, Users, Briefcase, CheckCircle2, Award, Clock, BadgeCheck, X } from "lucide-react";

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
}

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
    <div className="min-h-screen bg-[#19191B] text-white">
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

            {/* Daftar kelas */}
            <section className="mt-5 space-y-3">
              {classes.length === 0 && <p className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/50">Belum ada aktivitas pada kategori ini.</p>}
              {classes.map((c) => {
                const meta = c.bucket ? BUCKET_META[c.bucket] : null;
                const Icon = meta?.icon ?? GraduationCap;
                return (
                  <div key={c.crm_id} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta?.accent ?? "from-slate-500 to-slate-700"}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-snug">{c.name}</p>
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
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
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
