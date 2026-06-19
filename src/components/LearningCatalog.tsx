"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ArrowUpRight, Clock, Loader2, BookOpen, Plus, Heart, X, CalendarDays, Target, ListChecks, Layers, ClipboardCheck } from "lucide-react";

interface Course {
  id: number; judul: string; kategori: string | null;
  jpl: number | null; metode: string | null; deskripsi: string | null;
  inWishlist?: boolean;
}

interface Detail {
  id: number; judul: string; elemen: string | null; gesture: string | null; metode: string | null;
  jpl: number; durasiHari: number; minimalPeserta: number; harga: number;
  deskripsi: string | null; silabus: string | null; sasaran: string | null; penugasan: string | null;
  kataKunci: string | null; metodeBelajar: { label: string; jpl: number }[];
}

/**
 * Katalog pelatihan internal untuk satu metode belajar (`metode` = kode di
 * `_learning_kategori.kode`, mis. `mb_ict`/`mb_sl`). Kartu bisa diklik untuk
 * melihat detail (modal); tombol "Tambah" memasukkan ke wishlist.
 */
export default function LearningCatalog({ metode, label }: { metode: string; label: string }) {
  const [items, setItems] = useState<Course[] | null>(null);
  const [total, setTotal] = useState(0);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const openDetail = (id: number) => {
    setDetailId(id); setDetail(null); setLoadingDetail(true);
    fetch(`/api/learning/katalog/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.detail) setDetail(d.detail); })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  };

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

  const detailAdded = detailId != null && added.has(detailId);

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
                  role="button" tabIndex={0}
                  onClick={() => openDetail(c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(c.id); } }}
                  className="flex cursor-pointer flex-col rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/40 hover:bg-white/[0.04] focus:outline-none focus-visible:border-emerald-500/60"
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
                        onClick={(e) => { e.stopPropagation(); addToWishlist(c.id); }} disabled={isBusy}
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

      {/* Modal detail */}
      {detailId != null && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setDetailId(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/12 bg-[#1b1f1c] sm:rounded-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#1b1f1c] px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">Detail Pelatihan</p>
                <h3 className="mt-0.5 text-[17px] font-bold leading-snug">{detail?.judul ?? "Memuat…"}</h3>
              </div>
              <button onClick={() => setDetailId(null)} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            {loadingDetail || !detail ? (
              <div className="flex items-center justify-center gap-2 py-16 text-white/50"><Loader2 className="h-5 w-5 animate-spin" /> Memuat detail…</div>
            ) : (
              <div className="px-5 py-5">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {detail.elemen && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300"><GraduationCap className="h-3 w-3" /> {detail.elemen}</span>}
                  {detail.metode && <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-white/70">{detail.metode}</span>}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-white/70"><Clock className="h-3 w-3" /> {detail.jpl} JPL</span>
                  {detail.durasiHari > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-medium text-white/70"><CalendarDays className="h-3 w-3" /> {detail.durasiHari} hari</span>}
                </div>

                {/* Deskripsi */}
                {detail.deskripsi && (
                  <div className="mt-5">
                    <p className="text-[13px] font-bold text-white/85">Deskripsi</p>
                    <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/65">{detail.deskripsi}</p>
                  </div>
                )}

                {/* Metode belajar */}
                {detail.metodeBelajar.length > 0 && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/85"><Layers className="h-4 w-4 text-emerald-300" /> Metode Belajar</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detail.metodeBelajar.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12.5px] text-white/75">{m.label} <span className="text-white/45">· {m.jpl} JPL</span></span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sasaran */}
                {detail.sasaran && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/85"><Target className="h-4 w-4 text-emerald-300" /> Sasaran Pembelajaran</p>
                    <NumberedText text={detail.sasaran} />
                  </div>
                )}

                {/* Silabus */}
                {detail.silabus && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/85"><ListChecks className="h-4 w-4 text-emerald-300" /> Silabus</p>
                    <NumberedText text={detail.silabus} />
                  </div>
                )}

                {/* Penugasan */}
                {detail.penugasan && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-white/85"><ClipboardCheck className="h-4 w-4 text-emerald-300" /> Penugasan Pasca Pelatihan</p>
                    <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/65">{detail.penugasan}</p>
                  </div>
                )}

                {/* Aksi */}
                <div className="mt-7 flex justify-end">
                  {detailAdded ? (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-[13.5px] font-semibold text-emerald-300"><Heart className="h-4 w-4 fill-current" /> Sudah di wishlist</span>
                  ) : (
                    <button
                      onClick={() => addToWishlist(detail.id)} disabled={busy === detail.id}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-[13.5px] font-bold text-[#0d130f] transition-colors hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {busy === detail.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah ke Wishlist
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Pecah teks bernomor ("1. … 2. … 3. …") jadi item terpisah — termasuk saat
 * semua nomor menyatu dalam satu paragraf tanpa baris baru. Penanda hanya
 * dianggap butir bila nomornya berurutan (1,2,3,…) agar angka di tengah teks
 * (mis. "CK24", "16.4") tidak salah dipecah. Mengembalikan null bila bukan
 * daftar bernomor (≥2 butir) → pemanggil menampilkannya sebagai paragraf biasa.
 */
function splitNumbered(text: string): string[] | null {
  const s = text.trim();
  const re = /(\d{1,2})\.\s+/g;
  const marks: { num: number; start: number; contentStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    marks.push({ num: parseInt(m[1], 10), start: m.index, contentStart: m.index + m[0].length });
  }
  const seq: typeof marks = [];
  let expect = 1;
  for (const mk of marks) {
    if (mk.num === expect) { seq.push(mk); expect++; }
  }
  if (seq.length < 2) return null;
  return seq.map((mk, i) => {
    const end = i + 1 < seq.length ? seq[i + 1].start : s.length;
    return s.slice(mk.contentStart, end).trim().replace(/\s+/g, " ");
  });
}

/** Teks yang dirender sebagai daftar bernomor bila polanya cocok; selain itu paragraf. */
function NumberedText({ text }: { text: string }) {
  const items = splitNumbered(text);
  if (!items) return <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-white/65">{text}</p>;
  return (
    <ol className="mt-2 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-white/65 marker:font-semibold marker:text-emerald-300/80">
      {items.map((it, i) => <li key={i} className="pl-1">{it}</li>)}
    </ol>
  );
}
