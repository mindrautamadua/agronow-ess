"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";
import { Skeleton } from "@/components/Skeleton";
import {
  ChevronRight, ChevronDown, Send, X, CheckCircle2, Loader2, AlertCircle,
  LifeBuoy, GraduationCap, TrendingUp, Bookmark, Target, Wallet, KeyRound,
  Wrench, HelpCircle, UploadCloud, FileText, Clock, ShieldCheck, ImageIcon,
  Inbox, ExternalLink,
} from "lucide-react";

/** Kategori bantuan — `key` selaras dengan HELPDESK_CATEGORIES di /api/helpdesk. */
const CATEGORIES = [
  { key: "belajar_di_kelas", label: "Belajar di Kelas", desc: "Kelas, kehadiran, materi", Icon: GraduationCap },
  { key: "progres_jpl", label: "Progres & JPL", desc: "Capaian jam pelajaran", Icon: TrendingUp },
  { key: "wishlist", label: "Wishlist & Katalog", desc: "Rencana & katalog pelatihan", Icon: Bookmark },
  { key: "idp", label: "IDP", desc: "Individual Development Program", Icon: Target },
  { key: "agro_wallet", label: "Agro Wallet", desc: "Saldo & pengajuan pelatihan", Icon: Wallet },
  { key: "akun_login", label: "Akun & Login", desc: "Masuk, password, profil", Icon: KeyRound },
  { key: "aplikasi_teknis", label: "Kendala Teknis", desc: "Error / bug aplikasi", Icon: Wrench },
  { key: "lainnya", label: "Lainnya", desc: "Pertanyaan umum", Icon: HelpCircle },
] as const;

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_CHARS = 1500;
const MIN_CHARS = 10;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

type Tab = "create" | "mine";
type Filter = "all" | "open" | "closed";

interface Ticket {
  id: number; category: string; description: string;
  berkas: string | null; closed: boolean; createdAt: string | null;
}

const toDate = (s: string | null) => (s ? new Date(s.includes(" ") ? s.replace(" ", "T") : s) : null);
const fmtDate = (s: string | null) => {
  const d = toDate(s);
  return d && !isNaN(d.getTime()) ? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
};
const fmtDateTime = (s: string | null) => {
  const d = toDate(s);
  return d && !isNaN(d.getTime())
    ? d.toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";
};
const fmtSize = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const isImg = (url: string) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);

