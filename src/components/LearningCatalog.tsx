"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowUpRight, Clock, Loader2, BookOpen, Plus, Heart } from "lucide-react";

interface Course {
  id: number; judul: string; kategori: string | null;
  jpl: number | null; metode: string | null; deskripsi: string | null;
  inWishlist?: boolean;
}

/**
 * Katalog pelatihan internal untuk satu metode belajar (`metode` = kode di
 * `_learning_kategori.kode`, mis. `mb_ict`/`mb_sl`). Ditarik dari
 * /api/learning/katalog; kartu menautkan ke /wishlist (tempat aksi tambah ke
 * rencana belajar). Judul diturunkan dari `label`.
 */
export default function LearningCatalog({ metode, label }: { metode: string; label: string }) {
  const [items, setItems] = useState<Course[] | null>(null);
  const [total, setTotal] = useState(0);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    fetch(`/api/learning/katalog?metode=${encodeURIComponent(metode)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Course[] = d.items ?? [];
        setItems(list); setTotal(d.total ?? 0);
        setAdded(new Set(list.filter((c) => c.inWishlist).map((c) => c.id)));
      })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [metode]);

  const addToWishlist = async (id: number) => {
    if (busy || added.has(id)) return;
    setBusy(id);
    try {
      const r = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_learning_katalog: id }),
      });
      if (r.ok) setAdded((s) => new Set(s).add(id));
    } catch { /* abaikan */ } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-lime-500 to-green-600 text-white"><BookOpen className="h-5 w-5" /></span>
            <div>
              <p className="text-[15px] font-semibold">Katalog {label}</p>
              <p className="text-[12.5px] text-white/55">{total > 0 ? `${total} pelatihan tersedia` : `Pelatihan kategori ${label}`}</p>
            </div>
          </div>
          <a href="/wishlist" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-emerald-300 hover:underline">
            Jelajahi semua <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Loading */}
        {items === null && (
          <div className="mt-6 flex items-center justify-center gap-2 py-8 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat katalog…
          </div>
        )}

        {/* Kosong */}
        {items !== null && items.length === 0 && (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-[13px] text-white/50">
            Belum ada pelatihan {label} pada katalog.
          </p>
        )}

        {/* Grid katalog */}
        {items && items.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => {
              const isAdded = added.has(c.id);
              const isBusy = busy === c.id;
              return (
                <div
                  key={c.id}
                  className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/40"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.kategori && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300"><GraduationCap className="h-3 w-3" /> {c.kategori}</span>}
                    {c.metode && <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10.5px] font-medium text-white/60">{c.metode}</span>}
                  </div>
                  <span className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-snug">{c.judul}</span>
                  {c.deskripsi && <span className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-white/50">{c.deskripsi}</span>}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="inline-flex items-center gap-1 text-[12px] text-white/55">{c.jpl ? <><Clock className="h-3.5 w-3.5" /> {c.jpl} JPL</> : ""}</span>
                    {isAdded ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-300"><Heart className="h-3.5 w-3.5 fill-current" /> Di wishlist</span>
                    ) : (
                      <button
                        onClick={() => addToWishlist(c.id)} disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/10 disabled:opacity-60"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
