"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useParams } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { VideoCard, VideoModal, type VideoCardData } from "@/components/InsightVideo";
import { ArrowLeft, Quote as QuoteIcon, X, Eye, Search, MessageSquare, Heart, Pencil } from "lucide-react";
import { SECTION_BY_SLUG } from "@/lib/insight-sections";

interface DireksiItem { id: number; nama: string; jabatan: string; pesan: string | null; image: string | null; initials: string }
interface BeritaItem { id: number; title: string; image: string | null; date: string | null; source: string | null; author: string | null; body: string | null }
interface ArticleItem extends BeritaItem { views: number }
interface QuoteItem { text: string; author: string }
interface LibraryCat { id: number; name: string; alias: string; count: number }
interface LibraryItem { id: number; title: string; alias: string; image: string | null; date: string | null; author: string | null; category: string | null; body: string | null }
interface DiskusiItem { id: number; judul: string; preview: string; body: string | null; penulis: string; penulisImg: string | null; tgl: string | null; balasan: number; likes: number; likedByMe: boolean }
interface DiskusiReply { id: number; memberId: number; penulis: string; penulisImg: string | null; tgl: string | null; body: string | null; likes: number; likedByMe: boolean }
type Item = VideoCardData | DireksiItem | BeritaItem | ArticleItem | LibraryItem | QuoteItem | DiskusiItem;
interface SectionData { kind: string; items: Item[]; total: number; categories?: LibraryCat[] }

const fmtTgl = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

const DISKUSI_HTML_CLS = "text-[13.5px] leading-relaxed text-white/80 [&_a]:text-emerald-300 [&_a]:underline [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:mb-2 [&_strong]:font-semibold [&_strong]:text-white";

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
  const [diskusi, setDiskusi] = useState<DiskusiItem | null>(null);
  const [categories, setCategories] = useState<LibraryCat[]>([]);
  const [category, setCategory] = useState("all"); // filter Digital Library
  const [qInput, setQInput] = useState(""); // teks di kotak cari
  const [q, setQ] = useState(""); // query ter-debounce yang dipakai fetch

  const isLibrary = meta?.kind === "library";
  const isSoon = !meta || meta.kind === "soon";

  // Section eksternal (mis. SOP → OneHub): alihkan langsung ke URL tujuan.
  useEffect(() => {
    if (meta?.kind === "external" && meta.href) window.location.replace(meta.href);
  }, [meta]);

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
                  <DireksiCard key={d.id} d={d} onOpen={() => setDireksi(d)} />
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
            ) : meta.kind === "discussion" ? (
              <div className="mt-6 space-y-3">
                {(items as DiskusiItem[]).map((d) => (
                  <DiskusiCard key={d.id} d={d} onOpen={() => setDiskusi(d)}
                    onLikeChange={(likes, likedByMe) =>
                      setItems((prev) => prev.map((it) => ("balasan" in it && it.id === d.id ? { ...it, likes, likedByMe } : it)))
                    } />
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
      {diskusi && (
        <DiskusiModal
          d={diskusi}
          onClose={() => setDiskusi(null)}
          onThreadLike={(likes, likedByMe) =>
            setItems((prev) => prev.map((it) => ("balasan" in it && it.id === diskusi.id ? { ...it, likes, likedByMe } : it)))
          }
        />
      )}
    </div>
  );
}

/** Avatar member — foto bila ada URL valid, jika gagal/null jatuh ke inisial. */
function Avatar({ name, src, size = "md" }: { name: string; src: string | null; size?: "md" | "sm" }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[13px]";
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} onError={() => setFailed(true)}
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-white/10`} />
    );
  }
  return (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-green-800 font-bold text-white ring-1 ring-white/10`}>
      {initials}
    </div>
  );
}

/**
 * Kartu thread diskusi: klik kartu membuka modal; tombol ♥ bisa diklik langsung
 * (stopPropagation agar tak ikut membuka modal). Like optimistik lewat onLikeChange
 * (parent yang memegang state, jadi modal & kartu tetap sinkron).
 */
