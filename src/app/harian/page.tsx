"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, CheckCircle2, XCircle, Sparkles, Trophy, BookOpen, ArrowRight, Loader2, CalendarDays } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Skeleton } from "@/components/Skeleton";

// ── Tipe data dari /api/microlearning ──
interface QuizOption { name: string; correct: boolean }
interface Daily {
  date: string;
  term: { name: string; desc: string } | null;
  quiz: { question: string; options: QuizOption[] } | null;
  quote: { text: string; author: string } | null;
  totalTerms: number;
}

// ── Streak (disimpan di perangkat; server-persist menyusul saat write-API siap) ──
const LS_KEY = "ess_microlearning_streak_v1";
interface StreakData {
  lastDate: string;
  current: number;
  longest: number;
  total: number;
  correct: number;
  history: Record<string, "correct" | "wrong">;
}
const EMPTY: StreakData = { lastDate: "", current: 0, longest: 0, total: 0, correct: 0, history: {} };

// Aritmetika tanggal aman-zona-waktu atas string "YYYY-MM-DD".
function addDays(d: string, n: number): string {
  const [y, m, dd] = d.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, dd));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function HarianPage() {
  const [data, setData] = useState<Daily | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<StreakData>(EMPTY);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    setStreak(loadStreak());
    fetch("/api/microlearning")
      .then((r) => r.json())
      .then((d: Daily) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const today = data?.date ?? "";
  const doneToday = !!today && streak.lastDate === today;

  // Streak "hidup" untuk ditampilkan: utuh bila terakhir = hari ini / kemarin, selain itu terputus.
  const displayStreak = useMemo(() => {
    if (!today || !streak.lastDate) return 0;
    if (streak.lastDate === today || streak.lastDate === addDays(today, -1)) return streak.current;
    return 0;
  }, [today, streak]);

  // Strip 7 hari terakhir (termasuk hari ini di paling kanan).
  const week = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i - 6);
      const [, , dd] = d.split("-").map(Number);
      return { date: d, day: DOW[new Date(d + "T00:00:00Z").getUTCDay()], dd, status: streak.history[d] ?? null, isToday: d === today };
    });
  }, [today, streak]);

  // Sudah menjawab hari ini? (picked di sesi ini, atau riwayat tersimpan)
  const answered = picked !== null || doneToday;
  const correctIdx = data?.quiz?.options.findIndex((o) => o.correct) ?? -1;

  function answer(i: number) {
    if (answered || !data?.quiz || !today) return;
    setPicked(i);
    const isCorrect = data.quiz.options[i].correct;

    // Hitung streak (idempoten: hanya sekali per hari).
    setStreak((prev) => {
      if (prev.lastDate === today) return prev; // sudah dihitung hari ini
      const cont = prev.lastDate === addDays(today, -1);
      const next: StreakData = {
        lastDate: today,
        current: cont ? prev.current + 1 : 1,
        longest: Math.max(prev.longest, cont ? prev.current + 1 : 1),
        total: prev.total + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        history: { ...prev.history, [today]: isCorrect ? "correct" : "wrong" },
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader active="Belajar Harian" />

      <main className="mx-auto max-w-[720px] px-4 py-6 sm:py-8">
        {/* ── Streak hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0c1c0e]/55 p-6 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        >
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(251,146,60,0.18), transparent 65%)" }} />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-amber-200">
                Belajar Harian · 1 menit/hari
              </div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-extrabold leading-none tabular-nums">{displayStreak}</span>
                <span className="mb-1 text-lg font-semibold text-white/80">hari beruntun</span>
              </div>
              <p className="mt-1.5 text-[13.5px] text-emerald-50/70">
                {doneToday ? "Mantap! Misi hari ini selesai 🎉 Balik lagi besok ya." : displayStreak > 0 ? "Jaga apinya tetap menyala — selesaikan hari ini!" : "Mulai streak pertamamu hari ini!"}
              </p>
            </div>
            <motion.div
              className="relative flex h-24 w-24 shrink-0 items-center justify-center"
              animate={doneToday ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.4, repeat: doneToday ? Infinity : 0, ease: "easeInOut" }}
            >
              <div aria-hidden className="absolute inset-0 rounded-full blur-2xl" style={{ background: displayStreak > 0 ? "radial-gradient(circle, rgba(251,146,60,0.45), transparent 70%)" : "transparent" }} />
              <Flame className={`relative h-20 w-20 ${displayStreak > 0 ? "text-amber-400" : "text-white/20"}`} strokeWidth={1.5} fill={displayStreak > 0 ? "rgba(251,146,60,0.25)" : "none"} />
            </motion.div>
          </div>

          {/* Strip 7 hari */}
          <div className="relative z-10 mt-5 grid grid-cols-7 gap-1.5">
            {(week.length ? week : Array.from({ length: 7 })).map((d, i) =>
              d ? (
                <div key={(d as { date: string }).date} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-white/40">{(d as { day: string }).day}</span>
                  <div className={`flex h-9 w-full items-center justify-center rounded-lg border text-[12px] font-semibold tabular-nums ${
                    (d as { status: string | null }).status === "correct" ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                    : (d as { status: string | null }).status === "wrong" ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                    : (d as { isToday: boolean }).isToday ? "border-white/30 bg-white/[0.06] text-white"
                    : "border-white/10 bg-white/[0.02] text-white/40"
                  }`}>
                    {(d as { status: string | null }).status === "correct" ? <CheckCircle2 className="h-4 w-4" /> : (d as { dd: number }).dd}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-center gap-1"><Skeleton className="h-3 w-6" /><Skeleton className="h-9 w-full" /></div>
              ),
            )}
          </div>

          {/* Mini-stat */}
          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat icon={Flame} label="Streak terpanjang" value={String(Math.max(streak.longest, displayStreak))} tone="text-amber-300" />
            <Stat icon={CalendarDays} label="Total hari" value={String(streak.total)} tone="text-emerald-300" />
            <Stat icon={Trophy} label="Akurasi" value={streak.total ? `${Math.round((streak.correct / streak.total) * 100)}%` : "—"} tone="text-lime-300" />
          </div>
        </motion.section>

        {/* ── Kuis harian ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-5 rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-6"
        >
          <div className="flex items-center gap-2 text-[12px] font-medium text-emerald-300">
            <BookOpen className="h-4 w-4" /> Istilah Hari Ini
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" />
              <div className="mt-4 space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            </div>
          ) : !data?.quiz ? (
            <p className="mt-4 text-sm text-white/60">Konten harian belum tersedia. Coba lagi nanti ya.</p>
          ) : (
            <>
              <h2 className="mt-3 text-lg font-semibold leading-snug">
                Istilah mana yang memiliki arti berikut?
              </h2>
              <p className="mt-2 rounded-xl border border-white/10 bg-black/20 p-3.5 text-[14px] leading-relaxed text-white/85">
                “{data.quiz.question}”
              </p>

              <div className="mt-4 space-y-2.5">
                {data.quiz.options.map((o, i) => {
                  const isCorrect = i === correctIdx;
                  const isPicked = picked === i;
                  const show = answered;
                  return (
                    <button
                      key={i} onClick={() => answer(i)} disabled={answered}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[14px] transition-all ${
                        show && isCorrect ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                        : show && isPicked && !isCorrect ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                        : show ? "border-white/8 bg-white/[0.02] text-white/40"
                        : "border-white/12 bg-white/[0.04] text-white/90 hover:border-emerald-400/50 hover:bg-emerald-500/10 active:scale-[0.99]"
                      }`}
                    >
                      <span className="font-medium">{o.name}</span>
                      {show && isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />}
                      {show && isPicked && !isCorrect && <XCircle className="h-5 w-5 shrink-0 text-rose-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Feedback + penjelasan */}
              {answered && data.term && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-4">
                  <p className="text-[13px] font-semibold text-emerald-200">
                    {doneToday && picked === null ? "Kamu sudah menyelesaikan kuis hari ini ✓"
                      : picked !== null && data.quiz.options[picked].correct ? "Tepat sekali! 🎉"
                      : "Belum tepat — tak apa, ini yang benar:"}
                  </p>
                  <p className="mt-1.5 text-[14px]"><b className="text-white">{data.term.name}</b></p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-white/75">{data.term.desc}</p>
                </motion.div>
              )}

              {/* Quote bonus setelah selesai */}
              {answered && data.quote && (
                <motion.blockquote initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                  className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <p className="mt-2 text-[14px] italic leading-relaxed text-white/85">“{data.quote.text}”</p>
                  <footer className="mt-2 text-[12px] text-white/55">— {data.quote.author}</footer>
                </motion.blockquote>
              )}
            </>
          )}
        </motion.section>

        <a href="/learning" className="mt-5 flex items-center justify-center gap-1.5 text-[13.5px] text-emerald-300 hover:text-emerald-200">
          Lihat progres pembelajaran lengkap <ArrowRight className="h-4 w-4" />
        </a>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Flame; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2.5">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} />
      <p className="mt-1 text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] leading-tight text-white/50">{label}</p>
    </div>
  );
}
