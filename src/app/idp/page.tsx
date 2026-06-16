"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Target, Plus, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface IdpItem {
  id: number; tahun: number | null; area: string; aspirasi: string; rencana: string; deskripsi: string;
  tanggal: string | null; jam: string | null; status: string; status_verifikasi: string; catatan: string;
}

const fmtDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

function statusTone(s: string) {
  const v = s.toLowerCase();
  if (v.includes("terima") || v.includes("approve") || v.includes("selesai")) return "bg-emerald-500/15 text-emerald-300";
  if (v.includes("reject") || v.includes("tolak")) return "bg-red-500/15 text-red-300";
  return "bg-amber-500/15 text-amber-300";
}

export default function IdpPage() {
  const [data, setData] = useState<{ year: number; items: IdpItem[] } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/idp").then((r) => r.json()).then((d) => { d.items ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader />

      <main className="mx-auto max-w-[1000px] px-4 pb-20">
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Individual Development Program</h1>
            <p className="mt-1 text-[14px] text-white/60">Rencana pengembangan diri (IDP) tahun {data?.year ?? new Date().getFullYear()}.</p>
          </div>
          <button
            onClick={() => alert("Formulir IDP menunggu API tersambung.")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-[13px] font-semibold transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> Buat IDP
          </button>
        </div>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}
        {!data && !err && (
          <section className="mt-6 space-y-4">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} className="p-5">
                <div className="flex items-center justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-28 rounded-full" /></div>
                <Skeleton className="mt-4 h-3 w-32" /><Skeleton className="mt-2 h-4 w-3/4" />
                <Skeleton className="mt-4 h-3 w-40" />
              </SkeletonCard>
            ))}
          </section>
        )}

        {data && data.items.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300"><Target className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-bold">Belum ada IDP</h2>
            <p className="mt-1 max-w-md text-[13.5px] text-white/55">
              Susun rencana pengembangan dirimu — isikan area, aspirasi karir, dan rencana belajar untuk tahun ini.
            </p>
            <button
              onClick={() => alert("Formulir IDP menunggu API tersambung.")}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-[13px] font-semibold transition hover:bg-white/10"
            >
              <FileText className="h-4 w-4" /> Isi Formulir IDP
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <section className="mt-6 space-y-4">
            {data.items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-white/60">IDP {it.tahun ?? ""}</span>
                  <div className="flex items-center gap-2">
                    {it.status_verifikasi && <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusTone(it.status_verifikasi)}`}>{it.status_verifikasi}</span>}
                    <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${statusTone(it.status)}`}>{it.status}</span>
                  </div>
                </div>
                {it.area && <Field label="Area Pengembangan" value={it.area} />}
                {it.aspirasi && <Field label="Aspirasi Pengembangan" value={it.aspirasi} />}
                {it.rencana && <Field label="Rencana" value={it.rencana} />}
                <div className="mt-3 flex flex-wrap gap-4 text-[12.5px] text-white/55">
                  {fmtDate(it.tanggal) && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(it.tanggal)}{it.jam ? ` · ${it.jam}` : ""}</span>}
                </div>
                {it.catatan && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-[12.5px] text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Catatan verifikator: {it.catatan}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="mt-8 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[13px] text-white/55">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pengisian & verifikasi IDP akan aktif setelah API tersambung.
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="text-[11px] uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-0.5 text-[14px] leading-relaxed text-white/85">{value}</div>
    </div>
  );
}
