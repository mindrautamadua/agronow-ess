"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trophy, X, ChevronRight, GraduationCap, Award, BadgeCheck, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

type Scope = "year" | "all";
interface TopRow { mid: number; rank: number; name: string; initials: string; role: string; points: number; isMe: boolean }

interface DetailBucket { key: string; label: string; earned: number; target: number; pct: number }
interface PointSection { section: string; points: number; count: number }
interface RecentPoint { name: string; section: string; points: number; date: string | null }
interface ContribDetail {
  scope: Scope; year: number;
  profile: { name: string; jabatan: string | null; unit: string | null; role: string | null };
  learning: { total: { earned: number; target: number; pct: number }; buckets: DetailBucket[]; totalClasses: number; certificates: number };
  pointsBySection: PointSection[];
  recent: RecentPoint[];
}
interface Me { name: string; firstName: string; rank: number | null; points: number; total: number; percentile: number | null }
interface Data { scope: Scope; year: number; me: Me; top: TopRow[] }

const nf = (n: number) => n.toLocaleString("id-ID");

/** Pesan apresiasi berdasarkan persentil (semakin kecil = semakin baik). */
function praise(pct: number | null, name: string) {
  if (pct === null) return { title: `Halo, ${name}!`, sub: "Mulai belajar untuk masuk peringkat korporat." };
  const t =
    pct <= 5 ? "Outstanding" : pct <= 10 ? "Amazing" : pct <= 25 ? "Great Work" :
    pct <= 50 ? "Excellent Work" : pct <= 75 ? "Nice Progress" : "Keep Going";
  return { title: `${t}, ${name}!`, sub: `Kamu berada di top ${pct}% learner${pct <= 50 ? "" : ""}.` };
}