function DiskusiCard({ d, onOpen, onLikeChange }: { d: DiskusiItem; onOpen: () => void; onLikeChange: (likes: number, likedByMe: boolean) => void }) {
  const [liking, setLiking] = useState(false);

  async function toggleLike(e: MouseEvent) {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const prevLiked = d.likedByMe, prevLikes = d.likes;
    onLikeChange(prevLikes + (prevLiked ? -1 : 1), !prevLiked); // optimistik
    try {
      const res = await fetch("/api/diskusi/like", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumId: d.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { onLikeChange(prevLikes, prevLiked); return; } // revert
      onLikeChange(Number(j.likes) || 0, !!j.liked);
    } catch {
      onLikeChange(prevLikes, prevLiked); // revert
    } finally {
      setLiking(false);
    }
  }

  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group flex w-full cursor-pointer items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-emerald-500/60 focus:outline-none focus-visible:border-emerald-500/60">
      <Avatar name={d.penulis} src={d.penulisImg} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[14.5px] font-semibold leading-snug text-white group-hover:text-emerald-200">{d.judul}</p>
        {d.preview && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/55">{d.preview}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/45">
          <span className="font-medium text-white/65">{d.penulis}</span>
          <span>{fmtTgl(d.tgl)}</span>
          <span className="inline-flex items-center gap-1 text-emerald-300/80">
            <MessageSquare className="h-3.5 w-3.5" /> {d.balasan} balasan
          </span>
          <button type="button" onClick={toggleLike} disabled={liking} aria-pressed={d.likedByMe}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-colors disabled:opacity-60 ${d.likedByMe ? "bg-rose-500/15 text-rose-300" : "text-white/50 hover:bg-white/10 hover:text-white/85"}`}>
            <Heart className={`h-3.5 w-3.5 ${d.likedByMe ? "fill-rose-400 text-rose-400" : ""}`} /> {d.likes} suka
          </button>
        </div>
      </div>
    </div>
  );
}

/** HTML balasan → teks polos untuk textarea sunting (<br> jadi newline). */
function bodyToPlain(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}

/**
 * Satu balasan diskusi: tampil body + aksi like (semua user) & sunting (pemilik).
 * Like optimistik (revert bila gagal); sunting inline lewat /api/diskusi/edit.
 */
function ReplyItem({ r, mine, onUpdate }: { r: DiskusiReply; mine: boolean; onUpdate: (id: number, patch: Partial<DiskusiReply>) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [liking, setLiking] = useState(false);
  const [err, setErr] = useState("");

  function startEdit() {
    setDraft(bodyToPlain(r.body));
    setErr("");
    setEditing(true);
  }

  async function save() {
    const body = draft.trim();
    if (!body || saving) return;
    setSaving(true); setErr("");
    try {
      const res = await fetch("/api/diskusi/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcId: r.id, text: body }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j?.error ?? "Gagal menyimpan."); return; }
      onUpdate(r.id, { body: j.body ?? null });
      setEditing(false);
    } catch {
      setErr("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    const optimistic = { likedByMe: !r.likedByMe, likes: r.likes + (r.likedByMe ? -1 : 1) };
    onUpdate(r.id, optimistic);
    try {
      const res = await fetch("/api/diskusi/like", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcId: r.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { onUpdate(r.id, { likedByMe: r.likedByMe, likes: r.likes }); return; } // revert
      onUpdate(r.id, { likedByMe: !!j.liked, likes: Number(j.likes) || 0 });
    } catch {
      onUpdate(r.id, { likedByMe: r.likedByMe, likes: r.likes }); // revert
    } finally {
      setLiking(false);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <Avatar name={r.penulis} src={r.penulisImg} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-white/85">{r.penulis} <span className="ml-1 font-normal text-white/40">{fmtTgl(r.tgl)}</span></p>

        {editing ? (
          <div className="mt-1.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); } }}
              rows={3} maxLength={4000} autoFocus
              className="w-full resize-y rounded-lg border border-white/12 bg-white/[0.04] p-2.5 text-[13px] text-white outline-none focus:border-emerald-500/60"
            />
            {err && <p className="mt-1 text-[12px] text-red-300">{err}</p>}
            <div className="mt-1.5 flex items-center gap-2">
              <button onClick={save} disabled={saving || !draft.trim()}
                className="rounded-full bg-emerald-600 px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50">
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
              <button onClick={() => setEditing(false)} disabled={saving}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white/55 transition-colors hover:text-white">
                Batal
              </button>
            </div>
          </div>
        ) : (
          <>
            {r.body
              ? <div className={`mt-1 ${DISKUSI_HTML_CLS}`} dangerouslySetInnerHTML={{ __html: r.body }} />
              : <p className="mt-1 text-[13px] text-white/40">(pesan kosong)</p>}

            <div className="mt-2 flex items-center gap-3">
              <button onClick={toggleLike} disabled={liking}
                aria-pressed={r.likedByMe}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-60 ${r.likedByMe ? "bg-rose-500/15 text-rose-300" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                <Heart className={`h-3.5 w-3.5 ${r.likedByMe ? "fill-rose-400 text-rose-400" : ""}`} />
                {r.likes > 0 ? r.likes : "Suka"}
              </button>
              {mine && (
                <button onClick={startEdit}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/80">
                  <Pencil className="h-3.5 w-3.5" /> Sunting
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Modal diskusi — thread (judul + isi + penulis) lalu daftar balasan (di-fetch saat dibuka). */
function DiskusiModal({ d, onClose, onThreadLike }: { d: DiskusiItem; onClose: () => void; onThreadLike?: (likes: number, likedByMe: boolean) => void }) {
  const [replies, setReplies] = useState<DiskusiReply[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(d.balasan);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [meId, setMeId] = useState<number | null>(null);

  // Identitas user (untuk tombol sunting komentar sendiri).
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => setMeId(j?.member?.id ?? null)).catch(() => {});
  }, []);

  const updateReply = useCallback((id: number, patch: Partial<DiskusiReply>) => {
    setReplies((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
  }, []);

  // Like thread utama (state lokal, inisial dari kartu daftar).
  const [tLiked, setTLiked] = useState(d.likedByMe);
  const [tLikes, setTLikes] = useState(d.likes);
  const [tLiking, setTLiking] = useState(false);

  async function toggleThreadLike() {
    if (tLiking) return;
    setTLiking(true);
    const prevLiked = tLiked, prevLikes = tLikes;
    setTLiked(!prevLiked); setTLikes(prevLikes + (prevLiked ? -1 : 1)); // optimistik
    try {
      const res = await fetch("/api/diskusi/like", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumId: d.id }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setTLiked(prevLiked); setTLikes(prevLikes); return; } // revert
      const liked = !!j.liked, likes = Number(j.likes) || 0;
      setTLiked(liked); setTLikes(likes);
      onThreadLike?.(likes, liked); // sinkronkan kartu daftar
    } catch {
      setTLiked(prevLiked); setTLikes(prevLikes); // revert
    } finally {
      setTLiking(false);
    }
  }

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      const r = await fetch("/api/diskusi/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumId: d.id, text: body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.reply) { setError(j?.error ?? "Gagal mengirim komentar."); return; }
      setReplies((prev) => [...(prev ?? []), j.reply]);
      setCount((c) => c + 1);
      setText("");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/insight/diskusi?thread=${d.id}`)
      .then((r) => r.json())
      .then((j) => { if (alive) setReplies(Array.isArray(j.items) ? j.items : []); })
      .catch(() => { if (alive) setReplies([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [d.id]);

  const htmlCls = DISKUSI_HTML_CLS;

  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6">
      <div onClick={(e) => e.stopPropagation()} className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1d1f1c] shadow-2xl">
        {/* Header thread */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={d.penulis} src={d.penulisImg} />
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-snug text-white">{d.judul}</p>
              <p className="mt-0.5 text-[12.5px] text-white/45">{d.penulis} · {fmtTgl(d.tgl)}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Isi thread */}
        <div className="border-b border-white/10 p-4">
          {d.body
            ? <div className={htmlCls} dangerouslySetInnerHTML={{ __html: d.body }} />
            : <p className="text-[13px] text-white/50">Tidak ada deskripsi.</p>}
          <div className="mt-3 flex items-center gap-3">
            <button onClick={toggleThreadLike} disabled={tLiking} aria-pressed={tLiked}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-60 ${tLiked ? "bg-rose-500/15 text-rose-300" : "text-white/55 hover:bg-white/5 hover:text-white/85"}`}>
              <Heart className={`h-4 w-4 ${tLiked ? "fill-rose-400 text-rose-400" : ""}`} />
              {tLikes > 0 ? `${tLikes} Suka` : "Suka"}
            </button>
          </div>
        </div>

        {/* Balasan */}
        <div className="p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-white/70">
            <MessageSquare className="h-4 w-4 text-emerald-400" /> {count} Balasan
          </p>
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : !replies || replies.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-[13px] text-white/45">Belum ada balasan.</p>
          ) : (
            <div className="space-y-3">
              {replies.map((r) => (
                <ReplyItem key={r.id} r={r} mine={meId != null && r.memberId === meId} onUpdate={updateReply} />
              ))}
            </div>
          )}

          {/* Form komentar */}
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="mt-4 border-t border-white/10 pt-4"
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
              rows={3}
              maxLength={4000}
              placeholder="Tulis komentar kamu…"
              className="w-full resize-y rounded-xl border border-white/12 bg-white/[0.04] p-3 text-[13.5px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-500/60"
            />
            {error && <p className="mt-1.5 text-[12px] text-red-300">{error}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11.5px] text-white/35">⌘/Ctrl + Enter untuk kirim</span>
              <button
                type="submit" disabled={sending || !text.trim()}
                className="rounded-full bg-emerald-600 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Mengirim…" : "Kirim Komentar"}
              </button>
            </div>
          </form>
        </div>
      </div>
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

/**
 * Kartu direksi — foto poster; jatuh ke kartu inisial bila tak ada gambar ATAU
 * gambar gagal dimuat (mis. host `insight.agronow.co.id` tak terjangkau publik),
 * supaya tidak pernah menampilkan ikon broken.
 */
function DireksiCard({ d, onOpen }: { d: DireksiItem; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const showImg = !!d.image && !failed;
  return (
    <button type="button" onClick={onOpen}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left">
      {showImg ? (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image!} alt={d.nama} onError={() => setFailed(true)}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      ) : (
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-600 to-green-800 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">{d.initials}</div>
          <p className="text-[15px] font-semibold">{d.nama}</p>
          <p className="text-[12px] text-white/80">{d.jabatan}</p>
        </div>
      )}
    </button>
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
