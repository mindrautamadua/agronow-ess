"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Play, Quote as QuoteIcon, Video, X } from "lucide-react";

interface Card { id: number; judul: string; thumb: string | null; link: string; videoId: string | null; tipe?: string; tgl?: string | null }
interface Direksi { id: number; nama: string; jabatan: string; pesan: string | null; initials: string }
interface Quote { text: string; author: string }
interface Insight { webinar: Card[]; movies: Card[]; direksi: Direksi[]; quotes: Quote[] }

function VideoCard({ c, onPlay }: { c: Card; onPlay: (c: Card) => void }) {
  return (
    <button type="button" onClick={() => onPlay(c)} className="group block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left">
      <div className="relative aspect-video overflow-hidden bg-black">
        {c.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumb} alt={c.judul} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-emerald-700"><Play className="h-5 w-5 translate-x-0.5" /></div>
        </div>
        {c.tipe && <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold">{c.tipe}</span>}
      </div>
      <div className="p-3.5">
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{c.judul}</p>
        {c.tgl && <p className="mt-1 text-[12px] text-white/45">{c.tgl}</p>}
      </div>
    </button>
  );
}

/** Modal pemutar video YouTube (responsif, mobile-friendly). */
function VideoModal({ video, onClose }: { video: Card; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // kunci scroll latar
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="line-clamp-1 text-[14px] font-semibold text-white">{video.judul}</p>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
          <div className="relative aspect-video w-full">
            {video.videoId ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
                title={video.judul}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">Video tidak tersedia</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsightHubPage() {
  const [data, setData] = useState<Insight | null>(null);
  const [err, setErr] = useState(false);
  const [active, setActive] = useState<Card | null>(null);

  useEffect(() => {
    fetch("/api/insight").then((r) => r.json()).then((d) => { d.webinar ? setData(d) : setErr(true); }).catch(() => setErr(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader active="Insight Hub" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Insight Hub</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Pusat informasi terintegrasi: webinar, pesan direksi, short movie &amp; vlog, serta inspirasi terkini.
        </p>

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}
        {!data && !err && (
          <>
            <Skeleton className="mt-7 h-6 w-32" />
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} className="overflow-hidden p-0">
                  <Skeleton className="aspect-video w-full rounded-none" />
                  <div className="p-3.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/3" /></div>
                </SkeletonCard>
              ))}
            </div>
            <Skeleton className="mt-10 h-6 w-40" />
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i}>
                  <div className="flex items-center gap-3"><Skeleton className="h-12 w-12 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-28" /><Skeleton className="mt-1.5 h-3 w-20" /></div></div>
                  <Skeleton className="mt-3 h-3 w-full" /><Skeleton className="mt-1.5 h-3 w-2/3" />
                </SkeletonCard>
              ))}
            </div>
          </>
        )}

        {data && (
          <>
            {/* Webinar */}
            {data.webinar.length > 0 && (
              <section className="mt-7">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Video className="h-5 w-5 text-emerald-400" /> Webinar</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.webinar.map((c) => <VideoCard key={c.id} c={c} onPlay={setActive} />)}
                </div>
              </section>
            )}

            {/* Pesan Direksi */}
            {data.direksi.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-lg font-bold">Pesan Direksi</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.direksi.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-700 text-[15px] font-bold">{d.initials}</div>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold">{d.nama}</p>
                          <p className="truncate text-[12px] text-emerald-300">{d.jabatan}</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-white/70">{d.pesan || "— coming soon —"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Short Movie & Vlog */}
            {data.movies.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Play className="h-5 w-5 text-emerald-400" /> Short Movie &amp; Vlog</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {data.movies.map((c) => <VideoCard key={c.id} c={c} onPlay={setActive} />)}
                </div>
              </section>
            )}

            {/* Quotes */}
            {data.quotes.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-lg font-bold">Inspirasi</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.quotes.map((q, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f3d12] to-[#0c1f08] p-5">
                      <QuoteIcon className="h-6 w-6 text-emerald-400/40" />
                      <p className="mt-2 text-[14px] italic leading-relaxed text-white/85">{q.text}</p>
                      <p className="mt-3 text-[12px] font-semibold text-emerald-300">— {q.author}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
    </div>
  );
}
