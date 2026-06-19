"use client";

/**
 * Widget AI Coach mengambang — tombol bulat di kanan-bawah yang membuka panel
 * chat ringkas. Dipasang sekali di root layout sehingga tersedia di SELURUH
 * halaman, memakai ulang endpoint `/api/coach` (sama dengan halaman /coach).
 * Disembunyikan otomatis pada rute publik/auth (mis. /login) karena coach
 * membutuhkan sesi & data member.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, X } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string }

// Rute tanpa widget (belum login / tak ada sesi member).
const HIDDEN_PREFIXES = ["/login", "/auth"];

const SUGGESTIONS = [
  "Bagaimana progres belajarku tahun ini?",
  "Kompetensi apa yang perlu aku kuatkan?",
  "Rekomendasikan pelatihan untukku",
];

const GREETING = "Hai! Aku Coach Agro 🌱 — pendamping belajarmu. Aku bisa lihat progres 70-20-10 & riwayat pelatihanmu. Mau mulai dari mana?";

export default function CoachWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  // Tutup panel dengan Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "(kosong)" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kendala.");
      setMessages((m) => m.slice(0, -1));
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Panel chat */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-24 right-4 z-50 flex h-[min(560px,75vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#1d1f1c] shadow-2xl sm:right-6"
            role="dialog"
            aria-label="AI Coach"
          >
            {/* Header panel */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold leading-tight">Coach Agro</p>
                  <p className="text-[11px] text-emerald-50/55">AI learning coach</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Tutup"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Area chat */}
            <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-4">
              <Bubble role="assistant" content={GREETING} />
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-[12px] text-emerald-100 transition-colors hover:bg-emerald-500/20">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}
              {loading && (
                <div className="flex items-center gap-2 text-[12.5px] text-emerald-50/60">
                  <Bot className="h-4 w-4 text-emerald-300" />
                  <Loader2 className="h-4 w-4 animate-spin" /> Coach sedang menyiapkan jawaban…
                </div>
              )}
              {error && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-200">{error}</p>}
            </div>

            {/* Composer */}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t border-white/10 p-3">
              <input
                value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
                placeholder="Tanya soal belajar & kariermu…"
                className="flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-[13.5px] text-white placeholder:text-white/40 outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-60"
              />
              <button type="submit" disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a] transition-all hover:brightness-110 disabled:opacity-40">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tombol mengambang */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Tutup AI Coach" : "Buka AI Coach"}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a] shadow-xl shadow-emerald-900/40 transition-transform hover:scale-105 active:scale-95 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-white/10" : "bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]"}`}>
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed ${
        isUser ? "rounded-tr-sm bg-emerald-500/15 text-emerald-50" : "rounded-tl-sm border border-white/[0.07] bg-white/[0.04] text-white/90"
      }`}>
        {content}
      </div>
    </motion.div>
  );
}