export default function HelpdeskPage() {
  const [tab, setTab] = useState<Tab>("create");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  const loadTickets = useCallback(() => {
    fetch("/api/helpdesk").then((r) => r.json()).then((d) => setTickets(d.items ?? [])).catch(() => setTickets([]));
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  const openCount = tickets?.filter((t) => !t.closed).length ?? 0;

  return (
    <div className="relative isolate min-h-screen bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="Bantuan" />

      <main className="mx-auto max-w-[1120px] px-4 pb-24">
        {/* Breadcrumb */}
        <nav className="mt-4 flex items-center gap-1.5 text-[13px] text-white/50">
          <a href="/home" className="hover:text-white/80">Dashboard</a>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-white/80">Helpdesk</span>
        </nav>

        {/* Hero */}
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">Pusat Bantuan</h1>
              <p className="mt-1 text-[14px] text-white/60">Kirim kendala Anda dan pantau status tindak lanjutnya.</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] text-white/70 sm:flex">
            <Clock className="h-3.5 w-3.5 text-emerald-300" /> Estimasi respon 1×24 jam kerja
          </span>
        </header>

        {/* Tabs */}
        <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <TabBtn active={tab === "create"} onClick={() => setTab("create")} icon={<Send className="h-4 w-4" />} label="Buat Tiket" />
          <TabBtn active={tab === "mine"} onClick={() => setTab("mine")} icon={<Inbox className="h-4 w-4" />} label="Tiket Saya" badge={openCount} />
        </div>

        <div className="mt-6">
          {tab === "create"
            ? <CreateTab onSubmitted={() => { loadTickets(); setTab("mine"); }} />
            : <MineTab tickets={tickets} onCreate={() => setTab("create")} />}
        </div>
      </main>
    </div>
  );
}

/* ════════════════════════ TAB: Buat Tiket ════════════════════════ */

function CreateTab({ onSubmitted }: { onSubmitted: () => void }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) { setFile(null); return; }
    const okType = f.type === "application/pdf" || f.type.startsWith("image/");
    if (!okType) { setError("Format bukti harus gambar (PNG/JPG/WEBP/GIF) atau PDF."); return; }
    if (f.size > MAX_BYTES) { setError("Ukuran file maksimal 10 MB."); return; }
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); };

  const descError = touched && description.trim().length < MIN_CHARS;
  const catError = touched && !category;
  const valid = category && description.trim().length >= MIN_CHARS;

  const submit = async () => {
    setTouched(true); setError(null);
    if (!category) { setError("Silakan pilih kategori bantuan terlebih dahulu."); return; }
    if (description.trim().length < MIN_CHARS) { setError(`Jelaskan permasalahan minimal ${MIN_CHARS} karakter.`); return; }

    setSubmitting(true);
    try {
      let berkas: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/helpdesk/upload", { method: "POST", body: fd });
        const ud = await up.json();
        if (!up.ok) throw new Error(ud.error || "Gagal mengunggah bukti.");
        berkas = ud.url ?? null;
      }
      const res = await fetch("/api/helpdesk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, description: description.trim(), berkas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim ke Helpdesk.");
      // Reset & lempar ke tab "Tiket Saya" (banner konfirmasi tampil di sana).
      sessionStorage.setItem("helpdesk_flash", String(data.id ?? 0));
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* FORM */}
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-7">
        {/* 1. Kategori */}
        <Step n={1} title="Kategori Bantuan" required />
        <div className={`mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 ${catError ? "rounded-2xl ring-1 ring-red-400/40" : ""}`}>
          {CATEGORIES.map(({ key, label, desc, Icon }) => {
            const on = category === key;
            return (
              <button
                key={key} type="button" onClick={() => setCategory(key)} aria-pressed={on}
                className={`group flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-all ${
                  on ? "border-emerald-400/60 bg-emerald-500/10 ring-1 ring-emerald-400/30"
                     : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]"}`}
              >
                <Icon className={`h-5 w-5 ${on ? "text-emerald-300" : "text-white/55 group-hover:text-white/80"}`} />
                <span className="text-[13.5px] font-semibold leading-tight">{label}</span>
                <span className="text-[11.5px] leading-tight text-white/45">{desc}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Permasalahan */}
        <div className="mt-7 flex items-center justify-between">
          <Step n={2} title="Permasalahan" required />
          <span className={`text-[12px] tabular-nums ${description.length >= MAX_CHARS ? "text-amber-400" : "text-white/40"}`}>{description.length}/{MAX_CHARS}</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_CHARS))}
          onBlur={() => setTouched(true)}
          rows={7} aria-invalid={descError}
          placeholder="Contoh: Saya sudah mengikuti kelas 'K3 Perkebunan' tanggal 12 Juni namun JPL saya belum bertambah. Mohon dibantu pengecekannya."
          className={`mt-3 w-full resize-y rounded-2xl border bg-white/[0.04] px-4 py-3.5 text-[14.5px] leading-relaxed outline-none transition-colors placeholder:text-white/35 focus:ring-2 ${
            descError ? "border-red-400/50 focus:border-red-400/60 focus:ring-red-400/15" : "border-white/10 focus:border-emerald-400/50 focus:ring-emerald-400/15"}`}
        />
        <p className="mt-1.5 text-[12px] text-white/45">Jelaskan sedetail mungkin: apa yang terjadi, kapan, dan langkah yang sudah dicoba.</p>

        {/* 3. Lampiran */}
        <div className="mt-7"><Step n={3} title="Lampirkan Bukti" optional /></div>
        <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] p-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><FileText className="h-6 w-6" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{file.name}</p>
              <p className="text-[12px] text-white/45">{fmtSize(file.size)}</p>
            </div>
            <button onClick={() => pickFile(null)} aria-label="Hapus lampiran" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/55 transition-colors hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button
            type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
            className={`mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-7 text-center transition-colors ${
              dragOver ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"}`}
          >
            <UploadCloud className={`h-7 w-7 ${dragOver ? "text-emerald-300" : "text-white/45"}`} />
            <span className="text-[13.5px] font-semibold text-white/85">Seret &amp; lepas, atau <span className="text-emerald-300">pilih file</span></span>
            <span className="text-[12px] text-white/40">Gambar atau PDF • maks 10 MB • opsional</span>
          </button>
        )}

        {error && (
          <p className="mt-5 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-[13px] font-medium text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        <button
          onClick={submit} disabled={submitting || (touched && !valid)}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-6 py-4 text-[15px] font-bold text-[#0d130f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Mengirim…</> : <><Send className="h-[18px] w-[18px]" /> Kirim ke Helpdesk</>}
        </button>
        <p className="mt-3 text-center text-[11.5px] text-white/35">Tiket dikirim atas nama akun Anda yang sedang login.</p>
      </div>

      {/* SIDEBAR */}
      <aside className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="flex items-center gap-2 text-[13px] font-bold"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Sebelum mengirim</h3>
          <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-white/60">
            {["Cek dulu menu FAQ — banyak kendala umum sudah ada jawabannya.",
              "Sertakan tanggal kejadian & nama kelas/menu terkait.",
              "Lampirkan tangkapan layar agar lebih cepat ditindaklanjuti."].map((t) => (
              <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/70" /><span>{t}</span></li>
            ))}
          </ul>
          <a href="/bantuan/faq" className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-300 hover:text-emerald-200">Buka FAQ <ChevronRight className="h-3.5 w-3.5" /></a>
        </div>
      </aside>
    </div>
  );
}

/* ════════════════════════ TAB: Tiket Saya ════════════════════════ */

function MineTab({ tickets, onCreate }: { tickets: Ticket[] | null; onCreate: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);

  useEffect(() => {
    const f = sessionStorage.getItem("helpdesk_flash");
    if (f !== null) { setFlashId(Number(f)); sessionStorage.removeItem("helpdesk_flash"); }
  }, []);

  const counts = {
    all: tickets?.length ?? 0,
    open: tickets?.filter((t) => !t.closed).length ?? 0,
    closed: tickets?.filter((t) => t.closed).length ?? 0,
  };
  const list = (tickets ?? []).filter((t) => filter === "all" || (filter === "open" ? !t.closed : t.closed));

  return (
    <div className="space-y-4">
      {flashId !== null && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3.5">
          <p className="flex items-start gap-2 text-[13.5px] text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            Tiket {flashId ? <span className="font-semibold">#{flashId}</span> : ""} berhasil dikirim. Kami akan menindaklanjutinya.
          </p>
          <button onClick={() => setFlashId(null)} aria-label="Tutup" className="shrink-0 text-emerald-300/70 hover:text-emerald-200"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {([["all", "Semua"], ["open", "Diproses"], ["closed", "Selesai"]] as [Filter, string][]).map(([k, lbl]) => (
          <button
            key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              filter === k ? "bg-emerald-500 text-[#0d130f]" : "border border-white/12 text-white/70 hover:bg-white/5"}`}
          >
            {lbl} <span className={filter === k ? "text-[#0d130f]/60" : "text-white/40"}>{counts[k]}</span>
          </button>
        ))}
      </div>

      {/* Skeleton */}
      {tickets === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><Skeleton className="h-4 w-40" /><Skeleton className="mt-2.5 h-3 w-full" /><Skeleton className="mt-1.5 h-3 w-2/3" /></div>
          ))}
        </div>
      )}

      {/* Kosong */}
      {tickets !== null && list.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5 text-white/40"><Inbox className="h-7 w-7" /></span>
          <p className="mt-4 text-[14px] font-semibold text-white/80">{filter === "all" ? "Belum ada tiket" : "Tidak ada tiket pada filter ini"}</p>
          <p className="mt-1 text-[13px] text-white/45">{filter === "all" ? "Tiket yang Anda kirim akan muncul dan bisa dipantau di sini." : "Coba ganti filter di atas."}</p>
          {filter === "all" && <button onClick={onCreate} className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 text-[13.5px] font-bold text-[#0d130f] transition-colors hover:bg-emerald-400">Buat Tiket Pertama</button>}
        </div>
      )}

      {/* Daftar */}
      {list.map((t) => {
        const open = openId === t.id;
        return (
          <div key={t.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <button onClick={() => setOpenId(open ? null : t.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-[14px] font-semibold">{t.category || "Tiket"}</span>
                  <span className="text-[12px] text-white/35">#{t.id}</span>
                  <StatusPill closed={t.closed} />
                </div>
                {!open && <p className="mt-1 line-clamp-1 text-[13px] text-white/55">{t.description}</p>}
                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-white/40"><Clock className="h-3 w-3" /> {fmtDate(t.createdAt)}</p>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="border-t border-white/10 px-4 py-4">
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-white/75">{t.description}</p>
                {t.berkas && (
                  <a href={t.berkas} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3 py-2 text-[12.5px] font-medium text-emerald-300 transition-colors hover:bg-white/[0.06]">
                    {isImg(t.berkas) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />} Lihat lampiran <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-white/40">
                  <span>Dikirim {fmtDateTime(t.createdAt)}</span>
                  <span>Status: <span className={t.closed ? "text-emerald-300" : "text-amber-300"}>{t.closed ? "Selesai" : "Sedang diproses"}</span></span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════ Komponen kecil ════════════════════════ */

function TabBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold transition-colors ${active ? "bg-emerald-500 text-[#0d130f]" : "text-white/70 hover:text-white"}`}
    >
      {icon}{label}
      {!!badge && badge > 0 && (
        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${active ? "bg-[#0d130f]/15 text-[#0d130f]" : "bg-emerald-500/20 text-emerald-300"}`}>{badge}</span>
      )}
    </button>
  );
}

function StatusPill({ closed, small }: { closed: boolean; small?: boolean }) {
  return (
    <span className={`shrink-0 rounded-full font-semibold ${small ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-0.5 text-[11.5px]"} ${closed ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
      {closed ? "Selesai" : "Diproses"}
    </span>
  );
}

/** Label langkah bernomor dengan penanda wajib/opsional. */
function Step({ n, title, required, optional }: { n: number; title: string; required?: boolean; optional?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/15 text-[12px] font-bold text-emerald-300">{n}</span>
      <span className="text-[14px] font-semibold">{title}</span>
      {required && <span className="text-[12px] font-medium text-emerald-400/80">• wajib</span>}
      {optional && <span className="text-[12px] text-white/40">• opsional</span>}
    </div>
  );
}
