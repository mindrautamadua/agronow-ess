"use client";

/**
 * Chatroom — dua panel: daftar room (`_forum_group`) + stream pesan
 * (`_forum_group_chat`). Pesan baru di-polling tiap 5 dtk lewat ?after=<fc_id>.
 * Kirim pesan: POST /api/chatroom/message. Identitas (untuk bubble milik sendiri)
 * dari /api/me.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Skeleton } from "@/components/Skeleton";
import { ArrowLeft, MessageCircle, Search, X, Send, MessagesSquare } from "lucide-react";

interface ChatRoom {
  id: number; nama: string; desc: string | null; jumlah: number;
  terakhir: { text: string; penulis: string; tgl: string | null } | null;
}
interface ChatMessage {
  id: number; memberId: number; penulis: string; penulisImg: string | null; tgl: string | null; body: string | null;
}

const POLL_MS = 5000;

const fmtJam = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};
const fmtTgl = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay ? fmtJam(s) : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};
const fmtPemisah = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/** Avatar member — foto bila URL valid, jika gagal/null jatuh ke inisial. */
function Avatar({ name, src, size = "md" }: { name: string; src: string | null; size?: "md" | "sm" }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[13px]";
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} onError={() => setFailed(true)} className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-white/10`} />
    );
  }
  return (
    <div className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-green-800 font-bold text-white ring-1 ring-white/10`}>
      {initials}
    </div>
  );
}

const bodyCls = "text-[13.5px] leading-relaxed [&_a]:underline [&_a]:text-emerald-200 [&_strong]:font-semibold";

