"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from "recharts";
import { Radar as RadarIcon, Target, TrendingUp, GraduationCap, Clock, ArrowRight, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton } from "@/components/Skeleton";

// ── Tipe dari /api/skillgap ──
interface Axis { catId: number; name: string; short: string; kode: string; bucket: string; bucketLabel: string; target: number; earned: number; pct: number; remaining: number }
interface Bucket { key: string; label: string; earned: number; target: number; pct: number }
interface Rec { id: number; nama: string; jplTotal: number; durasiHari: number; harga: number; metode: string | null; deskripsi: string; score: number; fills: { name: string; short: string; jpl: number }[] }
interface SkillGap { year: number; axes: Axis[]; buckets: Bucket[]; recommendations: Rec[]; total: { earned: number; target: number; pct: number } }

const BUCKET_COLOR: Record<string, string> = { formal: "#a3e635", social: "#2dd4bf", experiential: "#34d399" };
const rupiah = (n: number) => (n > 0 ? `Rp ${n.toLocaleString("id-ID")}` : "Gratis");

export default function KompetensiPage() {
  const [data, setData] = useState<SkillGap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skillgap").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  const radarData = useMemo(
    () => (data?.axes ?? []).map((a) => ({ short: a.short, pct: a.pct, target: 100, name: a.name, earned: a.earned, targetJpl: a.target })),
    [data],
  );
  const gaps = useMemo(() => (data?.axes ?? []).filter((a) => a.remaining > 0).sort((a, b) => b.remaining - a.remaining), [data]);

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Peta Kompetensi" />

      <main className="mx-auto max-w-[920px] px-4 py-6 sm:py-8">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.16), transparent 65%)" }} />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-emerald-200">
                <RadarIcon className="h-3.5 w-3.5" /> Peta Kompetensi {data ? `· ${data.year}` : ""}
              </div>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Skill Gap Pembelajaran</h1>
              <p className="mt-1.5 max-w-md text-[13.5px] text-emerald-50/70">
                Sebaran capaian JPL kamu vs target tahun ini per metode belajar — temukan channel yang masih perlu diperkuat.
              </p>
            </div>
            <div className="text-right">
              {data ? (
                <>
                  <div className="text-4xl font-extrabold tabular-nums sm:text-5xl">{data.total.pct}%</div>
                  <div className="text-[12px] text-white/60">{data.total.earned} / {data.total.target} JPL keseluruhan</div>
                </>
              ) : (
                <Skeleton className="h-12 w-24" />
              )}
            </div>
          </div>
        </motion.section>

        {/* ── Radar ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06 }}
          className="mt-5 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 sm:p-6"
        >
          <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-300">
            <Target className="h-4 w-4" /> Capaian vs Target per Metode
          </div>
          {loading ? (
            <Skeleton className="mx-auto mt-4 h-[300px] w-full max-w-[420px] rounded-2xl" />
          ) : radarData.length === 0 ? (
            <p className="py-12 text-center text-sm text-white/60">Belum ada target kompetensi untuk tahun ini.</p>
          ) : (
            <div className="mt-2 h-[330px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.12)" />
                  <PolarAngleAxis dataKey="short" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Target" dataKey="target" stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" fill="none" />
                  <Radar name="Capaian" dataKey="pct" stroke="#34d399" strokeWidth={2} fill="#34d399" fillOpacity={0.35} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { name: string; pct: number; earned: number; targetJpl: number };
                    return (
                      <div className="rounded-xl border border-white/10 bg-[#21241f] px-3 py-2 text-xs shadow-2xl">
                        <p className="font-semibold text-white">{d.name}</p>
                        <p className="mt-0.5 text-white/70">{d.earned} / {d.targetJpl} JPL · <span className="font-semibold text-emerald-300">{d.pct}%</span></p>
                      </div>
                    );
                  }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bucket 70-20-10 */}
          {data && (
            <div className="mt-2 grid grid-cols-3 gap-2.5">
              {data.buckets.map((b) => (
                <div key={b.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/70">{b.label.split(" (")[0]}</span>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: BUCKET_COLOR[b.key] }}>{b.pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: BUCKET_COLOR[b.key] }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/45 tabular-nums">{b.earned} / {b.target} JPL</p>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Gap terbesar ── */}
        {!loading && gaps.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-[12px] font-medium text-amber-300">
              <TrendingUp className="h-4 w-4" /> Gap Terbesar
            </div>
            <div className="mt-3 space-y-2">
              {gaps.map((a) => (
                <div key={a.catId} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BUCKET_COLOR[a.bucket] }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13.5px] font-medium">{a.name}</span>
                      <span className="shrink-0 text-[12px] text-white/60 tabular-nums">{a.earned}/{a.target} JPL</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/30">
                      <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: BUCKET_COLOR[a.bucket] }} />
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200 tabular-nums">
                    -{a.remaining} JPL
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Rekomendasi pelatihan ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-5"
        >
          <div className="mb-3 flex items-center gap-2 text-[15px] font-bold">
            <Sparkles className="h-4.5 w-4.5 text-emerald-300" /> Rekomendasi untuk Menutup Gap
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
          ) : !data?.recommendations.length ? (
            <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 text-center text-sm text-white/60">
              Mantap! Semua target metode belajar sudah tercapai 🎉
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recommendations.map((r) => (
                <div key={r.id} className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition-all hover:border-emerald-400/30 hover:bg-white/[0.05]">
                  <div className="flex flex-wrap gap-1.5">
                    {r.fills.map((f) => (
                      <span key={f.name} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                        {f.short} +{f.jpl} JPL
                      </span>
                    ))}
                  </div>
                  <h3 className="mt-2.5 text-[14.5px] font-semibold leading-snug">{r.nama}</h3>
                  {r.deskripsi && <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/55">{r.deskripsi}</p>}
                  <div className="mt-auto flex items-center gap-3 pt-3 text-[11.5px] text-white/60">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{r.jplTotal} JPL</span>
                    {r.durasiHari > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{r.durasiHari} hari</span>}
                    <span className="ml-auto font-semibold text-amber-200">{rupiah(r.harga)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>

        <a href="/learning" className="mt-5 flex items-center justify-center gap-1.5 text-[13.5px] text-emerald-300 hover:text-emerald-200">
          Lihat progres pembelajaran lengkap <ArrowRight className="h-4 w-4" />
        </a>
      </main>
    </div>
  );
}
