"use client";

import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Gamepad2, Play } from "lucide-react";

// Game yang sudah bisa dimainkan (punya `href` → buka di tab baru).
const FEATURED = {
  name: "Counter Dash",
  img: "/img/games/banner-game1.jpeg",
  href: "https://rakamin---counter-dash.web.app",
  desc: "Asah fokus dan kecepatan pengambilan keputusanmu. Sudah bisa dimainkan sekarang!",
};

// Game yang belum dirilis.
const GAMES = [
  { name: "Pac-Man", img: "/img/games/Pacman.png" },
  { name: "Candy Crush", img: "/img/games/Candy-Crush.png" },
  { name: "2048", img: "/img/games/2048.png" },
  { name: "Feeding Frenzy", img: "/img/games/Feeding-Frenzy.png" },
  { name: "Tetris", img: "/img/games/tetris.png" },
  { name: "Dinner Dash", img: "/img/games/Dinner-Dash.png" },
];

export default function GamesPage() {
  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Games" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Games</h1>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Game berasa belajar — tiap tantangannya dirancang buat bantu kamu memahami materi sesuai tujuan belajar.
        </p>

        {/* ───── Featured: game yang sudah bisa dimainkan ───── */}
        <a
          href={FEATURED.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Main ${FEATURED.name} (buka di tab baru)`}
          className="group mt-7 block overflow-hidden rounded-2xl border border-emerald-500/30 bg-white/[0.03] shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition-colors hover:border-emerald-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={FEATURED.img}
              alt={FEATURED.name}
              className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-64"
            />
            {/* Gradien agar teks selalu terbaca di atas gambar apa pun */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11.5px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Tersedia
            </span>

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-bold sm:text-2xl">{FEATURED.name}</h2>
                <p className="mt-1 max-w-xl text-[13px] text-white/75">{FEATURED.desc}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-emerald-500 px-5 py-2.5 text-[14px] font-semibold text-white transition-transform group-hover:scale-105 sm:self-auto">
                <Play className="h-4 w-4 fill-current" /> Main Sekarang
              </span>
            </div>
          </div>
        </a>

        {/* ───── Segera Hadir ───── */}
        <div className="mt-9 flex items-center gap-3">
          <h2 className="text-lg font-bold sm:text-xl">Segera Hadir</h2>
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[12px] font-semibold text-amber-300">Coming Soon</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {GAMES.map((g) => (
            <div key={g.name} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.img} alt={g.name} className="w-full transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-[12px] font-semibold text-slate-800"><Gamepad2 className="h-4 w-4" /> Segera Hadir</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
