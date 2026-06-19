"use client";

import { useEffect } from "react";
import { Play, X, Building2 } from "lucide-react";

export interface VideoCardData {
  id: number; judul: string; thumb: string | null; link: string; videoId: string | null;
  tipe?: string; tgl?: string | null; entitas?: string | null;
}

const fmtTgl = (s: string | null | undefined) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

export function VideoCard({ c, onPlay }: { c: VideoCardData; onPlay: (c: VideoCardData) => void }) {
  const tgl = fmtTgl(c.tgl);
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
        {c.entitas && (
          <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-white/65">
            <Building2 className="h-3 w-3 shrink-0 text-emerald-300/70" />
            <span className="truncate">{c.entitas}</span>
          </span>
        )}
        {tgl && <p className="mt-1.5 text-[12px] text-white/45">{tgl}</p>}
      </div>
    </button>
  );
}

/** Modal pemutar video YouTube (responsif, mobile-friendly). */
export function VideoModal({ video, onClose }: { video: VideoCardData; onClose: () => void }) {
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
