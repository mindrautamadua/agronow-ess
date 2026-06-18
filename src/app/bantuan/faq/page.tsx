"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { ChevronDown, Search, BookOpen } from "lucide-react";

const FAQ = [
  { q: "Apa itu kerangka 70 · 20 · 10?", a: "Model pembelajaran: 70% dari pengalaman & penugasan kerja, 20% dari interaksi sosial (coaching, mentoring), dan 10% dari pelatihan formal (kelas, workshop, belajar mandiri)." },
  { q: "Bagaimana JPL saya dihitung?", a: "JPL (Jam Pelajaran) bertambah dari kelas yang kamu ikuti dan telah diverifikasi. Setiap kategori punya target JPL per tahun, dan capaianmu ditampilkan di panel Progres Pembelajaran." },
  { q: "Mengapa progres saya belum bertambah?", a: "Kelas yang belum diverifikasi belum dihitung sebagai JPL. Pastikan kehadiran/penyelesaianmu sudah diverifikasi oleh admin pembelajaran." },
  { q: "Apa itu IDP?", a: "Individual Development Program — rencana pengembangan diri berisi area pengembangan, aspirasi karir, dan rencana belajar yang kamu susun setiap tahun." },
  { q: "Bagaimana cara menambah Wishlist?", a: "Buka menu Wishlist, telusuri Katalog Pelatihan, lalu tambahkan pelatihan yang kamu rencanakan dan tentukan prioritasnya." },
  { q: "Apa itu Agro Wallet?", a: "Saldo pelatihan tahunan yang dapat digunakan untuk pengajuan pembelajaran sesuai ketentuan yang berlaku." },
];

interface Term { name: string; desc: string }

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  const [terms, setTerms] = useState<Term[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/kamus").then((r) => r.json()).then((d) => setTerms(d.terms ?? [])).catch(() => {});
  }, []);

  const filtered = terms.filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || t.desc.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Bantuan" />

      <main className="mx-auto max-w-[1000px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">FAQ &amp; Kamus</h1>
        <p className="mt-1 text-[14px] text-white/60">Pertanyaan yang sering diajukan dan kamus istilah perkebunan.</p>

        {/* FAQ */}
        <section className="mt-6 space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                <span className="text-[14px] font-semibold">{item.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-white/65">{item.a}</p>}
            </div>
          ))}
        </section>

        {/* Kamus istilah (LIVE) */}
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen className="h-5 w-5 text-emerald-400" /> Kamus Istilah Perkebunan</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari istilah…"
                className="w-60 rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15"
              />
            </div>
          </div>
          {terms.length === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-2/3" />
                </SkeletonCard>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((t) => (
              <div key={t.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[14px] font-semibold text-emerald-300">{t.name}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-white/65">{t.desc}</p>
              </div>
            ))}
          </div>
          {terms.length > 0 && filtered.length === 0 && <p className="text-white/50">Tidak ditemukan istilah “{q}”.</p>}
        </section>
      </main>
    </div>
  );
}
