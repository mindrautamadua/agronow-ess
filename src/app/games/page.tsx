"use client";

import AppHeader from "@/components/AppHeader";
import { Gamepad2 } from "lucide-react";

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
    <div className="min-h-screen bg-[#19191B] text-white">
      <AppHeader active="Games" />

      <main className="mx-auto max-w-[1100px] px-4 pb-20">
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-bold sm:text-3xl">Games</h1>
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[12px] font-semibold text-amber-300">Coming Soon</span>
        </div>
        <p className="mt-1 max-w-3xl text-[14px] text-white/60">
          Game berasa belajar — tiap tantangannya dirancang buat bantu kamu memahami materi sesuai tujuan belajar.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3">
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
