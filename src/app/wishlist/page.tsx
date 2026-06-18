"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Heart, Clock, BookOpen, Plus, Search } from "lucide-react";

interface Course {
  id: number; judul: string; kategori: string | null; jpl: number | null; metode: string | null; deskripsi: string | null;
  wid?: number; prioritas?: number | null;
}
interface Data { wishlist: Course[]; katalog: Course[] }

function CourseCard({ c, inWishlist, onAdd }: { c: Course; inWishlist?: boolean; onAdd?: () => void }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><BookOpen className="h-5 w-5" /></div>
        {c.kategori && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/70">{c.kategori}</span>}
      </div>
      <p className="text-[14px] font-semibold leading-snug">{c.judul}</p>
      {c.deskripsi && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-white/50">{c.deskripsi}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/55">
        {c.jpl && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {c.jpl} JPL</span>}
        {c.metode && <span>{c.metode}</span>}
      </div>
      <div className="mt-4">
        {inWishlist ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-semibold text-emerald-300"><Heart className="h-3.5 w-3.5 fill-current" /> Di wishlist</span>
        ) : (
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold transition hover:bg-white/10">
            <Plus className="h-3.5 w-3.5" /> Tambah ke Wishlist
          </button>
        )}
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/wishlist").then((r) => r.json()).then((d) => { d.katalog ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

  const katalog = (data?.katalog ?? []).filter((c) => !q || c.judul.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Wishlist Pelatihan</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Tambah pelatihan yang kamu rencanakan untuk diikuti dan tentukan prioritasnya.
        </p>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}
        {!data && !err && (
          <section className="mt-6">
            <Skeleton className="h-6 w-44" />
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i}>
                  <div className="flex items-start justify-between"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-5 w-14 rounded-full" /></div>
                  <Skeleton className="mt-3 h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-full" /><Skeleton className="mt-1.5 h-3 w-1/2" />
                  <Skeleton className="mt-4 h-7 w-36 rounded-lg" />
                </SkeletonCard>
              ))}
            </div>
          </section>
        )}

        {data && (
          <>
            {/* Wishlist saya */}
            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Heart className="h-5 w-5 text-emerald-400" /> Wishlist Saya ({data.wishlist.length})</h2>
              {data.wishlist.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center text-[13.5px] text-white/55">
                  Belum ada pelatihan di wishlist. Pilih dari katalog di bawah.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.wishlist.map((c) => <CourseCard key={c.id} c={c} inWishlist />)}
                </div>
              )}
            </section>

            {/* Katalog */}
            <section className="mt-10">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Katalog Pelatihan</h2>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pelatihan…"
                    className="w-60 rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {katalog.map((c) => (
                  <CourseCard key={c.id} c={c} onAdd={() => alert("Menambah wishlist menunggu API tersambung.")} />
                ))}
              </div>
              {katalog.length === 0 && <p className="text-white/50">Tidak ada hasil untuk “{q}”.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