/** Warna avatar deterministik dari nama (palet selaras tema). */
const AV = ["bg-emerald-500/20 text-emerald-200", "bg-teal-500/20 text-teal-200", "bg-lime-500/20 text-lime-200", "bg-green-500/20 text-green-200", "bg-cyan-500/20 text-cyan-200"];
const avatarTone = (s: string) => AV[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

const MEDAL: Record<number, string> = {
  1: "bg-amber-300 text-amber-900",
  2: "bg-slate-200 text-slate-700",
  3: "bg-orange-300 text-orange-900",
};

const fmtDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

export default function Leaderboard() {
  const [scope, setScope] = useState<Scope>("year");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  // Baris yang sedang dibuka detailnya (null = modal tertutup).
  const [openRow, setOpenRow] = useState<TopRow | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/leaderboard?scope=${scope}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d.top) setData(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope]);

  const me = data?.me;
  const msg = praise(me?.percentile ?? null, me?.firstName ?? "Learner");

  return (
    <div className="space-y-6">
      {/* ───── Banner ringkasan peringkat ───── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1d4d33] via-[#1c4630] to-[#16341f] p-6 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.22), transparent 65%)" }} />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wider text-emerald-300/80">Poin kamu berdasarkan aktivitas belajarmu</p>
            {loading && !data ? (
              <Skeleton className="mt-2 h-8 w-64 bg-white/10" />
            ) : (
              <h3 className="mt-1.5 text-2xl font-extrabold text-white sm:text-3xl">{msg.title}</h3>
            )}
            <p className="mt-1.5 text-[13.5px] text-emerald-100/75">{msg.sub}</p>
          </div>
          <div className="flex shrink-0 gap-8 sm:gap-10">
            <Stat label="Corporate Rank" value={me?.rank ? `#${nf(me.rank)}` : "—"} loading={loading && !data} />
            <Stat label="Total Points" value={me ? nf(me.points) : "—"} loading={loading && !data} />
          </div>
        </div>
      </div>

      {/* ───── Tabel Top Contributors ───── */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2.5 text-[17px] font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"><Star className="h-4 w-4 fill-emerald-300" /></span>
            Top Contributors
          </h3>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-[13px] font-semibold">
            <button onClick={() => setScope("year")} className={`rounded-full px-3.5 py-1.5 transition-colors ${scope === "year" ? "bg-emerald-500 text-[#0d130f]" : "text-white/70 hover:text-white"}`}>Tahun {data?.year ?? new Date().getFullYear()}</button>
            <button onClick={() => setScope("all")} className={`rounded-full px-3.5 py-1.5 transition-colors ${scope === "all" ? "bg-emerald-500 text-[#0d130f]" : "text-white/70 hover:text-white"}`}>All Time</button>
          </div>
        </div>

        {/* Header kolom (desktop) */}
        <div className="hidden grid-cols-[64px_1fr_auto] items-center gap-4 border-y border-white/8 bg-white/[0.02] px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white/40 sm:grid sm:grid-cols-[64px_1.4fr_1fr_auto]">
          <span>Rank</span><span>Contributor</span><span className="hidden sm:block">Role &amp; Department</span><span className="text-right">Points</span>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {loading && !data && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1"><Skeleton className="h-3.5 w-40" /></div>
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}

          {data?.top.length === 0 && (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/40"><Trophy className="h-6 w-6" /></span>
              <p className="mt-3 text-[14px] font-semibold text-white/80">Belum ada kontributor</p>
              <p className="mt-1 text-[12.5px] text-white/45">Peringkat akan muncul saat poin mulai terkumpul.</p>
            </div>
          )}

          {data?.top.map((row, i) => (
            <button
              key={`${row.rank}-${row.name}-${i}`}
              type="button"
              onClick={() => setOpenRow(row)}
              className={`group grid w-full grid-cols-[64px_1fr_auto] items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-white/[0.04] sm:grid-cols-[64px_1.4fr_1fr_auto] sm:px-6 ${row.isMe ? "bg-emerald-500/[0.07]" : ""}`}
            >
              {/* Rank */}
              <div className="flex items-center">
                <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[12.5px] font-extrabold tabular-nums ${MEDAL[row.rank] ?? "bg-white/5 text-white/55"}`}>{row.rank}</span>
              </div>
              {/* Contributor */}
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${avatarTone(row.name)}`}>{row.initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold group-hover:text-emerald-200">{row.name}{row.isMe && <span className="ml-2 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Kamu</span>}</p>
                  <p className="truncate text-[12px] text-white/45 sm:hidden">{row.role || "—"}</p>
                </div>
              </div>
              {/* Role (desktop) */}
              <p className="hidden truncate text-[13px] text-white/60 sm:block">{row.role || "—"}</p>
              {/* Points */}
              <div className="flex items-center justify-end gap-2">
                <p className="text-right text-[15px] font-bold tabular-nums">{nf(row.points)}</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openRow && <ContributorModal row={openRow} scope={scope} onClose={() => setOpenRow(null)} />}
      </AnimatePresence>
    </div>
  );
}

/** Modal detail kontributor — dibuka saat sebuah baris Top Contributors diklik. */
function ContributorModal({ row, scope, onClose }: { row: TopRow; scope: Scope; onClose: () => void }) {
  const [detail, setDetail] = useState<ContribDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setErr(null);
    fetch(`/api/leaderboard/${row.mid}?scope=${scope}`)
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!alive) return;
        if (ok && body.profile) setDetail(body);
        else setErr(body.detail ? `${body.error} — ${body.detail}` : (body.error ?? "Gagal memuat detail."));
      })
      .catch((e) => { if (alive) setErr(e instanceof Error ? e.message : "Gagal memuat detail."); });
    return () => { alive = false; };
  }, [row.mid, scope]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#1d1f1c] shadow-2xl"
      >
        {/* Header: rank + identitas + total poin */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/[0.02] p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid h-9 min-w-9 place-items-center rounded-full px-1.5 text-[13px] font-extrabold tabular-nums ${MEDAL[row.rank] ?? "bg-white/5 text-white/55"}`}>{row.rank}</span>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-bold ${avatarTone(row.name)}`}>{row.initials}</span>
            <div className="min-w-0">
              <p className="truncate text-[16px] font-bold leading-snug">{row.name}{row.isMe && <span className="ml-2 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Kamu</span>}</p>
              <p className="truncate text-[12.5px] text-white/50">{detail?.profile.role || row.role || "—"}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {/* Ringkasan angka */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label={`Poin ${scope === "all" ? "All Time" : "Tahun"}`} value={nf(row.points)} />
            <MiniStat label="Corporate Rank" value={`#${nf(row.rank)}`} />
            <MiniStat label="Kelas" value={detail ? nf(detail.learning.totalClasses) : "…"} icon={<BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />} />
            <MiniStat label="Sertifikat" value={detail ? nf(detail.learning.certificates) : "…"} icon={<Award className="h-3.5 w-3.5 text-amber-400" />} />
          </div>

          {err && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-[13px] text-red-300">{err}</p>}

          {!detail && !err && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          )}

          {detail && (
            <>
              {/* Profil */}
              {(detail.profile.jabatan || detail.profile.unit) && (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5 text-[13px] text-white/70">
                  {detail.profile.jabatan && <p><span className="text-white/40">Jabatan:</span> {detail.profile.jabatan}</p>}
                  {detail.profile.unit && <p className="mt-1"><span className="text-white/40">Unit:</span> {detail.profile.unit}</p>}
                </div>
              )}

              {/* Progres 70-20-10 */}
              <section>
                <h4 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/75">
                  <GraduationCap className="h-4 w-4 text-emerald-400" /> Progres 70·20·10 ({detail.year}) — {detail.learning.total.pct}%
                </h4>
                <div className="space-y-2.5">
                  {detail.learning.buckets.map((b) => (
                    <div key={b.key}>
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-white/70">{b.label}</span>
                        <span className="text-white/50 tabular-nums">{b.earned}/{b.target} JPL · {b.pct}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: `${Math.min(b.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Rincian poin per kategori */}
              {detail.pointsBySection.length > 0 && (
                <section>
                  <h4 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/75">
                    <Star className="h-4 w-4 fill-emerald-300 text-emerald-300" /> Sumber Poin
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detail.pointsBySection.map((s) => (
                      <span key={s.section} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px]">
                        <span className="text-white/70">{s.section}</span>
                        <span className="font-bold tabular-nums text-emerald-300">{nf(s.points)}</span>
                        <span className="text-white/35">· {s.count}×</span>
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Aktivitas poin terbaru */}
              {detail.recent.length > 0 && (
                <section>
                  <h4 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-white/75">
                    <Clock className="h-4 w-4 text-sky-400" /> Aktivitas Poin Terbaru
                  </h4>
                  <ul className="space-y-2">
                    {detail.recent.map((r, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-white/85">{r.name}</p>
                          <p className="text-[11.5px] text-white/40">{r.section}{fmtDate(r.date) ? ` · ${fmtDate(r.date)}` : ""}</p>
                        </div>
                        <span className="shrink-0 text-[13px] font-bold tabular-nums text-emerald-300">+{nf(r.points)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-white/40">{icon}{label}</div>
      <p className="mt-1 text-[18px] font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="text-right">
      {loading ? <Skeleton className="ml-auto h-8 w-16 bg-white/10" /> : <div className="text-3xl font-extrabold leading-none text-white tabular-nums sm:text-4xl">{value}</div>}
      <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300/70">{label}</div>
    </div>
  );
}
