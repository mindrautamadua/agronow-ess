"use client";

import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { INSIGHT_SECTIONS, type SectionMeta } from "@/lib/insight-sections";

/** Kartu section → sub-halaman. Foto bila ada, selain itu tile gradien. */
function SectionCard({ s }: { s: SectionMeta }) {
  const Icon = s.icon;
  const external = !!s.href;
  return (
    <a
      href={external ? s.href : `/insight-hub/${s.slug}`}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group block overflow-hidden rounded-[15px] bg-black shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
    >
      {s.image ? (
        <div className="relative aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt={s.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        </div>
      ) : (
        <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#1f3d12] to-[#0c1f08] p-6 text-center transition-transform duration-500 group-hover:scale-105">
          <Icon className="h-12 w-12 text-emerald-300" />
          <span className="text-2xl font-bold text-white">{s.title}</span>
        </div>
      )}
    </a>
  );
}

export default function InsightHubPage() {
  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Insight Hub" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Insight Hub</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Pusat informasi terintegrasi. Pilih kategori untuk menjelajah kontennya.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {INSIGHT_SECTIONS.filter((s) => s.slug !== "inspirasi").map((s) => <SectionCard key={s.slug} s={s} />)}
        </section>
      </main>
    </div>
  );
}
