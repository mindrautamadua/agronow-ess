"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Building2,
  ChevronDown,
  Briefcase,
  Users,
  GraduationCap,
} from "lucide-react";

// Partikel "spora cahaya" yang naik — koordinat tetap agar stabil saat SSR.
const MOTES = [
  { x: "8%", dur: 13, delay: 0, size: 6 },
  { x: "22%", dur: 17, delay: 2.5, size: 4 },
  { x: "37%", dur: 11, delay: 1, size: 7 },
  { x: "51%", dur: 15, delay: 3.5, size: 5 },
  { x: "66%", dur: 12, delay: 0.6, size: 6 },
  { x: "79%", dur: 18, delay: 2, size: 4 },
  { x: "91%", dur: 14, delay: 4, size: 5 },
];

// Kerangka pembelajaran 70-20-10
const LEARNING = [
  { icon: Briefcase, pct: "70", title: "Experiential", desc: "Belajar dari pengalaman & penugasan kerja." },
  { icon: Users, pct: "20", title: "Social", desc: "Belajar dari mentor, atasan, dan rekan." },
  { icon: GraduationCap, pct: "10", title: "Formal", desc: "Pelatihan, kelas, dan sertifikasi." },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // Disambiguasi entitas — hanya muncul saat backend balas `needGroup`
  // (NIK + password sama terdaftar di >1 perusahaan, jalur login non-API).
  const [groups, setGroups] = useState<{ groupId: string; groupName: string }[]>([]);
  const [groupId, setGroupId] = useState("");

  async function onLogin() {
    if (loading) return;
    setError("");
    if (!nip.trim() || !password) {
      setError("NIK dan password wajib diisi.");
      return;
    }
    if (groups.length > 0 && !groupId) {
      setError("Pilih perusahaan/entitas kamu.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik: nip.trim(), password, groupId: groupId || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      // NIK ambigu — minta user memilih entitas, lalu submit ulang.
      if (res.status === 409 && data?.needGroup) {
        setGroups(data.options ?? []);
        setError("NIK ini terdaftar di lebih dari satu perusahaan. Pilih entitas kamu.");
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const base = data?.error ?? `Gagal masuk (HTTP ${res.status}).`;
        setError(data?.detail ? `${base} — ${data.detail}` : base);
        setLoading(false);
        return;
      }
      router.replace("/home");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi kamu.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#041304] text-white">
      {/* ── Latar: foto kebun + gelap-hijau gradient ── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/img/bglogin.jpg)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(120deg, rgba(4,19,4,0.92) 0%, rgba(9,50,9,0.82) 45%, rgba(12,71,39,0.78) 100%)",
        }}
      />

      {/* ── Aurora glow blobs bergerak lembut ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.32), transparent 65%)" }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-44 -right-24 h-[36rem] w-[36rem] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.28), transparent 65%)" }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* ── Spora cahaya naik ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {MOTES.map((m, i) => (
          <motion.span
            key={i}
            className="absolute bottom-0 rounded-full bg-emerald-200/70 blur-[1px]"
            style={{ left: m.x, width: m.size, height: m.size }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: ["0vh", "-105vh"], opacity: [0, 0.9, 0.9, 0] }}
            transition={{ duration: m.dur, repeat: Infinity, ease: "linear", delay: m.delay }}
          />
        ))}
      </div>

      {/* ── Konten ── */}
      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* ───── Panel kiri: hero brand ───── */}
        <div className="relative hidden flex-col justify-between p-12 xl:p-16 lg:flex">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo_danantara.png" alt="Danantara Indonesia" className="h-12 w-auto" />
            <span className="h-9 w-px bg-white/25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo_ptpn.png" alt="Perkebunan Nusantara" className="h-12 w-auto" />
          </motion.div>

          <div className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3.5 py-1.5 text-[12px] font-medium text-emerald-200 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              Learning &amp; Development
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl"
            >
              <span className="bg-gradient-to-r from-white via-emerald-50 to-emerald-200 bg-clip-text text-transparent">
                Hai, Selamat Datang
              </span>
              <br />
              <span className="bg-gradient-to-r from-emerald-300 via-green-300 to-lime-300 bg-clip-text text-transparent">
                di Agronow
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-5 max-w-md text-[15px] leading-relaxed text-emerald-50/70"
            >
              Platform pembelajaran &amp; pengembangan karyawan Perkebunan Nusantara —
              tumbuhkan kompetensi lewat kerangka <span className="font-semibold text-emerald-200">70&nbsp;·&nbsp;20&nbsp;·&nbsp;10</span>.
            </motion.p>

            <div className="mt-9 grid grid-cols-3 gap-3">
              {LEARNING.map((h, i) => {
                const Icon = h.icon;
                return (
                  <motion.div
                    key={h.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-colors hover:bg-white/[0.1]"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/25 to-lime-400/20 ring-1 ring-white/15">
                        <Icon className="h-4.5 w-4.5 text-emerald-200" />
                      </div>
                      <span className="bg-gradient-to-br from-emerald-200 to-lime-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                        {h.pct}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-white">{h.title}</p>
                    <p className="mt-1 text-[11px] leading-snug text-emerald-50/60">{h.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-[12px] text-emerald-50/45"
          >
            © {new Date().getFullYear()} PT Perkebunan Nusantara · Agronow Learning &amp; Development
          </motion.p>
        </div>

        {/* ───── Panel kanan: kartu login ───── */}
        <div className="flex items-center justify-center px-5 py-10 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="w-full max-w-[400px]"
          >
            {/* Header brand untuk mobile */}
            <div className="mb-7 flex flex-col items-center lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/logo-login.png" alt="Agronow" className="mb-4 h-14 w-auto" />
              <h1 className="text-center text-2xl font-bold">Hai, Selamat Datang di Agronow</h1>
            </div>

            <div className="relative">
              {/* glow tepi kartu */}
              <div
                aria-hidden
                className="absolute -inset-[1px] rounded-[26px] bg-gradient-to-br from-emerald-400/50 via-green-500/25 to-lime-400/50 opacity-70 blur-[7px]"
              />
              <div className="relative rounded-[24px] border border-white/12 bg-white/[0.07] p-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-8">
                {/* logo di kartu (desktop) */}
                <div className="mb-6 hidden lg:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/logo-login.png" alt="Agronow" className="h-12 w-auto" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight">Login</h2>
                <p className="mt-1 text-[13px] text-emerald-50/60">
                  Silahkan login ke akun kamu
                </p>

                <form
                  className="mt-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onLogin();
                  }}
                >
                  {/* NIK */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-emerald-50/70">
                      NIK
                    </label>
                    <div className="group relative">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/60 transition-colors group-focus-within:text-emerald-300" />
                      <input
                        type="text"
                        value={nip}
                        onChange={(e) => { setNip(e.target.value); setGroups([]); setGroupId(""); }}
                        placeholder="ketik NIK"
                        autoComplete="username"
                        className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-3 pl-10 pr-3 text-sm text-white outline-none transition-all placeholder:text-emerald-50/35 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-emerald-50/70">
                      Password
                    </label>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/60 transition-colors group-focus-within:text-emerald-300" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setGroups([]); setGroupId(""); }}
                        placeholder="ketik password"
                        autoComplete="current-password"
                        className="w-full rounded-xl border border-white/12 bg-white/[0.04] py-3 pl-10 pr-10 text-sm text-white outline-none transition-all placeholder:text-emerald-50/35 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/60 transition-colors hover:text-emerald-200"
                        aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Entitas — muncul hanya saat NIK terdaftar di >1 perusahaan */}
                  {groups.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium text-emerald-50/70">
                        Perusahaan / Entitas
                      </label>
                      <div className="group relative">
                        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/60 transition-colors group-focus-within:text-emerald-300" />
                        <select
                          value={groupId}
                          onChange={(e) => setGroupId(e.target.value)}
                          className="w-full appearance-none rounded-xl border border-white/12 bg-white/[0.04] py-3 pl-10 pr-10 text-sm text-white outline-none transition-all focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20 [&>option]:text-black"
                        >
                          <option value="">Pilih perusahaan</option>
                          {groups.map((g) => (
                            <option key={g.groupId} value={g.groupId}>
                              {g.groupName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/60" />
                      </div>
                    </div>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-400/30 bg-red-500/15 px-3.5 py-2.5 text-[12.5px] font-medium text-red-100"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Login
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-emerald-50/45 lg:hidden">
              © {new Date().getFullYear()} PT Perkebunan Nusantara · Agronow Learning &amp; Development
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
