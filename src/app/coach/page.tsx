"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Send, Loader2, Bot, User as UserIcon } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomGradient from "@/components/BottomGradient";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "Bagaimana progres belajarku tahun ini?",
  "Kompetensi apa yang masih perlu aku kuatkan?",
  "Rekomendasikan pelatihan untukku dong",
  "Bantu aku menyusun rencana IDP",
];

const GREETING = "Hai! Aku Coach Agro 🌱 — pendamping belajarmu. Aku bisa lihat progres 70-20-10, gap kompetensi, dan riwayat pelatihanmu untuk kasih saran yang pas. Mau mulai dari mana?";

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
      setMessages((m) => m.slice(0, -1)); // kembalikan input agar bisa dicoba lagi
      setInput(q);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-[#19191B] text-white">
      <BottomGradient />
      <AppHeader active="AI Coach" />

      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 py-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Coach Agro</h1>
            <p className="text-[12px] text-emerald-50/60">AI career & learning coach · grounded ke datamu</p>
          </div>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-4">
          {/* Greeting */}
          <Bubble role="assistant" content={GREETING} />

          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-[12.5px] text-emerald-100 transition-colors hover:bg-emerald-500/20">
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)}

          {loading && (
            <div className="flex items-center gap-2 text-[13px] text-emerald-50/60">
              <Bot className="h-4 w-4 text-emerald-300" />
              <Loader2 className="h-4 w-4 animate-spin" /> Coach sedang menyiapkan jawaban…
            </div>
          )}
          {error && <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-200">{error}</p>}
        </div>

        {/* Composer */}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex items-center gap-2">
          <input
            value={input} onChange={(e) => setInput(e.target.value)} disabled={loading}
            placeholder="Tanya apa saja soal belajar & kariermu…"
            className="flex-1 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-emerald-400/50 disabled:opacity-60"
          />
          <button type="submit" disabled={loading || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a] transition-all hover:brightness-110 disabled:opacity-40">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-white/30">Coach Agro bisa keliru. Verifikasi info penting dengan unit L&D.</p>
      </main>
    </div>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-white/10" : "bg-gradient-to-br from-emerald-400 to-green-600 text-[#06210a]"}`}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
        isUser ? "rounded-tr-sm bg-emerald-500/15 text-emerald-50" : "rounded-tl-sm border border-white/[0.07] bg-white/[0.04] text-white/90"
      }`}>
        {content}
      </div>
    </motion.div>
  );
}
