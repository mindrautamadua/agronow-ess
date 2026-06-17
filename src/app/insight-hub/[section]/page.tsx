"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { VideoCard, VideoModal, type VideoCardData } from "@/components/InsightVideo";
import { ArrowLeft, Quote as QuoteIcon, X, Eye, Search } from "lucide-react";
import { SECTION_BY_SLUG } from "@/lib/insight-sections";

interface DireksiItem { id: number; nama: string; jabatan: string; pesan: string | null; image: string | null; initials: string }
interface BeritaItem { id: number; title: string; image: string | null; date: string | null; source: string | null; author: string | null; body: string | null }
interface ArticleItem extends BeritaItem { views: number }
interface QuoteItem { text: string; author: string }
interface LibraryCat { id: number; name: string; alias: string; count: number }
interface LibraryItem { id: number; title: string; alias: string; image: string | null; date: string | null; author: string | null; category: string | null; body: string | null }
type Item = VideoCardData | DireksiItem | BeritaItem | ArticleItem | LibraryItem | QuoteItem;
interface SectionData { kind: string; items: Item[]; total: number; categories?: LibraryCat[] }

const fmtTgl = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

export default function InsightSectionPage() {
  const { section } = useParams<{ section: string }>();
  const meta = SECTION_BY_SLUG[section];

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState(false);
  const [active, setActive] = useState<VideoCardData | null>(null);
  const [direksi, setDireksi] = useState<DireksiItem | null>(null);
  const [berita, setBerita] = useState<BeritaItem | null>(null);
  const [library, setLibrary] = useState<LibraryItem | null>(null);
  const [categories, setCategories] = useState<LibraryCat[]>([]);
  const [category, setCategory] = useState("all"); // filter Digital Library
  const [qInput, setQInput] = useState(""); // teks di kotak cari
  const [q, setQ] = useState(""); // query ter-debounce yang dipakai fetch

  const isLibrary = meta?.kind === "library";
  const isSoon = !meta || meta.kind === "soon";

  // Debounce input pencarian → q (memicu refetch lewat dependensi load).
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async (offset: number) => {
    const qs = new URLSearchParams({ offset: String(offset) });
    if (isLibrary && category !== "all") qs.set("category", category);
    if (q) qs.set("q", q);
    const r = await fetch(`/api/insight/${section}?${qs}`);
    const d: SectionData = await r.json();
    if (!Array.isArray(d.items)) throw new Error("bad payload");
    setItems((prev) => (offset === 0 ? d.items : [...prev, ...d.items]));
    setTotal(d.total);
    if (d.categories) setCategories(d.categories);
  }, [section, isLibrary, category, q]);

  useEffect(() => {
    if (isSoon) { setLoading(false); return; }
    setLoading(true); setErr(false);
    load(0).catch(() => setErr(true)).finally(() => setLoading(false));
  }, [isSoon, load]);

  const loadMore = () => {
    setLoadingMore(true);
    load(items.length).catch(() => setErr(true)).finally(() => setLoadingMore(false));
  };

  const Icon = meta?.icon ?? QuoteIcon;
  const hasMore = !isSoon && items.length < total;

  return (
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader active="Insight Hub" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <a href="/insight-hub" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-emerald-300">
          <ArrowLeft className="h-4 w-4" /> Insight Hub
        </a>

        <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold sm:text-3xl">
          <Icon className="h-6 w-6 text-emerald-400" /> {meta?.title ?? "Section tidak ditemukan"}
        </h1>
        {meta && <p className="mt-1 max-w-3xl text-[14px] text-white/60">{meta.desc}</p>}
        {meta && !isSoon && !loading && !err && <p className="mt-1 text-[12.5px] text-white/40">{total} item</p>}

        {/* Pencarian */}
        {meta && !isSoon && (
          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder={`Cari ${meta.title.toLowerCase()}…`}
              className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-[13.5px] text-white placeholder:text-white/35 outline-none focus:border-emerald-500/60"
            />
            {qInput && (
              <button onClick={() => setQInput("")} aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Kategori (pill) Digital Library */}
        {isLibrary && categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[{ id: 0, name: "Semua", alias: "all", count: 0 }, ...categories].map((c) => (
              <button key={c.alias} onClick={() => setCategory(c.alias)}
                className={`rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${category === c.alias ? "bg-emerald-500 text-white" : "bg-white/[0.06] text-white/70 hover:bg-white/10"}`}>
                {c.name}{c.alias !== "all" && <span className="ml-1 text-white/40">{c.count}</span>}
              </button>
            ))}
          </div>
        )}

        {!meta && (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
            Kategori tidak dikenal. Kembali ke <a href="/insight-hub" className="text-emerald-300 underline">Insight Hub</a>.
          </p>
        )}

        {/* Coming soon */}
        {meta && isSoon && (
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center">
            <Icon className="mx-auto h-10 w-10 text-emerald-400/70" />
            <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-white/60">{meta.desc}</p>
            <span className="mt-4 inline-block rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/50">Segera hadir</span>
          </div>
        )}

        {err && <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">Gagal memuat data.</p>}

        {/* Skeleton */}
        {meta && !isSoon && loading && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} className="overflow-hidden p-0">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-3.5"><Skeleton className="h-4 w-3/4" /><Skeleton className="mt-2 h-3 w-1/3" /></div>
              </SkeletonCard>
            ))}
          </div>
        )}

        {/* Konten */}
        {meta && !isSoon && !loading && !err && (
          <>
            {items.length === 0 ? (
              <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-white/50">
                {q ? `Tidak ada hasil untuk "${q}".` : "Belum ada konten."}
              </p>
            ) : meta.kind === "video" ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(items as VideoCardData[]).map((c) => <VideoCard key={c.id} c={c} onPlay={setActive} />)}
              </div>
            ) : meta.kind === "direksi" ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(items as DireksiItem[]).map((d) => (
                  <button key={d.id} type="button" onClick={() => setDireksi(d)}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left">
                    {d.image ? (
                      <div className="overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.image} alt={d.nama} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    ) : (
                      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-600 to-green-800 p-6 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{d.initials}</div>
                        <p className="text-[15px] font-semibold">{d.nama}</p>
                        <p className="text-[12px] text-white/80">{d.jabatan}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : meta.kind === "library" ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {(items as LibraryItem[]).map((l) => (
                  <button key={l.id} type="button" onClick={() => setLibrary(l)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-colors hover:border-emerald-500/60">
                    <div className="aspect-[3/4] overflow-hidden bg-black">
                      {l.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image} alt={l.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug">{l.title}</p>
                      <span className="mt-2 rounded-lg bg-emerald-600 px-2 py-1.5 text-center text-[12px] font-medium text-white transition-colors group-hover:bg-emerald-500">Lihat Detail</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : meta.kind === "berita" ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(items as BeritaItem[]).map((b) => (
                  <button key={b.id} type="button" onClick={() => setBerita(b)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-emerald-600/30 bg-white/[0.03] text-left transition-colors hover:border-emerald-500/60">
                    <div className="aspect-video overflow-hidden bg-black">
                      {b.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.image} alt={b.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3.5">
                      <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{b.title}</p>
                      <p className="mt-1 text-[12px] text-white/45">{fmtTgl(b.date)}</p>
                      <span className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-center text-[12.5px] font-medium text-white transition-colors group-hover:bg-emerald-500">baca berita</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : meta.kind === "article" ? (
              <div className="mt-6 space-y-3">
                {(items as ArticleItem[]).map((a) => (
                  <button key={a.id} type="button" onClick={() => setBerita(a)}
                    className="group flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-emerald-500/60">
                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-black sm:h-24 sm:w-36">
                      {a.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.image} alt={a.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] font-semibold leading-snug">{a.title}</p>
                      <p className="mt-1 text-[12px] text-white/45">{fmtTgl(a.date)}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-[12px] text-white/40">
                        <Eye className="h-3.5 w-3.5" /> {a.views.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(items as QuoteItem[]).map((q, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f3d12] to-[#0c1f08] p-5">
                    <QuoteIcon className="h-6 w-6 text-emerald-400/40" />
                    <p className="mt-2 text-[14px] italic leading-relaxed text-white/85">{q.text}</p>
                    <p className="mt-3 text-[12px] font-semibold text-emerald-300">— {q.author}</p>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-7 flex justify-center">
                <button onClick={loadMore} disabled={loadingMore}
                  className="rounded-full bg-white/[0.06] px-6 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50">
                  {loadingMore ? "Memuat…" : "Muat lebih banyak"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {active && <VideoModal video={active} onClose={() => setActive(null)} />}
      {direksi && <DireksiModal d={direksi} onClose={() => setDireksi(null)} />}
      {berita && <BeritaModal b={berita} onClose={() => setBerita(null)} />}
      {library && <LibraryModal l={library} onClose={() => setLibrary(null)} />}
    </div>
  );
}

/** Modal Digital Library — judul + meta + isi (boleh berisi embed video/audio). */
function LibraryModal({ l, onClose }: { l: LibraryItem; onClose: () => void }) {
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
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-[15px] font-bold leading-snug text-white">{l.title}</p>
            <p className="mt-1 text-[12.5px] text-white/45">{[l.category, l.author, fmtTgl(l.date)].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {l.body ? (
            <div
              className="text-[13.5px] leading-relaxed text-white/80 [&_a]:text-emerald-300 [&_a]:underline [&_audio]:mt-2 [&_audio]:w-full [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: l.body }}
            />
          ) : l.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image} alt={l.title} className="w-full rounded-xl" />
          ) : (
            <p className="text-[13px] text-white/50">Konten tidak tersedia.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal artikel berita — gambar + judul + meta + isi (HTML) + tautan sumber. */
function BeritaModal({ b, onClose }: { b: BeritaItem; onClose: () => void }) {
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
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <p className="text-[15px] font-bold leading-snug text-white">{b.title}</p>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="mb-3 text-[12.5px] text-white/45">
            {[b.author, fmtTgl(b.date)].filter(Boolean).join(" · ")}
          </p>
          {b.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image} alt={b.title} className="mb-4 w-full rounded-xl" />
          )}
          {b.body ? (
            <div
              className="text-[13.5px] leading-relaxed text-white/80 [&_a]:text-emerald-300 [&_a]:underline [&_em]:italic [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: b.body }}
            />
          ) : (
            <p className="text-[13px] text-white/50">Isi berita tidak tersedia.</p>
          )}
          {b.source && (
            <a href={b.source} target="_blank" rel="noopener noreferrer"
              className="mt-4 inline-block rounded-full bg-white/[0.06] px-4 py-2 text-[12.5px] font-medium text-emerald-300 transition-colors hover:bg-white/10">
              Baca di sumber asli ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal pesan direksi — poster besar + pesan lengkap (HTML kaya dari CMS). */
function DireksiModal({ d, onClose }: { d: DireksiItem; onClose: () => void }) {
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
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-white">{d.nama}</p>
            <p className="text-[12.5px] text-emerald-300">{d.jabatan}</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {d.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.image} alt={d.nama} className="mb-4 w-full rounded-xl" />
          )}
          {d.pesan ? (
            <div
              className="text-[13.5px] leading-relaxed text-white/80 [&_em]:italic [&_strong]:font-semibold [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: d.pesan }}
            />
          ) : (
            <p className="rounded-xl bg-white/5 p-4 text-center text-[13px] text-white/50">Pesan segera hadir.</p>
          )}
        </div>
      </div>
    </div>
  );
}
