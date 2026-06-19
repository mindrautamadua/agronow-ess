"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { Heart, Clock, BookOpen, Plus, Search, Loader2, Trash2, X, AlertTriangle } from "lucide-react";

interface Course {
  id: number; judul: string; kategori: string | null; jpl: number | null; metode: string | null; deskripsi: string | null;
  wid?: number; prioritas?: number | null; status?: string | null;
}
interface Data { wishlist: Course[]; katalog: Course[] }

// Status yang sudah disetujui → tidak boleh dihapus user (riwayat pengajuan).
const APPROVED = new Set(["approved", "disetujui", "diterima", "selesai"]);
const canDelete = (status?: string | null) => !APPROVED.has((status ?? "").toLowerCase());

function CourseCard({ c, inWishlist, busy, onAdd, onRemove }: { c: Course; inWishlist?: boolean; busy?: boolean; onAdd?: () => void; onRemove?: () => void }) {
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
      <div className="mt-4 flex items-center gap-2">
        {inWishlist ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[12px] font-semibold text-emerald-300"><Heart className="h-3.5 w-3.5 fill-current" /> Di wishlist</span>
            {onRemove && (
              <button onClick={onRemove} disabled={busy} aria-label="Hapus dari wishlist" className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[12px] font-semibold text-white/60 transition-colors hover:bg-white/5 hover:text-red-300 disabled:opacity-60">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            )}
          </>
        ) : (
          <button onClick={onAdd} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[12px] font-semibold transition hover:bg-white/10 disabled:opacity-60">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Tambah ke Wishlist
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
  const [busyId, setBusyId] = useState<number | null>(null);
  const [delTarget, setDelTarget] = useState<Course | null>(null);
  const [delText, setDelText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  const load = () => fetch("/api/wishlist").then((r) => r.json()).then((d) => { d.katalog ? setData(d) : setErr(true); }).catch(() => setErr(true));

  useEffect(() => { load(); }, []);

  const add = async (katalogId: number) => {
    if (busyId) return;
    setBusyId(katalogId);
    try {
      const r = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_learning_katalog: katalogId }) });
      if (r.ok) await load();
    } catch { /* abaikan */ } finally { setBusyId(null); }
  };

  const openDelete = (c: Course) => { setDelTarget(c); setDelText(""); setDelErr(null); };
  const closeDelete = () => { if (!deleting) { setDelTarget(null); setDelText(""); setDelErr(null); } };

  const confirmDelete = async () => {
    if (!delTarget || delText !== "DELETE") return;
    setDeleting(true); setDelErr(null);
    try {
      const r = await fetch("/api/wishlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id_learning_katalog: delTarget.id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setDelErr(d.error || "Gagal menghapus."); setDeleting(false); return; }
      await load();
      setDeleting(false); setDelTarget(null); setDelText("");
    } catch {
      setDelErr("Terjadi kesalahan."); setDeleting(false);
    }
  };

  const wishlistIds = new Set((data?.wishlist ?? []).map((c) => c.id));
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
                  {data.wishlist.map((c) => <CourseCard key={c.id} c={c} inWishlist onRemove={canDelete(c.status) ? () => openDelete(c) : undefined} />)}
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
                  <CourseCard key={c.id} c={c} inWishlist={wishlistIds.has(c.id)} busy={busyId === c.id} onAdd={() => add(c.id)} onRemove={() => openDelete(c)} />
                ))}
              </div>
              {katalog.length === 0 && <p className="text-white/50">Tidak ada hasil untuk “{q}”.</p>}
            </section>
          </>
        )}
      </main>

      {/* Modal konfirmasi hapus — wajib mengetik DELETE */}
      {delTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={closeDelete}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/12 bg-[#1b1f1c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-300"><AlertTriangle className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-bold">Hapus dari Wishlist?</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">
                  Pelatihan <span className="font-semibold text-white/85">“{delTarget.judul}”</span> akan dihapus dari wishlist kamu. Tindakan ini hanya berlaku untuk pengajuan yang belum disetujui.
                </p>
              </div>
              <button onClick={closeDelete} disabled={deleting} aria-label="Tutup" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>

            <label className="mt-5 block text-[12.5px] text-white/60">Ketik <span className="font-mono font-bold text-red-300">DELETE</span> untuk mengonfirmasi:</label>
            <input
              value={delText}
              onChange={(e) => setDelText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && delText === "DELETE") confirmDelete(); }}
              autoFocus
              placeholder="DELETE"
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[14px] tracking-wider outline-none transition-colors focus:border-red-400/50 focus:ring-2 focus:ring-red-400/15"
            />
            {delErr && <p className="mt-3 text-[12.5px] font-medium text-red-300">{delErr}</p>}

            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={closeDelete} disabled={deleting} className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50">Batal</button>
              <button
                onClick={confirmDelete}
                disabled={deleting || delText !== "DELETE"}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Menghapus…</> : <><Trash2 className="h-4 w-4" /> Hapus</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
