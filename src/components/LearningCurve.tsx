"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, TrendingUp, X } from "lucide-react";

interface Item { name: string; poin: number; section: string; date: string | null }
interface Point { m: number; label: string; total: number; count: number; items: Item[] }
interface Data { year: number; minYear: number; maxYear: number; total: number; points: Point[] }

const fmtTime = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s.includes(" ") ? s.replace(" ", "T") : s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/15 bg-[#1b1f1c] px-3 py-2 shadow-xl">
      <p className="text-[12px] font-semibold text-white">{p.label}</p>
      <p className="mt-0.5 text-[12px] text-emerald-300">{p.total} poin</p>
      <p className="text-[11px] text-white/45">{p.count} aktivitas</p>
    </div>
  );
}

export default function LearningCurve() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setSel(null);
    fetch(`/api/learning-curve?year=${year}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d.points) setData(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [year]);

  const minYear = data?.minYear ?? year;
  const maxYear = data?.maxYear ?? now.getFullYear();
  const points = data?.points ?? [];
  const hasData = (data?.total ?? 0) > 0;
  const selected = sel !== null ? points[sel] : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      {/* Header: navigasi tahun + total */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-300">
          <TrendingUp className="h-4 w-4" /> {data?.total ?? 0} poin di {year}
        </span>
        <div className="inline-flex items-center gap-1.5">
          <button
            onClick={() => setYear((y) => Math.max(minYear, y - 1))}
            disabled={year <= minYear}
            aria-label="Tahun sebelumnya"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="w-16 text-center text-[17px] font-bold tabular-nums">{year}</span>
          <button
            onClick={() => setYear((y) => Math.min(maxYear, y + 1))}
            disabled={year >= maxYear}
            aria-label="Tahun berikutnya"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative mt-5 h-[280px] w-full">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#19191B]/40 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
          </div>
        )}
        {!loading && !hasData ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/40"><Sparkles className="h-6 w-6" /></span>
              <p className="mt-3 text-[14px] font-semibold text-white/80">Belum ada aktivitas di {year}</p>
              <p className="mt-1 text-[12.5px] text-white/45">Ikuti kelas & belajar harian untuk mengisi kurva ini.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
              onClick={(s) => {
                const raw = s?.activeTooltipIndex;
                const idx = typeof raw === "string" ? Number(raw) : raw;
                if (typeof idx === "number" && !Number.isNaN(idx)) setSel(idx);
              }}
            >
              <defs>
                <linearGradient id="poinFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
              <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(52,211,153,0.4)", strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="total" stroke="#34d399" strokeWidth={2.5} fill="url(#poinFill)"
                dot={{ r: 4, fill: "#19191B", stroke: "#4ade80", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#4ade80", stroke: "#19191B", strokeWidth: 2, cursor: "pointer" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail / hint */}
      {selected && selected.items.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13.5px] font-bold">Rincian poin · {selected.label} {year}</h4>
            <button onClick={() => setSel(null)} aria-label="Tutup rincian" className="grid h-7 w-7 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <ul className="mt-3 divide-y divide-white/5">
            {selected.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-white/85">{it.name}</p>
                  <p className="text-[11.5px] text-white/40">{it.section || "Aktivitas"} · {fmtTime(it.date)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[12px] font-bold text-emerald-300">+{it.poin}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        hasData && (
          <p className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.05] px-4 py-3 text-[13px] font-medium text-emerald-200/80">
            Klik titik pada kurva untuk melihat rincian poin.
          </p>
        )
      )}
    </div>
  );
}
