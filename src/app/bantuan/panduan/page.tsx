"use client";

import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { GraduationCap, Users, Briefcase, Target, Heart, BarChart3 } from "lucide-react";
import { GLOSSARY } from "@/lib/glossary";

// Daftar istilah dikelompokkan; tiap kunci mengacu ke entri di lib/glossary.ts.
const GLOSSARY_GROUPS: { title: string; keys: string[] }[] = [
  { title: "Kerangka 70 · 20 · 10", keys: ["formal", "social", "experiential"] },
  { title: "Metode Pembelajaran", keys: ["mb_ict", "mb_sl", "mb_w", "mb_c", "mb_m", "mb_b", "mb_lo", "mb_pa", "mb_ib"] },
  { title: "Insight Hub", keys: ["webinar", "direksi", "berita", "diskusi", "library", "article", "chatroom", "short-movie", "vlog"] },
  { title: "Program Lain", keys: ["wishlist", "idp", "agrowallet"] },
];

const STEPS = [
  { icon: BarChart3, title: "1. Pantau Progres", desc: "Lihat capaian belajarmu pada panel Progres Pembelajaran di halaman utama — total jam dan rincian 70 · 20 · 10." },
  { icon: GraduationCap, title: "2. Pembelajaran Formal (10%)", desc: "Ikuti kelas, belajar mandiri, dan workshop. Setiap kelas yang terverifikasi menambah JPL kategori Formal." },
  { icon: Users, title: "3. Pembelajaran Sosial (20%)", desc: "Belajar dari orang lain lewat coaching, mentoring, dan benchmarking bersama rekan & atasan." },
  { icon: Briefcase, title: "4. Belajar dari Pengalaman (70%)", desc: "Action-based learning, project assignment, dan innovation box dari pekerjaan nyata." },
  { icon: Target, title: "5. Susun IDP", desc: "Isi Individual Development Program: area pengembangan, aspirasi karir, dan rencana belajar tahun ini." },
  { icon: Heart, title: "6. Kelola Wishlist", desc: "Tambahkan pelatihan yang ingin kamu ikuti dari katalog dan tentukan prioritasnya." },
];

export default function PanduanPage() {
  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Bantuan" />

      <main className="mx-auto max-w-[1000px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Panduan Penggunaan</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Agronow adalah platform Learning &amp; Development dengan kerangka <b className="text-emerald-300">70 · 20 · 10</b>.
          Ikuti langkah berikut untuk memaksimalkan pengembangan kompetensimu.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700"><Icon className="h-5 w-5" /></div>
                <h2 className="mt-3 text-[15px] font-bold">{s.title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-white/60">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Daftar istilah — sumber: lib/glossary.ts */}
        <section className="mt-10">
          <h2 className="text-xl font-bold sm:text-2xl">Daftar Istilah</h2>
          <p className="mt-1 max-w-3xl text-[14px] text-white/60">Pengertian metode dan program pembelajaran yang tersedia di Agronow.</p>
          <div className="mt-5 space-y-6">
            {GLOSSARY_GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-emerald-300/90">{g.title}</h3>
                <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                  {g.keys.map((k) => {
                    const e = GLOSSARY[k];
                    if (!e) return null;
                    return (
                      <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <dt className="text-[14px] font-bold">
                          {e.term}
                          {e.comingSoon && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">Coming soon</span>}
                        </dt>
                        <dd className="mt-1 text-[12.5px] leading-relaxed text-white/60">{e.desc}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-7 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1f3d12] to-[#0c1f08] p-6">
          <h2 className="text-lg font-bold">Butuh bantuan lebih lanjut?</h2>
          <p className="mt-1 text-[13.5px] text-white/70">Lihat <a href="/bantuan/faq" className="font-semibold text-emerald-300 underline-offset-2 hover:underline">FAQ</a> atau hubungi tim L&amp;D Holding PTPN.</p>
        </div>
      </main>
    </div>
  );
}