export default function ChatroomPage() {
  const [meId, setMeId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsErr, setRoomsErr] = useState(false);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ChatRoom | null>(null);

  // Identitas user (untuk membedakan bubble milik sendiri).
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => setMeId(j?.member?.id ?? null)).catch(() => {});
  }, []);

  // Debounce pencarian room.
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true); setRoomsErr(false);
    try {
      const r = await fetch(`/api/insight/chatroom${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const d = await r.json();
      if (!Array.isArray(d.items)) throw new Error("bad payload");
      setRooms(d.items);
    } catch {
      setRoomsErr(true);
    } finally {
      setLoadingRooms(false);
    }
  }, [q]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  return (
    <div className="flex h-screen flex-col bg-[#19191B] text-white">
      <AppHeader active="Insight Hub" />

      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col overflow-hidden px-0 sm:px-4 sm:pb-4">
        <div className="hidden px-4 pt-4 sm:block sm:px-0">
          <a href="/insight-hub" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-emerald-300">
            <ArrowLeft className="h-4 w-4" /> Insight Hub
          </a>
          <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-bold">
            <MessageCircle className="h-6 w-6 text-emerald-400" /> Chatroom
          </h1>
        </div>

        <div className="mt-0 flex flex-1 overflow-hidden sm:mt-4 sm:rounded-2xl sm:border sm:border-white/10">
          {/* Sidebar daftar room */}
          <aside className={`flex w-full flex-col border-white/10 sm:w-[320px] sm:border-r ${active ? "hidden sm:flex" : "flex"}`}>
            <div className="border-b border-white/10 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="Cari room…"
                  className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-[13.5px] text-white placeholder:text-white/35 outline-none focus:border-emerald-500/60"
                />
                {qInput && (
                  <button onClick={() => setQInput("")} aria-label="Hapus pencarian"
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : roomsErr ? (
                <p className="m-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">Gagal memuat room.</p>
              ) : rooms.length === 0 ? (
                <p className="m-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-[13px] text-white/50">
                  {q ? `Tidak ada room "${q}".` : "Belum ada room."}
                </p>
              ) : (
                <ul>
                  {rooms.map((room) => (
                    <li key={room.id}>
                      <button type="button" onClick={() => setActive(room)}
                        className={`flex w-full items-start gap-3 border-b border-white/5 px-3 py-3 text-left transition-colors hover:bg-white/[0.04] ${active?.id === room.id ? "bg-white/[0.06]" : ""}`}>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 font-bold text-white ring-1 ring-white/10">
                          {room.nama.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[14px] font-semibold text-white">{room.nama}</p>
                            {room.terakhir?.tgl && <span className="shrink-0 text-[11px] text-white/40">{fmtTgl(room.terakhir.tgl)}</span>}
                          </div>
                          <p className="mt-0.5 truncate text-[12.5px] text-white/50">
                            {room.terakhir ? <><span className="text-white/65">{room.terakhir.penulis}:</span> {room.terakhir.text}</> : "Belum ada pesan"}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          {/* Panel chat */}
          <section className={`flex-1 flex-col ${active ? "flex" : "hidden sm:flex"}`}>
            {active ? (
              <ChatPanel room={active} meId={meId} onBack={() => setActive(null)} onSent={loadRooms} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-white/40">
                <MessagesSquare className="h-12 w-12 text-emerald-400/50" />
                <p className="text-[14px]">Pilih room untuk mulai mengobrol.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/** Stream pesan satu room + composer. Polling pesan baru tiap POLL_MS. */
function ChatPanel({ room, meId, onBack, onSent }: { room: ChatRoom; meId: number | null; onBack: () => void; onSent: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const scrollToEnd = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Muat awal + reset saat ganti room.
  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(false); setMessages([]); lastIdRef.current = 0;
    fetch(`/api/insight/chatroom?room=${room.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const items: ChatMessage[] = Array.isArray(j.items) ? j.items : [];
        setMessages(items);
        lastIdRef.current = items.length ? items[items.length - 1].id : 0;
      })
      .catch(() => { if (alive) setErr(true); })
      .finally(() => { if (alive) { setLoading(false); requestAnimationFrame(() => scrollToEnd()); } });
    return () => { alive = false; };
  }, [room.id, scrollToEnd]);

  // Polling pesan baru (?after=<fc_id terakhir>).
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/insight/chatroom?room=${room.id}&after=${lastIdRef.current}`);
        const j = await r.json();
        const fresh: ChatMessage[] = Array.isArray(j.items) ? j.items : [];
        if (fresh.length) {
          lastIdRef.current = fresh[fresh.length - 1].id;
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...fresh.filter((m) => !seen.has(m.id))];
          });
          const el = scrollRef.current;
          const nearBottom = el && el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          if (nearBottom) requestAnimationFrame(() => scrollToEnd(true));
        }
      } catch { /* abaikan error polling */ }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [room.id, scrollToEnd]);

  async function submit() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setSendErr("");
    try {
      const r = await fetch("/api/chatroom/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, text: body }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.message) { setSendErr(j?.error ?? "Gagal mengirim pesan."); return; }
      const msg: ChatMessage = j.message;
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText("");
      requestAnimationFrame(() => scrollToEnd(true));
      onSent();
    } catch {
      setSendErr("Tidak dapat terhubung ke server.");
    } finally {
      setSending(false);
    }
  }

  let lastDay = "";

  return (
    <>
      {/* Header room */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.02] px-3 py-3">
        <button onClick={onBack} aria-label="Kembali" className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 sm:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 font-bold text-white ring-1 ring-white/10">
          {room.nama.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-white">{room.nama}</p>
          <p className="text-[12px] text-white/45">{room.jumlah} pesan</p>
        </div>
      </div>

      {/* Stream pesan */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-[#141416] px-3 py-4 sm:px-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)}
          </div>
        ) : err ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-300">Gagal memuat pesan.</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-white/40">
            <MessageCircle className="h-10 w-10 text-emerald-400/40" />
            <p className="text-[13.5px]">Belum ada pesan. Mulai obrolan!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = meId != null && m.memberId === meId;
            const day = fmtPemisah(m.tgl);
            const showDay = day && day !== lastDay;
            if (showDay) lastDay = day;
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] text-white/50">{day}</span>
                  </div>
                )}
                <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <Avatar name={m.penulis} src={m.penulisImg} size="sm" />}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md bg-white/[0.06] text-white/90"}`}>
                    {!mine && <p className="mb-0.5 text-[12px] font-semibold text-emerald-300">{m.penulis}</p>}
                    {m.body
                      ? <div className={bodyCls} dangerouslySetInnerHTML={{ __html: m.body }} />
                      : <p className="text-[13px] italic text-white/40">(pesan kosong)</p>}
                    <p className={`mt-0.5 text-right text-[10.5px] ${mine ? "text-white/70" : "text-white/35"}`}>{fmtJam(m.tgl)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="border-t border-white/10 bg-white/[0.02] p-3">
        {sendErr && <p className="mb-1.5 text-[12px] text-red-300">{sendErr}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            rows={1}
            maxLength={4000}
            placeholder="Tulis pesan…"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[13.5px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-500/60"
          />
          <button type="submit" disabled={sending || !text.trim()} aria-label="Kirim"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </>
  );
}
